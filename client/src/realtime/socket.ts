import { io } from 'socket.io-client';
import { apiBaseUrl } from '../api/config';

export const socket = io(apiBaseUrl || '/', {
  autoConnect: false,
  path: '/socket.io',
});
