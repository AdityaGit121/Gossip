import { io, Socket } from 'socket.io-client';
import { getBaseServerUrl } from './config.js';
import { ErrorNotificationService } from './ErrorNotificationService.js';

let socket: Socket | null = null;

export const initSocket = (token: string): Socket => {
  if (socket) {
    socket.disconnect();
  }

  const serverUrl = getBaseServerUrl() || window.location.origin;

  socket = io(serverUrl, {
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 3000,
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('⚡ Socket.IO connected:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.debug('Socket connection status:', err.message);
    if (err.message && !err.message.includes('xhr poll error')) {
      ErrorNotificationService.notifyCommError(`Realtime socket server issue: ${err.message}`);
    }
  });

  socket.on('error', (err) => {
    ErrorNotificationService.notifyCommError(`Socket protocol error: ${typeof err === 'string' ? err : JSON.stringify(err)}`);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

