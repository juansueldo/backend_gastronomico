# API Gastronómico

API REST para la gestión de un local gastronómico, desarrollada con Node.js, Express, Sequelize y PostgreSQL (Supabase). Incluye autenticación por Bearer Token y custom header, y documentación interactiva con Swagger/OpenAPI.

## Características
- ABM de clientes
- Gestión de productos
- Reservas de mesas
- Órdenes (con opción de delivery o local)
- Autenticación por Bearer Token y custom header
- Documentación Swagger UI en `/docs`
- Especificaciones OpenAPI/Swagger disponibles en `/openapi.json` y `/swagger.json`

## Instalación
1. Clona el repositorio o copia los archivos en tu entorno.
2. Instala las dependencias:
   ```bash
   pnpm install
   ```
3. Renombra `.env.example` a `.env` y completa tus datos de Supabase y credenciales:
   ```env
   API_TOKEN=tu_token_secreto
   CUSTOM_HEADER_VALUE=valor_custom_header
   DB_HOST=tu_host_de_supabase
   DB_NAME=tu_nombre_db
   DB_USER=tu_usuario_db
   DB_PASSWORD=tu_password_db
   PORT=3000
   ```
4. Inicia el servidor:
   ```bash
   node index.js
   ```

## Autenticación
Todos los endpoints requieren:
- Header `Authorization: Bearer <API_TOKEN>`
- Header personalizado `x-custom-header: <CUSTOM_HEADER_VALUE>`

## Endpoints principales
- `/clientes` - ABM de clientes
- `/productos` - ABM de productos
- `/mesas` - ABM de mesas
- `/reservas` - Reservas de mesas
- `/ordenes` - Gestión de órdenes

Consulta la documentación y prueba los endpoints en:
- [http://localhost:3000/docs](http://localhost:3000/docs)
- [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json)
- [http://localhost:3000/swagger.json](http://localhost:3000/swagger.json)

## Tecnologías
- Node.js
- Express
- Sequelize
- PostgreSQL (Supabase)
- Swagger/OpenAPI

## Licencia
MIT
