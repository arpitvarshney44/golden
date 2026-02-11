const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Set timezone to India Standard Time
process.env.TZ = 'Asia/Kolkata';

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Make io globally available for scheduler
global.io = io;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB Connected');
    // Start the result schedulers after DB connection
    const { startScheduler } = require('./scheduler/resultScheduler');
    const { start100DScheduler } = require('./scheduler/result100dScheduler');
    const { start12DScheduler } = require('./scheduler/result12dScheduler');
    startScheduler();
    start100DScheduler();
    start12DScheduler();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/lottery', require('./routes/lottery'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/tickets100d', require('./routes/tickets100d'));
app.use('/api/tickets12d', require('./routes/tickets12d'));
app.use('/api/100d-lottery', require('./routes/lottery100d'));
app.use('/api/12d-lottery', require('./routes/lottery12d'));
app.use('/api/ticket-check', require('./routes/ticketCheck'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Golden Lottery API is running' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
