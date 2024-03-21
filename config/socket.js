const { Server } = require('socket.io');

// setup web socket
const socketIoMiddleware = (server) => {
    const io = new Server(server, {
        cors: {
            origin: 'http://localhost:5173',
            methods:['GET','POST']
        }
    })
    
    io.on('connection', (socket) => {
        console.log(`A user connected: ${socket.id}`);
    });

    return (req, res, next) => {
        req.io = io;
        next();
    };
};

module.exports = socketIoMiddleware;