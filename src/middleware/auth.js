// Middleware para autenticación con Bearer Token y custom header
export default function (req, res, next) {
  // Permitir acceso libre a la documentación y archivos estáticos de Swagger
  if (
    req.path === '/docs.html' ||
    req.path === '/swagger.json' ||
    req.path.startsWith('/swagger-ui')
  ) {
    return next();
  }
  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-header']; // Cambia el nombre según tu necesidad

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token Bearer requerido' });
  }
  const token = authHeader.split(' ')[1];

  // Aquí puedes validar el token como prefieras (ejemplo simple):
  if (token !== process.env.API_TOKEN) {
    return res.status(403).json({ error: 'Token inválido' });
  }

  // Validar custom header si es necesario
  if (!customHeader || customHeader !== process.env.CUSTOM_HEADER_VALUE) {
    return res.status(400).json({ error: 'Custom header inválido o faltante' });
  }

  next();
};
