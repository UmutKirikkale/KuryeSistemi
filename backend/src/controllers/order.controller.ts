import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { emitEvent } from '../realtime';

const createOrderSchema = z.object({
  pickupAddress: z.string(),
  deliveryAddress: z.string(),
  pickupLatitude: z.number(),
  pickupLongitude: z.number(),
  deliveryLatitude: z.number(),
  deliveryLongitude: z.number(),
  orderAmount: z.number().positive(),
  customerName: z.string(),
  customerPhone: z.string(),
  notes: z.string().optional()
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'PREPARING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED']),
  paymentMethod: z.enum(['CASH', 'CARD']).optional(),
  cancelReason: z.string().min(2).max(200).optional()
});

const restaurantStatusTransitions: Record<string, string[]> = {
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['DELIVERED']
};

const courierStatusTransitions: Record<string, string[]> = {
  ASSIGNED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['DELIVERED', 'CANCELLED']
};

const isTransitionAllowed = (
  fromStatus: string,
  toStatus: string,
  transitions: Record<string, string[]>
) => {
  if (fromStatus === toStatus) {
    return true;
  }

  return (transitions[fromStatus] || []).includes(toStatus);
};

const getSystemSettings = async () => {
  return prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { courierAutoBusyAfterOrders: 4 }
  });
};

const syncCourierAvailability = async (courierUserId: string) => {
  const settings = await getSystemSettings();
  const threshold = settings.courierAutoBusyAfterOrders;

  if (threshold <= 0) {
    return;
  }

  const courierProfile = await prisma.courierProfile.findUnique({
    where: { userId: courierUserId }
  });

  if (!courierProfile) {
    return;
  }

  const activeOrdersCount = await prisma.order.count({
    where: {
      courierId: courierUserId,
      status: {
        in: ['ASSIGNED', 'PICKED_UP']
      }
    }
  });

  const shouldBeAvailable = activeOrdersCount < threshold;

  if (courierProfile.isAvailable !== shouldBeAvailable) {
    await prisma.courierProfile.update({
      where: { id: courierProfile.id },
      data: { isAvailable: shouldBeAvailable }
    });

    await prisma.courierAvailabilityEvent.create({
      data: {
        courierId: courierProfile.id,
        isAvailable: shouldBeAvailable
      }
    });
  }
};

export const createOrder = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const validatedData = createOrderSchema.parse(req.body);

    // Sadece restoran siparişoluşturabilir
    if (req.userRole !== 'RESTAURANT') {
      throw new AppError('Only restaurants can create orders', 403);
    }

    // Restoranı bul
    const restaurant = await prisma.restaurant.findFirst({
      where: { userId: req.userId }
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    // Sipariş numarası oluştur
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Kurye ücreti artık kullanılmıyor (sadece commission kullanıyoruz)
    const courierFee = 0;

    // Komisyon hesapla (sabit tutar)
    const commissionAmount = restaurant.commissionPerOrder;

    // Siparişi oluştur
    const order = await prisma.order.create({
      data: {
        orderNumber,
        restaurantId: restaurant.id,
        ...validatedData,
        courierFee,
        commissionAmount,
        status: 'PENDING'
      }
    });

    // WebSocket ile bildirim gönder (tüm kuryelere)
    emitEvent('order:new', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      pickupAddress: order.pickupAddress,
      deliveryAddress: order.deliveryAddress,
      commissionAmount: order.commissionAmount
    });

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
};

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let whereClause: any = {};

    // Rol bazlı filtreleme
    if (req.userRole === 'RESTAURANT') {
      const restaurant = await prisma.restaurant.findFirst({
        where: { userId: req.userId }
      });
      if (!restaurant) {
        throw new AppError('Restaurant not found', 404);
      }
      whereClause.restaurantId = restaurant.id;
    } else if (req.userRole === 'COURIER') {
      whereClause.OR = [
        { courierId: req.userId },
        { status: 'PENDING' } // Bekleyen siparişleri göster
      ];
    }

    // Durum filtresi
    if (status) {
      whereClause.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              latitude: true,
              longitude: true
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.order.count({ where: whereClause })
    ]);

    res.json({
      orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    throw error;
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        restaurant: true,
        courier: {
          select: {
            id: true,
            name: true,
            phone: true,
            courierProfile: true
          }
        }
      }
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Yetki kontrolü
    if (req.userRole === 'RESTAURANT') {
      const restaurant = await prisma.restaurant.findFirst({
        where: { userId: req.userId }
      });
      if (order.restaurantId !== restaurant?.id) {
        throw new AppError('Access denied', 403);
      }
    } else if (req.userRole === 'COURIER' && order.courierId !== req.userId) {
      throw new AppError('Access denied', 403);
    }

    res.json({ order });
  } catch (error) {
    throw error;
  }
};

export const assignOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Sadece kurye kendine atayabilir
    if (req.userRole !== 'COURIER') {
      throw new AppError('Only couriers can assign orders', 403);
    }

    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (!['PENDING', 'APPROVED', 'PREPARING'].includes(order.status)) {
      throw new AppError('Order is not available', 400);
    }

    // Siparişi kuryeye ata
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        courierId: req.userId,
        status: 'ASSIGNED',
        assignedAt: new Date()
      },
      include: {
        restaurant: true,
        courier: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });

    // WebSocket bildirimi
    emitEvent('order:status:update', {
      orderId: updatedOrder.id,
      status: 'ASSIGNED',
      courier: updatedOrder.courier
    });

    await prisma.customerOrder.updateMany({
      where: { orderNumber: updatedOrder.orderNumber },
      data: { status: 'ASSIGNED' }
    });

    await syncCourierAvailability(req.userId as string);

    res.json({
      message: 'Order assigned successfully',
      order: updatedOrder
    });
  } catch (error) {
    throw error;
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const validatedData = updateOrderStatusSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Yetki kontrolü
    if (req.userRole === 'COURIER' && order.courierId !== req.userId) {
      throw new AppError('Access denied', 403);
    }

    if (req.userRole === 'RESTAURANT') {
      const restaurant = await prisma.restaurant.findFirst({
        where: { userId: req.userId }
      });

      if (!restaurant || restaurant.id !== order.restaurantId) {
        throw new AppError('Access denied', 403);
      }

      if (!isTransitionAllowed(order.status, validatedData.status, restaurantStatusTransitions)) {
        throw new AppError('Invalid status flow for restaurant', 400);
      }
    }

    if (req.userRole === 'COURIER') {
      if (!isTransitionAllowed(order.status, validatedData.status, courierStatusTransitions)) {
        throw new AppError('Invalid status flow for courier', 400);
      }
    }

    if (validatedData.status === 'DELIVERED' && !validatedData.paymentMethod) {
      throw new AppError('Payment method is required before delivery', 400);
    }

    const updateData: any = {
      status: validatedData.status
    };

    // Durum bazlı zaman damgaları
    if (validatedData.status === 'PICKED_UP') {
      updateData.pickedUpAt = new Date();
    } else if (validatedData.status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
      updateData.paymentMethod = validatedData.paymentMethod;

      // Finansal işlemleri oluştur
      await prisma.$transaction([
        // Restoran kazancı
        prisma.financialTransaction.create({
          data: {
            restaurantId: order.restaurantId,
            orderId: order.id,
            transactionType: 'EARNING',
            amount: order.orderAmount,
            description: `Sipariş geliri - ${order.orderNumber}`
          }
        }),
        // Kurye ücreti (restorandan düş)
        prisma.financialTransaction.create({
          data: {
            restaurantId: order.restaurantId,
            orderId: order.id,
            transactionType: 'COURIER_FEE',
            amount: -order.courierFee,
            description: `Kurye ücreti - ${order.orderNumber}`
          }
        }),
        // Komisyon (varsa)
        ...(order.commissionAmount > 0 ? [
          prisma.financialTransaction.create({
            data: {
              restaurantId: order.restaurantId,
              orderId: order.id,
              transactionType: 'COMMISSION',
              amount: -order.commissionAmount,
              description: `Sistem komisyonu - ${order.orderNumber}`
            }
          })
        ] : [])
      ]);
    } else if (validatedData.status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
      if (validatedData.cancelReason) {
        updateData.cancelReason = validatedData.cancelReason;
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        restaurant: true,
        courier: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });

    await prisma.customerOrder.updateMany({
      where: { orderNumber: updatedOrder.orderNumber },
      data: { status: updatedOrder.status }
    });

    if (order.courierId) {
      await syncCourierAvailability(order.courierId);
    }

    // WebSocket bildirimi
    emitEvent('order:status:update', {
      orderId: updatedOrder.id,
      status: updatedOrder.status,
      timestamp: new Date()
    });

    res.json({
      message: 'Order status updated successfully',
      order: updatedOrder
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
};
