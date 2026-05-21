import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

const tagByRoute = {
  auth: 'Auth',
  billingCycle: 'BillingCycle',
  category: 'Category',
  contact: 'Contact',
  customer: 'Customer',
  deliveryZone: 'DeliveryZone',
  headquarter: 'Headquarter',
  instance: 'Instance',
  localities: 'Locality',
  network: 'Network',
  notification: 'Notification',
  order: 'Order',
  plan: 'Plan',
  planFeatures: 'PlanFeatures',
  planPrice: 'PlanPrice',
  product: 'Product',
  role: 'Role',
  status: 'Status',
  storefront: 'Store',
  subscription: 'Subscription',
  table: 'Table',
  user: 'User',
  waiter: 'Waiter',
  websocket: 'WebSocket',
};

const entityByRoute = {
  auth: 'autenticacion',
  billingCycle: 'ciclo de facturacion',
  category: 'categoria',
  contact: 'contacto',
  customer: 'cliente',
  deliveryZone: 'zona de entrega',
  headquarter: 'sede',
  instance: 'instancia',
  localities: 'localidad',
  network: 'red',
  notification: 'notificacion',
  order: 'orden',
  plan: 'plan',
  planFeatures: 'caracteristica de plan',
  planPrice: 'precio de plan',
  product: 'producto',
  role: 'rol',
  status: 'estado',
  storefront: 'tienda publica',
  subscription: 'suscripcion',
  table: 'mesa',
  user: 'usuario',
  waiter: 'mozo',
  websocket: 'websocket',
};

const actionByMethod = {
  get: 'Consultar',
  post: 'Crear',
  put: 'Reemplazar',
  patch: 'Actualizar',
  delete: 'Eliminar',
};

const publicOperations = new Set([
  'POST /auth/register',
  'POST /auth/login',
  'GET /store/{slug}',
  'GET /store/{slug}/products',
  'POST /store/{slug}/orders',
]);

const normalizeMountPath = (mountPath) => mountPath
  .replaceAll('${version}', '')
  .replace(/^\/+/, '/')
  .replace(/\/$/, '');

const normalizeRoutePath = (routePath) => {
  const normalized = routePath === '/' ? '' : routePath;
  return normalized.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
};

const toPascalPart = (part) => part
  .replace(/-([a-z])/g, (_, char) => char.toUpperCase())
  .replace(/^([a-z])/, (_, char) => char.toUpperCase());

const toOperationId = (method, openApiPath) => {
  const suffix = openApiPath
    .replace(/[{}]/g, '')
    .split('/')
    .filter(Boolean)
    .map(toPascalPart)
    .join('');

  return `${method}${suffix}`;
};

const getPathParameters = (openApiPath) => {
  const parameters = [];
  for (const match of openApiPath.matchAll(/{([^}]+)}/g)) {
    parameters.push({
      name: match[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    });
  }
  return parameters;
};

const buildSummary = (method, routeName, openApiPath) => {
  if (openApiPath === '/auth/register') return 'Registrar usuario y tienda';
  if (openApiPath === '/auth/login') return 'Iniciar sesion';
  if (openApiPath === '/store/{slug}') return 'Consultar tienda publica';
  if (openApiPath === '/store/{slug}/products') return 'Listar productos de tienda publica';
  if (openApiPath === '/store/{slug}/orders') return 'Crear orden publica';
  if (openApiPath.endsWith('/status')) return `Cambiar estado de ${entityByRoute[routeName]}`;
  if (openApiPath.endsWith('/payment')) return 'Actualizar estado de pago de suscripcion';
  if (openApiPath.endsWith('/production')) return 'Marcar orden en produccion';
  if (openApiPath.endsWith('/ready')) return 'Marcar orden lista';
  if (openApiPath.endsWith('/finalize')) return 'Finalizar orden';
  if (openApiPath.endsWith('/check')) return 'Validar cobertura de zona de entrega';
  if (openApiPath.endsWith('/search')) return 'Buscar clientes';
  if (openApiPath.includes('/cash-register/close')) return 'Cerrar caja de sede';
  if (openApiPath.includes('/cash-register/periods')) return 'Listar periodos de caja de sede';
  if (openApiPath.includes('/cash-register')) return method === 'post' ? 'Abrir caja de sede' : 'Consultar caja activa de sede';
  if (openApiPath.endsWith('/schedules')) return 'Actualizar horarios de sede';
  if (method === 'get' && !openApiPath.includes('{')) return `Listar ${entityByRoute[routeName]}`;
  if (method === 'get') return `Consultar ${entityByRoute[routeName]}`;
  return `${actionByMethod[method]} ${entityByRoute[routeName]}`;
};

const buildOperation = ({ method, routeName, openApiPath, sourceFile, isProtected }) => {
  const upperMethod = method.toUpperCase();
  const operationKey = `${upperMethod} ${openApiPath}`;
  const parameters = getPathParameters(openApiPath);

  const operation = {
    tags: [tagByRoute[routeName] || routeName],
    summary: buildSummary(method, routeName, openApiPath),
    operationId: toOperationId(method, openApiPath),
    'x-source-file': sourceFile.replaceAll(path.sep, '/'),
    responses: {
      200: {
        description: 'Operacion ejecutada correctamente',
      },
      400: {
        description: 'Solicitud invalida',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      404: {
        description: 'Recurso no encontrado',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      500: {
        description: 'Error interno del servidor',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  };

  if (parameters.length) {
    operation.parameters = parameters;
  }

  if (isProtected && !publicOperations.has(operationKey)) {
    operation.security = [{ BearerAuth: [] }];
    operation.responses[401] = {
      description: 'No autenticado o token invalido',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    };
  }

  if (['post', 'put', 'patch'].includes(method)) {
    operation.requestBody = {
      required: method === 'post' || method === 'put',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
    };
  }

  if (method === 'post') {
    operation.responses[201] = {
      description: 'Recurso creado correctamente',
    };
  }

  if (method === 'delete') {
    operation.responses[204] = {
      description: 'Recurso eliminado correctamente',
    };
  }

  return operation;
};

const mergeOperation = (baseOperation, documentedOperation) => ({
  ...baseOperation,
  ...documentedOperation,
  responses: {
    ...baseOperation.responses,
    ...(documentedOperation?.responses || {}),
  },
});

export const buildRouteDocs = (documentedPaths = {}) => {
  const indexPath = path.join(projectRoot, 'index.js');
  const indexSource = fs.readFileSync(indexPath, 'utf8');
  const importByVariable = new Map();

  for (const match of indexSource.matchAll(/import\s+(\w+)\s+from\s+'\.\/src\/routes\/([^']+)\.js'/g)) {
    importByVariable.set(match[1], match[2]);
  }

  const generatedPaths = {};
  const mountRegex = /app\.use\(`([^`]+)`,\s*([^)]*?)(\w+Routes)\)/g;

  for (const match of indexSource.matchAll(mountRegex)) {
    const [, mountPath, middlewareList, routeVariable] = match;
    const routeName = importByVariable.get(routeVariable);
    if (!routeName) continue;

    const sourceFile = path.join('src', 'routes', `${routeName}.js`);
    const routePath = path.join(projectRoot, sourceFile);
    const routeSource = fs.readFileSync(routePath, 'utf8');
    const isMountProtected = middlewareList.includes('authRequired');
    const routeMethodRegex = /router\.(get|post|put|patch|delete)\('([^']+)'\s*(?:,\s*([^,)]*))?/g;

    for (const routeMatch of routeSource.matchAll(routeMethodRegex)) {
      const [, method, endpointPath, routeMiddleware = ''] = routeMatch;
      const openApiPath = `${normalizeMountPath(mountPath)}${normalizeRoutePath(endpointPath)}` || '/';
      const isProtected = isMountProtected || routeMiddleware.includes('authRequired');
      const operation = buildOperation({
        method,
        routeName,
        openApiPath,
        sourceFile,
        isProtected,
      });

      generatedPaths[openApiPath] = generatedPaths[openApiPath] || {};
      generatedPaths[openApiPath][method] = operation;
    }
  }

  for (const [openApiPath, methods] of Object.entries(documentedPaths || {})) {
    generatedPaths[openApiPath] = generatedPaths[openApiPath] || {};
    for (const [method, documentedOperation] of Object.entries(methods)) {
      generatedPaths[openApiPath][method] = mergeOperation(
        generatedPaths[openApiPath][method] || {},
        documentedOperation,
      );
    }
  }

  return generatedPaths;
};
