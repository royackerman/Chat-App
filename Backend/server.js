// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const winston = require('winston');
const axios = require('axios');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
require('dotenv').config();
// const path = require('path');  // Added for serving React static files

// AWS Configuration
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const sqs = new AWS.SQS();
const ses = new AWS.SES();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"]
  }
});

app.use(cors());
// app.use(express.static(path.join(__dirname, 'public')));  // Added to serve React build files
app.use(express.json());

// // Handle any other routes and serve the React app's index.html
// app.get('*', (req, res) => {  // Added to handle all other routes with React
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// Database setup (RDS)
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  logging: false // Disable Sequelize's logging
});

// Models
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, unique: true },
  password: DataTypes.STRING,
  email: DataTypes.STRING,
  isAdmin: DataTypes.BOOLEAN
});

const Room = sequelize.define('Room', {
  name: DataTypes.STRING
});

const Message = sequelize.define('Message', {
  content: DataTypes.TEXT
});

const UserRoom = sequelize.define('UserRoom', {
  canManage: DataTypes.BOOLEAN
});

User.belongsToMany(Room, { through: UserRoom });
Room.belongsToMany(User, { through: UserRoom });
User.hasMany(Message);
Room.hasMany(Message);
Message.belongsTo(User);
Message.belongsTo(Room);

// Logging setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'chat-app' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Middleware for logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Webhook function
const sendWebhook = async (event, data) => {
  try {
    await axios.post(process.env.WEBHOOK_URL, { event, data });
    logger.info('Webhook sent', { event, data });
  } catch (error) {
    logger.error('Webhook error', { error: error.message, event, data });
  }
};

// SQS functions
const sendMessageToQueue = async (message) => {
  const params = {
    MessageBody: JSON.stringify(message),
    QueueUrl: process.env.SQS_QUEUE_URL
  };

  try {
    await sqs.sendMessage(params).promise();
    logger.info('Message sent to SQS', { messageId: message.id });
  } catch (error) {
    logger.error('Error sending message to SQS', { error: error.message, messageId: message.id });
  }
};

const processMessagesFromQueue = async () => {
  const params = {
    QueueUrl: process.env.SQS_QUEUE_URL,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20
  };

  try {
    const data = await sqs.receiveMessage(params).promise();
    if (data.Messages) {
      for (const message of data.Messages) {
        const messageBody = JSON.parse(message.Body);
        await processMessage(messageBody);
        await sqs.deleteMessage({
          QueueUrl: process.env.SQS_QUEUE_URL,
          ReceiptHandle: message.ReceiptHandle
        }).promise();
      }
    }
  } catch (error) {
    logger.error('Error processing messages from SQS', { error: error.message });
  }
};

const processMessage = async (message) => {
  try {
    await Message.create(message);
    io.to(message.RoomId).emit('new message', message);
    logger.info('Message processed and saved', { messageId: message.id });
  } catch (error) {
    logger.error('Error processing message', { error: error.message, messageId: message.id });
  }
};

// Start SQS message processing
setInterval(processMessagesFromQueue, 60000); // Process messages every minute

// SES function
const sendEmailNotification = async (to, subject, body) => {
  const params = {
    Destination: { ToAddresses: [to] },
    Message: {
      Body: { Text: { Data: body } },
      Subject: { Data: subject }
    },
    Source: process.env.SES_FROM_EMAIL
  };

  try {
    await ses.sendEmail(params).promise();
    logger.info('Email notification sent', { to, subject });
  } catch (error) {
    logger.error('Error sending email notification', { error: error.message, to, subject });
  }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Input validation middleware
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
};

// Socket.IO event handlers
io.on('connection', (socket) => {
  logger.info('New client connected', { socketId: socket.id });

  socket.on('join room', async ({ roomId, token }) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      const room = await Room.findByPk(roomId);
      if (user && room) {
        await UserRoom.findOrCreate({ where: { UserId: user.id, RoomId: room.id } });
        socket.join(roomId);
        const users = await room.getUsers();
        io.to(roomId).emit('user joined', { username: user.username, users: users.map(u => u.username) });
        logger.info('User joined room', { username: user.username, roomId });
        sendWebhook('user_joined', { username: user.username, roomId });
        sendEmailNotification(user.email, 'You joined a new room', `You have joined the room: ${room.name}`);
      }
    } catch (error) {
      logger.error('Error joining room', { error: error.message });
    }
  });

  socket.on('send message', async ({ roomId, message, token }) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      const room = await Room.findByPk(roomId);
      if (user && room) {
        const newMessage = { content: message, UserId: user.id, RoomId: room.id };
        await sendMessageToQueue(newMessage);
        logger.info('Message sent to queue', { username: user.username, roomId });
        sendWebhook('new_message', { username: user.username, roomId, message });
      }
    } catch (error) {
      logger.error('Error sending message', { error: error.message });
    }
  });

  socket.on('delete message', async ({ roomId, messageId, token }) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      const message = await Message.findByPk(messageId, { include: User });
      const userRoom = await UserRoom.findOne({ where: { UserId: user.id, RoomId: roomId } });
      if (user && message && (message.User.id === user.id || userRoom.canManage)) {
        await message.destroy();
        io.to(roomId).emit('message deleted', messageId);
        logger.info('Message deleted', { username: user.username, roomId, messageId });
        sendWebhook('message_deleted', { username: user.username, roomId, messageId });
      }
    } catch (error) {
      logger.error('Error deleting message', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// API Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword, email });
    logger.info('User registered', { username });
    sendEmailNotification(email, 'Welcome to Chat App', 'Thank you for registering with our chat application!');
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    logger.error('Error registering user', { error: error.message });
    res.status(500).json({ error: 'Error registering user' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '1h' });
      logger.info('User logged in', { username });
      res.json({ token });
    } else {
      res.status(400).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    logger.error('Error logging in', { error: error.message });
    res.status(500).json({ error: 'Error logging in' });
  }
});

app.post('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const room = await Room.create(req.body);
    await UserRoom.create({ UserId: req.user.id, RoomId: room.id, canManage: true });
    logger.info('Room created', { roomId: room.id, createdBy: req.user.username });
    sendWebhook('room_created', { roomId: room.id, createdBy: req.user.username });
    res.status(201).json(room);
  } catch (error) {
    logger.error('Error creating room', { error: error.message });
    res.status(500).json({ error: 'Error creating room' });
  }
});

app.get('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const userRooms = await UserRoom.findAll({ where: { UserId: req.user.id }, include: Room });
    const rooms = userRooms.map(ur => ur.Room);
    res.json(rooms);
  } catch (error) {
    logger.error('Error fetching rooms', { error: error.message });
    res.status(500).json({ error: 'Error fetching rooms' });
  }
});

app.post('/api/rooms/:roomId/users', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { username, canManage } = req.body;
    const user = await User.findOne({ where: { username } });
    const room = await Room.findByPk(roomId);
    const userRoom = await UserRoom.findOne({ where: { UserId: req.user.id, RoomId: roomId } });
    if (user && room && userRoom && userRoom.canManage) {
      await UserRoom.create({ UserId: user.id, RoomId: room.id, canManage });
      logger.info('User added to room', { username, roomId });
      sendWebhook('user_added_to_room', { username, roomId });
      sendEmailNotification(user.email, 'You were added to a new room', `You have been added to the room: ${room.name}`);
      res.status(200).json({ message: 'User added to room' });
    } else {
      res.status(404).json({ error: 'User or room not found, or insufficient permissions' });
    }
  } catch (error) {
    logger.error('Error adding user to room', { error: error.message });
    res.status(500).json({ error: 'Error adding user to room' });
  }
});

// Admin routes
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    logger.error('Error fetching users', { error: error.message });
    res.status(500).json({ error: 'Error fetching users' });
  }
});

app.get('/api/admin/rooms', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);
  try {
    const rooms = await Room.findAll({ include: User });
    res.json(rooms);
  } catch (error) {
    logger.error('Error fetching rooms', { error: error.message });
    res.status(500).json({ error: 'Error fetching rooms' });
  }
});

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Chat Application API',
      version: '1.0.0',
    },
  },
  apis: ['./server.js'], // path to API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Start server
// server.js (continued)

// Auto-scaling configuration
const autoScaling = new AWS.AutoScaling();

const updateAutoScalingGroup = async () => {
  const params = {
    AutoScalingGroupName: process.env.AUTO_SCALING_GROUP_NAME,
    MinSize: 1,
    MaxSize: 5,
    DesiredCapacity: 2
  };

  try {
    await autoScaling.updateAutoScalingGroup(params).promise();
    logger.info('Auto Scaling group updated');
  } catch (error) {
    logger.error('Error updating Auto Scaling group', { error: error.message });
  }
};

// VPC and Security Group setup
const ec2 = new AWS.EC2();

const createVpcAndSecurityGroup = async () => {
  try {
    // Create VPC
    const vpcResult = await ec2.createVpc({ CidrBlock: '10.0.0.0/16' }).promise();
    const vpcId = vpcResult.Vpc.VpcId;

    // Create Security Group
    const sgResult = await ec2.createSecurityGroup({
      GroupName: 'ChatAppSecurityGroup',
      Description: 'Security group for Chat Application',
      VpcId: vpcId
    }).promise();
    const groupId = sgResult.GroupId;

    // Add inbound rule
    await ec2.authorizeSecurityGroupIngress({
      GroupId: groupId,
      IpPermissions: [
        {
          IpProtocol: 'tcp',
          FromPort: 80,
          ToPort: 80,
          IpRanges: [{ CidrIp: '0.0.0.0/0' }]
        }
      ]
    }).promise();

    logger.info('VPC and Security Group created', { vpcId, securityGroupId: groupId });
  } catch (error) {
    logger.error('Error creating VPC and Security Group', { error: error.message });
  }
};

// API rate limiting
const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use("/api/", apiLimiter);

// Additional API routes

// Get messages for a room
app.get('/api/rooms/:roomId/messages', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.findAll({
      where: { RoomId: roomId },
      include: [{ model: User, attributes: ['username'] }],
      order: [['createdAt', 'ASC']]
    });
    res.json(messages);
  } catch (error) {
    logger.error('Error fetching messages', { error: error.message });
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// Update user profile
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;
    await User.update({ email }, { where: { id: req.user.id } });
    logger.info('User profile updated', { userId: req.user.id });
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    logger.error('Error updating user profile', { error: error.message });
    res.status(500).json({ error: 'Error updating user profile' });
  }
});

// Delete a room (admin only)
app.delete('/api/rooms/:roomId', authenticateToken, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);
  try {
    const { roomId } = req.params;
    await Room.destroy({ where: { id: roomId } });
    logger.info('Room deleted', { roomId, deletedBy: req.user.username });
    sendWebhook('room_deleted', { roomId, deletedBy: req.user.username });
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    logger.error('Error deleting room', { error: error.message });
    res.status(500).json({ error: 'Error deleting room' });
  }
});

// Swagger documentation
/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       500:
 *         description: Error registering user
 */

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Login user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Error logging in
 */

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message });
  res.status(500).json({ error: 'An unexpected error occurred' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    await sequelize.sync();
    console.log('Database synchronized');
    await createVpcAndSecurityGroup();
    await updateAutoScalingGroup();
  } catch (error) {
    console.error('Unable to start server:', error);
  }
});

module.exports = app; // For testing purposes