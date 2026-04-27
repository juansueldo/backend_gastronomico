import fs from 'node:fs';
import path from 'node:path';
import swaggerSpec from '../config/swagger.js';

const outputPath = path.join(process.cwd(), 'public', 'swagger.json');

fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
console.log(`swagger.json generado en ${outputPath}`);

