import sequelize from '../models/db.js';
import {
  Category,
  Customer,
  Headquarter,
  Order,
  OrderItem,
  Product,
  Store,
} from '../models/index.js';
import { parseLocaleNumber } from '../utils/numberParser.js';

const ACTIVE_STATUS_ID = 1;

function toPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeHeadquarter(headquarter) {
  return {
    id: String(headquarter.id),
    name: headquarter.name,
    location: headquarter.location || undefined,
    phone: headquarter.phone || undefined,
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

    const previousQuantity = grouped.get(item.productId) || 0;
    grouped.set(item.productId, previousQuantity + item.quantity);
  });

  return Array.from(grouped.entries()).map(([productId, quantity]) => ({ productId, quantity }));
}

function mapStoreOrderType(rawType) {
  const normalizedType = String(rawType || '').trim().toLowerCase();
  if (normalizedType === 'delivery') return 'delivery';
  if (normalizedType === 'pickup') return 'takeaway';
  if (normalizedType === 'takeaway') return 'takeaway';
  return null;
}

class StorefrontController {
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
        attributes: ['id', 'name', 'location', 'phone'],
        order: [['id', 'ASC']],
      });

      const pickupHeadquarters = headquarters.map(normalizeHeadquarter);
      const defaultHeadquarterId = pickupHeadquarters[0]?.id;

      return res.status(200).json({
        id: String(store.id),
        slug: store.slug,
        name: store.name,
        statusId: store.statusId,
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
        attributes: ['id', 'name', 'location', 'phone'],
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
      const requestedHeadquarterId = req.body.headquarterId
        ?? req.body.headquarter_id
        ?? req.body.pickupHeadquarterId
        ?? req.body.pickup_headquarter_id;

      if (!customerName) return res.status(400).json({ error: 'customerName es requerido' });
      if (!phone) return res.status(400).json({ error: 'phone es requerido' });
      if (!type) return res.status(400).json({ error: 'type debe ser delivery o pickup' });
      if (type === 'delivery' && !address) {
        return res.status(400).json({ error: 'address es requerido para órdenes delivery' });
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

      let headquarterId = requestedHeadquarterId
        ? toPositiveInteger(requestedHeadquarterId)
        : toPositiveInteger(headquarters[0].id);
      if (!headquarterId) {
        return res.status(400).json({ error: 'headquarterId debe ser un entero válido' });
      }

      const headquarter = headquarters.find(
        (currentHeadquarter) => toPositiveInteger(currentHeadquarter.id) === headquarterId
      );
      if (!headquarter) {
        return res.status(404).json({ error: 'Sede no encontrada para esta tienda' });
      }

      const productIds = requestedItems.map((item) => item.productId);
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
      const orderItemsToCreate = requestedItems.map((item) => {
        const product = productById.get(item.productId);
        const price = parseLocaleNumber(product.price);
        totalAmount += price * item.quantity;

        return {
          productId: item.productId,
          quantity: item.quantity,
          price,
          storeId: store.id,
          statusId: ACTIVE_STATUS_ID,
          headquarterId,
        };
      });

      totalAmount = Number(totalAmount.toFixed(2));
      const orderNumber = `PUB-${Date.now()}-${store.id}`;

      const createdOrder = await sequelize.transaction(async (transaction) => {
        const order = await Order.create({
          order_number: orderNumber,
          total_amount: totalAmount,
          type,
          status: 'pending',
          statusId: ACTIVE_STATUS_ID,
          delivery_address: type === 'delivery' ? String(address).trim() : null,
          storeId: store.id,
          headquarterId,
          customerId: customer.id,
          userId: null,
          tableId: null,
          waiterId: null,
        }, { transaction });

        await Promise.all(
          orderItemsToCreate.map((item) => OrderItem.create({
            ...item,
            orderId: order.id,
          }, { transaction }))
        );

        return order;
      });

      const orderWithItems = await Order.findByPk(createdOrder.id, {
        include: [
          {
            model: OrderItem,
            include: [{ model: Product, attributes: ['id', 'name', 'image_url'] }],
          },
          { model: Customer, attributes: ['id', 'name', 'phone'] },
          { model: Headquarter, attributes: ['id', 'name', 'location'] },
          { model: Store, attributes: ['id', 'name', 'slug'] },
        ],
      });

      return res.status(201).json(orderWithItems);
    } catch (err) {
      return res.status(400).json({ error: err.message, details: err.errors ?? [] });
    }
  }
}

export default StorefrontController;
