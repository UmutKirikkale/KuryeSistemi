import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

const getDayBounds = (dateInput?: string) => {
  const targetDate = dateInput ? new Date(dateInput) : new Date();

  if (Number.isNaN(targetDate.getTime())) {
    throw new AppError('Invalid date', 400);
  }

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const dayKey = startOfDay.toISOString().slice(0, 10);

  return { targetDate, startOfDay, endOfDay, dayKey };
};

const getCourierDailySettlementSummary = async (courierId: string, dateInput?: string) => {
  const { targetDate, startOfDay, endOfDay, dayKey } = getDayBounds(dateInput);

  const deliveredCashOrders = await prisma.order.findMany({
    where: {
      courierId,
      status: 'DELIVERED',
      deliveredAt: {
        gte: startOfDay,
        lte: endOfDay
      },
      OR: [
        { paymentMethod: 'CASH' },
        { paymentMethod: null }
      ]
    },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { deliveredAt: 'desc' }
  });

  const grouped = new Map<string, {
    restaurantId: string;
    restaurantName: string;
    packageCount: number;
    grossAmount: number;
    commissionAmount: number;
    courierFeeAmount: number;
    amountToRestaurant: number;
  }>();

  deliveredCashOrders.forEach((order: any) => {
    const restaurantId = order.restaurantId;
    const existing = grouped.get(restaurantId) || {
      restaurantId,
      restaurantName: order.restaurant?.name || 'Restoran',
      packageCount: 0,
      grossAmount: 0,
      commissionAmount: 0,
      courierFeeAmount: 0,
      amountToRestaurant: 0
    };

    existing.packageCount += 1;
    existing.grossAmount += order.orderAmount || 0;
    existing.commissionAmount += order.commissionAmount || 0;
    existing.courierFeeAmount += order.courierFee || 0;
    existing.amountToRestaurant += (order.orderAmount || 0) - (order.commissionAmount || 0) - (order.courierFee || 0);

    grouped.set(restaurantId, existing);
  });

  const restaurants = Array.from(grouped.values());

  const settlementTransactions = await prisma.financialTransaction.findMany({
    where: {
      transactionType: 'COURIER_SETTLEMENT',
      date: {
        gte: startOfDay,
        lte: endOfDay
      },
      description: {
        contains: `courier:${courierId}|date:${dayKey}|`
      }
    },
    select: {
      restaurantId: true,
      amount: true,
      description: true,
      date: true
    }
  });

  const closedRestaurantIds = new Set(
    settlementTransactions
      .map((tx: any) => tx.restaurantId)
      .filter(Boolean)
  );

  const rows = restaurants.map((item) => ({
    ...item,
    isClosed: closedRestaurantIds.has(item.restaurantId)
  }));

  const totals = {
    totalRestaurants: rows.length,
    totalPackages: rows.reduce((sum, item) => sum + item.packageCount, 0),
    totalGrossAmount: rows.reduce((sum, item) => sum + item.grossAmount, 0),
    totalCommissionAmount: rows.reduce((sum, item) => sum + item.commissionAmount, 0),
    totalCourierFeeAmount: rows.reduce((sum, item) => sum + item.courierFeeAmount, 0),
    totalAmountToRestaurant: rows.reduce((sum, item) => sum + item.amountToRestaurant, 0),
    closedRestaurants: rows.filter((item) => item.isClosed).length,
    openRestaurants: rows.filter((item) => !item.isClosed).length
  };

  return {
    date: targetDate,
    dayKey,
    rows,
    totals
  };
};

export const getRestaurantFinancials = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Sadece restoran kendi finansallarını görebilir
    if (req.userRole !== 'RESTAURANT' && req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { userId: req.userId }
    });

    if (!restaurant && req.userRole !== 'ADMIN') {
      throw new AppError('Restaurant not found', 404);
    }

    const whereClause: any = {};

    if (restaurant) {
      whereClause.restaurantId = restaurant.id;
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate as string);
      }
    }

    // Tüm finansal işlemleri getir
    const transactions = await prisma.financialTransaction.findMany({
      where: whereClause,
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    const deliveredOrderWhere: any = {
      status: 'DELIVERED'
    };

    if (restaurant) {
      deliveredOrderWhere.restaurantId = restaurant.id;
    }

    if (startDate || endDate) {
      deliveredOrderWhere.deliveredAt = {};
      if (startDate) {
        deliveredOrderWhere.deliveredAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        deliveredOrderWhere.deliveredAt.lte = new Date(endDate as string);
      }
    }

    const deliveredOrders = await prisma.order.findMany({
      where: deliveredOrderWhere,
      select: {
        orderAmount: true,
        courierFee: true,
        commissionAmount: true
      }
    });

    // Özet hesaplamalar
    const summary = {
      totalEarnings: deliveredOrders.reduce((sum: number, order: any) => sum + (order.orderAmount || 0), 0),
      totalCourierFees: deliveredOrders.reduce((sum: number, order: any) => sum + (order.courierFee || 0), 0),
      totalCommissions: deliveredOrders.reduce((sum: number, order: any) => sum + (order.commissionAmount || 0), 0),
      commissionPerOrder: restaurant?.commissionPerOrder || 0,
      netBalance: 0,
      transactionCount: transactions.length
    };

    summary.netBalance = summary.totalEarnings - summary.totalCourierFees - summary.totalCommissions;

    res.json({
      summary,
      transactions
    });
  } catch (error) {
    throw error;
  }
};

export const getCourierEarnings = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Sadece kurye kendi kazançlarını görebilir
    if (req.userRole !== 'COURIER' && req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    // Kurye profilini al
    const courierProfile = await prisma.courierProfile.findUnique({
      where: { userId: req.userId }
    });

    if (!courierProfile) {
      throw new AppError('Courier profile not found', 404);
    }

    const whereClause: any = {
      courierId: req.userId,
      status: 'DELIVERED'
    };

    if (startDate || endDate) {
      whereClause.deliveredAt = {};
      if (startDate) {
        whereClause.deliveredAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.deliveredAt.lte = new Date(endDate as string);
      }
    }

    const deliveredOrders = await prisma.order.findMany({
      where: whereClause,
      include: {
        restaurant: {
          select: {
            name: true
          }
        }
      },
      orderBy: { deliveredAt: 'desc' }
    });

    // Kazanç hesaplamaları (artık courierFee yerine paymentPerOrder kullanıyoruz)
    const paymentPerOrder = courierProfile.paymentPerOrder;
    const summary = {
      totalOrders: deliveredOrders.length,
      paymentPerOrder,
      totalEarnings: deliveredOrders.length * paymentPerOrder,
      averageEarningPerOrder: paymentPerOrder
    };

    res.json({
      summary,
      orders: deliveredOrders.map((order: any) => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        restaurantName: order.restaurant.name,
        earning: paymentPerOrder,
        deliveredAt: order.deliveredAt
      }))
    });
  } catch (error) {
    throw error;
  }
};

export const getDailyReport = async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date as string) : new Date();
    
    // Günün başlangıcı ve sonu
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    if (req.userRole === 'RESTAURANT') {
      const restaurant = await prisma.restaurant.findFirst({
        where: { userId: req.userId }
      });

      if (!restaurant) {
        throw new AppError('Restaurant not found', 404);
      }

      // Günlük siparişler
      const orders = await prisma.order.findMany({
        where: {
          restaurantId: restaurant.id,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      // Tamamlanan siparişler
      const completedOrders = orders.filter((o: any) => o.status === 'DELIVERED');

      const report = {
        date: targetDate,
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        pendingOrders: orders.filter((o: any) => o.status === 'PENDING').length,
        cancelledOrders: orders.filter((o: any) => o.status === 'CANCELLED').length,
        grossEarnings: completedOrders.reduce((sum: number, o: any) => sum + o.orderAmount, 0),
        courierFees: completedOrders.reduce((sum: number, o: any) => sum + o.courierFee, 0),
        commissions: completedOrders.reduce((sum: number, o: any) => sum + o.commissionAmount, 0),
        netEarnings: 0
      };

      report.netEarnings = report.grossEarnings - report.courierFees - report.commissions;

      res.json({ report });

    } else if (req.userRole === 'COURIER') {
      const orders = await prisma.order.findMany({
        where: {
          courierId: req.userId,
          deliveredAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: 'DELIVERED'
        }
      });

      const report = {
        date: targetDate,
        totalDeliveries: orders.length,
        totalEarnings: orders.reduce((sum: number, o: any) => sum + o.courierFee, 0),
        averageEarningPerDelivery: orders.length > 0 
          ? orders.reduce((sum: number, o: any) => sum + o.courierFee, 0) / orders.length 
          : 0
      };

      res.json({ report });
    } else {
      throw new AppError('Invalid role for daily report', 403);
    }
  } catch (error) {
    throw error;
  }
};

export const getMonthlyReport = async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;
    
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    if (req.userRole === 'RESTAURANT') {
      const restaurant = await prisma.restaurant.findFirst({
        where: { userId: req.userId }
      });

      if (!restaurant) {
        throw new AppError('Restaurant not found', 404);
      }

      const transactions = await prisma.financialTransaction.findMany({
        where: {
          restaurantId: restaurant.id,
          date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });

      const orders = await prisma.order.findMany({
        where: {
          restaurantId: restaurant.id,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });

      const completedOrders = orders.filter((o: any) => o.status === 'DELIVERED');

      const report = {
        period: `${targetYear}-${targetMonth.toString().padStart(2, '0')}`,
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        grossEarnings: transactions
          .filter((t: any) => t.transactionType === 'EARNING')
          .reduce((sum: number, t: any) => sum + t.amount, 0),
        courierFees: Math.abs(transactions
          .filter((t: any) => t.transactionType === 'COURIER_FEE')
          .reduce((sum: number, t: any) => sum + t.amount, 0)),
        commissions: Math.abs(transactions
          .filter((t: any) => t.transactionType === 'COMMISSION')
          .reduce((sum: number, t: any) => sum + t.amount, 0)),
        netEarnings: 0
      };

      report.netEarnings = report.grossEarnings - report.courierFees - report.commissions;

      res.json({ report });

    } else if (req.userRole === 'COURIER') {
      const orders = await prisma.order.findMany({
        where: {
          courierId: req.userId,
          deliveredAt: {
            gte: startOfMonth,
            lte: endOfMonth
          },
          status: 'DELIVERED'
        }
      });

      const report = {
        period: `${targetYear}-${targetMonth.toString().padStart(2, '0')}`,
        totalDeliveries: orders.length,
        totalEarnings: orders.reduce((sum: number, o: any) => sum + o.courierFee, 0),
        averageEarningPerDelivery: orders.length > 0
          ? orders.reduce((sum: number, o: any) => sum + o.courierFee, 0) / orders.length
          : 0
      };

      res.json({ report });
    } else {
      throw new AppError('Invalid role for monthly report', 403);
    }
  } catch (error) {
    throw error;
  }
};

export const getCourierDailySettlement = async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'COURIER' && req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { date } = req.query;
    const report = await getCourierDailySettlementSummary(req.userId!, date as string | undefined);

    res.json({ report });
  } catch (error) {
    throw error;
  }
};

export const closeCourierDailySettlement = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'COURIER' && req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { date } = req.body || {};
    const report = await getCourierDailySettlementSummary(req.userId!, date);

    const openRows = report.rows.filter((row) => !row.isClosed && row.amountToRestaurant > 0);

    if (openRows.length === 0) {
      return res.json({
        message: 'Bu tarih için kapatılacak açık hesap bulunamadı',
        closedCount: 0,
        totalClosedAmount: 0,
        report
      });
    }

    const createdTransactions = await prisma.$transaction(
      openRows.map((row) =>
        prisma.financialTransaction.create({
          data: {
            transactionType: 'COURIER_SETTLEMENT',
            amount: row.amountToRestaurant,
            restaurantId: row.restaurantId,
            description: `courier:${req.userId}|date:${report.dayKey}|restaurant:${row.restaurantId}|packages:${row.packageCount}`,
            date: new Date()
          }
        })
      )
    );

    const refreshedReport = await getCourierDailySettlementSummary(req.userId!, report.dayKey);

    return res.json({
      message: 'Günlük hesap kapama tamamlandı',
      closedCount: createdTransactions.length,
      totalClosedAmount: createdTransactions.reduce((sum, tx) => sum + tx.amount, 0),
      report: refreshedReport
    });
  } catch (error) {
    throw error;
  }
};
