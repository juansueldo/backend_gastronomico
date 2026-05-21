
import swaggerJSDoc from 'swagger-jsdoc';
import { buildRouteDocs } from './routeDocs.js';

const version = process.env.API_VERSION || 'v1';
const renderUrl = process.env.RENDER_EXTERNAL_URL || 'https://backend-gastronomico.onrender.com';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Gastronómico',
      version: '1.0.0',
      description: 'Documentación de la API Multi-Tenant para Restaurantes',
      contact: {
        name: 'Soporte API',
        email: 'api@gastronomico.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/${version}`,
        description: 'Servidor local'
      },
      {
        url: `${renderUrl}/${version}`,
        description: 'Servidor desplegado'
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtenido del endpoint /auth/login'
        }
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Descripcion del error'
            },
            message: {
              type: 'string',
              example: 'Mensaje opcional del error'
            }
          },
          additionalProperties: true
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'Autenticación y registro' },
      { name: 'Store', description: 'Storefront público y perfil de tienda' },
      { name: 'Order', description: 'Gestión de órdenes' },
      { name: 'Customer', description: 'Gestión de clientes' },
      { name: 'Contact', description: 'Contactos de clientes' },
      { name: 'DeliveryZone', description: 'Zonas de entrega' },
      { name: 'Locality', description: 'Localidades derivadas de zonas de entrega' },
      { name: 'Instance', description: 'Instancias de canales de comunicación' },
      { name: 'Network', description: 'Redes de comunicación' },
      { name: 'Product', description: 'Productos del catálogo' },
      { name: 'Category', description: 'Gestión de categorías' },
      { name: 'Role', description: 'Roles de usuario' },
      { name: 'Status', description: 'Estados del sistema' },
      { name: 'Plan', description: 'Planes de suscripción' },
      { name: 'PlanPrice', description: 'Precios de planes (multi-moneda)' },
      { name: 'PlanFeatures', description: 'Características de planes' },
      { name: 'BillingCycle', description: 'Ciclos de facturación' },
      { name: 'Subscription', description: 'Suscripciones de tiendas' },
      { name: 'Table', description: 'Gestión de mesas del restaurante' },
      { name: 'Waiter', description: 'Gestión de mozos/camareros' },
      { name: 'User', description: 'Gestión de usuarios internos' },
      { name: 'Headquarter', description: 'Gestión de sedes de la tienda' },
      { name: 'CashRegister', description: 'Gestión de caja por sede' },
      { name: 'Notification', description: 'Notificaciones internas' },
      { name: 'WebSocket', description: 'Documentación de integración websocket' },
    ]
  },
  apis: ['./src/routes/*.js'] // donde están tus endpoints
};

const swaggerSpec = swaggerJSDoc(options);
swaggerSpec.paths = buildRouteDocs(swaggerSpec.paths);

export default swaggerSpec;
