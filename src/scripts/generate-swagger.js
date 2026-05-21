import fs from 'node:fs';
import path from 'node:path';
import swaggerSpec from '../config/swagger.js';

const publicDir = path.join(process.cwd(), 'public');
const swaggerPath = path.join(publicDir, 'swagger.json');
const openApiPath = path.join(publicDir, 'openapi.json');

fs.writeFileSync(swaggerPath, JSON.stringify(swaggerSpec, null, 2));
fs.writeFileSync(openApiPath, JSON.stringify(swaggerSpec, null, 2));
console.log(`swagger.json generado en ${swaggerPath}`);
console.log(`openapi.json generado en ${openApiPath}`);

