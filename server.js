// server.js - WebRTC Signaling Server
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
    transports: ['websocket', 'polling']
});

// Serve static files
app.use(express.static('public'));

// Store active rooms and users
const rooms = new Map();
const users = new Map();

io.on('connection', (socket) => {
    console.log(`📱 User connected: ${socket.id}`);
    users.set(socket.id, { socketId: socket.id, roomId: null });

    // Handle joining a room
    socket.on('join-room', (data) => {
        const { roomId } = data;
        console.log(`🚪 User ${socket.id} joining room: ${roomId}`);
        
        // Leave previous room if any
        const user = users.get(socket.id);
        if (user && user.roomId) {
            socket.leave(user.roomId);
            handleUserLeaveRoom(socket.id, user.roomId);
        }
        
        // Join new room
        socket.join(roomId);
        user.roomId = roomId;
        users.set(socket.id, user);
        
        // Track room participants
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        rooms.get(roomId).add(socket.id);
        
        // Notify others in the room
        socket.to(roomId).emit('user-joined', {
            userId: socket.id,
            roomId: roomId,
            timestamp: Date.now()
        });
        
        console.log(`✅ Room ${roomId} now has ${rooms.get(roomId).size} users`);
    });

    // Handle WebRTC offer
    socket.on('offer', (data) => {
        console.log(`📤 Offer sent from ${socket.id} to room ${data.roomId}`);
        socket.to(data.roomId).emit('offer', {
            offer: data.offer,
            from: socket.id,
            roomId: data.roomId,
            timestamp: Date.now()
        });
    });

    // Handle WebRTC answer
    socket.on('answer', (data) => {
        console.log(`📤 Answer sent from ${socket.id} to room ${data.roomId}`);
        socket.to(data.roomId).emit('answer', {
            answer: data.answer,
            from: socket.id,
            roomId: data.roomId,
            timestamp: Date.now()
        });
    });

    // Handle ICE candidates
    socket.on('ice-candidate', (data) => {
        console.log(`🧊 ICE candidate from ${socket.id} to room ${data.roomId}`);
        socket.to(data.roomId).emit('ice-candidate', {
            candidate: data.candidate,
            from: socket.id,
            roomId: data.roomId,
            timestamp: Date.now()
        });
    });

    // Handle leaving room
    socket.on('leave-room', (data) => {
        const { roomId } = data;
        console.log(`🚪 User ${socket.id} leaving room: ${roomId}`);
        handleUserLeaveRoom(socket.id, roomId);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`📱 User disconnected: ${socket.id}`);
        const user = users.get(socket.id);
        if (user && user.roomId) {
            handleUserLeaveRoom(socket.id, user.roomId);
        }
        users.delete(socket.id);
    });

    // Send welcome message
    socket.emit('connected', {
        message: 'Connected to WebRTC signaling server',
        socketId: socket.id,
        timestamp: Date.now()
    });
});

function handleUserLeaveRoom(socketId, roomId) {
    if (!roomId) return;
    
    // Remove from room tracking
    if (rooms.has(roomId)) {
        rooms.get(roomId).delete(socketId);
        if (rooms.get(roomId).size === 0) {
            rooms.delete(roomId);
        }
    }
    
    // Notify others in the room
    io.to(roomId).emit('user-left', {
        userId: socketId,
        roomId: roomId,
        timestamp: Date.now()
    });
    
    console.log(`👋 User ${socketId} left room ${roomId}`);
}

// API endpoints for monitoring
app.get('/api/rooms', (req, res) => {
    const roomsData = {};
    rooms.forEach((users, roomId) => {
        roomsData[roomId] = {
            userCount: users.size,
            users: Array.from(users)
        };
    });
    res.json(roomsData);
});

app.get('/api/users', (req, res) => {
    const usersData = {};
    users.forEach((user, socketId) => {
        usersData[socketId] = user;
    });
    res.json(usersData);
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: Date.now(),
        activeRooms: rooms.size,
        activeUsers: users.size
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 WebRTC Signaling Server running on port ${PORT}`);
    console.log(`📡 Server URL: http://localhost:${PORT}`);
    console.log(`🌐 WebSocket URL: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server shut down gracefully');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server shut down gracefully');
        process.exit(0);
    });
});