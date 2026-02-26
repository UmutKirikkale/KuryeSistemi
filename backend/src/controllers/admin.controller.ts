import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const systemSettingsSchema = z.object({
  courierAutoBusyAfterOrders: z.number().int().min(1).max(100)
});

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // Sadece admin erişebilir
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    // Toplam kullanıcılar
    const totalUsers = await prisma.user.count();
    
    // Toplam restoranlar
    const totalRestaurants = await prisma.restaurant.count();
    
    // Toplam kuryeler
    const totalCouriers = await prisma.courierProfile.count();
    
    // Toplam siparişler
    const totalOrders = await prisma.order.count();
    
    // Aktif siparişler (PENDING, ASSIGNED, PICKED_UP)
    const activeOrders = await prisma.order.count({
      where: {
        status: {
          in: ['PENDING', 'ASSIGNED', 'PICKED_UP']
        }
      }
    });
    
    // Tamamlanan siparişler
    const completedOrders = await prisma.order.count({
      where: { status: 'DELIVERED' }
    });

    // Toplam komisyon (tamamlanan siparişlerden)
    const commissionData = await prisma.order.aggregate({
      where: { status: 'DELIVERED' },
      _sum: {
        commissionAmount: true
      }
    });

    // Bugünün komisyonu
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCommissionData = await prisma.order.aggregate({
      where: {
        status: 'DELIVERED',
        deliveredAt: {
          gte: today,
          lt: tomorrow
        }
      },
      _sum: {
        commissionAmount: true
      }
    });

    res.json({
      stats: {
        totalUsers,
        totalRestaurants,
        totalCouriers,
        totalOrders,
        activeOrders,
        completedOrders,
        totalRevenue: commissionData._sum.commissionAmount || 0,
        todayRevenue: todayCommissionData._sum.commissionAmount || 0
      }
    });
  } catch (error) {
    throw error;
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { page = '1', limit = '20', role } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};
    if (role && role !== 'ALL') {
      whereClause.role = role;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        restaurants: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        courierProfile: {
          select: {
            id: true,
            vehicleType: true,
            isAvailable: true
          }
        }
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.user.count({ where: whereClause });

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    throw error;
  }
};

export const getAllOrders = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { page = '1', limit = '20', status } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        restaurant: {
          select: {
            name: true,
            address: true,
            phone: true
          }
        },
        courier: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.order.count({ where: whereClause });

    res.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    throw error;
  }
};

export const getAllCouriers = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const couriers = await prisma.courierProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true
          }
        },
        _count: {
          select: {
            locationHistory: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(dayStart);
    weekStart.setDate(dayStart.getDate() - 6);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Her kurye için istatistikleri al
    const couriersWithStats = await Promise.all(
      couriers.map(async (courier: any) => {
        const deliveredOrders = await prisma.order.count({
          where: {
            courierId: courier.userId,
            status: 'DELIVERED'
          }
        });

        const last7Days = Array.from({ length: 7 }, (_, index) => {
          const day = new Date(dayStart);
          day.setDate(dayStart.getDate() - (6 - index));

          const nextDay = new Date(day);
          nextDay.setDate(day.getDate() + 1);

          return { day, nextDay };
        });

        const [dailyBusyCount, weeklyBusyCount, monthlyBusyCount] = await Promise.all([
          prisma.courierAvailabilityEvent.count({
            where: {
              courierId: courier.id,
              isAvailable: false,
              createdAt: {
                gte: dayStart
              }
            }
          }),
          prisma.courierAvailabilityEvent.count({
            where: {
              courierId: courier.id,
              isAvailable: false,
              createdAt: {
                gte: weekStart
              }
            }
          }),
          prisma.courierAvailabilityEvent.count({
            where: {
              courierId: courier.id,
              isAvailable: false,
              createdAt: {
                gte: monthStart
              }
            }
          })
        ]);

        const busyTogglesLast7Days = await Promise.all(
          last7Days.map(async ({ day, nextDay }) => {
            const count = await prisma.courierAvailabilityEvent.count({
              where: {
                courierId: courier.id,
                isAvailable: false,
                createdAt: {
                  gte: day,
                  lt: nextDay
                }
              }
            });

            return {
              date: day.toISOString(),
              count
            };
          })
        );

        return {
          ...courier,
          stats: {
            deliveredOrders,
            busyToggles: {
              daily: dailyBusyCount,
              weekly: weeklyBusyCount,
              monthly: monthlyBusyCount
            },
            busyTogglesLast7Days
          }
        };
      })
    );

    res.json({ couriers: couriersWithStats });
  } catch (error) {
    throw error;
  }
};

export const getCourierPerformanceReport = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { courierId } = req.params;
    const daysParam = req.query.days ? parseInt(req.query.days as string, 10) : 7;
    const days = Number.isNaN(daysParam) || daysParam < 1 ? 7 : Math.min(daysParam, 31);

    const courierProfile = await prisma.courierProfile.findUnique({
      where: { userId: courierId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!courierProfile) {
      throw new AppError('Courier profile not found', 404);
    }

    const allOrders = await prisma.order.findMany({
      where: {
        courierId,
        status: {
          in: ['DELIVERED', 'CANCELLED']
        }
      },
      select: {
        status: true,
        assignedAt: true,
        deliveredAt: true,
        createdAt: true,
        restaurantId: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const deliveredOrders = allOrders.filter((order) => order.status === 'DELIVERED' && order.assignedAt && order.deliveredAt);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (days - 1));

    const deliveredInRange = deliveredOrders.filter((order) =>
      order.deliveredAt ? order.deliveredAt >= startDate : false
    );
    const cancelledInRange = allOrders.filter((order) => {
      if (order.status !== 'CANCELLED') return false;
      return order.createdAt >= startDate;
    });

    const totalAssigned = deliveredInRange.length + cancelledInRange.length;
    const cancelRate = totalAssigned > 0 ? (cancelledInRange.length / totalAssigned) * 100 : 0;

    const deliveryMinutes = deliveredInRange
      .map((order) => {
        const start = order.assignedAt ? order.assignedAt.getTime() : 0;
        const end = order.deliveredAt ? order.deliveredAt.getTime() : 0;
        if (!start || !end || end <= start) return null;
        return (end - start) / 60000;
      })
      .filter((value): value is number => value !== null);

    const totalDeliveryMinutes = deliveryMinutes.reduce((sum, value) => sum + value, 0);

    const averageDeliveryMinutes = deliveryMinutes.length > 0
      ? totalDeliveryMinutes / deliveryMinutes.length
      : 0;

    const sortedMinutes = [...deliveryMinutes].sort((a, b) => a - b);
    const medianDeliveryMinutes = sortedMinutes.length > 0
      ? (sortedMinutes.length % 2 === 1
          ? sortedMinutes[Math.floor(sortedMinutes.length / 2)]
          : (sortedMinutes[sortedMinutes.length / 2 - 1] + sortedMinutes[sortedMinutes.length / 2]) / 2)
      : 0;

    const dailyMap: Record<string, { date: string; deliveries: number; earnings: number }> = {};
    for (let i = 0; i < days; i += 1) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      dailyMap[key] = { date: key, deliveries: 0, earnings: 0 };
    }

    deliveredInRange.forEach((order) => {
      if (!order.deliveredAt) return;
      const key = order.deliveredAt.toISOString().slice(0, 10);
      if (!dailyMap[key]) {
        dailyMap[key] = { date: key, deliveries: 0, earnings: 0 };
      }
      dailyMap[key].deliveries += 1;
      dailyMap[key].earnings += courierProfile.paymentPerOrder;
    });

    const dailyEarnings = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const totalEarnings = deliveredInRange.length * courierProfile.paymentPerOrder;

    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({ hour, deliveries: 0 }));
    deliveredInRange.forEach((order) => {
      if (!order.deliveredAt) return;
      const hour = order.deliveredAt.getHours();
      hourlyDistribution[hour].deliveries += 1;
    });

    const weekdayMap: Record<number, { weekday: number; delivered: number; cancelled: number }> = {};
    for (let i = 0; i < 7; i += 1) {
      weekdayMap[i] = { weekday: i, delivered: 0, cancelled: 0 };
    }

    deliveredInRange.forEach((order) => {
      if (!order.deliveredAt) return;
      const day = order.deliveredAt.getDay();
      weekdayMap[day].delivered += 1;
    });

    cancelledInRange.forEach((order) => {
      const day = order.createdAt.getDay();
      weekdayMap[day].cancelled += 1;
    });

    const weekdayDistribution = Object.values(weekdayMap);

    const restaurantIds = Array.from(new Set(deliveredInRange.map((order) => order.restaurantId)));
    const restaurants = restaurantIds.length > 0
      ? await prisma.restaurant.findMany({
          where: { id: { in: restaurantIds } },
          select: { id: true, name: true }
        })
      : [];
    const restaurantNameById = new Map<string, string>(
      restaurants.map((restaurant: { id: string; name: string }) => [restaurant.id, restaurant.name])
    );

    const restaurantMap: Record<string, { restaurantName: string; deliveredCount: number; totalMinutes: number; averageMinutes: number }> = {};
    deliveredInRange.forEach((order) => {
      if (!order.deliveredAt || !order.assignedAt) return;
      const restaurantName = restaurantNameById.get(order.restaurantId) || 'Bilinmeyen';
      const duration = (order.deliveredAt.getTime() - order.assignedAt.getTime()) / 60000;
      if (!restaurantMap[restaurantName]) {
        restaurantMap[restaurantName] = { restaurantName, deliveredCount: 0, totalMinutes: 0, averageMinutes: 0 };
      }
      restaurantMap[restaurantName].deliveredCount += 1;
      restaurantMap[restaurantName].totalMinutes += duration;
      restaurantMap[restaurantName].averageMinutes = restaurantMap[restaurantName].totalMinutes / restaurantMap[restaurantName].deliveredCount;
    });

    const restaurantStats = Object.values(restaurantMap).sort((a, b) => b.deliveredCount - a.deliveredCount);

    const cancelReasonRows = await prisma.$queryRaw<Array<{ reason: string; count: bigint | number }>>`
      SELECT
        COALESCE(NULLIF(TRIM("cancelReason"), ''), 'Belirtilmedi') AS reason,
        COUNT(*)::bigint AS count
      FROM "orders"
      WHERE "courierId" = ${courierId}
        AND "status" = 'CANCELLED'
        AND COALESCE("cancelledAt", "createdAt") >= ${startDate}
      GROUP BY 1
      ORDER BY 2 DESC
    `;

    const cancelReasons = cancelReasonRows.map((row) => ({
      reason: row.reason,
      count: Number(row.count)
    }));

    res.json({
      courier: {
        id: courierProfile.user.id,
        name: courierProfile.user.name,
        email: courierProfile.user.email,
        paymentPerOrder: courierProfile.paymentPerOrder
      },
      summary: {
        totalAssigned,
        deliveredCount: deliveredInRange.length,
        cancelledCount: cancelledInRange.length,
        cancelRate,
        averageDeliveryMinutes,
        medianDeliveryMinutes,
        totalEarnings
      },
      dailyEarnings,
      hourlyDistribution,
      weekdayDistribution,
      restaurantStats,
      cancelReasons
    });
  } catch (error) {
    throw error;
  }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: !user.isActive
      }
    });

    res.json({
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser
    });
  } catch (error) {
    throw error;
  }
};

export const getSystemLogs = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { limit = '50' } = req.query;
    const limitNum = parseInt(limit as string);

    // Son siparişleri loglar olarak göster
    const recentOrders = await prisma.order.findMany({
      take: limitNum,
      include: {
        restaurant: {
          select: { name: true }
        },
        courier: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const logs = recentOrders.map((order: any) => ({
      id: order.id,
      type: 'ORDER',
      action: order.status,
      description: `Order ${order.orderNumber} - ${order.restaurant.name}`,
      timestamp: order.createdAt
    }));

    res.json({ logs });
  } catch (error) {
    throw error;
  }
};

export const getSystemSettings = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const settings = await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { courierAutoBusyAfterOrders: 4 }
    });

    res.json({ settings });
  } catch (error) {
    throw error;
  }
};

export const updateSystemSettings = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const validatedData = systemSettingsSchema.parse(req.body);

    const settings = await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: {
        courierAutoBusyAfterOrders: validatedData.courierAutoBusyAfterOrders
      },
      create: {
        courierAutoBusyAfterOrders: validatedData.courierAutoBusyAfterOrders
      }
    });

    res.json({
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
};

// Kurye oluşturma (Sadece admin)
export const createCourier = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { email, password, name, phone, vehicleType, paymentPerOrder } = req.body;

    // Validasyon
    if (!email || !password || !name || !phone || !vehicleType) {
      throw new AppError('All fields are required', 400);
    }

    // Email kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new AppError('Email already exists', 400);
    }

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, 10);

    // Transaction ile kullanıcı ve kurye profili oluştur
    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          role: 'COURIER'
        }
      });

      const courierProfile = await tx.courierProfile.create({
        data: {
          userId: user.id,
          vehicleType,
          isAvailable: true,
          paymentPerOrder: paymentPerOrder || 0
        }
      });

      return { user, courierProfile };
    });

    res.status(201).json({
      message: 'Courier created successfully',
      courier: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        phone: result.user.phone,
        vehicleType: result.courierProfile.vehicleType,
        isAvailable: result.courierProfile.isAvailable,
        paymentPerOrder: result.courierProfile.paymentPerOrder
      }
    });
  } catch (error) {
    throw error;
  }
};

// Kurye silme (Sadece admin)
export const deleteCourier = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { courierId } = req.params;

    // Kullanıcıyı kontrol et
    const user = await prisma.user.findUnique({
      where: { id: courierId },
      include: {
        courierProfile: true
      }
    });

    if (!user) {
      throw new AppError('Courier not found', 404);
    }

    if (user.role !== 'COURIER') {
      throw new AppError('User is not a courier', 400);
    }

    // Aktif siparişleri kontrol et
    const activeOrders = await prisma.order.count({
      where: {
        courierId: courierId,
        status: {
          in: ['ASSIGNED', 'PICKED_UP']
        }
      }
    });

    if (activeOrders > 0) {
      throw new AppError('Cannot delete courier with active orders', 400);
    }

    // Transaction ile kurye profili ve kullanıcıyı sil
    await prisma.$transaction(async (tx: any) => {
      // Önce kurye profili
      await tx.courierProfile.delete({
        where: { userId: courierId }
      });

      // Sonra kullanıcı
      await tx.user.delete({
        where: { id: courierId }
      });
    });

    res.json({
      message: 'Courier deleted successfully'
    });
  } catch (error) {
    throw error;
  }
};

// Kurye güncelleme (Sadece admin)
export const updateCourier = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { courierId } = req.params;
    const { name, phone, vehicleType, paymentPerOrder, isAvailable } = req.body;

    // Kullanıcıyı kontrol et
    const user = await prisma.user.findUnique({
      where: { id: courierId },
      include: {
        courierProfile: true
      }
    });

    if (!user) {
      throw new AppError('Courier not found', 404);
    }

    if (user.role !== 'COURIER') {
      throw new AppError('User is not a courier', 400);
    }

    // Transaction ile kullanıcı ve kurye profili güncelle
    const result = await prisma.$transaction(async (tx: any) => {
      // Kullanıcı bilgilerini güncelle
      const updatedUser = await tx.user.update({
        where: { id: courierId },
        data: {
          ...(name && { name }),
          ...(phone && { phone })
        }
      });

      // Kurye profili bilgilerini güncelle
      const updatedProfile = await tx.courierProfile.update({
        where: { userId: courierId },
        data: {
          ...(vehicleType && { vehicleType }),
          ...(paymentPerOrder !== undefined && { paymentPerOrder }),
          ...(isAvailable !== undefined && { isAvailable })
        }
      });

      return { user: updatedUser, profile: updatedProfile };
    });

    res.json({
      message: 'Courier updated successfully',
      courier: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        phone: result.user.phone,
        vehicleType: result.profile.vehicleType,
        isAvailable: result.profile.isAvailable,
        paymentPerOrder: result.profile.paymentPerOrder
      }
    });
  } catch (error) {
    throw error;
  }
};

// Restoran oluşturma (Sadece admin)
export const createRestaurant = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { email, password, name, phone, restaurantName, address, restaurantPhone, commissionPerOrder } = req.body;

    // Validasyon
    if (!email || !password || !name || !phone || !restaurantName || !address || !restaurantPhone) {
      throw new AppError('All fields are required', 400);
    }

    if (commissionPerOrder !== undefined && commissionPerOrder < 0) {
      throw new AppError('Commission per order must be a positive number', 400);
    }

    // Email kontrolü
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new AppError('Email already exists', 400);
    }

    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash(password, 10);

    // Transaction ile kullanıcı ve restoran profili oluştur
    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          role: 'RESTAURANT'
        }
      });

      const restaurant = await tx.restaurant.create({
        data: {
          userId: user.id,
          name: restaurantName,
          address,
          phone: restaurantPhone,
          commissionPerOrder: commissionPerOrder ?? 0 // Varsayılan komisyon (sipariş başına TL)
        }
      });

      return { user, restaurant };
    });

    res.status(201).json({
      message: 'Restaurant created successfully',
      restaurant: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        phone: result.user.phone,
        restaurantName: result.restaurant.name,
        restaurantAddress: result.restaurant.address,
        restaurantPhone: result.restaurant.phone,
        commissionPerOrder: result.restaurant.commissionPerOrder
      }
    });
  } catch (error) {
    throw error;
  }
};

// Restoran silme (Sadece admin)
export const deleteRestaurant = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { restaurantId } = req.params;

    // Restoranı bul
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    // Kullanıcıyı kontrol et
    const user = await prisma.user.findUnique({
      where: { id: restaurant.userId }
    });

    if (!user || user.role !== 'RESTAURANT') {
      throw new AppError('User is not a restaurant', 400);
    }

    // Aktif siparişleri kontrol et
    const activeOrders = await prisma.order.count({
      where: {
        restaurantId: restaurantId,
        status: {
          in: ['PENDING', 'ASSIGNED', 'PICKED_UP']
        }
      }
    });

    if (activeOrders > 0) {
      throw new AppError('Cannot delete restaurant with active orders', 400);
    }

    // Transaction ile restoran ve kullanıcıyı sil
    await prisma.$transaction(async (tx: any) => {
      // Siparişleri sil (eğer varsa)
      await tx.order.deleteMany({
        where: { restaurantId: restaurantId }
      });

      // Finansal işlemleri sil
      await tx.financialTransaction.deleteMany({
        where: { restaurantId: restaurantId }
      });

      // Restoranı sil
      await tx.restaurant.delete({
        where: { id: restaurantId }
      });

      // Kullanıcıyı sil
      await tx.user.delete({
        where: { id: restaurant.userId }
      });
    });

    res.json({
      message: 'Restaurant deleted successfully'
    });
  } catch (error) {
    throw error;
  }
};

// Restoran finansal raporu
export const getRestaurantFinancialReport = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // Sadece admin erişebilir
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { restaurantId } = req.params;
    const { period = 'daily' } = req.query; // daily, weekly, monthly

    // Restoran kontrolü
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { user: true }
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    // Tarih hesaplamaları
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    // Tamamlanan siparişler
    const completedOrders = await prisma.order.findMany({
      where: {
        restaurantId: restaurantId,
        status: 'DELIVERED',
        deliveredAt: {
          gte: startDate,
          lte: now
        }
      },
      include: {
        courier: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        deliveredAt: 'desc'
      }
    });

    // Finansal özet
    const totalRevenue = completedOrders.reduce((sum: number, order: any) => sum + order.orderAmount, 0);
    const totalCommission = completedOrders.reduce((sum: number, order: any) => sum + order.commissionAmount, 0);
    const netIncome = totalRevenue - totalCommission; // Restorana verilecek para

    // Günlük bazda gruplama
    const dailyStats: { [key: string]: any } = {};
    
    completedOrders.forEach((order: any) => {
      const date = order.deliveredAt ? new Date(order.deliveredAt).toISOString().split('T')[0] : '';
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          orderCount: 0,
          revenue: 0,
          commission: 0,
          netIncome: 0
        };
      }
      dailyStats[date].orderCount++;
      dailyStats[date].revenue += order.orderAmount;
      dailyStats[date].commission += order.commissionAmount;
      dailyStats[date].netIncome += (order.orderAmount - order.commissionAmount);
    });

    res.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        commissionPerOrder: restaurant.commissionPerOrder,
        owner: {
          name: restaurant.user.name,
          email: restaurant.user.email
        }
      },
      period,
      dateRange: {
        start: startDate,
        end: now
      },
      summary: {
        totalOrders: completedOrders.length,
        totalRevenue,
        totalCommission,
        netIncome
      },
      dailyStats: Object.values(dailyStats),
      orders: completedOrders
    });
  } catch (error) {
    throw error;
  }
};

// Restoran komisyon oranını güncelle
export const updateRestaurantCommission = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // Sadece admin erişebilir
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { restaurantId } = req.params;
    const { commissionPerOrder } = req.body;

    // Validasyon
    if (commissionPerOrder === undefined || commissionPerOrder < 0) {
      throw new AppError('Commission per order must be a positive number', 400);
    }

    // Restoran kontrolü
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId }
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    // Komisyon oranını güncelle
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { commissionPerOrder },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: 'Commission per order updated successfully',
      restaurant: updatedRestaurant
    });
  } catch (error) {
    throw error;
  }
};

// Tüm restoranları komisyon oranlarıyla listele
export const getAllRestaurants = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // Sadece admin erişebilir
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const restaurants = await prisma.restaurant.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Bugünün başlangıcı
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Bugün tüm restoranların toplam geliri
    const todayTotalRevenue = await prisma.order.aggregate({
      where: {
        status: 'DELIVERED',
        deliveredAt: {
          gte: today,
          lt: tomorrow
        }
      },
      _sum: {
        orderAmount: true
      }
    });

    res.json({
      count: restaurants.length,
      todayTotalRevenue: todayTotalRevenue._sum.orderAmount || 0,
      restaurants: restaurants.map((restaurant: any) => ({
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
        commissionPerOrder: restaurant.commissionPerOrder ?? 0,
        totalOrders: restaurant._count.orders,
        user: restaurant.user,
        createdAt: restaurant.createdAt
      }))
    });
  } catch (error) {
    throw error;
  }
};

export const getCourierSettlementClosings = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { startDate, endDate, courierId, restaurantId, limit = '200' } = req.query;
    const take = Math.min(Math.max(parseInt(limit as string, 10) || 200, 1), 500);

    const whereClause: any = {
      transactionType: 'COURIER_SETTLEMENT'
    };

    if (restaurantId) {
      whereClause.restaurantId = restaurantId;
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

    if (courierId) {
      whereClause.description = {
        contains: `courier:${courierId}|`
      };
    }

    const transactions = await prisma.financialTransaction.findMany({
      where: whereClause,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { date: 'desc' },
      take
    });

    const parsedRows = transactions.map((transaction: any) => {
      const description = transaction.description || '';
      const courierMatch = description.match(/courier:([^|]+)/);
      const dayMatch = description.match(/date:([^|]+)/);
      const packageMatch = description.match(/packages:(\d+)/);

      return {
        transaction,
        courierId: courierMatch?.[1] || null,
        dayKey: dayMatch?.[1] || null,
        packageCount: packageMatch ? parseInt(packageMatch[1], 10) : null
      };
    });

    const courierIds = Array.from(
      new Set(parsedRows.map((row) => row.courierId).filter(Boolean))
    ) as string[];

    const courierUsers = courierIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: {
              in: courierIds
            }
          },
          select: {
            id: true,
            name: true,
            email: true
          }
        })
      : [];

    const courierMap = new Map(courierUsers.map((courier) => [courier.id, courier]));

    const settlements = parsedRows.map((row) => ({
      id: row.transaction.id,
      amount: row.transaction.amount,
      date: row.transaction.date,
      dayKey: row.dayKey,
      packageCount: row.packageCount,
      restaurant: row.transaction.restaurant,
      courier: row.courierId
        ? (courierMap.get(row.courierId) || { id: row.courierId, name: 'Kurye', email: '' })
        : null
    }));

    const summary = {
      totalRecords: settlements.length,
      totalClosedAmount: settlements.reduce((sum, item) => sum + item.amount, 0),
      startDate: startDate || null,
      endDate: endDate || null
    };

    res.json({
      summary,
      settlements
    });
  } catch (error) {
    throw error;
  }
};
