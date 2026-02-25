import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const customerRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().min(5)
});

const customerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const savedAddressSchema = z.object({
  label: z.string().min(1),
  address: z.string().min(5),
  latitude: z.number(),
  longitude: z.number(),
  isDefault: z.boolean().optional()
});

export const customerRegister = async (req: Request, res: Response): Promise<any> => {
  const parsed = customerRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Geçersiz kayıt bilgileri', 400);
  }

  const { email, password, name, phone } = parsed.data;

  const existingCustomer = await prisma.customer.findUnique({
    where: { email }
  });

  if (existingCustomer) {
    throw new AppError('Bu e-posta adresi zaten kayıtlı', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const customer = await prisma.customer.create({
    data: {
      email,
      password: hashedPassword,
      name,
      phone
    }
  });

  const token = jwt.sign(
    { id: customer.id, email: customer.email, type: 'customer' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.status(201).json({
    message: 'Kayıt başarılı',
    token,
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone
    }
  });
};

export const customerLogin = async (req: Request, res: Response): Promise<any> => {
  const parsed = customerLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Geçersiz giriş bilgileri', 400);
  }

  const { email, password } = parsed.data;

  const customer = await prisma.customer.findUnique({
    where: { email }
  });

  if (!customer || !customer.isActive) {
    throw new AppError('E-posta veya şifre hatalı', 401);
  }

  const isValidPassword = await bcrypt.compare(password, customer.password);
  if (!isValidPassword) {
    throw new AppError('E-posta veya şifre hatalı', 401);
  }

  const token = jwt.sign(
    { id: customer.id, email: customer.email, type: 'customer' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    message: 'Giriş başarılı',
    token,
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone
    }
  });
};

export const getCustomerProfile = async (req: Request, res: Response): Promise<any> => {
  const customerId = (req as any).customerId;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      savedAddresses: {
        orderBy: { isDefault: 'desc' }
      }
    }
  });

  if (!customer) {
    throw new AppError('Müşteri bulunamadı', 404);
  }

  res.json({
    customer: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      savedAddresses: customer.savedAddresses
    }
  });
};

export const createSavedAddress = async (req: Request, res: Response): Promise<any> => {
  const customerId = (req as any).customerId;
  const parsed = savedAddressSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Geçersiz adres bilgileri', 400);
  }

  const { label, address, latitude, longitude, isDefault } = parsed.data;

  if (isDefault) {
    await prisma.savedAddress.updateMany({
      where: { customerId },
      data: { isDefault: false }
    });
  }

  const savedAddress = await prisma.savedAddress.create({
    data: {
      customerId,
      label,
      address,
      latitude,
      longitude,
      isDefault: isDefault || false
    }
  });

  res.status(201).json({
    message: 'Adres kaydedildi',
    address: savedAddress
  });
};

export const updateSavedAddress = async (req: Request, res: Response): Promise<any> => {
  const customerId = (req as any).customerId;
  const { addressId } = req.params;
  const parsed = savedAddressSchema.partial().safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Geçersiz adres bilgileri', 400);
  }

  const existingAddress = await prisma.savedAddress.findFirst({
    where: { id: addressId, customerId }
  });

  if (!existingAddress) {
    throw new AppError('Adres bulunamadı', 404);
  }

  if (parsed.data.isDefault) {
    await prisma.savedAddress.updateMany({
      where: { customerId },
      data: { isDefault: false }
    });
  }

  const updatedAddress = await prisma.savedAddress.update({
    where: { id: addressId },
    data: parsed.data
  });

  res.json({
    message: 'Adres güncellendi',
    address: updatedAddress
  });
};

export const deleteSavedAddress = async (req: Request, res: Response): Promise<any> => {
  const customerId = (req as any).customerId;
  const { addressId } = req.params;

  const existingAddress = await prisma.savedAddress.findFirst({
    where: { id: addressId, customerId }
  });

  if (!existingAddress) {
    throw new AppError('Adres bulunamadı', 404);
  }

  await prisma.savedAddress.delete({
    where: { id: addressId }
  });

  res.json({
    message: 'Adres silindi'
  });
};

export const getCustomerOrders = async (req: Request, res: Response): Promise<any> => {
  const customerId = (req as any).customerId;

  const orders = await prisma.customerOrder.findMany({
    where: { customerId },
    include: {
      restaurant: {
        select: {
          name: true,
          phone: true
        }
      },
      courier: {
        select: {
          name: true,
          phone: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      restaurantName: order.restaurant.name,
      orderAmount: order.orderAmount,
      deliveryAddress: order.deliveryAddress,
      createdAt: order.createdAt,
      courier: order.courier ? {
        name: order.courier.name,
        phone: order.courier.phone
      } : null
    }))
  });
};
