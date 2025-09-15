let io;

function init(server) {
  const { Server } = require('socket.io');

  io = new Server(server, {
    cors: {
      origin: '*', // You can restrict this to your frontend domain in production
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('User connected:', socket.id);
    }

    socket.on('join', (userId) => {
      if (userId) {
        socket.join(userId.toString());
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Socket ${socket.id} joined room ${userId}`);
        }
      }
    });

    socket.on('disconnect', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('User disconnected:', socket.id);
      }
    });

    // Broadcast events
    socket.on('new-order', (orderData) => {
      io.emit('new-order', orderData);
    });

    socket.on('order-shipped', (orderData) => {
      io.emit('order-shipped', orderData);
    });
  });
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
}

module.exports = { init, getIO };
