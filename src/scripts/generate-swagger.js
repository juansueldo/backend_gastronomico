// Script para generar swagger.json a partir de tu configuración actual
import swaggerSpec from '../src/config/swagger';
import fs from 'node:fs';

fs.writeFileSync(
  __dirname + '/../public/swagger.json',
  JSON.stringify(swaggerSpec, null, 2)
);

