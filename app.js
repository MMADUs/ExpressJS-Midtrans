const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

// initialize server
const app = express();
const http = require('http');
const server = http.createServer(app);

require('dotenv').config();

app.use(express.json());
app.use(express.urlencoded ({extended: false}));
app.use(cookieParser());

const allowedOrigins = [
    "http://localhost:5173",
    "https://z7svt2vc-5173.asse.devtunnels.ms"
];

app.use(cors({ 
    origin: function (origin, callback) {
        // Check if the origin is in the allowed origins array or if it is undefined (for cases like same-origin requests)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// setup web socket
const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            // Check if the origin is in the allowed origins array or if it is undefined (for cases like same-origin requests)
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods:['GET','POST']
    }
})
app.set('socketio', io);

server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});

// API Provider
const productAPI = require('./routes/product-routes');
const tableAPI = require('./routes/table-routes');
const orderAPI = require('./routes/order-routes');
const feedbackAPI = require('./routes/feedback-routes');
const reservasiAPI = require('./routes/reservasi-routes');
const userAPI = require('./routes/user-routes');

app.use('/product', productAPI);
app.use('/table', tableAPI);
app.use('/order', orderAPI);
app.use('/feedback', feedbackAPI);
app.use('/reservasi', reservasiAPI);
app.use('/user', userAPI);

// database credential
mongoose.set("strictQuery", false)
mongoose.connect('mongodb://127.0.0.1:27017/dbkasir')
.then(()=> {
    console.log('Connected to database')
}).catch((error) => {
    console.log(error)
});

io.on('connection', (socket) => {
    console.log(`A User ${socket.id} connected`);
});

// Muhammad Nizwa XII RPL - MERN Stack APP Kasir