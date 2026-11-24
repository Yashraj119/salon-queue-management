import { io } from 'socket.io-client';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '') || '/';

export const socket = io(apiBaseUrl, {
  autoConnect: false,
  path: '/socket.io',
});
