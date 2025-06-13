# WebRTC Video Call Application

A real-time peer-to-peer video calling application built with WebRTC, Socket.IO, and Node.js. This application allows users to create video call rooms and communicate directly with each other.

## 🚀 Features

- **Real-time Video Calls**: High-quality peer-to-peer video communication
- **Room-based System**: Create and join video call rooms using room IDs
- **Responsive Design**: Works on desktop and mobile devices
- **WebRTC Technology**: Direct peer-to-peer connection for optimal performance
- **Socket.IO Signaling**: Reliable signaling server for connection establishment
- **Modern UI**: Beautiful glassmorphism design with smooth animations

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Real-time Communication**: Socket.IO, WebRTC
- **Deployment**: Vercel

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- A modern web browser with WebRTC support
- HTTPS connection (required for WebRTC in production)

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/webrtc-video-call.git
   cd webrtc-video-call
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Allow camera and microphone permissions when prompted

### Production Deployment

This application is configured for easy deployment on Vercel:

1. **Deploy to Vercel**
   ```bash
   npm i -g vercel
   vercel
   ```

2. **Or deploy via Vercel Dashboard**
   - Connect your GitHub repository to Vercel
   - Vercel will automatically detect the configuration

## 📁 Project Structure

```
webrtc-video-call/
├── public/
│   └── index.html          # Frontend application
├── server.js               # Express server with Socket.IO
├── package.json           # Node.js dependencies and scripts
├── vercel.json           # Vercel deployment configuration
└── README.md             # Project documentation
```

## 🎮 How to Use

1. **Join a Room**
   - Enter a room ID (e.g., "room123")
   - Click "Join Room"
   - Allow camera and microphone access

2. **Start a Call**
   - Wait for another user to join the same room
   - Click "Start Call" to initiate the video call
   - The other user will automatically receive the call

3. **During the Call**
   - Your video appears on the left
   - Remote user's video appears on the right
   - Use "Hang Up" to end the call

4. **Leave the Room**
   - Click "Leave Room" to exit
   - This will end any active calls

## 🔧 Configuration

### Environment Variables

You can customize the following environment variables:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

### WebRTC Configuration

The application uses Google's STUN servers by default. For production use, consider:

- Adding TURN servers for users behind restrictive NATs
- Implementing authentication for TURN servers
- Using your own STUN/TURN infrastructure

## 📡 API Endpoints

### Health Check
- `GET /health` - Returns server health status

### Monitoring
- `GET /api/rooms` - Lists active rooms and users
- `GET /api/users` - Lists connected users

### WebSocket Events

#### Client to Server
- `join-room` - Join a video call room
- `leave-room` - Leave the current room
- `offer` - Send WebRTC offer
- `answer` - Send WebRTC answer
- `ice-candidate` - Send ICE candidate

#### Server to Client
- `connected` - Connection established
- `user-joined` - New user joined room
- `user-left` - User left room
- `offer` - Received WebRTC offer
- `answer` - Received WebRTC answer
- `ice-candidate` - Received ICE candidate

## 🔒 Security Considerations

- **HTTPS Required**: WebRTC requires HTTPS in production
- **Camera/Mic Permissions**: Users must grant media access
- **Room Privacy**: Room IDs should be shared securely
- **No Authentication**: This is a demo app - add authentication for production

## 🐛 Troubleshooting

### Common Issues

1. **Camera/Microphone Access Denied**
   - Check browser permissions
   - Ensure HTTPS connection
   - Try refreshing the page

2. **Connection Failed**
   - Check network connectivity
   - Verify STUN/TURN server accessibility
   - Try different browsers

3. **Audio/Video Not Working**
   - Check device permissions
   - Ensure devices are not in use by other applications
   - Test with different devices

### Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Check the troubleshooting section
- Review WebRTC documentation

## 🙏 Acknowledgments

- WebRTC community for excellent documentation
- Socket.IO team for reliable real-time communication
- Google for providing free STUN servers

---

**Note**: This is a demonstration application. For production use, implement proper authentication, security measures, and consider using professional TURN servers.