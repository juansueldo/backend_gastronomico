# 📚 API Endpoints Documentation

Documentación completa de todos los endpoints disponibles en la API Gastronómico.

## 🔐 Autenticación

Todos los endpoints protegidos requieren un JWT token en el header:
```
Authorization: Bearer <token>
```

El token se obtiene al hacer login y contiene: `{id, email, storeId, roleId, username}`

---

## 📋 Endpoints por Categoría

### 🔑 Auth
- **POST** `/auth/register` - Registrar nuevo usuario y tienda
  - Body: `{storename, slug, timezone, location, firstname, lastname, username, email, password}`
  - Response: `{store, user, token}`

- **POST** `/auth/login` - Iniciar sesión
  - Body: `{username, password}`
  - Response: `{message, user, token}`

---

### 🍽️ Order (Órdenes)
- **POST** `/order` - Crear una nueva orden ⭐ Protegido
  - Validación automática de zonas de entrega si es delivery
  - Cálculo automático de totales
  - Body: `{customerId, orderType, items[], totalPrice, deliveryAddress?, deliveryCoordinates?}`

- **GET** `/order` - Obtener órdenes de la tienda ⭐ Protegido
  - Filtra automáticamente por storeId
  - Parámetros: `page, limit, status`

- **GET** `/order/{id}` - Obtener detalle de una orden ⭐ Protegido

- **PATCH** `/order/{id}` - Actualizar orden ⭐ Protegido

- **PATCH** `/order/{id}/status` - Cambiar estado de orden ⭐ Protegido
  - Body: `{status: "pending|confirmed|preparing|ready|delivered|cancelled"}`

- **DELETE** `/order/{id}` - Eliminar orden ⭐ Protegido

---

### 👥 Customer (Clientes)
- **POST** `/customer` - Crear nuevo cliente ⭐ Protegido
  - Body: `{firstname, lastname, phone, email, metadata}`
  - storeId se toma automáticamente del token

- **GET** `/customer` - Obtener todos los clientes ⭐ Protegido
  - Filtra automáticamente por storeId
  - Parámetros: `page, limit`

- **GET** `/customer/{id}` - Obtener detalle de cliente ⭐ Protegido

- **PATCH** `/customer/{id}` - Actualizar cliente ⭐ Protegido

- **DELETE** `/customer/{id}` - Eliminar cliente ⭐ Protegido

---

### 📞 Contact (Contactos de Clientes)
- **POST** `/contact` - Crear contacto para cliente ⭐ Protegido
  - Body: `{customerId, instanceId, identifier (phone/email)}`
  - Valida que customer e instance pertenezcan a la misma tienda

- **GET** `/contact` - Obtener todos los contactos ⭐ Protegido
  - Filtra por storeId

- **GET** `/contact/{id}` - Obtener detalle de contacto ⭐ Protegido

- **GET** `/contact/customer/{customerId}` - Obtener contactos de un cliente

- **PATCH** `/contact/{id}` - Actualizar contacto ⭐ Protegido

- **DELETE** `/contact/{id}` - Eliminar contacto ⭐ Protegido

---

### 🚗 DeliveryZone (Zonas de Entrega)
- **POST** `/delivery-zone` - Crear zona de entrega ⭐ Protegido
  - Body: `{name, polygon (GeoJSON), status}`
  - Usa PostGIS para geometría

- **GET** `/delivery-zone` - Obtener zonas ⭐ Protegido

- **GET** `/delivery-zone/{id}` - Obtener detalle ⭐ Protegido

- **GET** `/delivery-zone/point/{lat}/{lon}` - Validar si punto está en zona

- **PATCH** `/delivery-zone/{id}` - Actualizar zona ⭐ Protegido

- **DELETE** `/delivery-zone/{id}` - Eliminar zona ⭐ Protegido

---

### 📡 Instance (Canales de Comunicación)
- **POST** `/instance` - Crear instancia de canal ⭐ Protegido
  - Body: `{networkId, name, identifier, credentials, metadata}`
  - Ejemplo: WhatsApp, Email, Telegram, SMS

- **GET** `/instance` - Obtener todas las instancias ⭐ Protegido

- **GET** `/instance/{id}` - Obtener detalle ⭐ Protegido

- **PATCH** `/instance/{id}` - Actualizar instancia ⭐ Protegido

- **DELETE** `/instance/{id}` - Eliminar instancia ⭐ Protegido

---

### 🌐 Network (Redes de Comunicación)
- **POST** `/network` - Crear red de comunicación ⭐ Protegido
  - Body: `{name, slug, type (whatsapp|email|telegram|sms|social), icon}`

- **GET** `/network` - Obtener todas las redes (Público)

- **GET** `/network/{id}` - Obtener detalle

- **PATCH** `/network/{id}` - Actualizar red ⭐ Protegido

- **DELETE** `/network/{id}` - Eliminar red ⭐ Protegido

---

### 📋 Role (Roles de Usuario)
- **POST** `/role` - Crear rol ⭐ Protegido
  - Body: `{name, slug, description}`

- **GET** `/role` - Obtener todos los roles (Público)

- **GET** `/role/{id}` - Obtener detalle

- **PATCH** `/role/{id}` - Actualizar rol ⭐ Protegido

- **DELETE** `/role/{id}` - Eliminar rol ⭐ Protegido

---

### ✅ Status (Estados del Sistema)
- **POST** `/status` - Crear estado ⭐ Protegido
  - Body: `{name, slug, description, type}`

- **GET** `/status` - Obtener todos los estados (Público)

- **GET** `/status/{id}` - Obtener detalle

- **PATCH** `/status/{id}` - Actualizar estado ⭐ Protegido

- **DELETE** `/status/{id}` - Eliminar estado ⭐ Protegido

---

### 💳 Plan (Planes de Suscripción)
- **POST** `/plan` - Crear plan ⭐ Protegido
  - Body: `{name, slug, description, price, billingCycle}`

- **GET** `/plan` - Obtener todos los planes (Público)

- **GET** `/plan/{id}` - Obtener detalle

- **PATCH** `/plan/{id}` - Actualizar plan ⭐ Protegido

- **PATCH** `/plan/{id}/status` - Cambiar estado ⭐ Protegido

- **DELETE** `/plan/{id}` - Eliminar plan ⭐ Protegido

---

### 💰 PlanPrice (Precios de Planes - Multi-moneda)
- **POST** `/plan-price` - Crear precio para un plan ⭐ Protegido
  - Body: `{planId, price, currency}`
  - Soporta múltiples monedas por plan (USD, EUR, UYU, ARS, etc.)

- **GET** `/plan-price` - Obtener todos los precios (Público)

- **GET** `/plan-price/{id}` - Obtener detalle de un precio

- **GET** `/plan-price/plan/{planId}` - Obtener precios de un plan específico

- **PATCH** `/plan-price/{id}` - Actualizar precio ⭐ Protegido

- **PATCH** `/plan-price/{id}/status` - Cambiar estado ⭐ Protegido

- **DELETE** `/plan-price/{id}` - Eliminar precio ⭐ Protegido

---

### ⭐ PlanFeatures (Características de Planes)
- **POST** `/plan-features` - Crear característica ⭐ Protegido
  - Body: `{planId, name, slug, description, value}`

- **GET** `/plan-features/plan/{planId}` - Obtener características de un plan (Público)

- **GET** `/plan-features/{id}` - Obtener detalle

- **PATCH** `/plan-features/{id}` - Actualizar característica ⭐ Protegido

- **PATCH** `/plan-features/{id}/status` - Cambiar estado ⭐ Protegido

- **DELETE** `/plan-features/{id}` - Eliminar característica ⭐ Protegido

---

### 📅 BillingCycle (Ciclos de Facturación)
- **POST** `/billing-cycle` - Crear ciclo ⭐ Protegido
  - Body: `{name, slug, days, description}`
  - Ejemplo: {name: "Mensual", slug: "monthly", days: 30}

- **GET** `/billing-cycle` - Obtener todos los ciclos (Público)

- **GET** `/billing-cycle/{id}` - Obtener detalle

- **PATCH** `/billing-cycle/{id}` - Actualizar ciclo ⭐ Protegido

- **PATCH** `/billing-cycle/{id}/status` - Cambiar estado ⭐ Protegido

- **DELETE** `/billing-cycle/{id}` - Eliminar ciclo ⭐ Protegido

---

## 🔒 Matiz de Protección

### ⭐ Protegido (authRequired)
Requiere JWT válido en header `Authorization: Bearer <token>`

**Endpoints protegidos:**
- Todas las mutaciones (POST, PATCH, DELETE)
- Order: Todos los métodos
- DeliveryZone: Todos los métodos
- Customer: Todos los métodos
- Contact: Todos los métodos
- Instance: Todos los métodos

### 📖 Públicos (GET)
Los endpoints GET de Role, Status, Network, Plan, BillingCycle, PlanFeatures son públicos para consultas de información estática.

### 🔓 Públicos Completos
- `/auth/register` - Registración pública
- `/auth/login` - Login público

---

## 📊 Response Format

### Éxito (2xx)
```json
{
  "id": 1,
  "name": "...",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Error (4xx/5xx)
```json
{
  "error": "Descrición del error"
}
```

---

## 🚀 Uso Común

### 1. Registro y Login
```bash
# Registrarse
POST /auth/register
{
  "storename": "Mi Restaurante",
  "slug": "mi-restaurante",
  "firstname": "Juan",
  "lastname": "Pérez",
  "username": "juan",
  "email": "juan@example.com",
  "password": "secure123"
}

# Login
POST /auth/login
{
  "username": "juan",
  "password": "secure123"
}
# Response incluye token JWT
```

### 2. Crear Orden
```bash
POST /order
Authorization: Bearer <token>
{
  "customerId": 1,
  "orderType": "delivery",
  "items": [
    {"productId": 1, "quantity": 2, "price": 15.50}
  ],
  "totalPrice": 31.00,
  "deliveryAddress": "Calle Principal 123",
  "deliveryCoordinates": [-56.1629, -34.9011]
}
```

### 3. Configurar Instancia WhatsApp
```bash
POST /instance
Authorization: Bearer <token>
{
  "networkId": 1,
  "name": "WhatsApp Ventas",
  "identifier": "+598912345678",
  "credentials": {
    "token": "xxx",
    "secret": "yyy"
  }
}
```

### 4. Crear Plan con Precios Multi-moneda
```bash
# Crear plan
POST /plan
Authorization: Bearer <token>
{
  "name": "Plan Pro",
  "slug": "plan-pro",
  "description": "Plan profesional",
  "billingCycle": "monthly"
}

# Agregar precio en USD
POST /plan-price
Authorization: Bearer <token>
{
  "planId": 1,
  "price": 99.99,
  "currency": "USD"
}

# Agregar precio en UYU
POST /plan-price
Authorization: Bearer <token>
{
  "planId": 1,
  "price": 3500.00,
  "currency": "UYU"
}

# Agregar característica al plan
POST /plan-features
Authorization: Bearer <token>
{
  "planId": 1,
  "feature": "API Calls",
  "description": "Llamadas API ilimitadas",
  "key": "api_calls",
  "value": "unlimited"
}
```

### 5. Crear Suscripción
```bash
POST /subscription
Authorization: Bearer <token>
{
  "planId": 1,
  "billingCycleId": 1
}

# Actualizar estado de pago
PATCH /subscription/1/payment
Authorization: Bearer <token>
{
  "payment": 1
}
```

---

## ⚠️ Notas Importantes

1. **storeId automático**: Se obtiene del token JWT, no necesita incluirse en el body
2. **Multi-tenant**: Todos los datos se filtran automáticamente por storeId del usuario
3. **PostGIS**: Las zonas de entrega usan geometría espacial (POLYGON)
4. **Tokens**: Expiran en 24 horas, se renuevan con nuevo login
5. **Validación**: Se validan relaciones entre entidades (customer→store, instance→store)
6. **Multi-moneda**: Soporta múltiples monedas por plan (USD, EUR, UYU, ARS, BRL, etc.)

---

## 📚 Acceder a Swagger UI

Mientras el servidor esté corriendo:
```
http://localhost:3000/docs
```

Todos los endpoints están documentados con ejemplos de request/response.

---

**Última actualización**: 2024
**Versión API**: 1.0.0
