// server.js - WebRTC Signaling Server (Fixed)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
});

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// Store active rooms and users with enhanced tracking
const rooms = new Map();
const users = new Map();
const peerConnections = new Map(); // Track peer connections per room

// Enhanced logging
const log = (message, level = 'info') => {
    const timestamp = new Date().toISOString();
    const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📋';
    console.log(`${emoji} [${timestamp}] ${message}`);
};

io.on('connection', (socket) => {
    log(`User connected: ${socket.id}`);
    users.set(socket.id, { 
        socketId: socket.id, 
        roomId: null, 
        connectedAt: Date.now(),
        lastSeen: Date.now()
    });

    // Send connection acknowledgment with server info
    socket.emit('connected', {
        message: 'Connected to WebRTC signaling server',
        socketId: socket.id,
        timestamp: Date.now(),
        serverVersion: '1.1.0'
    });

    // Handle joining a room with validation
    socket.on('join-room', (data) => {
        try {
            if (!data || !data.roomId) {
                socket.emit('error', { message: 'Invalid room data' });
                return;
            }

            const { roomId, username } = data;
            log(`User ${socket.id} (${username || 'anonymous'}) joining room: ${roomId}`);
            
            // Leave previous room if any
            const user = users.get(socket.id);
            if (user && user.roomId) {
                socket.leave(user.roomId);
                handleUserLeaveRoom(socket.id, user.roomId);
            }
            
            // Join new room
            socket.join(roomId);
            user.roomId = roomId;
            user.username = username;
            user.lastSeen = Date.now();
            users.set(socket.id, user);
            
            // Track room participants
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
                peerConnections.set(roomId, new Map());
            }
            rooms.get(roomId).add(socket.id);
            
            // Get current room users
            const roomUsers = Array.from(rooms.get(roomId));
            const roomUserData = roomUsers.map(userId => ({
                id: userId,
                username: users.get(userId)?.username || 'anonymous'
            }));
            
            // Notify the joining user about existing users
            socket.emit('room-joined', {
                roomId: roomId,
                users: roomUserData,
                yourId: socket.id,
                timestamp: Date.now()
            });
            
            // Notify others in the room about new user
            socket.to(roomId).emit('user-joined', {
                userId: socket.id,
                username: username || 'anonymous',
                roomId: roomId,
                timestamp: Date.now()
            });
            
            log(`Room ${roomId} now has ${rooms.get(roomId).size} users: ${roomUserData.map(u => u.username).join(', ')}`);
        } catch (error) {
            log(`Error in join-room: ${error.message}`, 'error');
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    // Handle WebRTC offer with validation
    socket.on('offer', (data) => {
        try {
            if (!data || !data.offer || !data.roomId || !data.targetId) {
                socket.emit('error', { message: 'Invalid offer data' });
                return;
            }

            log(`Offer sent from ${socket.id} to ${data.targetId} in room ${data.roomId}`);
            
            // Send offer to specific target
            socket.to(data.targetId).emit('offer', {
                offer: data.offer,
                from: socket.id,
                roomId: data.roomId,
                timestamp: Date.now()
            });
        } catch (error) {
            log(`Error in offer: ${error.message}`, 'error');
            socket.emit('error', { message: 'Failed to send offer' });
        }
    });

    // Handle WebRTC answer with validation
    socket.on('answer', (data) => {
        try {
            if (!data || !data.answer || !data.roomId || !data.targetId) {
                socket.emit('error', { message: 'Invalid answer data' });
                return;
            }

            log(`Answer sent from ${socket.id} to ${data.targetId} in room ${data.roomId}`);
            
            // Send answer to specific target
            socket.to(data.targetId).emit('answer', {
                answer: data.answer,
                from: socket.id,
                roomId: data.roomId,
                timestamp: Date.now()
            });
        } catch (error) {
            log(`Error in answer: ${error.message}`, 'error');
            socket.emit('error', { message: 'Failed to send answer' });
        }
    });

    // Handle ICE candidates with validation
    socket.on('ice-candidate', (data) => {
        try {
            if (!data || !data.candidate || !data.roomId) {
                return; // ICE candidates can be null, so don't emit error
            }

            log(`ICE candidate from ${socket.id} to room ${data.roomId}`);
            
            if (data.targetId) {
                // Send to specific target
                socket.to(data.targetId).emit('ice-candidate', {
                    candidate: data.candidate,
                    from: socket.id,
                    roomId: data.roomId,
                    timestamp: Date.now()
                });
            } else {
                // Broadcast to room
                socket.to(data.roomId).emit('ice-candidate', {
                    candidate: data.candidate,
                    from: socket.id,
                    roomId: data.roomId,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            log(`Error in ice-candidate: ${error.message}`, 'error');
        }
    });

    // Handle connection state updates
    socket.on('connection-state', (data) => {
        try {
            log(`Connection state from ${socket.id}: ${data.state}`);
            socket.to(data.roomId).emit('peer-connection-state', {
                peerId: socket.id,
                state: data.state,
                timestamp: Date.now()
            });
        } catch (error) {
            log(`Error in connection-state: ${error.message}`, 'error');
        }
    });

    // Handle leaving room
    socket.on('leave-room', (data) => {
        try {
            const { roomId } = data;
            log(`User ${socket.id} leaving room: ${roomId}`);
            handleUserLeaveRoom(socket.id, roomId);
        } catch (error) {
            log(`Error in leave-room: ${error.message}`, 'error');
        }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
        const user = users.get(socket.id);
        if (user) {
            user.lastSeen = Date.now();
            users.set(socket.id, user);
        }
        socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
        log(`User disconnected: ${socket.id}, reason: ${reason}`);
        const user = users.get(socket.id);
        if (user && user.roomId) {
            handleUserLeaveRoom(socket.id, user.roomId);
        }
        users.delete(socket.id);
    });

    // Handle errors
    socket.on('error', (error) => {
        log(`Socket error for ${socket.id}: ${error}`, 'error');
    });
});

function handleUserLeaveRoom(socketId, roomId) {
    if (!roomId) return;
    
    try {
        // Remove from room tracking
        if (rooms.has(roomId)) {
            rooms.get(roomId).delete(socketId);
            if (rooms.get(roomId).size === 0) {
                rooms.delete(roomId);
                peerConnections.delete(roomId);
                log(`Room ${roomId} deleted (empty)`);
            }
        }
        
        // Clean up peer connections
        if (peerConnections.has(roomId)) {
            peerConnections.get(roomId).delete(socketId);
        }
        
        // Notify others in the room
        io.to(roomId).emit('user-left', {
            userId: socketId,
            roomId: roomId,
            timestamp: Date.now()
        });
        
        log(`User ${socketId} left room ${roomId}`);
    } catch (error) {
        log(`Error in handleUserLeaveRoom: ${error.message}`, 'error');
    }
}

// Enhanced API endpoints for monitoring
app.get('/api/rooms', (req, res) => {
    try {
        const roomsData = {};
        rooms.forEach((userSet, roomId) => {
            const roomUsers = Array.from(userSet).map(userId => ({
                id: userId,
                username: users.get(userId)?.username || 'anonymous',
                connectedAt: users.get(userId)?.connectedAt,
                lastSeen: users.get(userId)?.lastSeen
            }));
            
            roomsData[roomId] = {
                userCount: userSet.size,
                users: roomUsers,
                createdAt: Math.min(...roomUsers.map(u => u.connectedAt || Date.now()))
            };
        });
        res.json(roomsData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users', (req, res) => {
    try {
        const usersData = {};
        users.forEach((user, socketId) => {
            usersData[socketId] = {
                ...user,
                isOnline: Date.now() - user.lastSeen < 30000 // Consider online if seen within 30s
            };
        });
        res.json(usersData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: Date.now(),
        activeRooms: rooms.size,
        activeUsers: users.size,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.1.0'
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Cleanup stale connections every 5 minutes
setInterval(() => {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    users.forEach((user, socketId) => {
        if (now - user.lastSeen > staleThreshold) {
            log(`Cleaning up stale user: ${socketId}`, 'warn');
            if (user.roomId) {
                handleUserLeaveRoom(socketId, user.roomId);
            }
            users.delete(socketId);
        }
    });
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    log(`WebRTC Signaling Server running on port ${PORT}`);
    log(`Server URL: http://localhost:${PORT}`);
    log(`WebSocket URL: ws://localhost:${PORT}`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    log(`Received ${signal}. Shutting down gracefully...`);
    
    // Notify all connected users
    io.emit('server-shutdown', {
        message: 'Server is shutting down',
        timestamp: Date.now()
    });
    
    // Close server
    server.close(() => {
        log('Server shut down gracefully');
        process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
        log('Force closing server');
        process.exit(1);
    }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    log(`Uncaught Exception: ${error.message}`, 'error');
    console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
});
