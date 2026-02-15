const { createServer } = require('http');
const { Server } = require('socket.io');

// 创建HTTP服务器
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 房间管理
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 加入房间
  socket.on('join-room', (roomId) => {
    console.log(`用户 ${socket.id} 加入房间 ${roomId}`);
    
    socket.join(roomId);
    
    // 初始化房间
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Set(),
        createdAt: new Date()
      });
    }
    
    const room = rooms.get(roomId);
    room.users.add(socket.id);
    
    // 通知房间内其他用户
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      roomId: roomId,
      userCount: room.users.size
    });
    
    // 发送房间信息给新用户
    socket.emit('room-info', {
      roomId: roomId,
      userCount: room.users.size,
      users: Array.from(room.users)
    });
    
    console.log(`房间 ${roomId} 当前用户数: ${room.users.size}`);
  });

  // 转发WebRTC信令
  socket.on('webrtc-signal', (data) => {
    const { roomId, targetUserId, signal } = data;
    console.log(`转发信令: ${socket.id} -> ${targetUserId} (房间: ${roomId})`);
    
    socket.to(targetUserId).emit('webrtc-signal', {
      fromUserId: socket.id,
      signal: signal
    });
  });

  // 文件传输请求
  socket.on('file-transfer-request', (data) => {
    const { targetUserId, fileInfo } = data;
    console.log(`文件传输请求: ${socket.id} -> ${targetUserId}`, fileInfo);
    
    socket.to(targetUserId).emit('file-transfer-request', {
      fromUserId: socket.id,
      fileInfo: fileInfo
    });
  });

  // 文件传输响应
  socket.on('file-transfer-response', (data) => {
    const { targetUserId, accepted, fileInfo } = data;
    console.log(`文件传输响应: ${socket.id} -> ${targetUserId}`, { accepted, fileInfo });
    
    socket.to(targetUserId).emit('file-transfer-response', {
      fromUserId: socket.id,
      accepted: accepted,
      fileInfo: fileInfo
    });
  });

  // 心跳检测
  socket.on('heartbeat', () => {
    socket.emit('heartbeat-ack');
  });

  // 用户断开连接
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
    
    // 从所有房间中移除用户
    for (const [roomId, room] of rooms.entries()) {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        
        // 通知房间内其他用户
        socket.to(roomId).emit('user-left', {
          userId: socket.id,
          roomId: roomId,
          userCount: room.users.size
        });
        
        // 如果房间为空，清理房间
        if (room.users.size === 0) {
          rooms.delete(roomId);
          console.log(`清理空房间: ${roomId}`);
        }
        
        console.log(`用户 ${socket.id} 离开房间 ${roomId}, 剩余用户: ${room.users.size}`);
      }
    }
  });

  // 错误处理
  socket.on('error', (error) => {
    console.error('Socket错误:', error);
  });
});

// 启动服务器
const PORT = process.env.PORT || 11451;
httpServer.listen(PORT, () => {
  console.log(`信令服务器运行在端口 ${PORT}`);
  console.log(`支持以下事件:`);
  console.log(`- join-room: 加入房间`);
  console.log(`- webrtc-signal: WebRTC信令转发`);
  console.log(`- file-transfer: 文件传输信令`);
  console.log(`- heartbeat: 心跳检测`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('正在关闭信令服务器...');
  httpServer.close(() => {
    console.log('信令服务器已关闭');
    process.exit(0);
  });
});