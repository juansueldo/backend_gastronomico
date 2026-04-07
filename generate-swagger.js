
import swaggerJSDoc from 'swagger-jsdoc';
import fs from 'node:fs';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Gastronómico',
      version: '1.0.0',
      description: 'Documentación de la API para el local gastronómico',
    },
    servers: [
      { url: 'https://backend-gastronomico.onrender.com' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
        customHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-custom-header',
        }
      }
    },
    security: [
      { bearerAuth: [] },
      { customHeader: [] }
    ]
  },
  apis: ['./src/routes/*.js'],
};


const swaggerSpec = swaggerJSDoc(swaggerOptions);
fs.writeFileSync('./public/swagger.json', JSON.stringify(swaggerSpec, null, 2));
console.log('swagger.json generado');
