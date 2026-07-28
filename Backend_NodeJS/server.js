const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const db = require('./src/config/db');
const dbInit = require('./src/config/dbInit');
const pricingEngine = require('./src/services/pricingEngine');

// Import routes
const authRoutes = require('./src/routes/auth');
const productRoutes = require('./src/routes/products');
const orderRoutes = require('./src/routes/orders');
const walletRoutes = require('./src/routes/wallet');
const adminRoutes = require('./src/routes/admin');
const p2pRoutes = require('./src/routes/p2p');
const aiRoutes = require('./src/routes/ai');
const deliveryRoutes = require('./src/routes/delivery');

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

const io = socketIo(server, {
  cors: corsOptions
});

app.set('socketio', io);

// Configure Swagger API Documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Food Stock Exchange API Documentation',
      version: '1.0.0',
      description: 'API specs for dynamic pricing restaurant system',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/p2p', p2pRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/delivery', deliveryRoutes);

app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

io.on('connection', (socket) => {
  console.log(`New Client Connected. Active connections: ${io.engine.clientsCount}`);

  socket.on('disconnect', () => {
    console.log(`Client Disconnected. Active connections: ${io.engine.clientsCount}`);
  });
});

// Initialize database, then start the pricing engine
dbInit().then(() => {
  pricingEngine.start(io);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`=================================================`);
});
