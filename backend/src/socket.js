import { Server } from 'socket.io';
import fs from 'fs';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Adjust for production
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 New client connected: ${socket.id}`);

        socket.on('join_room', (roomId) => {
            socket.join(roomId);
            console.log(`👤 Client ${socket.id} joined room: ${roomId}`);
            
            // Log to file for deep debugging
            try {
                fs.appendFileSync('./REAL_USER_DEBUG.log', `${new Date().toISOString()} - SOCKET_JOIN - Client ${socket.id} -> ${roomId}\n`);
            } catch (e) {}
        });

        socket.on('disconnect', () => {
            console.log(`🚪 Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
