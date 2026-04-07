// Suprimir warnings de Node.js
import process from 'node:process';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { authOptional, authRequired } from './src/middleware/authMiddleware.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './src/config/swagger.js';

import authRoutes from './src/routes/auth.js';
import statusRoutes from './src/routes/status.js';
import networkRoutes from './src/routes/network.js';
import instanceRoutes from './src/routes/instance.js';
import customerRoutes from './src/routes/customer.js';
import contactRoutes from './src/routes/contact.js';
import planRoutes from './src/routes/plan.js';
import planPriceRoutes from './src/routes/planPrice.js';
import planFeaturesRoutes from './src/routes/planFeatures.js';
import billingCycleRoutes from './src/routes/billingCycle.js';
import roleRoutes from './src/routes/role.js';
import orderRoutes from './src/routes/order.js';
import deliveryZoneRoutes from './src/routes/deliveryZone.js';
import subscriptionRoutes from './src/routes/subscription.js';
import tableRoutes from './src/routes/table.js';
import waiterRoutes from './src/routes/waiter.js';
import productRoutes from './src/routes/product.js';
import userRoutes from './src/routes/user.js';
import websocketRoutes from './src/routes/websocket.js';


process.removeAllListeners('warning');
process.on('warning', () => {});

const app = express();


// Middleware JSON
app.use(express.json());
const app = express();


// Middleware JSON
app.use(express.json());
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin origin (Postman, curl, mobile apps)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

if (process.env.NODE_ENV !== 'production') {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/', (req, res) => res.redirect('/docs'));
} else {
  app.get('/', (req, res) => res.redirect('/docs.html'));
  app.get('/docs', (req, res) => res.redirect('/docs.html'));
  app.get('/docs', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'docs.html'));
  });
}


// Servir archivos estáticos (incluye docs.html, swagger.json, etc.)
app.use(express.static(path.join(process.cwd(), 'public')));


// Rutas públicas (sin autenticación)
app.use('/auth', authRoutes);

// Rutas con autenticación opcional (GET públicas, CREATE protegidas en la ruta)
app.use('/status', authOptional, statusRoutes);
app.use('/role', authOptional, roleRoutes);
app.use('/network', authOptional, networkRoutes);
app.use('/plan', authOptional, planRoutes);
app.use('/plan-price', authOptional, planPriceRoutes);
app.use('/plan-features', authOptional, planFeaturesRoutes);
app.use('/billing-cycle', authOptional, billingCycleRoutes);
app.use('/instance', authOptional, instanceRoutes);

// Rutas de datos (mixtas)
app.use('/customer', authOptional, customerRoutes);
app.use('/contact', authOptional, contactRoutes);

// Rutas protegidas (requieren autenticación válida)
app.use('/order', authRequired, orderRoutes);
app.use('/delivery-zone', authRequired, deliveryZoneRoutes);
app.use('/subscription', authRequired, subscriptionRoutes);
app.use('/table', authRequired, tableRoutes);
app.use('/waiter', authRequired, waiterRoutes);
app.use('/product', authRequired, productRoutes);
app.use('/user', authRequired, userRoutes);

// Rutas WebSocket (status y debugging)
app.use('/websocket', authOptional, websocketRoutes);


export default app;
