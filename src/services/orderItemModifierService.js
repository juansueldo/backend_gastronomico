import { InventoryItem, OrderItemModifier, ProductIngredientOption } from '../models/index.js';

const ACTIVE_STATUS_ID = 1;

function toPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeRemovedInputs(item) {
  const raw = item.removedIngredients ?? item.removed_ingredients ?? item.removedIngredientIds ?? [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => toPositiveInteger(typeof entry === 'object' ? entry.inventoryItemId ?? entry.inventory_item_id ?? entry.optionId ?? entry.option_id : entry))
    .filter((value) => value !== null);
}

function normalizeExtraInputs(item) {
  const raw = item.extraIngredients ?? item.extra_ingredients ?? item.extras ?? [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const inventoryItemId = toPositiveInteger(entry.inventoryItemId ?? entry.inventory_item_id ?? entry.optionId ?? entry.option_id);
      const quantity = Number(entry.quantity ?? 1);
      if (!inventoryItemId || !Number.isFinite(quantity) || quantity <= 0) return null;
      return { inventoryItemId, quantity };
    })
    .filter((entry) => entry !== null);
}

function normalizeOption(option) {
  return {
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
  };
}

class OrderItemModifierService {
  static async listProductOptions(productId, storeId, transaction) {
    return ProductIngredientOption.findAll({
      where: { productId, storeId, statusId: ACTIVE_STATUS_ID },
      include: [{ model: InventoryItem }],
      transaction,
      order: [['id', 'ASC']],
    });
  }

  static async prepareItemModifiers({ item, product, storeId, transaction }) {
    const options = await this.listProductOptions(product.id, storeId, transaction);
    if (options.length === 0) return { modifiers: [], extraTotal: 0 };

    const optionsByInventoryId = new Map(options.map((option) => [Number(option.inventoryItemId), option]));
    const removedIds = [...new Set(normalizeRemovedInputs(item))];
    const extras = normalizeExtraInputs(item);
    const modifiers = [];
    let extraTotal = 0;

    for (const inventoryItemId of removedIds) {
      const option = optionsByInventoryId.get(inventoryItemId);
      if (!option) throw new Error(`El ingrediente ${inventoryItemId} no se puede modificar para "${product.name}"`);
      if (option.isRemovable === false) throw new Error(`El ingrediente "${option.name}" no se puede quitar`);

      modifiers.push({
        type: 'removed',
        productIngredientOptionId: option.id,
        inventoryItemId: option.inventoryItemId,
        name: option.name,
        quantity: 1,
        unit: option.InventoryItem?.unit ?? 'unidad',
        priceDelta: 0,
        storeId,
        statusId: ACTIVE_STATUS_ID,
      });
    }

    for (const extra of extras) {
      const option = optionsByInventoryId.get(extra.inventoryItemId);
      if (!option) throw new Error(`El ingrediente extra ${extra.inventoryItemId} no se puede modificar para "${product.name}"`);
      if (option.isAddable !== true) throw new Error(`El ingrediente "${option.name}" no se puede agregar como extra`);
      const maxExtraQuantity = Number(option.maxExtraQuantity ?? 1);
      if (extra.quantity > maxExtraQuantity) {
        throw new Error(`El maximo para "${option.name}" es ${maxExtraQuantity}`);
      }

      const priceDelta = Number(option.extraPrice ?? 0) * extra.quantity;
      extraTotal += priceDelta;
      modifiers.push({
        type: 'extra',
        productIngredientOptionId: option.id,
        inventoryItemId: option.inventoryItemId,
        name: option.name,
        quantity: extra.quantity,
        unit: option.InventoryItem?.unit ?? 'unidad',
        priceDelta,
        storeId,
        statusId: ACTIVE_STATUS_ID,
      });
    }

    return { modifiers, extraTotal };
  }

  static async createOrderItemModifiers({ orderItem, modifiers, transaction }) {
    if (!Array.isArray(modifiers) || modifiers.length === 0) return [];

    return Promise.all(
      modifiers.map((modifier) => OrderItemModifier.create({
        ...modifier,
        orderItemId: orderItem.id,
      }, { transaction }))
    );
  }

  static normalizeOption = normalizeOption;
}

export default OrderItemModifierService;
