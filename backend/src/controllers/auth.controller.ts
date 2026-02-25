import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(['RESTAURANT', 'COURIER', 'ADMIN']),
  restaurantData: z.object({
    name: z.string(),
    address: z.string(),
    phone: z.string(),
    commissionPerOrder: z.number().optional()
  }).optional(),
  courierData: z.object({
    vehicleType: z.string().optional()
  }).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export const register = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Kullanıcı zaten var mı kontrol et
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Transaction ile kullanıcı ve ilgili profilleri oluştur
    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newUser = await tx.user.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          name: validatedData.name,
          phone: validatedData.phone,
          role: validatedData.role
        }
      });

      // Restoran ise restaurant kaydı oluştur
      if (validatedData.role === 'RESTAURANT' && validatedData.restaurantData) {
        await tx.restaurant.create({
          data: {
            userId: newUser.id,
            name: validatedData.restaurantData.name,
            address: validatedData.restaurantData.address,
            phone: validatedData.restaurantData.phone,
            commissionPerOrder: validatedData.restaurantData.commissionPerOrder || 0
          }
        });
      }

      // Kurye ise courier profile oluştur
      if (validatedData.role === 'COURIER') {
        await tx.courierProfile.create({
          data: {
            userId: newUser.id,
            vehicleType: validatedData.courierData?.vehicleType,
            isAvailable: true
          }
        });
      }

      return newUser;
    });

    // JWT token oluştur
    const jwtOptions: SignOptions = { expiresIn: '7d' };
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      jwtOptions
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
};

export const login = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const validatedData = loginSchema.parse(req.body);

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      include: {
        restaurants: true,
        courierProfile: true
      }
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403);
    }

    // Şifre kontrolü
    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      user.password
    );

    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // JWT token oluştur
    const jwtOptions: SignOptions = { expiresIn: '7d' };
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      jwtOptions
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurant: user.restaurants[0] || null,
        courierProfile: user.courierProfile || null
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        restaurants: true,
        courierProfile: true
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user });
  } catch (error) {
    throw error;
  }
};
