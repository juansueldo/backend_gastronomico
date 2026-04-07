# Guía de Uso de la API - Autenticación y Endpoints

## 🔐 Autenticación

### 1. Registro (Público)
```bash
POST /auth/register

{
  "storename": "Mi Restaurante",
  "slug": "mi-restaurante",
  "timezone": "UTC-3",
  "location": "Montevideo",
  "firstname": "Juan",
  "lastname": "Pérez",
  "username": "juanperez",
  "email": "juan@example.com",
  "password": "securepassword123"
}
```

**Response (201):**
```json
{
  "store": {
    "id": 1,
    "name": "Mi Restaurante",
    "slug": "mi-restaurante",
    "statusId": 1
  },
  "user": {
    "id": 1,
    "firstname": "Juan",
    "lastname": "Pérez",
    "email": "juan@example.com",
    "username": "juanperez",
    "storeId": 1,
    "roleId": 1
  }
}
```

### 2. Login (Público)
```bash
POST /auth/login

{
  "username": "juanperez",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "firstname": "Juan",
    "lastname": "Pérez",
    "email": "juan@example.com",
    "customerId": null,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Token JWT (Automático)
El token contiene:
```javascript
{
  id: 1,
  email: "juan@example.com",
  storeId: 1,
  roleId: 1,
  username: "juanperez",
  iat: 1234567890,
  exp: 1234654290  // Expira en 24 horas
}
```

---

## 📨 Uso del Token en Requests

### Headers Necesarios
```bash
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Ejemplo con curl:**
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
     -H "Content-Type: application/json" \
     https://api.example.com/status
```

**Ejemplo con fetch (JavaScript):**
```javascript
const token = localStorage.getItem('token');

const response = await fetch('https://api.example.com/status', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Activo'
  })
});

const data = await response.json();
```

---

## 📋 Endpoints por Categoría

### Status (Estados)
```
POST   /status                  → Crear (PROTEGIDO)
GET    /status                  → Listar (Público)
GET    /status/:id              → Obtener (Público)
PATCH  /status/:id              → Actualizar (PROTEGIDO)
DELETE /status/:id              → Eliminar (PROTEGIDO)
```

### Role (Roles)
```
POST   /role                    → Crear (PROTEGIDO)
GET    /role                    → Listar (Público)
GET    /role/:id                → Obtener (Público)
PATCH  /role/:id                → Actualizar (PROTEGIDO)
DELETE /role/:id                → Eliminar (PROTEGIDO)
```

### Network (Redes/Canales)
```
POST   /network                 → Crear (PROTEGIDO)
GET    /network                 → Listar (Público)
GET    /network/:id             → Obtener (Público)
PATCH  /network/:id             → Actualizar (PROTEGIDO)
DELETE /network/:id             → Eliminar (PROTEGIDO)
```

### Plan
```
POST   /plan                    → Crear (PROTEGIDO)
GET    /plan                    → Listar (Público)
GET    /plan/:id                → Obtener (Público)
PATCH  /plan/:id                → Actualizar (PROTEGIDO)
DELETE /plan/:id                → Eliminar (PROTEGIDO)
```

### Billing Cycle (Ciclos de Facturación)
```
POST   /billing-cycle           → Crear (PROTEGIDO)
GET    /billing-cycle           → Listar (Público)
GET    /billing-cycle/:id       → Obtener (Público)
PATCH  /billing-cycle/:id       → Actualizar (PROTEGIDO)
DELETE /billing-cycle/:id       → Eliminar (PROTEGIDO)
```

### Plan Features
```
POST   /plan-features           → Crear (PROTEGIDO)
GET    /plan-features/id/:id    → Obtener por ID (Público)
GET    /plan-features/plan/:id  → Listar por Plan (Público)
PATCH  /plan-features/:id       → Actualizar (PROTEGIDO)
DELETE /plan-features/:id       → Eliminar (PROTEGIDO)
```

### Customer
```
POST   /customer                → Crear (storeId en token)
GET    /customer                → Listar (Público)
GET    /customer/:id            → Obtener (Público)
```

### Contact
```
POST   /contact                 → Crear (storeId en token)
GET    /contact/customer/:id    → Listar por Cliente
GET    /contact/instance/:id    → Listar por Instancia
GET    /contact/:id             → Obtener
PATCH  /contact/:id             → Actualizar (PROTEGIDO)
DELETE /contact/:id             → Eliminar (PROTEGIDO)
```

### Order
```
POST   /order                   → Crear (PROTEGIDO)
GET    /order/:id               → Obtener (PROTEGIDO)
GET    /order?storeId=X         → Listar (PROTEGIDO)
PATCH  /order/:id/status        → Cambiar estado (PROTEGIDO)
DELETE /order/:id               → Eliminar (PROTEGIDO)
```

### Delivery Zone
```
POST   /delivery-zone           → Crear (PROTEGIDO)
GET    /delivery-zone?storeId=X → Listar (PROTEGIDO)
GET    /delivery-zone/:id       → Obtener (PROTEGIDO)
PATCH  /delivery-zone/:id       → Actualizar (PROTEGIDO)
DELETE /delivery-zone/:id       → Eliminar (PROTEGIDO)
```

---

## 💡 Cómo Pasar storeId

**NO necesitas enviar storeId manualmente en el request body.** ✅

El `storeId` está **automáticamente disponible** en el token JWT:

```javascript
// En el BACKEND
app.post('/order', authRequired, async (req, res) => {
  const storeId = req.user.storeId;  // ← Obtenido del token
  const userId = req.user.id;        // ← También del token
  
  // Usar storeId para validaciones y querys
});
```

### Cómo funciona el flow:
1. **Login** → Backend devuelve JWT con `storeId`
2. **Frontend** → Guarda el token
3. **Request** → Envía `Authorization: Bearer {token}`
4. **Backend** → Valida token, extrae `req.user.storeId`
5. **Automático** → Todos los datos se filtran por `storeId` verificado

---

## 📝 Ejemplos Prácticos

### Crear un Status (Protegido)
```bash
curl -X POST http://localhost:3000/status \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Activo"}'
```

### Listar Status (Público)
```bash
curl http://localhost:3000/status
```

### Crear una Orden (Protegido)
```bash
curl -X POST http://localhost:3000/order \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "items": [{"productId": 1, "quantity": 2}],
    "type": "delivery",
    "delivery_address": "Calle 123",
    "delivery_latitude": -33.86,
    "delivery_longitude": -56.16,
    "delivery_date": "2026-04-03T18:00:00Z"
  }'
```

(storeId se obtiene automáticamente del token)

---

## 🚨 Errores Comunes

| Código | Descripción | Solución |
|--------|-------------|----------|
| 401 | Token Bearer requerido | Enviar `Authorization: Bearer {token}` en headers |
| 403 | Token inválido o expirado | Re-hacer login para obtener nuevo token |
| 404 | Recurso no encontrado | Verificar ID y permisos |
| 400 | Validación fallida | Revisar request body |

---

## 🔄 Ciclo de Vida del Token

```
1. User login
   ↓
2. Backend genera JWT (24 horas)
   ↓
3. Frontend recibe token
   ↓
4. Frontend almacena en localStorage/sessionStorage
   ↓
5. Frontend envía en cada request protected
   ↓
6. Backend valida y extrae req.user
   ↓
7. Si expira (24h) → usuario debe hacer login nuevamente
```

---

## 📋 Próximos Pasos

Actualizar rutas faltantes con protección:
- [ ] network.js - Agregar GET, PATCH, DELETE
- [ ] plan.js - Agregar GET, PATCH, DELETE  
- [ ] plan-features.js - Crear archivo con CRUD completo
- [ ] billing-cycle.js - Agregar GET, PATCH, DELETE

Patrón a seguir:
```javascript
import { authRequired } from '../middleware/authMiddleware.js';

router.post('/', authRequired, Controller.create);
router.get('/', Controller.getAll);  // Público
router.get('/:id', Controller.getById);  // Público
router.patch('/:id', authRequired, Controller.update);
router.delete('/:id', authRequired, Controller.delete);
```
