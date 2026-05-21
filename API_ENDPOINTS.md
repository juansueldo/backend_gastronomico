# API Endpoints

Documentacion de referencia para la API Gastronomico.

La fuente tecnica principal es OpenAPI 3.0:

- Swagger UI: `GET /docs`
- OpenAPI JSON: `GET /openapi.json`
- Swagger-compatible JSON: `GET /swagger.json`

Base URL local por defecto: `http://localhost:3000/v1`

Los endpoints protegidos requieren:

```http
Authorization: Bearer <token>
```

El token se obtiene en `POST /v1/auth/login`.

## Auth

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/auth/register` | Publico | Registrar usuario y tienda |
| POST | `/v1/auth/login` | Publico | Iniciar sesion |

## Store

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| PATCH | `/v1/store/profile-image` | Requerida | Actualizar imagen de perfil de la tienda |
| GET | `/v1/store/{slug}` | Publico | Consultar tienda publica |
| GET | `/v1/store/{slug}/products` | Publico | Listar productos de una tienda publica |
| POST | `/v1/store/{slug}/orders` | Publico | Crear orden desde tienda publica |

## Status

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/status` | Requerida | Crear estado |
| GET | `/v1/status` | Opcional | Listar estados |
| GET | `/v1/status/{id}` | Opcional | Consultar estado |
| PATCH | `/v1/status/{id}` | Requerida | Actualizar estado |
| DELETE | `/v1/status/{id}` | Requerida | Eliminar estado |

## Role

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/role` | Requerida | Crear rol |
| GET | `/v1/role` | Opcional | Listar roles |
| GET | `/v1/role/{id}` | Opcional | Consultar rol |
| PATCH | `/v1/role/{id}` | Requerida | Actualizar rol |
| DELETE | `/v1/role/{id}` | Requerida | Eliminar rol |

## Network

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/network` | Requerida | Crear red |
| GET | `/v1/network` | Opcional | Listar redes |
| GET | `/v1/network/{id}` | Opcional | Consultar red |
| PATCH | `/v1/network/{id}` | Requerida | Actualizar red |
| DELETE | `/v1/network/{id}` | Requerida | Eliminar red |

## Plan

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/plan` | Requerida | Crear plan |
| GET | `/v1/plan` | Opcional | Listar planes |
| GET | `/v1/plan/{id}` | Opcional | Consultar plan |
| PATCH | `/v1/plan/{id}` | Requerida | Actualizar plan |
| PATCH | `/v1/plan/{id}/status` | Requerida | Cambiar estado de plan |
| DELETE | `/v1/plan/{id}` | Requerida | Eliminar plan |

## PlanPrice

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/plan-price` | Requerida | Crear precio de plan |
| GET | `/v1/plan-price` | Opcional | Listar precios |
| GET | `/v1/plan-price/plan/{planId}` | Opcional | Listar precios de un plan |
| GET | `/v1/plan-price/{id}` | Opcional | Consultar precio |
| PATCH | `/v1/plan-price/{id}` | Requerida | Actualizar precio |
| PATCH | `/v1/plan-price/{id}/status` | Requerida | Cambiar estado de precio |
| DELETE | `/v1/plan-price/{id}` | Requerida | Eliminar precio |

## PlanFeatures

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/plan-features` | Requerida | Crear caracteristica de plan |
| GET | `/v1/plan-features/plan/{planId}` | Opcional | Listar caracteristicas de un plan |
| GET | `/v1/plan-features/{id}` | Opcional | Consultar caracteristica |
| PATCH | `/v1/plan-features/{id}` | Requerida | Actualizar caracteristica |
| PATCH | `/v1/plan-features/{id}/status` | Requerida | Cambiar estado de caracteristica |
| DELETE | `/v1/plan-features/{id}` | Requerida | Eliminar caracteristica |

## BillingCycle

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/billing-cycle` | Requerida | Crear ciclo de facturacion |
| GET | `/v1/billing-cycle` | Opcional | Listar ciclos |
| GET | `/v1/billing-cycle/{id}` | Opcional | Consultar ciclo |
| PATCH | `/v1/billing-cycle/{id}` | Requerida | Actualizar ciclo |
| PATCH | `/v1/billing-cycle/{id}/status` | Requerida | Cambiar estado de ciclo |
| DELETE | `/v1/billing-cycle/{id}` | Requerida | Eliminar ciclo |

## Instance

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/instance` | Requerida | Crear instancia |
| GET | `/v1/instance` | Requerida | Listar instancias |
| GET | `/v1/instance/{id}` | Requerida | Consultar instancia |
| PATCH | `/v1/instance/{id}` | Requerida | Actualizar instancia |
| DELETE | `/v1/instance/{id}` | Requerida | Eliminar instancia |

## Customer

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| GET | `/v1/customer/search` | Requerida | Buscar clientes |
| POST | `/v1/customer` | Requerida | Crear cliente |
| GET | `/v1/customer` | Requerida | Listar clientes |
| GET | `/v1/customer/{id}` | Requerida | Consultar cliente |
| PATCH | `/v1/customer/{id}` | Requerida | Actualizar cliente |
| DELETE | `/v1/customer/{id}` | Requerida | Eliminar cliente |

## Contact

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/contact` | Opcional | Crear contacto |
| GET | `/v1/contact/customer/{customerId}` | Opcional | Listar contactos por cliente |
| GET | `/v1/contact/instance/{instanceId}` | Opcional | Listar contactos por instancia |
| GET | `/v1/contact/{id}` | Opcional | Consultar contacto |
| PATCH | `/v1/contact/{id}` | Opcional | Actualizar contacto |
| PATCH | `/v1/contact/{id}/status` | Opcional | Cambiar estado de contacto |
| DELETE | `/v1/contact/{id}` | Opcional | Eliminar contacto |

## Order

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/order` | Requerida | Crear orden |
| GET | `/v1/order` | Requerida | Listar ordenes |
| GET | `/v1/order/{id}` | Requerida | Consultar orden |
| PATCH | `/v1/order/{id}/status` | Requerida | Cambiar estado de orden |
| PATCH | `/v1/order/{id}/production` | Requerida | Marcar orden en produccion |
| PATCH | `/v1/order/{id}/ready` | Requerida | Marcar orden lista |
| PATCH | `/v1/order/{id}/finalize` | Requerida | Finalizar orden |
| DELETE | `/v1/order/{id}` | Requerida | Eliminar orden |

## DeliveryZone

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/delivery-zone` | Opcional | Crear zona de entrega |
| GET | `/v1/delivery-zone` | Opcional | Listar zonas |
| POST | `/v1/delivery-zone/check` | Opcional | Validar cobertura |
| GET | `/v1/delivery-zone/{id}` | Opcional | Consultar zona |
| PATCH | `/v1/delivery-zone/{id}` | Opcional | Actualizar zona |
| PATCH | `/v1/delivery-zone/{id}/status` | Opcional | Cambiar estado de zona |
| DELETE | `/v1/delivery-zone/{id}` | Opcional | Eliminar zona |

## Locality

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| GET | `/v1/localities` | Requerida | Listar localidades |

## Subscription

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/subscription` | Requerida | Crear suscripcion |
| GET | `/v1/subscription` | Requerida | Listar suscripciones |
| GET | `/v1/subscription/{id}` | Requerida | Consultar suscripcion |
| PATCH | `/v1/subscription/{id}` | Requerida | Actualizar suscripcion |
| PATCH | `/v1/subscription/{id}/payment` | Requerida | Actualizar pago |
| PATCH | `/v1/subscription/{id}/status` | Requerida | Cambiar estado de suscripcion |
| DELETE | `/v1/subscription/{id}` | Requerida | Eliminar suscripcion |

## Table

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/table` | Requerida | Crear mesa |
| GET | `/v1/table` | Requerida | Listar mesas |
| GET | `/v1/table/{id}` | Requerida | Consultar mesa |
| PATCH | `/v1/table/{id}` | Requerida | Actualizar mesa |
| PATCH | `/v1/table/{id}/status` | Requerida | Cambiar estado de mesa |
| DELETE | `/v1/table/{id}` | Requerida | Eliminar mesa |

## Waiter

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/waiter` | Requerida | Crear mozo |
| GET | `/v1/waiter` | Requerida | Listar mozos |
| GET | `/v1/waiter/{id}` | Requerida | Consultar mozo |
| PATCH | `/v1/waiter/{id}` | Requerida | Actualizar mozo |
| PATCH | `/v1/waiter/{id}/status` | Requerida | Cambiar estado de mozo |
| DELETE | `/v1/waiter/{id}` | Requerida | Eliminar mozo |

## Category

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/category` | Requerida | Crear categoria |
| GET | `/v1/category` | Requerida | Listar categorias |
| GET | `/v1/category/{id}` | Requerida | Consultar categoria |
| PUT | `/v1/category/{id}` | Requerida | Reemplazar categoria |

## Product

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/product` | Requerida | Crear producto |
| GET | `/v1/product` | Requerida | Listar productos |
| GET | `/v1/product/{id}` | Requerida | Consultar producto |
| PATCH | `/v1/product/{id}` | Requerida | Actualizar producto |
| DELETE | `/v1/product/{id}` | Requerida | Eliminar producto |

## User

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/user` | Requerida | Crear usuario |
| GET | `/v1/user` | Requerida | Listar usuarios |
| GET | `/v1/user/{id}` | Requerida | Consultar usuario |
| PUT | `/v1/user/{id}` | Requerida | Reemplazar usuario |

## Headquarter

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| POST | `/v1/headquarter` | Requerida | Crear sede |
| GET | `/v1/headquarter` | Requerida | Listar sedes |
| GET | `/v1/headquarter/{id}` | Requerida | Consultar sede |
| PUT | `/v1/headquarter/{id}` | Requerida | Reemplazar sede |
| PUT | `/v1/headquarter/{id}/schedules` | Requerida | Actualizar horarios |
| GET | `/v1/headquarter/{id}/cash-register` | Requerida | Consultar caja activa |
| POST | `/v1/headquarter/{id}/cash-register` | Requerida | Abrir caja |
| POST | `/v1/headquarter/{id}/cash-register/close` | Requerida | Cerrar caja |
| GET | `/v1/headquarter/{id}/cash-register/periods` | Requerida | Listar periodos de caja |

## Notification

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| GET | `/v1/notifications` | Requerida | Listar notificaciones |

## WebSocket

| Metodo | Endpoint | Auth | Descripcion |
| --- | --- | --- | --- |
| GET | `/v1/websocket/status` | Opcional | Consultar estado de integracion websocket |

## Notas

- La especificacion OpenAPI se genera desde las rutas reales y los comentarios Swagger existentes.
- `swagger.json` y `openapi.json` contienen el mismo documento OpenAPI 3.0 para compatibilidad con herramientas distintas.
- Ultima actualizacion: 2026-05-21.
