import type { Server } from 'socket.io';

let ioInstance: Server | null = null;

export const setIo = (io: Server) => {
  ioInstance = io;
};

export const emitEvent = (event: string, payload: unknown) => {
  if (!ioInstance) return;
  ioInstance.emit(event, payload);
};
