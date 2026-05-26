import {
  InventoryItem,
  Order,
  OrderItem,
  OrderItemModifier,
  Product,
  ProductIngredientOption,
  Recipe,
  RecipeItem,
  StockMovement,
} from '../models/index.js';

const ACTIVE_STATUS_ID = 1;

const normalizeName = (value) => String(value ?? '').trim().toLowerCase();

class InventoryConsumptionService {
  static async consumeOrderInventory(orderId, storeId, options = {}) {
    const transaction = options.transaction;

    const order = await Order.findOne({
      where: { id: orderId, storeId },
      transaction,
      lock: transaction?.LOCK?.UPDATE,
    });

    if (!order) {
      throw new Error('Orden no encontrada para descontar inventario');
    }

    if (order.inventory_discounted_at) {
      return { alreadyDiscounted: true, movements: [] };
    }

    const orderItems = await OrderItem.findAll({
      where: { orderId: order.id, storeId },
      include: [{ model: Product }],
      transaction,
    });

    const movements = [];

    for (const orderItem of orderItems) {
      const product = orderItem.Product ?? await Product.findOne({
        where: { id: orderItem.productId, storeId },
        transaction,
      });

      if (!product) {
        throw new Error(`Producto ${orderItem.productId} no encontrado para descontar inventario`);
      }

      const recipe = await Recipe.findOne({
        where: { productId: product.id, storeId, statusId: ACTIVE_STATUS_ID },
        transaction,
      });

      const recipeItems = recipe
        ? await RecipeItem.findAll({
          where: { recipeId: recipe.id, storeId, statusId: ACTIVE_STATUS_ID },
          include: [{ model: InventoryItem }],
          transaction,
        })
        : [];

      if (recipeItems.length > 0 || product.type === 'recipe') {
        if (recipeItems.length === 0) {
          throw new Error(`El producto "${product.name}" está marcado como receta pero no tiene ingredientes configurados`);
        }

        const modifiers = await OrderItemModifier.findAll({
          where: { orderItemId: orderItem.id, storeId, statusId: ACTIVE_STATUS_ID },
          include: [{ model: InventoryItem }, { model: ProductIngredientOption }],
          transaction,
        });
        const removedInventoryIds = new Set(
          modifiers
            .filter((modifier) => modifier.type === 'removed')
            .map((modifier) => Number(modifier.inventoryItemId))
            .filter((value) => Number.isInteger(value) && value > 0)
        );
        const removedNames = new Set(
          modifiers
            .filter((modifier) => modifier.type === 'removed')
            .map((modifier) => normalizeName(modifier.name))
            .filter(Boolean)
        );

        for (const recipeItem of recipeItems) {
          const ingredientTemplate = recipeItem.InventoryItem;
          const ingredientName = ingredientTemplate?.name;
          if (!ingredientName) {
            throw new Error(`La receta de "${product.name}" tiene un ingrediente inválido`);
          }
          if (removedInventoryIds.has(Number(recipeItem.inventoryItemId)) || removedNames.has(normalizeName(ingredientName))) {
            movements.push({
              productId: product.id,
              inventoryItemId: recipeItem.inventoryItemId,
              name: ingredientName,
              quantity: 0,
              mode: 'removed',
            });
            continue;
          }

          const inventoryItem = await InventoryItem.findOne({
            where: {
              storeId,
              headquarterId: order.headquarterId,
              statusId: ACTIVE_STATUS_ID,
              name: ingredientName,
            },
            transaction,
            lock: transaction?.LOCK?.UPDATE,
          });

          if (!inventoryItem) {
            throw new Error(`No hay stock del ingrediente "${ingredientName}" en la sede de la orden`);
          }

          const quantityToConsume = Number(recipeItem.quantity) * Number(orderItem.quantity);
          await this.consumeInventoryItem({
            inventoryItem,
            quantity: quantityToConsume,
            reason: `Orden ${order.order_number} - receta ${product.name}`,
            storeId,
            headquarterId: order.headquarterId,
            transaction,
          });

          movements.push({
            productId: product.id,
            inventoryItemId: inventoryItem.id,
            name: inventoryItem.name,
            quantity: quantityToConsume,
            mode: 'recipe',
          });
        }

        const extraModifiers = modifiers.filter((modifier) => modifier.type === 'extra');
        for (const modifier of extraModifiers) {
          const option = modifier.ProductIngredientOption;
          const modifierInventoryItem = modifier.InventoryItem;
          const ingredientName = modifierInventoryItem?.name ?? modifier.name;

          const inventoryItem = await InventoryItem.findOne({
            where: {
              storeId,
              headquarterId: order.headquarterId,
              statusId: ACTIVE_STATUS_ID,
              name: ingredientName,
            },
            transaction,
            lock: transaction?.LOCK?.UPDATE,
          });

          if (!inventoryItem) {
            throw new Error(`No hay stock del ingrediente extra "${ingredientName}" en la sede de la orden`);
          }

          const extraUnitQuantity = Number(option?.extraQuantity ?? modifier.quantity ?? 1);
          const quantityToConsume = extraUnitQuantity * Number(modifier.quantity) * Number(orderItem.quantity);
          await this.consumeInventoryItem({
            inventoryItem,
            quantity: quantityToConsume,
            reason: `Orden ${order.order_number} - extra ${ingredientName} (${product.name})`,
            storeId,
            headquarterId: order.headquarterId,
            transaction,
          });

          movements.push({
            productId: product.id,
            inventoryItemId: inventoryItem.id,
            name: inventoryItem.name,
            quantity: quantityToConsume,
            mode: 'extra',
          });
        }

        continue;
      }

      const directStockItem = await InventoryItem.findOne({
        where: {
          storeId,
          headquarterId: order.headquarterId,
          productId: product.id,
          statusId: ACTIVE_STATUS_ID,
        },
        transaction,
        lock: transaction?.LOCK?.UPDATE,
      });

      if (!directStockItem) {
        throw new Error(`El producto "${product.name}" no tiene stock directo configurado en la sede de la orden`);
      }

      const quantityToConsume = Number(orderItem.quantity);
      await this.consumeInventoryItem({
        inventoryItem: directStockItem,
        quantity: quantityToConsume,
        reason: `Orden ${order.order_number} - producto ${product.name}`,
        storeId,
        headquarterId: order.headquarterId,
        transaction,
      });

      movements.push({
        productId: product.id,
        inventoryItemId: directStockItem.id,
        name: directStockItem.name,
        quantity: quantityToConsume,
        mode: 'direct',
      });
    }

    await order.update({ inventory_discounted_at: new Date() }, { transaction });

    return { alreadyDiscounted: false, movements };
  }

  static async consumeInventoryItem({
    inventoryItem,
    quantity,
    reason,
    storeId,
    headquarterId,
    transaction,
  }) {
    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      throw new Error('La cantidad a descontar debe ser mayor a 0');
    }

    const currentStock = Number(inventoryItem.stock);
    if (!Number.isFinite(currentStock) || currentStock < parsedQuantity) {
      throw new Error(`Stock insuficiente para "${inventoryItem.name}". Disponible: ${currentStock}, requerido: ${parsedQuantity}`);
    }

    await inventoryItem.update(
      { stock: currentStock - parsedQuantity },
      { transaction },
    );

    await StockMovement.create({
      quantity: parsedQuantity,
      type: 'out',
      reason,
      storeId,
      headquarterId,
      inventoryItemId: inventoryItem.id,
      statusId: ACTIVE_STATUS_ID,
    }, { transaction });
  }

  static async findInventoryByName({ name, storeId, headquarterId, transaction }) {
    return InventoryItem.findOne({
      where: {
        storeId,
        headquarterId,
        statusId: ACTIVE_STATUS_ID,
        name,
      },
      transaction,
    });
  }

  static async upsertIngredientStock({
    name,
    unit = 'unidad',
    currentStock,
    minStock,
    storeId,
    headquarterId,
    transaction,
  }) {
    const normalized = String(name ?? '').trim();
    if (!normalized) {
      throw new Error('El nombre del ingrediente es requerido');
    }

    const existingItems = await InventoryItem.findAll({
      where: { storeId, headquarterId, statusId: ACTIVE_STATUS_ID },
      transaction,
    });
    const existing = existingItems.find((item) => normalizeName(item.name) === normalizeName(normalized));

    if (existing) {
      const updateData = { unit };
      if (currentStock !== undefined) updateData.stock = Number(currentStock);
      if (minStock !== undefined) updateData.min_stock = Number(minStock);
      await existing.update(updateData, { transaction });
      return existing;
    }

    return InventoryItem.create({
      name: normalized,
      unit,
      stock: Number(currentStock ?? 0),
      min_stock: Number(minStock ?? 0),
      storeId,
      headquarterId,
      statusId: ACTIVE_STATUS_ID,
    }, { transaction });
  }

  static async upsertProductStock({
    product,
    currentStock = 0,
    minStock = 0,
    storeId,
    headquarterId,
    transaction,
  }) {
    const existing = await InventoryItem.findOne({
      where: {
        storeId,
        headquarterId,
        productId: product.id,
        statusId: ACTIVE_STATUS_ID,
      },
      transaction,
    });

    const payload = {
      name: product.name,
      unit: 'unidad',
      stock: Number(currentStock),
      min_stock: Number(minStock),
      productId: product.id,
      storeId,
      headquarterId,
      statusId: ACTIVE_STATUS_ID,
    };

    if (existing) {
      await existing.update(payload, { transaction });
      return existing;
    }

    return InventoryItem.create(payload, { transaction });
  }
}

export default InventoryConsumptionService;
