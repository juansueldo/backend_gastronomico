
import sequelize from '../models/db.js';
import {
  Category,
  Customer,
  DeliveryZone,
  Headquarter,
  Order,
  OrderItem,
  OrderItemModifier,
  Product,
  ProductIngredientOption,
  InventoryItem,
  Store,
  HeadquarterSchedule
} from '../models/index.js';
import { parseLocaleNumber } from '../utils/numberParser.js';
import NotificationService from '../services/notificationService.js';
import ImageService from '../services/imageService.js';
import OrderItemModifierService from '../services/orderItemModifierService.js';

const ACTIVE_STATUS_ID = 1;
const MAX_STORE_IMAGE_BYTES = Number(process.env.STORE_IMAGE_MAX_BYTES) || 5 * 1024 * 1024;

function getBase64SizeInBytes(base64String) {
  const cleanBase64 = base64String.includes(',')
    ? base64String.split(',')[1]
    : base64String;

  const padding = cleanBase64.endsWith('==') ? 2 : cleanBase64.endsWith('=') ? 1 : 0;
  return Math.floor((cleanBase64.length * 3) / 4) - padding;
}

function toPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeHeadquarter(headquarter) {
  const closurePeriods = Array.isArray(headquarter.closure_periods) && headquarter.closure_periods.length > 0
    ? headquarter.closure_periods
    : undefined;

  // Horarios
  const schedules = Array.isArray(headquarter.schedules)
    ? headquarter.schedules.map(s => ({
        day_of_week: s.day_of_week,
        open_time: s.open_time,
        close_time: s.close_time,
        is_closed: s.is_closed
      }))
    : [];

  return {
    id: String(headquarter.id),
    name: headquarter.name,
    location: headquarter.location || undefined,
    phone: headquarter.phone || undefined,
    latitude: headquarter.latitude !== undefined && headquarter.latitude !== null ? Number(headquarter.latitude) : undefined,
    longitude: headquarter.longitude !== undefined && headquarter.longitude !== null ? Number(headquarter.longitude) : undefined,
    closure_periods: closurePeriods,
    closurePeriods: closurePeriods,
    schedules,
  };
}

function buildOrderItemsFromRequest(body) {
  const explicitProductIds = Array.isArray(body.productIds)
    ? body.productIds
    : Array.isArray(body.product_ids)
      ? body.product_ids
      : [];

  if (explicitProductIds.length > 0) {
    return explicitProductIds.map((productId) => ({
      productId: toPositiveInteger(productId),
      quantity: 1,
    }));
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return [];
  }

  return body.items
    .map((item) => {
      if (item && typeof item === 'object') {
        return {
          productId: toPositiveInteger(item.productId ?? item.product_id),
          quantity: Number(item.quantity ?? 1),
          removedIngredients: item.removedIngredients ?? item.removed_ingredients ?? item.removedIngredientIds ?? [],
          extraIngredients: item.extraIngredients ?? item.extra_ingredients ?? item.extras ?? [],
        };
      }

      return {
        productId: toPositiveInteger(item),
        quantity: 1,
      };
    })
    .filter((item) => Number.isInteger(item.productId) && item.productId > 0);
}

function normalizeRequestedItems(rawItems) {
  const grouped = new Map();

  rawItems.forEach((item) => {
    if (!Number.isInteger(item.productId) || item.productId <= 0) return;
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) return;

    const key = JSON.stringify({
      productId: item.productId,
      removedIngredients: item.removedIngredients ?? [],
      extraIngredients: item.extraIngredients ?? [],
    });
    const previous = grouped.get(key);
    grouped.set(key, {
      ...item,
      quantity: (previous?.quantity ?? 0) + item.quantity,
    });
  });

  return Array.from(grouped.values());
}

function mapStoreOrderType(rawType) {
  const normalizedType = String(rawType || '').trim().toLowerCase();
  if (normalizedType === 'delivery') return 'delivery';
  if (normalizedType === 'pickup') return 'takeaway';
  if (normalizedType === 'takeaway') return 'takeaway';
  return null;
}

function isValueProvided(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function normalizeBooleanFlag(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return undefined;
  if (['true', '1', 'yes', 'si', 'sí', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;

  return undefined;
}

function normalizeDateValue(value) {
  if (!isValueProvided(value)) return { value: null };

  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { value: raw };
  }

  const parsedDate = new Date(raw);
  if (Number.isNaN(parsedDate.getTime())) {
    return { error: 'La fecha solicitada no es válida' };
  }

  return { value: parsedDate.toISOString().slice(0, 10) };
}

function normalizeTimeValue(value) {
  if (!isValueProvided(value)) return { value: null };

  const raw = String(value).trim();
  const timeMatch = raw.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!timeMatch) {
    return { error: 'La hora solicitada debe tener formato HH:mm o HH:mm:ss' };
  }

  const [, hours, minutes, seconds = '00'] = timeMatch;
  return { value: `${hours}:${minutes}:${seconds}` };
}

function normalizePolygon(polygon) {
  if (!polygon) return null;

  let rawPolygon = polygon;

  if (typeof rawPolygon === 'string') {
    try {
      rawPolygon = JSON.parse(rawPolygon);
    } catch {
      return null;
    }
  }

  if (Array.isArray(rawPolygon) && rawPolygon[0]?.lat !== undefined && rawPolygon[0]?.lng !== undefined) {
    return rawPolygon.map((point) => [Number(point.lng), Number(point.lat)]);
  }

  if (Array.isArray(rawPolygon) && Array.isArray(rawPolygon[0])) {
    return rawPolygon;
  }

  if (rawPolygon?.type === 'Polygon') {
    return rawPolygon.coordinates?.[0] || null;
  }

  if (rawPolygon?.type === 'Feature' && rawPolygon.geometry?.type === 'Polygon') {
    return rawPolygon.geometry.coordinates?.[0] || null;
  }

  return null;
}

function isPointInPolygon(lat, lon, polygon) {
  const coordinates = normalizePolygon(polygon);

  if (!Array.isArray(coordinates) || coordinates.length < 3) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const [xi, yi] = coordinates[i];
    const [xj, yj] = coordinates[j];

    const xiEqual = Math.abs(xi - lon) < 0.0000001;
    const xjEqual = Math.abs(xj - lon) < 0.0000001;
    if (xiEqual && xjEqual && Math.min(yi, yj) <= lat && lat <= Math.max(yi, yj)) {
      return true;
    }

    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

class StorefrontController {
  static async updateStoreProfile(req, res) {
    try {
      const storeId = req.user?.storeId;
      const { name, slug, profile_image_url, profileImageUrl } = req.body;

      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      const store = await Store.findByPk(storeId);
      if (!store) {
        return res.status(404).json({ error: 'Tienda no encontrada' });
      }

      const nextName = typeof name === 'string' ? name.trim() : undefined;
      const nextSlug = typeof slug === 'string' ? slug.trim().toLowerCase() : undefined;
      const nextProfileImageUrl = typeof (profile_image_url ?? profileImageUrl) === 'string'
        ? String(profile_image_url ?? profileImageUrl).trim()
        : undefined;
      const nextOffersDelivery = normalizeBooleanFlag(
        req.body.offers_delivery
        ?? req.body.offersDelivery
        ?? req.body.delivery_enabled
        ?? req.body.deliveryEnabled
      );
      const nextOffersPickup = normalizeBooleanFlag(
        req.body.offers_pickup
        ?? req.body.offersPickup
        ?? req.body.pickup_enabled
        ?? req.body.pickupEnabled
      );

      if (nextName !== undefined && !nextName) {
        return res.status(400).json({ error: 'name no puede estar vacío' });
      }

      if (nextSlug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextSlug)) {
        return res.status(400).json({ error: 'slug debe usar minúsculas, números y guiones' });
      }

      if (nextName && nextName !== store.name) {
        const existingName = await Store.findOne({ where: { name: nextName } });
        if (existingName && existingName.id !== store.id) {
          return res.status(400).json({ error: 'Ya existe una tienda con ese nombre' });
        }
      }

      if (nextSlug && nextSlug !== store.slug) {
        const existingSlug = await Store.findOne({ where: { slug: nextSlug } });
        if (existingSlug && existingSlug.id !== store.id) {
          return res.status(400).json({ error: 'Ya existe una tienda con ese slug' });
        }
      }

      await store.update({
        ...(nextName !== undefined ? { name: nextName } : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        ...(nextProfileImageUrl !== undefined ? { profile_image_url: nextProfileImageUrl || null } : {}),
        ...(nextOffersDelivery !== undefined ? { offers_delivery: nextOffersDelivery } : {}),
        ...(nextOffersPickup !== undefined ? { offers_pickup: nextOffersPickup } : {}),
      });

      return res.status(200).json({
        id: store.id,
        name: store.name,
        slug: store.slug,
        profile_image_url: store.profile_image_url,
        profileImageUrl: store.profile_image_url,
        offers_delivery: store.offers_delivery !== false,
        offersDelivery: store.offers_delivery !== false,
        offers_pickup: store.offers_pickup !== false,
        offersPickup: store.offers_pickup !== false,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async uploadStoreImage(req, res) {
    try {
      const storeId = req.user?.storeId;
      const { image } = req.body;

      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'image es requerido y debe ser string base64' });
      }

      const store = await Store.findByPk(storeId);
      if (!store) {
        return res.status(404).json({ error: 'Tienda no encontrada' });
      }

      const imageSizeBytes = getBase64SizeInBytes(image);
      if (!Number.isFinite(imageSizeBytes) || imageSizeBytes <= 0) {
        return res.status(400).json({ error: 'No se pudo determinar el tamaño de la imagen base64' });
      }

      if (imageSizeBytes > MAX_STORE_IMAGE_BYTES) {
        return res.status(413).json({
          error: `Imagen demasiado grande. Máximo permitido: ${Math.floor(MAX_STORE_IMAGE_BYTES / (1024 * 1024))}MB`,
        });
      }

      if (!ImageService.isValidBase64(image)) {
        return res.status(400).json({ error: 'Imagen debe ser un string base64 válido' });
      }

      if (store.profile_image_url) {
        await ImageService.deleteImage(store.profile_image_url);
      }

      const imageResult = await ImageService.saveImage(
        image,
        storeId,
        `store_${storeId}_${Date.now()}`
      );

      await store.update({
        profile_image_url: imageResult.url,
      });

      return res.status(200).json({
        message: 'Imagen de tienda actualizada correctamente',
        profile_image_url: imageResult.url,
        profileImageUrl: imageResult.url,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async getPublicStore(req, res) {
    try {
      const slug = String(req.params.slug || '').trim();
      if (!slug) return res.status(400).json({ error: 'slug es requerido' });

      const store = await Store.findOne({
        where: { slug, statusId: ACTIVE_STATUS_ID },
      });

      if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });


      const headquarters = await Headquarter.findAll({
        where: { storeId: store.id, statusId: ACTIVE_STATUS_ID },
        attributes: ['id', 'name', 'location', 'phone', 'latitude', 'longitude', 'closure_periods'],
        order: [['id', 'ASC']],
        include: [
          {
            model: HeadquarterSchedule,
            as: 'schedules',
            attributes: ['day_of_week', 'open_time', 'close_time', 'is_closed'],
          },
        ],
      });

      const pickupHeadquarters = headquarters.map(normalizeHeadquarter);
      const defaultHeadquarterId = pickupHeadquarters[0]?.id;

      return res.status(200).json({
        id: String(store.id),
        slug: store.slug,
        name: store.name,
        profile_image_url: store.profile_image_url || undefined,
        profileImageUrl: store.profile_image_url || undefined,
        statusId: store.statusId,
        offers_delivery: store.offers_delivery !== false,
        offersDelivery: store.offers_delivery !== false,
        offers_pickup: store.offers_pickup !== false,
        offersPickup: store.offers_pickup !== false,
        pickupHeadquarters,
        pickup_headquarters: pickupHeadquarters,
        defaultHeadquarterId,
        pickupHeadquarterId: defaultHeadquarterId,
        pickup_headquarter_id: defaultHeadquarterId,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async getPublicProducts(req, res) {
    try {
      const slug = String(req.params.slug || '').trim();
      const rawHeadquarterId = req.query.headquarterId ?? req.query.headquarter_id;

      if (!slug) return res.status(400).json({ error: 'slug es requerido' });

      const store = await Store.findOne({
        where: { slug, statusId: ACTIVE_STATUS_ID },
      });
      if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

      const hasHeadquarterFilter = rawHeadquarterId !== undefined && rawHeadquarterId !== null && rawHeadquarterId !== '';
      let selectedHeadquarterId = null;
      if (hasHeadquarterFilter) {
        selectedHeadquarterId = toPositiveInteger(rawHeadquarterId);
        if (!selectedHeadquarterId) {
          return res.status(400).json({ error: 'headquarterId debe ser un entero válido' });
        }
      }

      const headquarters = await Headquarter.findAll({
        where: { storeId: store.id, statusId: ACTIVE_STATUS_ID },
        attributes: ['id', 'name', 'location', 'phone', 'latitude', 'longitude', 'closure_periods'],
        order: [['id', 'ASC']],
      });

      if (selectedHeadquarterId) {
        const existsHeadquarter = headquarters.some((headquarter) => headquarter.id === selectedHeadquarterId);
        if (!existsHeadquarter) {
          return res.status(404).json({ error: 'Sede no encontrada para esta tienda' });
        }
      }

      const products = await Product.findAll({
        where: { storeId: store.id, statusId: ACTIVE_STATUS_ID },
        include: [
          {
            model: Category,
            attributes: ['id', 'name', 'description', 'headquarterId'],
            where: selectedHeadquarterId ? { headquarterId: selectedHeadquarterId } : undefined,
            required: false,
          },
          {
            model: ProductIngredientOption,
            where: { statusId: ACTIVE_STATUS_ID },
            required: false,
            include: [{ model: InventoryItem, attributes: ['id', 'name', 'unit'] }],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      const mappedProducts = products
        .filter((product) => {
          if (!selectedHeadquarterId) return true;
          return toPositiveInteger(product.Category?.headquarterId) === selectedHeadquarterId;
        })
        .map((product) => ({
          id: String(product.id),
          name: product.name,
          description: product.description || undefined,
          price: parseLocaleNumber(product.price),
          image_url: product.image_url || undefined,
          imageUrl: product.image_url || undefined,
          active: product.statusId === ACTIVE_STATUS_ID,
          categoryId: product.categoryId ? String(product.categoryId) : undefined,
          category_id: product.categoryId ? String(product.categoryId) : undefined,
          categoryIds: product.categoryId ? [String(product.categoryId)] : [],
          category_ids: product.categoryId ? [String(product.categoryId)] : [],
          categories: product.Category
            ? [
              {
                id: String(product.Category.id),
                name: product.Category.name,
              },
            ]
            : [],
          ingredientOptions: (product.ProductIngredientOptions ?? []).map((option) => ({
            id: String(option.id),
            inventoryItemId: option.inventoryItemId,
            name: option.name,
            unit: option.InventoryItem?.unit ?? 'unidad',
            isRemovable: option.isRemovable !== false,
            isAddable: option.isAddable === true,
            defaultIncluded: option.defaultIncluded !== false,
            extraPrice: Number(option.extraPrice ?? 0),
            extraQuantity: Number(option.extraQuantity ?? 1),
            maxExtraQuantity: Number(option.maxExtraQuantity ?? 1),
          })),
        }));

      const categoriesMap = new Map();
      mappedProducts.forEach((product) => {
        product.categories.forEach((category) => {
          categoriesMap.set(category.id, {
            id: category.id,
            name: category.name,
          });
        });
      });

      const categories = Array.from(categoriesMap.values());
      const mappedHeadquarters = headquarters.map(normalizeHeadquarter);
      const defaultHeadquarterId = String(mappedHeadquarters[0]?.id || '') || undefined;
      const responseSelectedHeadquarterId = selectedHeadquarterId
        ? String(selectedHeadquarterId)
        : defaultHeadquarterId;

      return res.status(200).json({
        products: mappedProducts,
        categories,
        headquarters: mappedHeadquarters,
        pickupHeadquarters: mappedHeadquarters,
        offers_delivery: store.offers_delivery !== false,
        offersDelivery: store.offers_delivery !== false,
        offers_pickup: store.offers_pickup !== false,
        offersPickup: store.offers_pickup !== false,
        selectedHeadquarterId: responseSelectedHeadquarterId,
        defaultHeadquarterId,
        pickupHeadquarterId: defaultHeadquarterId,
        pickup_headquarter_id: defaultHeadquarterId,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async createPublicOrder(req, res) {
    try {
      const slug = String(req.params.slug || '').trim();
      if (!slug) return res.status(400).json({ error: 'slug es requerido' });

      const store = await Store.findOne({
        where: { slug, statusId: ACTIVE_STATUS_ID },
      });
      if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

      const customerName = req.body.customer_name ?? req.body.customerName;
      const phone = req.body.phone ?? req.body.customerPhone;
      const type = mapStoreOrderType(req.body.type);
      const address = req.body.address ?? req.body.delivery_address;
      const rawDeliveryLatitude = req.body.delivery_latitude
        ?? req.body.deliveryLatitude
        ?? req.body.latitude
        ?? req.body.lat;
      const rawDeliveryLongitude = req.body.delivery_longitude
        ?? req.body.deliveryLongitude
        ?? req.body.longitude
        ?? req.body.lng;
      const requestedDateRaw = req.body.scheduled_date
        ?? req.body.scheduledDate
        ?? req.body.requested_date
        ?? req.body.requestedDate
        ?? req.body.delivery_date
        ?? req.body.deliveryDate
        ?? req.body.pickup_date
        ?? req.body.pickupDate;
      const requestedTimeRaw = req.body.scheduled_time
        ?? req.body.scheduledTime
        ?? req.body.requested_time
        ?? req.body.requestedTime
        ?? req.body.delivery_time
        ?? req.body.deliveryTime
        ?? req.body.pickup_time
        ?? req.body.pickupTime;
      const requestedHeadquarterId = req.body.headquarterId
        ?? req.body.headquarter_id
        ?? req.body.pickupHeadquarterId
        ?? req.body.pickup_headquarter_id;

      if (!customerName) return res.status(400).json({ error: 'customerName es requerido' });
      if (!phone) return res.status(400).json({ error: 'phone es requerido' });
      if (!type) return res.status(400).json({ error: 'type debe ser delivery o pickup' });
      if (type === 'delivery' && store.offers_delivery === false) {
        return res.status(400).json({ error: 'La tienda no ofrece delivery actualmente' });
      }
      if (type === 'takeaway' && store.offers_pickup === false) {
        return res.status(400).json({ error: 'La tienda no ofrece retiro actualmente' });
      }
      if (type === 'delivery' && !address) {
        return res.status(400).json({ error: 'address es requerido para órdenes delivery' });
      }

      let parsedDeliveryLatitude = null;
      let parsedDeliveryLongitude = null;
      let matchedDeliveryZone = null;
      if (type === 'delivery') {
        if (rawDeliveryLatitude === undefined || rawDeliveryLongitude === undefined) {
          return res.status(400).json({
            error: 'delivery_latitude y delivery_longitude son requeridos para validar la zona de entrega',
          });
        }

        parsedDeliveryLatitude = Number(rawDeliveryLatitude);
        parsedDeliveryLongitude = Number(rawDeliveryLongitude);
        if (!Number.isFinite(parsedDeliveryLatitude) || !Number.isFinite(parsedDeliveryLongitude)) {
          return res.status(400).json({ error: 'delivery_latitude y delivery_longitude deben ser números válidos' });
        }

        const deliveryZones = await DeliveryZone.findAll({
          where: { storeId: store.id, statusId: ACTIVE_STATUS_ID },
          order: [['id', 'ASC']],
        });

        matchedDeliveryZone = deliveryZones.find((zone) =>
          isPointInPolygon(parsedDeliveryLatitude, parsedDeliveryLongitude, zone.polygon)
        ) ?? null;

        if (!matchedDeliveryZone) {
          return res.status(400).json({
            error: 'La dirección está fuera de las zonas de entrega disponibles',
            details: { latitude: parsedDeliveryLatitude, longitude: parsedDeliveryLongitude },
          });
        }
      }

      const normalizedDate = normalizeDateValue(requestedDateRaw);
      if (normalizedDate.error) {
        return res.status(400).json({ error: normalizedDate.error });
      }

      const normalizedTime = normalizeTimeValue(requestedTimeRaw);
      if (normalizedTime.error) {
        return res.status(400).json({ error: normalizedTime.error });
      }

      if ((isValueProvided(requestedDateRaw) && !normalizedDate.value) || (!isValueProvided(requestedDateRaw) && normalizedTime.value)) {
        return res.status(400).json({ error: 'Si envías hora solicitada, también debes enviar la fecha solicitada' });
      }

      const rawItems = buildOrderItemsFromRequest(req.body);
      const requestedItems = normalizeRequestedItems(rawItems);
      if (requestedItems.length === 0) {
        return res.status(400).json({ error: 'Se requiere al menos un producto válido' });
      }

      const headquarters = await Headquarter.findAll({
        where: { storeId: store.id, statusId: ACTIVE_STATUS_ID },
        order: [['id', 'ASC']],
      });

      if (headquarters.length === 0) {
        return res.status(400).json({ error: 'La tienda no tiene sedes activas disponibles' });
      }

      let headquarterId = null;
      if (type === 'delivery') {
        headquarterId = toPositiveInteger(matchedDeliveryZone?.headquarterId);
      } else {
        headquarterId = requestedHeadquarterId
          ? toPositiveInteger(requestedHeadquarterId)
          : toPositiveInteger(headquarters[0].id);
        if (!headquarterId) {
          return res.status(400).json({ error: 'headquarterId debe ser un entero válido' });
        }
      }

      const headquarter = headquarters.find(
        (currentHeadquarter) => toPositiveInteger(currentHeadquarter.id) === headquarterId
      );
      if (!headquarter) {
        return res.status(404).json({ error: 'Sede no encontrada para esta tienda' });
      }

      if (type === 'delivery' && requestedHeadquarterId) {
        const parsedRequestedHeadquarterId = toPositiveInteger(requestedHeadquarterId);
        if (!parsedRequestedHeadquarterId) {
          return res.status(400).json({ error: 'headquarterId debe ser un entero válido' });
        }
        if (parsedRequestedHeadquarterId !== headquarterId) {
          return res.status(400).json({
            error: 'La dirección corresponde a otra sede de entrega',
            details: {
              requestedHeadquarterId: parsedRequestedHeadquarterId,
              matchedHeadquarterId: headquarterId,
              matchedDeliveryZoneId: matchedDeliveryZone?.id ?? null,
            },
          });
        }
      }

      const productIds = [...new Set(requestedItems.map((item) => item.productId))];
      const products = await Product.findAll({
        where: {
          id: productIds,
          storeId: store.id,
          statusId: ACTIVE_STATUS_ID,
        },
        include: [
          {
            model: Category,
            attributes: ['id', 'headquarterId'],
          },
        ],
      });

      if (products.length !== productIds.length) {
        return res.status(404).json({ error: 'Uno o más productos no existen para esta tienda' });
      }

      const productById = new Map(products.map((product) => [product.id, product]));

      const productHeadquarterIds = [
        ...new Set(
          requestedItems
            .map((item) => toPositiveInteger(productById.get(item.productId)?.Category?.headquarterId))
            .filter((value) => value !== null)
        ),
      ];

      const outOfHeadquarterProduct = requestedItems.find((item) => {
        const product = productById.get(item.productId);
        const productHeadquarterId = toPositiveInteger(product?.Category?.headquarterId);
        if (!productHeadquarterId) return false; // Producto/categoría global de tienda
        return productHeadquarterId !== headquarterId;
      });

      if (outOfHeadquarterProduct) {
        if (type === 'delivery') {
          return res.status(400).json({
            error: `El producto ${outOfHeadquarterProduct.productId} no pertenece a la sede de la zona de entrega`,
          });
        }

        if (productHeadquarterIds.length === 1) {
          headquarterId = productHeadquarterIds[0];
        } else {
          return res.status(400).json({
            error: `El producto ${outOfHeadquarterProduct.productId} no pertenece a la sede seleccionada`,
          });
        }
      }

      let customer = await Customer.findOne({
        where: { storeId: store.id, phone: String(phone) },
      });

      if (!customer) {
        customer = await Customer.create({
          name: String(customerName).trim(),
          phone: String(phone).trim(),
          storeId: store.id,
          statusId: ACTIVE_STATUS_ID,
        });
      }

      let totalAmount = 0;
      const orderItemsToCreate = [];
      for (const item of requestedItems) {
        const product = productById.get(item.productId);
        const price = parseLocaleNumber(product.price);
        const modifiersConfig = await OrderItemModifierService.prepareItemModifiers({
          item,
          product,
          storeId: store.id,
        });
        const unitPrice = price + modifiersConfig.extraTotal;
        totalAmount += unitPrice * item.quantity;

        orderItemsToCreate.push({
          productId: item.productId,
          quantity: item.quantity,
          price: unitPrice,
          storeId: store.id,
          statusId: ACTIVE_STATUS_ID,
          headquarterId,
          modifiers: modifiersConfig.modifiers,
        });
      }

      totalAmount = Number(totalAmount.toFixed(2));
      const orderNumber = `PUB-${Date.now()}-${store.id}`;
      const deliveryDateTime = type === 'delivery' && normalizedDate.value
        ? new Date(`${normalizedDate.value}T${normalizedTime.value || '00:00:00'}`)
        : null;

      const createdOrder = await sequelize.transaction(async (transaction) => {
        const order = await Order.create({
          order_number: orderNumber,
          total_amount: totalAmount,
          type,
          status: 'pending',
          statusId: ACTIVE_STATUS_ID,
          delivery_address: type === 'delivery' ? String(address).trim() : null,
          delivery_date: deliveryDateTime,
          delivery_latitude: type === 'delivery' ? parsedDeliveryLatitude : null,
          delivery_longitude: type === 'delivery' ? parsedDeliveryLongitude : null,
          deliveryZoneId: matchedDeliveryZone?.id ?? null,
          scheduled_date: normalizedDate.value,
          scheduled_time: normalizedTime.value,
          storeId: store.id,
          headquarterId,
          customerId: customer.id,
          userId: null,
          tableId: null,
          waiterId: null,
        }, { transaction });

        for (const item of orderItemsToCreate) {
          const { modifiers, ...orderItemData } = item;
          const orderItem = await OrderItem.create({
            ...orderItemData,
            orderId: order.id,
          }, { transaction });
          await OrderItemModifierService.createOrderItemModifiers({
            orderItem,
            modifiers,
            transaction,
          });
        }
        // No crear notificación aquí, se hará después
        return order;
      });

      const orderWithItems = await Order.findByPk(createdOrder.id, {
        include: [
          {
            model: OrderItem,
            include: [{ model: Product, attributes: ['id', 'name', 'image_url'] }, { model: OrderItemModifier }],
          },
          { model: Customer, attributes: ['id', 'name', 'phone'] },
          { model: Headquarter, attributes: ['id', 'name', 'location'] },
          { model: Store, attributes: ['id', 'name', 'slug'] },
        ],
      });

      // Crear y enviar notificaciones al store y headquarter
      try {
        await NotificationService.notifyOrderCreatedWithPersistence(
          store.id,
          headquarterId,
          orderWithItems
        );
      } catch (notificationErr) {
        console.error('Error enviando notificación de orden pública:', notificationErr);
        // Continuar sin fallar la creación de la orden
      }

      return res.status(201).json(orderWithItems);
    } catch (err) {
      return res.status(400).json({ error: err.message, details: err.errors ?? [] });
    }
  }
}

export default StorefrontController;
