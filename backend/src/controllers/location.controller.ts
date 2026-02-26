import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

// Reverse geocoding cache (in-memory)
const geocodeCache = new Map<string, { address: string; details: Record<string, unknown>; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 saat

const updateLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().optional()
});

export const updateCourierLocation = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const validatedData = updateLocationSchema.parse(req.body);

    // Sadece kurye konum güncelleyebilir
    if (req.userRole !== 'COURIER') {
      throw new AppError('Only couriers can update location', 403);
    }

    // Courier profile'ı güncelle
    const courierProfile = await prisma.courierProfile.update({
      where: { userId: req.userId },
      data: {
        currentLatitude: validatedData.latitude,
        currentLongitude: validatedData.longitude,
        lastLocationUpdate: new Date()
      }
    });

    // Location history kaydet
    await prisma.locationHistory.create({
      data: {
        courierId: courierProfile.id,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        accuracy: validatedData.accuracy
      }
    });

    res.json({
      message: 'Location updated successfully',
      location: {
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        timestamp: new Date()
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    throw error;
  }
};

export const getCourierLocations = async (req: AuthRequest, res: Response) => {
  try {
    // Sadece restoran ve admin görüntüleyebilir
    if (req.userRole === 'COURIER') {
      throw new AppError('Couriers cannot view other courier locations', 403);
    }

    const couriers = await prisma.courierProfile.findMany({
      where: {
        currentLatitude: { not: null },
        currentLongitude: { not: null }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });

    const courierLocations = couriers.map((courier: any) => ({
      courierId: courier.userId,
      courierName: courier.user.name,
      latitude: courier.currentLatitude,
      longitude: courier.currentLongitude,
      vehicleType: courier.vehicleType,
      isAvailable: courier.isAvailable,
      lastUpdate: courier.lastLocationUpdate
    }));

    res.json({ couriers: courierLocations });
  } catch (error) {
    throw error;
  }
};

export const getCourierLocationHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { courierId } = req.params;
    const { startDate, endDate, limit = '100' } = req.query;

    // Yetki kontrolü
    if (req.userRole === 'COURIER' && req.userId !== courierId) {
      throw new AppError('Cannot view other courier history', 403);
    }

    const courierProfile = await prisma.courierProfile.findUnique({
      where: { userId: courierId }
    });

    if (!courierProfile) {
      throw new AppError('Courier not found', 404);
    }

    const whereClause: any = {
      courierId: courierProfile.id
    };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.timestamp.lte = new Date(endDate as string);
      }
    }

    const locationHistory = await prisma.locationHistory.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string)
    });

    res.json({ history: locationHistory });
  } catch (error) {
    throw error;
  }
};

export const toggleCourierAvailability = async (req: AuthRequest, res: Response) => {
  try {
    // Sadece kurye kendi durumunu değiştirebilir
    if (req.userRole !== 'COURIER') {
      throw new AppError('Only couriers can toggle availability', 403);
    }

    const courierProfile = await prisma.courierProfile.findUnique({
      where: { userId: req.userId }
    });

    if (!courierProfile) {
      throw new AppError('Courier profile not found', 404);
    }

    const updatedProfile = await prisma.courierProfile.update({
      where: { userId: req.userId },
      data: {
        isAvailable: !courierProfile.isAvailable
      }
    });

    await prisma.courierAvailabilityEvent.create({
      data: {
        courierId: courierProfile.id,
        isAvailable: updatedProfile.isAvailable
      }
    });

    res.json({
      message: 'Availability updated successfully',
      isAvailable: updatedProfile.isAvailable
    });
  } catch (error) {
    throw error;
  }
};

// Reverse geocoding endpoint (KKTC için)
export const reverseGeocode = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
      throw new AppError('Latitude and longitude are required', 400);
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new AppError('Invalid coordinates', 400);
    }

    // Cache key (koordinatları 4 ondalık basamağa yuvarla)
    const cacheKey = `${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
    
    // Cache'te var mı kontrol et
    const cached = geocodeCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('Cache hit for:', cacheKey);
      return res.json({
        address: cached.address,
        details: cached.details,
        cached: true
      });
    }

    // Nominatim API'ye istek yap (1 saniye bekle - rate limit için)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'KuryeSistemi/1.0'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limit aşıldıysa fallback address kullan
        const fallbackAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        return res.json({
          address: fallbackAddress,
          details: {},
          fallback: true
        });
      }
      throw new AppError('Geocoding service error', response.status);
    }

    const data = await response.json() as { display_name?: string; address?: Record<string, unknown> };
    const address = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    const details = data.address || {};
    
    // Cache'e kaydet
    geocodeCache.set(cacheKey, {
      address,
      details,
      timestamp: Date.now()
    });
    
    res.json({
      address,
      details,
      cached: false
    });
  } catch (error) {
    throw error;
  }
};
