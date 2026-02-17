const { createServer } = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

// 创建HTTP服务器
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 全局文件哈希索引
const fileIndex = new Map(); // hash -> { fileName, fileSize, nodes: Set<socketId> }

// 节点文件注册表
const nodeFiles = new Map(); // socketId -> Set<fileHash>

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 注册节点文件
  socket.on('register-files', (files) => {
    console.log(`用户 ${socket.id} 注册文件:`, files);
    
    // 如果节点已有注册文件，先移除
    if (nodeFiles.has(socket.id)) {
      const oldFiles = nodeFiles.get(socket.id);
      for (const hash of oldFiles) {
        if (fileIndex.has(hash)) {
          const fileInfo = fileIndex.get(hash);
          fileInfo.nodes.delete(socket.id);
          // 如果没有节点拥有该文件，从索引中删除
          if (fileInfo.nodes.size === 0) {
            fileIndex.delete(hash);
          }
        }
      }
    }
    
    // 创建新的文件集合并注册
    const newFiles = new Set();
    for (const file of files) {
      const hash = file.hash;
      newFiles.add(hash);
      
      // 更新文件索引
      if (!fileIndex.has(hash)) {
        fileIndex.set(hash, {
          fileName: file.fileName,
          fileSize: file.fileSize,
          nodes: new Set()
        });
      }
      
      // 添加当前节点到该文件的拥有者列表
      fileIndex.get(hash).nodes.add(socket.id);
    }
    
    // 保存节点的文件列表
    nodeFiles.set(socket.id, newFiles);
    
    console.log(`当前文件索引大小: ${fileIndex.size}`);
  });

  // 搜索文件
  socket.on('search-files', (query) => {
    console.log(`用户 ${socket.id} 搜索文件:`, query);
    
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    for (const [hash, fileInfo] of fileIndex.entries()) {
      if (
        fileInfo.fileName.toLowerCase().includes(lowerQuery) ||
        hash.toLowerCase().includes(lowerQuery)
      ) {
        // 只返回活跃节点
        const activeNodes = Array.from(fileInfo.nodes).filter(nodeId => 
          io.sockets.sockets.get(nodeId) && io.sockets.sockets.get(nodeId).connected
        );
        
        if (activeNodes.length > 0) {
          results.push({
            hash: hash,
            fileName: fileInfo.fileName,
            fileSize: fileInfo.fileSize,
            nodeCount: activeNodes.length,
            nodes: activeNodes
          });
        }
      }
    }
    
    socket.emit('search-results', results);
    console.log(`搜索结果: 找到 ${results.length} 个匹配文件`);
  });

  // 请求下载文件（获取拥有该文件的节点信息）
  socket.on('request-download', (fileHash) => {
    console.log(`用户 ${socket.id} 请求下载文件:`, fileHash);
    
    if (fileIndex.has(fileHash)) {
      const fileInfo = fileIndex.get(fileHash);
      
      // 获取活跃节点列表
      const activeNodes = Array.from(fileInfo.nodes).filter(nodeId => 
        io.sockets.sockets.get(nodeId) && io.sockets.sockets.get(nodeId).connected
      );
      
      if (activeNodes.length > 0) {
        // 随机选择一个节点进行下载（可以扩展为负载均衡算法）
        const selectedNode = activeNodes[Math.floor(Math.random() * activeNodes.length)];
        
        socket.emit('download-node-found', {
          fileHash: fileHash,
          fileName: fileInfo.fileName,
          fileSize: fileInfo.fileSize,
          nodeId: selectedNode
        });
        
        console.log(`为用户 ${socket.id} 找到文件 ${fileHash} 的下载节点: ${selectedNode}`);
      } else {
        socket.emit('download-node-not-found', {
          fileHash: fileHash,
          error: '没有节点拥有该文件'
        });
      }
    } else {
      socket.emit('download-node-not-found', {
        fileHash: fileHash,
        error: '文件未在索引中找到'
      });
    }
  });

  // 转发WebRTC信令（现在基于节点ID而不是房间）
  socket.on('webrtc-signal', (data) => {
    const { targetUserId, signal } = data;
    console.log(`转发信令: ${socket.id} -> ${targetUserId}`);
    
    socket.to(targetUserId).emit('webrtc-signal', {
      fromUserId: socket.id,
      signal: signal
    });
  });



  // 心跳检测
  socket.on('heartbeat', () => {
    socket.emit('heartbeat-ack');
  });

  // 用户断开连接
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
    
    // 从文件索引中移除该节点拥有的所有文件
    if (nodeFiles.has(socket.id)) {
      const files = nodeFiles.get(socket.id);
      for (const hash of files) {
        if (fileIndex.has(hash)) {
          const fileInfo = fileIndex.get(hash);
          fileInfo.nodes.delete(socket.id);
          
          // 如果没有节点拥有该文件，从索引中删除
          if (fileInfo.nodes.size === 0) {
            fileIndex.delete(hash);
          }
        }
      }
      
      nodeFiles.delete(socket.id);
    }
    
    console.log(`节点 ${socket.id} 已断开，清理其注册的文件索引`);
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
  console.log(`- register-files: 注册本地文件到全局索引`);
  console.log(`- search-files: 搜索全局文件索引`);
  console.log(`- request-download: 请求下载文件的节点信息`);
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