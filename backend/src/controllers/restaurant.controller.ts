import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { randomUUID } from 'crypto';

interface RestaurantMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
  categoryId: string | null;
}

const updateLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number()
});

const createCategorySchema = z.object({
  name: z.string().min(2),
  sortOrder: z.number().int().min(0).optional()
});

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  sortOrder: z.number().int().min(0).optional()
});

const createMenuItemSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  categoryId: z.string().uuid().nullable().optional()
});

const updateMenuItemSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  imageUrl: z.string().url().nullable().optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  categoryId: z.string().uuid().nullable().optional()
});

const getRestaurantByUser = async (userId?: string) => {
  const restaurant = await prisma.restaurant.findFirst({
    where: { userId }
  });

  if (!restaurant) {
    throw new AppError('Restaurant not found', 404);
  }

  return restaurant;
};

// Restoran kendi konumunu günceller
export const updateRestaurantLocation = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    // Sadece restoran kendi konumunu güncelleyebilir
    if (req.userRole !== 'RESTAURANT') {
      throw new AppError('Access denied', 403);
    }

    const validatedData = updateLocationSchema.parse(req.body);

    // Restoranı bul
    const restaurant = await prisma.restaurant.findFirst({
      where: { userId: req.userId }
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    // Konumu güncelle
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        latitude: validatedData.latitude,
        longitude: validatedData.longitude
      }
    });

    res.json({
      message: 'Restaurant location updated successfully',
      restaurant: updatedRestaurant
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
};

// Restoran kendi bilgilerini getirir
export const getRestaurantProfile = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'RESTAURANT') {
      throw new AppError('Access denied', 403);
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { userId: req.userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    res.json({ restaurant });
  } catch (error) {
    throw error;
  }
};

// Restoran kendi kuryelerinin konumlarını görür (aktif siparişlerdeki kuryeler)
export const getRestaurantCourierLocations = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'RESTAURANT') {
      throw new AppError('Access denied', 403);
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: { userId: req.userId }
    });

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    // Restoranın aktif siparişlerindeki kuryeleri bul
    const activeOrders = await prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        status: {
          in: ['ASSIGNED', 'PICKED_UP']
        },
        courierId: {
          not: null
        }
      },
      include: {
        courier: {
          include: {
            courierProfile: true
          }
        }
      }
    });

    // Kurye konumlarını topla
    const courierLocations = activeOrders
      .filter(order => order.courier?.courierProfile)
      .map(order => ({
        courierId: order.courierId,
        courierName: order.courier?.name,
        latitude: order.courier?.courierProfile?.currentLatitude,
        longitude: order.courier?.courierProfile?.currentLongitude,
        vehicleType: order.courier?.courierProfile?.vehicleType,
        lastUpdate: order.courier?.courierProfile?.lastLocationUpdate,
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.status
      }))
      .filter(loc => loc.latitude && loc.longitude);

    res.json({
      courierLocations
    });
  } catch (error) {
    throw error;
  }
};

export const getRestaurantMenu = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'RESTAURANT') {
      throw new AppError('Access denied', 403);
    }

    const restaurant = await getRestaurantByUser(req.userId);

    const categories = await prisma.$queryRaw<Array<{ id: string; name: string; sortOrder: number }>>`
      SELECT "id", "name", "sortOrder"
      FROM "menu_categories"
      WHERE "restaurantId" = ${restaurant.id}
      ORDER BY "sortOrder" ASC, "name" ASC
    `;

    const items = await prisma.$queryRaw<Array<RestaurantMenuItem>>`
      SELECT "id", "name", "description", "price", "imageUrl", "isAvailable", "sortOrder", "categoryId"
      FROM "menu_items"
      WHERE "restaurantId" = ${restaurant.id}
      ORDER BY "sortOrder" ASC, "name" ASC
    `;

    const categoriesWithItems = categories.map((category) => ({
      ...category,
      menuItems: items.filter((item) => item.categoryId === category.id)
    }));

    const uncategorizedItems = items.filter((item) => item.categoryId === null);

    res.json({ categories: categoriesWithItems, uncategorizedItems });
  } catch (error) {
    throw error;
  }
};

export const createRestaurantMenuCategory = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'RESTAURANT') {
      throw new AppError('Access denied', 403);
    }

    const validatedData = createCategorySchema.parse(req.body);
    const restaurant = await getRestaurantByUser(req.userId);
    const categoryId = randomUUID();

    const rows = await prisma.$queryRaw<Array<{ id: string; name: string; sortOrder: number }>>`
      INSERT INTO "menu_categories" ("id", "name", "sortOrder", "restaurantId", "createdAt", "updatedAt")
      VALUES (${categoryId}, ${validatedData.name}, ${validatedData.sortOrder ?? 0}, ${restaurant.id}, NOW(), NOW())
      RETURNING "id", "name", "sortOrder"
    `;

    const category = rows[0];

    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
};

export const updateRestaurantMenuCategory = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'RESTAURANT') {
      throw new AppError('Access denied', 403);
    }

    const { categoryId } = req.params;
    const validatedData = updateCategorySchema.parse(req.body);
    const restaurant = await getRestaurantByUser(req.userId);

    const categoryRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "menu_categories"
      WHERE "id" = ${categoryId}
        AND "restaurantId" = ${restaurant.id}
      LIMIT 1
    `;

    if (!categoryRows[0]) {
      throw new AppError('Category not found', 404);
    }

    const updatedRows = await prisma.$queryRaw<Array<{ id: string; name: string; sortOrder: number }>>`
      UPDATE "menu_categories"
      SET
        "name" = COALESCE(${validatedData.name ?? null}, "name"),
        "sortOrder" = COALESCE(${validatedData.sortOrder ?? null}, "sortOrder"),
        "updatedAt" = NOW()
      WHERE "id" = ${categoryId}
      RETURNING "id", "name", "sortOrder"
    `;

    const updatedCategory = updatedRows[0];

    res.json({ message: 'Category updated successfully', category: updatedCategory });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
};

export const deleteRestaurantMenuCategory = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'RESTAURANT') {
      throw new AppError('Access denied', 403);
    }

    const { categoryId } = req.params;
    const restaurant = await getRestaurantByUser(req.userId);

    const categoryRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "menu_categories"
      WHERE "id" = ${categoryId}
        AND "restaurantId" = ${restaurant.id}
      LIMIT 1
    `;

    if (!categoryRows[0]) {
      throw new AppError('Category not found', 404);
    }

    await prisma.$executeRaw`
      DELETE FROM "menu_categories"
      WHERE "id" = ${categoryId}
    `;

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    throw error;
  }
};

export const createRestaurantMenuItem = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'RESTAURANT') {
      throw new AppError('Access denied', 403);
    }

    const validatedData = createMenuItemSchema.parse(req.body);
    const restaurant = await getRestaurantByUser(req.userId);
    const itemId = randomUUID();

    if (validatedData.categoryId) {
      const categoryRows = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "menu_categories"
        WHERE "id" = ${validatedData.categoryId}
          AND "restaurantId" = ${restaurant.id}
        LIMIT 1
      `;

      if (!categoryRows[0]) {
        throw new AppError('Category not found', 404);
      }
    }

    const rows = await prisma.$queryRaw<Array<RestaurantMenuItem>>`
      INSERT INTO "menu_items" (
        "id", "restaurantId", "name", "description", "price", "imageUrl", "isAvailable", "sortOrder", "categoryId", "createdAt", "updatedAt"
      )
      VALUES (
        ${itemId},
        ${restaurant.id},
        ${validatedData.name},
        ${validatedData.description ?? null},
        ${validatedData.price},
        ${validatedData.imageUrl ?? null},
        ${validatedData.isAvailable ?? true},
        ${validatedData.sortOrder ?? 0},
        ${validatedData.categoryId ?? null},
        NOW(),
        NOW()
      )
      RETURNING "id", "name", "description", "price", "imageUrl", "isAvailable", "sortOrder", "categoryId"
    `;

    const menuItem = rows[0];

    res.status(201).json({ message: 'Menu item created successfully', menuItem });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
};

export const updateRestaurantMenuItem = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'RESTAURANT') {
      throw new AppError('Access denied', 403);
    }

    const { itemId } = req.params;
    const validatedData = updateMenuItemSchema.parse(req.body);
    const restaurant = await getRestaurantByUser(req.userId);

    const existingRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "menu_items"
      WHERE "id" = ${itemId}
        AND "restaurantId" = ${restaurant.id}
      LIMIT 1
    `;

    if (!existingRows[0]) {
      throw new AppError('Menu item not found', 404);
    }

    if (validatedData.categoryId) {
      const categoryRows = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "menu_categories"
        WHERE "id" = ${validatedData.categoryId}
          AND "restaurantId" = ${restaurant.id}
        LIMIT 1
      `;

      if (!categoryRows[0]) {
        throw new AppError('Category not found', 404);
      }
    }

    const updatedRows = await prisma.$queryRaw<Array<RestaurantMenuItem>>`
      UPDATE "menu_items"
      SET
        "name" = COALESCE(${validatedData.name ?? null}, "name"),
        "description" = COALESCE(${validatedData.description ?? null}, "description"),
        "price" = COALESCE(${validatedData.price ?? null}, "price"),
        "imageUrl" = COALESCE(${validatedData.imageUrl ?? null}, "imageUrl"),
        "isAvailable" = COALESCE(${validatedData.isAvailable ?? null}, "isAvailable"),
        "sortOrder" = COALESCE(${validatedData.sortOrder ?? null}, "sortOrder"),
        "categoryId" = CASE
          WHEN ${validatedData.categoryId === undefined} THEN "categoryId"
          ELSE ${validatedData.categoryId ?? null}
        END,
        "updatedAt" = NOW()
      WHERE "id" = ${itemId}
      RETURNING "id", "name", "description", "price", "imageUrl", "isAvailable", "sortOrder", "categoryId"
    `;

    const updatedItem = updatedRows[0];

    res.json({ message: 'Menu item updated successfully', menuItem: updatedItem });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
};

export const deleteRestaurantMenuItem = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (req.userRole !== 'RESTAURANT') {
      throw new AppError('Access denied', 403);
    }

    const { itemId } = req.params;
    const restaurant = await getRestaurantByUser(req.userId);

    const itemRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "menu_items"
      WHERE "id" = ${itemId}
        AND "restaurantId" = ${restaurant.id}
      LIMIT 1
    `;

    if (!itemRows[0]) {
      throw new AppError('Menu item not found', 404);
    }

    await prisma.$executeRaw`
      DELETE FROM "menu_items"
      WHERE "id" = ${itemId}
    `;

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    throw error;
  }
};
