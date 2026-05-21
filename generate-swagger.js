
import fs from 'node:fs';
import swaggerSpec from './src/config/swagger.js';

fs.writeFileSync('./public/swagger.json', JSON.stringify(swaggerSpec, null, 2));
fs.writeFileSync('./public/openapi.json', JSON.stringify(swaggerSpec, null, 2));
console.log('swagger.json y openapi.json generados');
