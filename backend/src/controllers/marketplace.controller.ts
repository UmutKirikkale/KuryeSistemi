import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { emitEvent } from '../realtime';
import { z } from 'zod';

const createMarketplaceOrderSchema = z.object({
  restaurantId: z.string().uuid(),
  savedAddressId: z.string().uuid(),
  notes: z.string().optional(),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    quantity: z.number().int().min(1).max(50)
  })).min(1)
});

const orderRatingSchema = z.object({
  speedScore: z.number().int().min(1).max(10),
  tasteScore: z.number().int().min(1).max(10),
  priceScore: z.number().int().min(1).max(10)
});

export const listMarketplaceRestaurants = async (_req: Request, res: Response): Promise<any> => {
  const restaurants = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    address: string;
    phone: string;
    latitude: number | null;
    longitude: number | null;
    availableMenuItemCount: bigint | number;
  }>>`
    SELECT
      r."id",
      r."name",
      r."address",
      r."phone",
      r."latitude",
      r."longitude",
      COUNT(mi."id")::bigint AS "availableMenuItemCount"
    FROM "restaurants" r
    LEFT JOIN "menu_items" mi
      ON mi."restaurantId" = r."id"
     AND mi."isAvailable" = true
    GROUP BY r."id", r."name", r."address", r."phone", r."latitude", r."longitude"
    ORDER BY r."name" ASC
  `;

  res.json({
    restaurants: restaurants.map((restaurant) => ({
      ...restaurant,
      availableMenuItemCount: Number(restaurant.availableMenuItemCount)
    }))
  });
};

export const getMarketplaceRestaurantMenu = async (req: Request, res: Response): Promise<any> => {
  const { restaurantId } = req.params;

  const restaurantRows = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    address: string;
    phone: string;
  }>>`
    SELECT "id", "name", "address", "phone"
    FROM "restaurants"
    WHERE "id"::uuid = ${restaurantId}::uuid
    LIMIT 1
  `;

  const restaurant = restaurantRows[0];

  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  const categories = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    sortOrder: number;
  }>>`
    SELECT "id", "name", "sortOrder"
    FROM "menu_categories"
    WHERE "restaurantId"::uuid = ${restaurantId}::uuid
    ORDER BY "sortOrder" ASC, "name" ASC
  `;

  const items = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    isAvailable: boolean;
    sortOrder: number;
    categoryId: string | null;
  }>>`
    SELECT "id", "name", "description", "price", "imageUrl", "isAvailable", "sortOrder", "categoryId"
    FROM "menu_items"
    WHERE "restaurantId"::uuid = ${restaurantId}::uuid
      AND "isAvailable" = true
    ORDER BY "sortOrder" ASC, "name" ASC
  `;

  const categoriesWithItems = categories.map((category) => ({
    ...category,
    menuItems: items
      .filter((item) => item.categoryId === category.id)
      .map(({ categoryId: _categoryId, sortOrder: _sortOrder, ...rest }) => rest)
  }));

  const uncategorizedItems = items
    .filter((item) => item.categoryId === null)
    .map(({ categoryId: _categoryId, sortOrder: _sortOrder, ...rest }) => rest);

  res.json({
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      phone: restaurant.phone
    },
    categories: categoriesWithItems,
    uncategorizedItems
  });
};

export const createMarketplaceOrder = async (req: Request, res: Response): Promise<any> => {
  const customerId = (req as any).customerId;

  if (!customerId) {
    throw new AppError('Müşteri girişi gerekli', 401);
  }

  const parsedPayload = createMarketplaceOrderSchema.safeParse(req.body);
  if (!parsedPayload.success) {
    console.error('Validation error:', parsedPayload.error.errors);
    throw new AppError(`Invalid checkout data: ${JSON.stringify(parsedPayload.error.errors)}`, 400);
  }
  const validatedData = parsedPayload.data;

  // Müşterinin kayıtlı adresini kontrol et
  const savedAddress = await prisma.savedAddress.findFirst({
    where: {
      id: validatedData.savedAddressId,
      customerId
    }
  });

  if (!savedAddress) {
    throw new AppError('Seçilen adres bulunamadı', 404);
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });

  if (!customer) {
    throw new AppError('Müşteri bulunamadı', 404);
  }

  const restaurantRows = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    commissionPerOrder: number;
  }>>`
    SELECT "id", "name", "address", "latitude", "longitude", "commissionPerOrder"
    FROM "restaurants"
    WHERE "id"::uuid = ${validatedData.restaurantId}::uuid
    LIMIT 1
  `;

  const restaurant = restaurantRows[0];

  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  // Eğer restaurant location'ı yoksa, KKTC merkezi (Lefkoşa) default location'ını kullan
  const restaurantLatitude = restaurant.latitude ?? 35.185566; // Lefkoşa merkez
  const restaurantLongitude = restaurant.longitude ?? 33.382276; // Lefkoşa merkez

  if (!restaurantLatitude || !restaurantLongitude) {
    // Eğer hala null ise, location'ı kaydet
    await prisma.restaurant.update({
      where: { id: validatedData.restaurantId },
      data: {
        latitude: restaurantLatitude,
        longitude: restaurantLongitude
      }
    });
  }

  const requestedIds = [...new Set(validatedData.items.map((item) => item.menuItemId))];
  const menuItems = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    price: number;
  }>>`
    SELECT "id", "name", "price"
    FROM "menu_items"
    WHERE "restaurantId"::uuid = ${validatedData.restaurantId}::uuid
      AND "isAvailable" = true
      AND "id"::uuid = ANY(${requestedIds}::uuid[])
  `;

  const menuById = new Map(menuItems.map((item) => [item.id, item]));

  const missingItem = validatedData.items.find((item) => !menuById.has(item.menuItemId));
  if (missingItem) {
    throw new AppError('Some selected products are no longer available', 400);
  }

  const orderItems = validatedData.items.map((item) => {
    const product = menuById.get(item.menuItemId)!;
    return {
      name: product.name,
      price: product.price,
      quantity: item.quantity,
      lineTotal: product.price * item.quantity
    };
  });

  const orderAmount = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);

  const orderNumber = `MKT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const notesLines = orderItems.map((item) => `${item.quantity}x ${item.name} - ${item.lineTotal.toFixed(2)} TL`);
  const finalNotes = [
    'Musteri Siparisi',
    ...notesLines,
    `Ara Toplam: ${orderAmount.toFixed(2)} TL`,
    validatedData.notes ? `Not: ${validatedData.notes}` : ''
  ].filter(Boolean).join('\n');

  const [customerOrder, restaurantOrder] = await prisma.$transaction([
    prisma.customerOrder.create({
      data: {
        orderNumber,
        status: 'PENDING',
        customerId,
        restaurantId: validatedData.restaurantId,
        pickupAddress: restaurant.address,
        pickupLatitude: restaurantLatitude,
        pickupLongitude: restaurantLongitude,
        deliveryAddress: savedAddress.address,
        deliveryLatitude: savedAddress.latitude,
        deliveryLongitude: savedAddress.longitude,
        orderAmount,
        courierFee: 0,
        commissionAmount: restaurant.commissionPerOrder,
        notes: finalNotes
      }
    }),
    prisma.order.create({
      data: {
        orderNumber,
        status: 'PENDING',
        restaurantId: validatedData.restaurantId,
        pickupAddress: restaurant.address,
        pickupLatitude: restaurantLatitude,
        pickupLongitude: restaurantLongitude,
        deliveryAddress: savedAddress.address,
        deliveryLatitude: savedAddress.latitude,
        deliveryLongitude: savedAddress.longitude,
        orderAmount,
        courierFee: 0,
        commissionAmount: restaurant.commissionPerOrder,
        customerName: customer.name,
        customerPhone: customer.phone,
        notes: finalNotes
      }
    })
  ]);

  emitEvent('order:new', {
    orderId: restaurantOrder.id,
    orderNumber: restaurantOrder.orderNumber,
    pickupAddress: restaurantOrder.pickupAddress,
    deliveryAddress: restaurantOrder.deliveryAddress,
    commissionAmount: restaurantOrder.commissionAmount
  });

  res.status(201).json({
    message: 'Order created successfully',
    order: {
      id: customerOrder.id,
      orderNumber: customerOrder.orderNumber,
      restaurantName: restaurant.name,
      orderAmount: customerOrder.orderAmount
    }
  });
};

export const getMarketplaceOrderStatus = async (req: Request, res: Response): Promise<any> => {
  const { orderNumber } = req.params;

  const orders = await prisma.$queryRaw<Array<{
    id: string;
    orderNumber: string;
    status: string;
    restaurantId: string;
    pickupAddress: string;
    deliveryAddress: string;
    orderAmount: number;
    customerName: string;
    customerPhone: string;
    notes: string | null;
    createdAt: Date;
    courierId: string | null;
  }>>`
    SELECT
      "id", "orderNumber", "status", "restaurantId",
      "pickupAddress", "deliveryAddress", "orderAmount",
      "customerName", "customerPhone", "notes",
      "createdAt", "courierId"
    FROM "orders"
    WHERE "orderNumber" = ${orderNumber}
    LIMIT 1
  `;

  const order = orders[0];

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  const restaurantRows = await prisma.$queryRaw<Array<{
    name: string;
    phone: string;
  }>>`
    SELECT "name", "phone"
    FROM "restaurants"
    WHERE "id"::uuid = ${order.restaurantId}::uuid
    LIMIT 1
  `;

  const restaurant = restaurantRows[0];

  let courierInfo = null;
  if (order.courierId) {
    const courierRows = await prisma.$queryRaw<Array<{
      name: string;
      phone: string;
    }>>`
      SELECT "name", "phone"
      FROM "couriers"
      WHERE "id"::uuid = ${order.courierId}::uuid
      LIMIT 1
    `;
    const courier = courierRows[0];
    if (courier) {
      courierInfo = {
        name: courier.name,
        phone: courier.phone
      };
    }
  }

  res.json({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      orderAmount: order.orderAmount,
      createdAt: order.createdAt,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      notes: order.notes,
      pickup: {
        address: order.pickupAddress,
        restaurant: restaurant ? restaurant.name : 'Unknown'
      },
      delivery: {
        address: order.deliveryAddress
      },
      courier: courierInfo
    }
  });
};

export const getMarketplaceOrderRating = async (req: Request, res: Response): Promise<any> => {
  const customerId = (req as any).customerId;
  const { orderNumber } = req.params;

  if (!customerId) {
    throw new AppError('Müşteri girişi gerekli', 401);
  }

  const customerOrder = await prisma.customerOrder.findFirst({
    where: {
      orderNumber,
      customerId
    }
  });

  if (!customerOrder) {
    throw new AppError('Sipariş bulunamadı', 404);
  }

  const rating = await prisma.restaurantRating.findUnique({
    where: { customerOrderId: customerOrder.id }
  });

  res.json({ rating });
};

export const submitMarketplaceOrderRating = async (req: Request, res: Response): Promise<any> => {
  const customerId = (req as any).customerId;
  const { orderNumber } = req.params;

  if (!customerId) {
    throw new AppError('Müşteri girişi gerekli', 401);
  }

  const parsedPayload = orderRatingSchema.safeParse(req.body);
  if (!parsedPayload.success) {
    throw new AppError('Invalid rating data', 400);
  }

  const customerOrder = await prisma.customerOrder.findFirst({
    where: {
      orderNumber,
      customerId
    }
  });

  if (!customerOrder) {
    throw new AppError('Sipariş bulunamadı', 404);
  }

  const order = await prisma.order.findFirst({
    where: { orderNumber }
  });

  if (!order || order.status !== 'DELIVERED') {
    throw new AppError('Sipariş teslim edilmeden puanlanamaz', 400);
  }

  const existingRating = await prisma.restaurantRating.findUnique({
    where: { customerOrderId: customerOrder.id }
  });

  if (existingRating) {
    throw new AppError('Bu siparis zaten puanlandi', 400);
  }

  const rating = await prisma.restaurantRating.create({
    data: {
      customerOrderId: customerOrder.id,
      customerId,
      restaurantId: customerOrder.restaurantId,
      speedScore: parsedPayload.data.speedScore,
      tasteScore: parsedPayload.data.tasteScore,
      priceScore: parsedPayload.data.priceScore
    }
  });

  res.status(201).json({ rating });
};
