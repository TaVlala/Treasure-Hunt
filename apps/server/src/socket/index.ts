// Socket.io server — initialisation, JWT auth, and hunt room management.
// Exports initSocketIO() to attach to the HTTP server and getIO() for route-level emits.
// Clients join `hunt:{huntId}` rooms to receive real-time leaderboard updates.

import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt';
import { env } from '../config/env';
import type { UserRole } from '@treasure-hunt/shared';

// User payload attached to each authenticated socket
interface SocketUser {
  id: string;
  email: string;
  role: UserRole;
}

// Extend socket.io's SocketData so TypeScript knows socket.data.user exists
declare module 'socket.io' {
  interface SocketData {
    user: SocketUser;
  }
}

// Module-level singleton — set by initSocketIO, read by getIO
let io: SocketServer | undefined;

// Attach Socket.io to the HTTP server. Call this once in index.ts before server.listen().
// Returns the io instance (also stored as module singleton for getIO()).
export function initSocketIO(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
    },
  });

  // JWT handshake middleware — client must send { auth: { token: '<access token>' } }
  io.use((socket: Socket, next) => {
    const token = (socket.handshake.auth as { token?: string }).token;

    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role === 'ADMIN' ? 'admin' : 'player',
      };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { email, id } = socket.data.user;
    console.log(`[Socket] + ${email} (${id}) connected — socket ${socket.id}`);

    // Join a hunt room to receive leaderboard:update events for that hunt
    socket.on('join:hunt', (huntId: unknown) => {
      if (typeof huntId !== 'string' || !huntId) return;
      socket.join(`hunt:${huntId}`);
      console.log(`[Socket]   ${email} joined room hunt:${huntId}`);
    });

    // Leave a hunt room (e.g. player navigates away)
    socket.on('leave:hunt', (huntId: unknown) => {
      if (typeof huntId !== 'string' || !huntId) return;
      socket.leave(`hunt:${huntId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] - ${email} (${id}) disconnected — socket ${socket.id}`);
    });
  });

  return io;
}

// Returns the io singleton for use in route handlers.
// Throws if initSocketIO() has not been called yet.
export function getIO(): SocketServer {
  if (!io) {
    throw new Error('[Socket] getIO() called before initSocketIO() — check server startup order');
  }
  return io;
}
