import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

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

    // Özet hesaplamalar
    const summary = {
      totalEarnings: 0,
      totalCourierFees: 0,
      totalCommissions: 0,
      netBalance: 0,
      transactionCount: transactions.length
    };

    transactions.forEach((transaction: any) => {
      if (transaction.transactionType === 'EARNING') {
        summary.totalEarnings += transaction.amount;
      } else if (transaction.transactionType === 'COURIER_FEE') {
        summary.totalCourierFees += Math.abs(transaction.amount);
      } else if (transaction.transactionType === 'COMMISSION') {
        summary.totalCommissions += Math.abs(transaction.amount);
      }
    });

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
