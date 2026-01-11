import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import http from 'http';

let io: Server;

export const initSocket = (httpServer: http.Server) => {
    // Create Redis clients for the adapter
    const pubClient = createClient({
        url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
    });
    const subClient = pubClient.duplicate();

    // Handle Redis connection errors
    pubClient.on('error', (err) => console.error('Redis Pub Client Error', err));
    subClient.on('error', (err) => console.error('Redis Sub Client Error', err));

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io = new Server(httpServer, {
            cors: {
                origin: '*', // Allow all origins for now (dev), tighten in production
                methods: ['GET', 'POST']
            },
            adapter: createAdapter(pubClient, subClient)
        });

        // Create a listener for application events (Worker -> API)
        const appSubscriber = pubClient.duplicate();
        appSubscriber.connect().then(() => {
            console.log('Redis subscriber for app events connected');

            appSubscriber.subscribe('analysis-events', (message) => {
                try {
                    const { roomId, event, payload } = JSON.parse(message);
                    if (roomId && event && payload) {
                        console.log(`Forwarding event ${event} to room ${roomId}`);
                        io.to(roomId).emit(event, payload);
                    }
                } catch (err) {
                    console.error('Failed to parse analysis event:', err);
                }
            });
        });

        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            // Join a room based on userId if authenticated
            // (client should emit 'join' or we extract from handshake auth)
            socket.on('join_user', (userId: string) => {
                if (userId) {
                    socket.join(`user:${userId}`);
                    console.log(`Socket ${socket.id} joined user:${userId}`);
                }
            });

            // Join a room for a specific analysis
            socket.on('join_analysis', (analysisId: string) => {
                socket.join(`analysis:${analysisId}`);
                console.log(`Socket ${socket.id} joined analysis:${analysisId}`);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });

        console.log('Socket.IO initialized with Redis Adapter');
    }).catch(err => {
        console.error('Failed to connect to Redis for Socket.IO adapter:', err);
        // Fallback to memory adapter if redis fails?
        // For now, let's just log it.
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO has not been initialized!');
    }
    return io;
};
