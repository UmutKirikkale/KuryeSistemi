import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './database';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export const setupWebSocket = (io: Server) => {
  // Authentication middleware for WebSocket
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`✅ User connected: ${socket.userId} (${socket.userRole})`);

    // Kurye konum güncellemesi
    socket.on('courier:location:update', async (data: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    }) => {
      if (socket.userRole !== 'COURIER') {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      try {
        // Courier profile güncelle ve id'sini al
        const courierProfile = await prisma.courierProfile.update({
          where: { userId: socket.userId },
          data: {
            currentLatitude: data.latitude,
            currentLongitude: data.longitude,
            lastLocationUpdate: new Date()
          }
        });

        // Location history kaydet (courierId olarak CourierProfile'ın id'sini kullan)
        await prisma.locationHistory.create({
          data: {
            courierId: courierProfile.id,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy
          }
        });

        // Tüm restoranlar ve admin'e broadcast et
        io.emit('courier:location:broadcast', {
          courierId: socket.userId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: new Date()
        });

        socket.emit('courier:location:updated', { success: true });
      } catch (error) {
        console.error('Location update error:', error);
        socket.emit('error', { message: 'Location update failed' });
      }
    });

    // Sipariş durumu değişikliği
    socket.on('order:status:changed', async (data: {
      orderId: string;
      status: string;
    }) => {
      try {
        // İlgili restoran ve kuryeye bildirim gönder
        io.emit('order:status:update', {
          orderId: data.orderId,
          status: data.status,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Order status broadcast error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
    });
  });
};
