import { io, Socket } from 'socket.io-client';

type LocationUpdatePayload = {
  courierId: string;
  courierName?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
};

const resolveWsUrl = () => {
  if (process.env.EXPO_PUBLIC_WS_URL) {
    return process.env.EXPO_PUBLIC_WS_URL;
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://kuryesistemiyemek.onrender.com/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

class WebSocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    const wsUrl = resolveWsUrl();

    this.socket = io(wsUrl, {
      path: '/socket.io',
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect_error', (error: any) => {
      console.log('WebSocket connect error:', error?.message || 'unknown');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  updateCourierLocation(latitude: number, longitude: number, accuracy?: number) {
    if (!this.socket) {
      return;
    }

    this.socket.emit('courier:location:update', {
      latitude,
      longitude,
      accuracy
    });
  }

  onLocationUpdate(callback: (data: LocationUpdatePayload) => void) {
    if (!this.socket) {
      return;
    }

    this.socket.on('courier:location:broadcast', callback);
  }

  onOrderStatusUpdate(callback: (data: any) => void) {
    if (!this.socket) {
      return;
    }

    this.socket.on('order:status:update', callback);
  }

  onNewOrder(callback: (data: any) => void) {
    if (!this.socket) {
      return;
    }

    this.socket.on('order:new', callback);
  }

  removeListener(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) {
      return;
    }

    this.socket.off(event, callback);
  }
}

export const wsService = new WebSocketService();
