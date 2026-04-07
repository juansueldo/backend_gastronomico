
import swaggerJSDoc from 'swagger-jsdoc';

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
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtenido del endpoint /auth/login'
        }
      }
    },
    tags: [
      { name: 'Auth', description: 'Autenticación y registro' },
      { name: 'Order', description: 'Gestión de órdenes' },
      { name: 'Customer', description: 'Gestión de clientes' },
      { name: 'Contact', description: 'Contactos de clientes' },
      { name: 'DeliveryZone', description: 'Zonas de entrega' },
      { name: 'Instance', description: 'Instancias de canales de comunicación' },
      { name: 'Network', description: 'Redes de comunicación' },
      { name: 'Product', description: 'Productos del catálogo' },
      { name: 'Category', description: 'Categorías de productos' },
      { name: 'Role', description: 'Roles de usuario' },
      { name: 'Status', description: 'Estados del sistema' },
      { name: 'Plan', description: 'Planes de suscripción' },
      { name: 'PlanPrice', description: 'Precios de planes (multi-moneda)' },
      { name: 'PlanFeatures', description: 'Características de planes' },
      { name: 'BillingCycle', description: 'Ciclos de facturación' },
      { name: 'Subscription', description: 'Suscripciones de tiendas' },
      { name: 'Table', description: 'Gestión de mesas del restaurante' },
      { name: 'Waiter', description: 'Gestión de mozos/camareros' }
    ]
  },
  apis: ['./src/routes/*.js'] // donde están tus endpoints
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
