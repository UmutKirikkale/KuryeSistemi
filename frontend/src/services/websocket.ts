import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || window.location.origin;

class WebSocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(WS_URL, {
      path: '/socket.io',
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    this.socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Kurye konum güncelleme
  updateCourierLocation(latitude: number, longitude: number, accuracy?: number) {
    if (!this.socket) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('courier:location:update', {
      latitude,
      longitude,
      accuracy
    });
  }

  // Konum güncellemelerini dinle
  onLocationUpdate(callback: (data: any) => void) {
    if (!this.socket) {
      throw new Error('WebSocket not connected');
    }

    this.socket.on('courier:location:broadcast', callback);
  }

  // Sipariş durumu değişikliklerini dinle
  onOrderStatusUpdate(callback: (data: any) => void) {
    if (!this.socket) {
      throw new Error('WebSocket not connected');
    }

    this.socket.on('order:status:update', callback);
  }

  // Yeni sipariş bildirimlerini dinle
  onNewOrder(callback: (data: any) => void) {
    if (!this.socket) {
      throw new Error('WebSocket not connected');
    }

    this.socket.on('order:new', callback);
  }

  // Listener kaldırma
  removeListener(event: string, callback: any) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const wsService = new WebSocketService();
