# Ejemplos de Uso - API de Productos con Imágenes

## 1. Crear Producto con Imagen

### Usando cURL:
```bash
curl -X POST http://localhost:3000/product \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pizza Margarita",
    "description": "Pizza fresca con tomate y mozzarella",
    "price": 15.99,
    "category": "Pizzas",
    "image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  }'
```

### Usando JavaScript/Fetch:
```javascript
const imageFile = document.getElementById('imageInput').files[0];
const reader = new FileReader();

reader.onload = async (e) => {
  const base64Image = e.target.result.split(',')[1]; // Remover el prefijo data:image/png;base64,
  
  const response = await fetch('http://localhost:3000/product', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Pizza Margarita',
      description: 'Pizza fresca con tomate y mozzarella',
      price: 15.99,
      category: 'Pizzas',
      image: base64Image
    })
  });
  
  const product = await response.json();
  console.log('Producto creado:', product);
  // La imagen será guardada en: /public/images/products/store_{storeId}/product_timestamp.png
  console.log('URL de imagen:', product.image_url);
};

reader.readAsDataURL(imageFile);
```

### Usando Python:
```python
import requests
import base64

# Leer imagen y convertir a base64
with open('pizza.png', 'rb') as f:
    image_base64 = base64.b64encode(f.read()).decode('utf-8')

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

data = {
    'name': 'Pizza Margarita',
    'description': 'Pizza fresca con tomate y mozzarella',
    'price': 15.99,
    'category': 'Pizzas',
    'image': image_base64
}

response = requests.post(
    'http://localhost:3000/product',
    headers=headers,
    json=data
)

product = response.json()
print(f"Producto creado: {product}")
print(f"URL de imagen: {product['image_url']}")
```

## 2. Obtener Todos los Productos de la Tienda

```bash
curl -X GET http://localhost:3000/product \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Respuesta:
```json
[
  {
    "id": 1,
    "name": "Pizza Margarita",
    "description": "Pizza fresca con tomate y mozzarella",
    "price": 15.99,
    "image_url": "/images/products/store_1/product_1704067200000.png",
    "type": "simple",
    "statusId": 1,
    "storeId": 1,
    "categoryId": 1,
    "Store": {
      "id": 1,
      "name": "Mi Pizzería"
    },
    "Category": {
      "id": 1,
      "name": "Pizzas",
      "description": null
    }
  }
]
```

## 3. Obtener Producto por ID

```bash
curl -X GET http://localhost:3000/product/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 4. Acceder a la Imagen Guardada

La imagen se puede acceder directamente desde el navegador o cliente:

```
GET http://localhost:3000/images/products/store_1/product_1704067200000.png
```

Ejemplo en HTML:
```html
<img src="http://localhost:3000/images/products/store_1/product_1704067200000.png" 
     alt="Pizza Margarita" />
```

## 5. Actualizar Producto con Nueva Imagen

El endpoint PATCH reemplaza la imagen anterior automáticamente:

```bash
curl -X PATCH http://localhost:3000/product/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pizza Margarita Premium",
    "price": 19.99,
    "image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ..."
  }'
```

**Nota**: La imagen anterior será eliminada automáticamente del servidor.

## 6. Eliminar Producto

El endpoint DELETE elimina el producto Y su imagen:

```bash
curl -X DELETE http://localhost:3000/product/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Respuesta:
```json
{
  "message": "Producto eliminado correctamente"
}
```

## Notas Importantes

### Almacenamiento de Imágenes
- Las imágenes se guardan en: `/public/images/products/store_{storeId}/`
- Cada tienda tiene su propio directorio (multi-tenant)
- Se crea automáticamente si no existe

### Validación de Base64
- El servicio valida que el string sea válido base64 antes de guardarlo
- Soporta prefijos `data:image/...;base64,` o solo el string base64
- Si la validación falla, retorna error 400

### Flujo de Imágenes
1. **Crear**: Recibe base64 → Decodifica → Guarda en disco → Almacena URL en BD
2. **Leer**: Retorna URL que se puede usar directamente en HTML/img
3. **Actualizar**: Elimina imagen vieja → Guarda nueva → Actualiza URL en BD
4. **Eliminar**: Elimina producto de BD → Elimina imagen del disco

### Limitaciones
- No hay límite de tamaño configurado en el código, considerar agregar validación de tamaño máximo
- Las imágenes se guardan en formato PNG (considerar determinación automática de formato)
- Solo soporta PNG por defecto, extender si es necesario para JPG, WebP, etc.

### Seguridad
- Todas las operaciones requieren token JWT válido
- storeId se extrae del token para validar propietario
- No se puede acceder a productos/imágenes de otras tiendas
- Las imágenes son estáticas y servidas por Express

## Mejoras Futuras Sugeridas

1. **Redimensionamiento**: Generar thumbnails automáticamente
2. **Validación de Tamaño**: Rechazar imágenes > X MB
3. **Detección de Formato**: Auto-detectar MIME type
4. **Compresión**: Comprimir imágenes antes de guardar
5. **CDN**: Considerar integración con S3/CloudFront para producción
6. **Caché**: Implementar caché de imágenes en cliente
