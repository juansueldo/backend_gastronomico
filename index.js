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
import categoryRoutes from './src/routes/category.js';
import productRoutes from './src/routes/product.js';
import userRoutes from './src/routes/user.js';
import websocketRoutes from './src/routes/websocket.js';

const version = process.env.API_VERSION || 'v1';
process.removeAllListeners('warning');
process.on('warning', () => {});


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

// Middleware CORS
app.use(cors(corsOptions));

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
app.use(`/${version}/auth`, authRoutes);

// Rutas con autenticación opcional (GET públicas, CREATE protegidas en la ruta)
app.use(`/${version}/status`, authOptional, statusRoutes);
app.use(`/${version}/role`, authOptional, roleRoutes);
app.use(`/${version}/network`, authOptional, networkRoutes);
app.use(`/${version}/plan`, authOptional, planRoutes);
app.use(`/${version}/plan-price`, authOptional, planPriceRoutes);
app.use(`/${version}/plan-features`, authOptional, planFeaturesRoutes);
app.use(`/${version}/billing-cycle`, authOptional, billingCycleRoutes);
app.use(`/${version}/instance`, authOptional, instanceRoutes);

// Rutas de datos (mixtas)
app.use(`/${version}/customer`, authOptional, customerRoutes);
app.use(`/${version}/contact`, authOptional, contactRoutes);

// Rutas protegidas (requieren autenticación válida)
app.use(`/${version}/order`, authRequired, orderRoutes);
app.use(`/${version}/delivery-zone`, authRequired, deliveryZoneRoutes);
app.use(`/${version}/subscription`, authRequired, subscriptionRoutes);
app.use(`/${version}/table`, authRequired, tableRoutes);
app.use(`/${version}/waiter`, authRequired, waiterRoutes);
app.use(`/${version}/category`, authRequired, categoryRoutes);
app.use(`/${version}/product`, authRequired, productRoutes);
app.use(`/${version}/user`, authRequired, userRoutes);

// Rutas WebSocket (status y debugging)
app.use(`/${version}/websocket`, authOptional, websocketRoutes);


export default app;
