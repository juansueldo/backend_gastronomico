import { Op } from 'sequelize';
import {
  CashRegisterMovement,
  Headquarter,
  Order,
  Status,
  Store,
  User,
} from '../models/index.js';
import { parseLocaleNumber } from '../utils/numberParser.js';

const ALLOWED_TYPES = ['opening', 'income', 'expense', 'adjustment', 'closing'];

function extractLinkedOrderId(reference, metadata) {
  const metadataOrderId = metadata?.orderId;
  const parsedMetadataOrderId = Number(metadataOrderId);
  if (Number.isInteger(parsedMetadataOrderId) && parsedMetadataOrderId > 0) {
    return parsedMetadataOrderId;
  }

  if (typeof reference !== 'string') {
    return null;
  }

  const orderReferenceMatch = reference.trim().match(/^ORDER-(\d+)$/i);
  if (!orderReferenceMatch) {
    return null;
  }

  const parsedReferenceOrderId = Number(orderReferenceMatch[1]);
  return Number.isInteger(parsedReferenceOrderId) && parsedReferenceOrderId > 0
    ? parsedReferenceOrderId
    : null;
}

function toSignedAmount(type, amount) {
  const numericAmount = Number(amount);

  if (type === 'expense' || type === 'closing') {
    return -Math.abs(numericAmount);
  }

  if (type === 'adjustment') {
    return numericAmount;
  }

  return Math.abs(numericAmount);
}

function roundAmount(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Number(numericValue.toFixed(2));
}

function buildDateFilter(from, to) {
  if (!from && !to) return undefined;

  const movementDate = {};

  if (from) {
    const parsedFrom = new Date(from);
    if (Number.isNaN(parsedFrom.getTime())) {
      throw new Error('from debe ser una fecha válida');
    }
    movementDate[Op.gte] = parsedFrom;
  }

  if (to) {
    const parsedTo = new Date(to);
    if (Number.isNaN(parsedTo.getTime())) {
      throw new Error('to debe ser una fecha válida');
    }
    movementDate[Op.lte] = parsedTo;
  }

  return movementDate;
}

function parseDateOrThrow(value, fieldName) {
  if (!value) return null;
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`${fieldName} debe ser una fecha válida`);
  }
  return parsedDate;
}

function parseBooleanFlag(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'y', 'si', 'sí'].includes(value.trim().toLowerCase());
}

function buildAfterMovementCondition(movement, inclusive = false) {
  const idOperator = inclusive ? Op.gte : Op.gt;
  return [
    { movementDate: { [Op.gt]: movement.movementDate } },
    { movementDate: movement.movementDate, id: { [idOperator]: movement.id } },
  ];
}

function createSummaryAccumulator() {
  return {
    opening: 0,
    income: 0,
    expense: 0,
    adjustment: 0,
    closing: 0,
    totalInflow: 0,
    totalOutflow: 0,
    balance: 0,
    movementCount: 0,
  };
}

function addMovementToSummary(summary, movement, signedAmount) {
  const normalizedAmount = movement.type === 'adjustment'
    ? Number(movement.amount)
    : Math.abs(Number(movement.amount));

  summary[movement.type] += normalizedAmount;
  if (signedAmount >= 0) {
    summary.totalInflow += signedAmount;
  } else {
    summary.totalOutflow += Math.abs(signedAmount);
  }
  summary.balance += signedAmount;
  summary.movementCount += 1;
}

function normalizeSummary(summary) {
  return Object.entries(summary).reduce((accumulator, [key, value]) => {
    if (typeof value === 'number') {
      accumulator[key] = roundAmount(value);
      return accumulator;
    }
    accumulator[key] = value;
    return accumulator;
  }, {});
}

function periodOverlapsRange(period, from, to) {
  const startedAt = new Date(period.startedAt);
  const endedAt = period.endedAt ? new Date(period.endedAt) : new Date();

  if (from && endedAt < from) {
    return false;
  }

  if (to && startedAt > to) {
    return false;
  }

  return true;
}

function buildPeriodsFromMovements(movements, includeMovements) {
  const periods = [];
  let currentPeriod = null;

  const serializePeriod = (period) => {
    const serializedPeriod = {
      periodId: `OPENING-${period.openingMovementId}`,
      openingMovementId: period.openingMovementId,
      openingMovement: period.openingMovement,
      closingMovement: period.closingMovement,
      startedAt: period.startedAt,
      endedAt: period.endedAt,
      status: period.status,
      movementCount: period.movementCount,
      summary: normalizeSummary(period.summary),
    };

    if (includeMovements) {
      serializedPeriod.movements = period.movements;
    }

    return serializedPeriod;
  };

  for (const movement of movements) {
    const normalizedMovement = {
      ...movement.toJSON(),
      signedAmount: toSignedAmount(movement.type, movement.amount),
    };

    if (movement.type === 'opening') {
      if (currentPeriod) {
        periods.push(serializePeriod(currentPeriod));
      }

      currentPeriod = {
        openingMovementId: movement.id,
        openingMovement: normalizedMovement,
        closingMovement: null,
        startedAt: movement.movementDate,
        endedAt: null,
        status: 'open',
        summary: createSummaryAccumulator(),
        movementCount: 0,
        movements: includeMovements ? [] : null,
      };
    }

    if (!currentPeriod) {
      continue;
    }

    addMovementToSummary(currentPeriod.summary, movement, normalizedMovement.signedAmount);
    if (includeMovements) {
      currentPeriod.movements.push(normalizedMovement);
    }

    currentPeriod.movementCount += 1;

    if (movement.type === 'closing') {
      currentPeriod.closingMovement = normalizedMovement;
      currentPeriod.endedAt = movement.movementDate;
      currentPeriod.status = 'closed';
      periods.push(serializePeriod(currentPeriod));
      currentPeriod = null;
    }
  }

  if (currentPeriod) {
    periods.push(serializePeriod(currentPeriod));
  }

  return periods;
}

function buildTodayDateFilter() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return {
    [Op.gte]: start,
    [Op.lte]: end,
  };
}

async function findHeadquarterOrFail(headquarterId, storeId) {
  return Headquarter.findOne({
    where: { id: headquarterId, storeId },
    include: [{ model: Store, attributes: ['id', 'name'] }],
  });
}

async function findCurrentOpenPeriod(storeId, headquarterId) {
  const latestOpening = await CashRegisterMovement.findOne({
    where: { storeId, headquarterId, type: 'opening' },
    order: [
      ['movementDate', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  if (!latestOpening) {
    return null;
  }

  const closingAfterOpening = await CashRegisterMovement.findOne({
    where: {
      storeId,
      headquarterId,
      type: 'closing',
      [Op.or]: buildAfterMovementCondition(latestOpening),
    },
    order: [
      ['movementDate', 'ASC'],
      ['id', 'ASC'],
    ],
  });

  if (closingAfterOpening) {
    return null;
  }

  const movements = await CashRegisterMovement.findAll({
    where: {
      storeId,
      headquarterId,
      [Op.or]: buildAfterMovementCondition(latestOpening, true),
    },
    order: [
      ['movementDate', 'ASC'],
      ['id', 'ASC'],
    ],
  });

  const summary = createSummaryAccumulator();
  const normalizedMovements = movements.map((movement) => {
    const signedAmount = toSignedAmount(movement.type, movement.amount);
    addMovementToSummary(summary, movement, signedAmount);
    return {
      ...movement.toJSON(),
      signedAmount,
    };
  });

  return {
    openingMovement: latestOpening,
    movements,
    normalizedMovements,
    summary: normalizeSummary(summary),
  };
}

class CashRegisterController {
  static async createMovement(req, res) {
    try {
      const storeId = req.user?.storeId;
      const createdByUserId = req.user?.id || null;
      const headquarterId = Number(req.params.id);
      const { type, amount, description, reference, movementDate, metadata } = req.body;
      const linkedOrderId = type === 'income' ? extractLinkedOrderId(reference, metadata) : null;

      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      if (!Number.isInteger(headquarterId)) {
        return res.status(400).json({ error: 'id de sede inválido' });
      }

      if (!ALLOWED_TYPES.includes(type)) {
        return res.status(400).json({
          error: `type debe ser uno de: ${ALLOWED_TYPES.join(', ')}`,
        });
      }

      if (!description?.trim()) {
        return res.status(400).json({ error: 'description es requerido' });
      }

      const numericAmount = parseLocaleNumber(amount);
      if (!linkedOrderId && (!Number.isFinite(numericAmount) || numericAmount === 0)) {
        return res.status(400).json({ error: 'amount debe ser un número distinto de 0' });
      }

      if (!linkedOrderId && type !== 'adjustment' && numericAmount < 0) {
        return res.status(400).json({
          error: 'amount debe ser positivo para opening, income, expense y closing',
        });
      }

      const headquarter = await findHeadquarterOrFail(headquarterId, storeId);
      if (!headquarter) {
        return res.status(404).json({ error: 'Sede no encontrada para esta tienda' });
      }

      const currentOpenPeriod = await findCurrentOpenPeriod(storeId, headquarterId);
      if (type === 'opening' && currentOpenPeriod) {
        return res.status(409).json({
          error: 'La caja ya está abierta para esta sede',
          openingMovementId: currentOpenPeriod.openingMovement.id,
        });
      }

      if (type !== 'opening' && !currentOpenPeriod) {
        return res.status(409).json({
          error: 'No hay una caja abierta para esta sede. Debe registrar una apertura antes de este movimiento.',
        });
      }

      let resolvedAmount = numericAmount;
      let normalizedReference = reference?.trim() || null;
      let normalizedMetadata = metadata && typeof metadata === 'object' ? metadata : null;

      if (linkedOrderId) {
        const linkedOrder = await Order.findOne({
          where: { id: linkedOrderId, storeId, headquarterId },
        });

        if (!linkedOrder) {
          return res.status(404).json({ error: 'Orden referenciada no encontrada para esta sede' });
        }

        const orderTotal = Number(linkedOrder.total_amount);
        if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
          return res.status(400).json({ error: 'La orden referenciada tiene total inválido' });
        }

        const canonicalReference = `ORDER-${linkedOrder.id}`;
        const existingOrderIncome = await CashRegisterMovement.findOne({
          where: {
            storeId,
            headquarterId,
            type: 'income',
            reference: canonicalReference,
          },
        });

        if (existingOrderIncome) {
          return res.status(409).json({
            error: 'La orden ya fue cobrada en caja',
            movementId: existingOrderIncome.id,
            reference: canonicalReference,
          });
        }

        resolvedAmount = Math.abs(orderTotal);
        normalizedReference = canonicalReference;
        normalizedMetadata = {
          ...(normalizedMetadata || {}),
          orderId: linkedOrder.id,
          source: normalizedMetadata?.source || 'order_reference',
        };
      }

      if (type === 'closing' && currentOpenPeriod) {
        const expectedBalanceBeforeClosing = roundAmount(currentOpenPeriod.summary.balance);
        normalizedMetadata = {
          ...(normalizedMetadata || {}),
          cashPeriod: {
            openingMovementId: currentOpenPeriod.openingMovement.id,
            startedAt: currentOpenPeriod.openingMovement.movementDate,
            expectedBalanceBeforeClosing,
          },
        };
      }

      const persistedAmount = ['expense', 'closing'].includes(type)
        ? -Math.abs(resolvedAmount)
        : type === 'adjustment'
          ? resolvedAmount
          : Math.abs(resolvedAmount);

      const createdMovement = await CashRegisterMovement.create({
        storeId,
        headquarterId,
        createdByUserId,
        type,
        amount: persistedAmount,
        description: description.trim(),
        reference: normalizedReference,
        movementDate: movementDate || new Date(),
        metadata: normalizedMetadata,
        statusId: 1,
      });

      const movement = await CashRegisterMovement.findByPk(createdMovement.id, {
        include: [
          { model: Store, attributes: ['id', 'name'] },
          { model: Headquarter, attributes: ['id', 'name', 'location'] },
          { model: Status, attributes: ['id', 'name'] },
          {
            model: User,
            as: 'createdBy',
            attributes: ['id', 'firstname', 'lastname', 'username'],
          },
        ],
      });

      res.status(201).json({
        ...movement.toJSON(),
        signedAmount: toSignedAmount(movement.type, movement.amount),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async getSummary(req, res) {
    try {
      const storeId = req.user?.storeId;
      const headquarterId = Number(req.params.id);
      const { from, to, type } = req.query;
      const today = parseBooleanFlag(req.query.today);
      const parsedLimit = Number(req.query.limit);
      const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 100;

      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      if (!Number.isInteger(headquarterId)) {
        return res.status(400).json({ error: 'id de sede inválido' });
      }

      if (type && !ALLOWED_TYPES.includes(type)) {
        return res.status(400).json({
          error: `type debe ser uno de: ${ALLOWED_TYPES.join(', ')}`,
        });
      }

      const headquarter = await findHeadquarterOrFail(headquarterId, storeId);
      if (!headquarter) {
        return res.status(404).json({ error: 'Sede no encontrada para esta tienda' });
      }

      const where = { storeId, headquarterId };
      const movementDate = today
        ? buildTodayDateFilter()
        : buildDateFilter(from, to);

      if (type) where.type = type;
      if (movementDate) where.movementDate = movementDate;

      const movements = await CashRegisterMovement.findAll({
        where,
        include: [
          {
            model: User,
            as: 'createdBy',
            attributes: ['id', 'firstname', 'lastname', 'username'],
          },
        ],
        order: [
          ['movementDate', 'DESC'],
          ['id', 'DESC'],
        ],
      });

      const summary = {
        ...createSummaryAccumulator(),
      };

      const normalizedMovements = movements.map((movement) => {
        const signedAmount = toSignedAmount(movement.type, movement.amount);
        addMovementToSummary(summary, movement, signedAmount);

        return {
          ...movement.toJSON(),
          signedAmount,
        };
      });

      res.status(200).json({
        headquarter: {
          id: headquarter.id,
          name: headquarter.name,
          location: headquarter.location,
          store: headquarter.Store,
        },
        filters: {
          from: today ? movementDate[Op.gte] : from || null,
          to: today ? movementDate[Op.lte] : to || null,
          type: type || null,
          today,
          limit,
        },
        summary: normalizeSummary(summary),
        movements: normalizedMovements.slice(0, limit),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async closeCashRegister(req, res) {
    try {
      const storeId = req.user?.storeId;
      const createdByUserId = req.user?.id || null;
      const headquarterId = Number(req.params.id);
      const {
        countedAmount,
        description,
        reference,
        movementDate,
        metadata,
      } = req.body;

      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      if (!Number.isInteger(headquarterId)) {
        return res.status(400).json({ error: 'id de sede inválido' });
      }

      const headquarter = await findHeadquarterOrFail(headquarterId, storeId);
      if (!headquarter) {
        return res.status(404).json({ error: 'Sede no encontrada para esta tienda' });
      }

      const currentOpenPeriod = await findCurrentOpenPeriod(storeId, headquarterId);
      if (!currentOpenPeriod) {
        return res.status(409).json({
          error: 'No hay una caja abierta para cerrar en esta sede',
        });
      }

      const expectedBalance = roundAmount(currentOpenPeriod.summary.balance);
      const hasCountedAmount = countedAmount !== undefined && countedAmount !== null && countedAmount !== '';
      const parsedCountedAmount = hasCountedAmount ? parseLocaleNumber(countedAmount) : expectedBalance;

      if (!Number.isFinite(parsedCountedAmount) || parsedCountedAmount < 0) {
        return res.status(400).json({ error: 'countedAmount debe ser un número mayor o igual a 0' });
      }

      const resolvedMovementDate = movementDate ? parseDateOrThrow(movementDate, 'movementDate') : new Date();
      const normalizedDescription = description?.trim() || 'Cierre de caja';
      const normalizedReference = reference?.trim() || null;
      const normalizedMetadata = metadata && typeof metadata === 'object' ? metadata : null;
      const difference = roundAmount(parsedCountedAmount - expectedBalance);

      const createdMovement = await CashRegisterMovement.create({
        storeId,
        headquarterId,
        createdByUserId,
        type: 'closing',
        amount: -Math.abs(parsedCountedAmount),
        description: normalizedDescription,
        reference: normalizedReference,
        movementDate: resolvedMovementDate,
        metadata: {
          ...(normalizedMetadata || {}),
          cashPeriod: {
            openingMovementId: currentOpenPeriod.openingMovement.id,
            startedAt: currentOpenPeriod.openingMovement.movementDate,
            expectedBalance,
            countedAmount: roundAmount(parsedCountedAmount),
            difference,
          },
        },
        statusId: 1,
      });

      const movement = await CashRegisterMovement.findByPk(createdMovement.id, {
        include: [
          { model: Store, attributes: ['id', 'name'] },
          { model: Headquarter, attributes: ['id', 'name', 'location'] },
          { model: Status, attributes: ['id', 'name'] },
          {
            model: User,
            as: 'createdBy',
            attributes: ['id', 'firstname', 'lastname', 'username'],
          },
        ],
      });

      return res.status(201).json({
        closingMovement: {
          ...movement.toJSON(),
          signedAmount: toSignedAmount(movement.type, movement.amount),
        },
        period: {
          periodId: `OPENING-${currentOpenPeriod.openingMovement.id}`,
          openingMovementId: currentOpenPeriod.openingMovement.id,
          startedAt: currentOpenPeriod.openingMovement.movementDate,
          endedAt: resolvedMovementDate,
          expectedBalance,
          countedAmount: roundAmount(parsedCountedAmount),
          difference,
          movementCountBeforeClosing: currentOpenPeriod.summary.movementCount,
          summaryBeforeClosing: currentOpenPeriod.summary,
          projectedBalanceAfterClosing: roundAmount(expectedBalance - parsedCountedAmount),
        },
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  static async getPeriods(req, res) {
    try {
      const storeId = req.user?.storeId;
      const headquarterId = Number(req.params.id);
      const from = parseDateOrThrow(req.query.from, 'from');
      const to = parseDateOrThrow(req.query.to, 'to');
      const includeMovements = parseBooleanFlag(req.query.includeMovements);
      const includeOpen = req.query.includeOpen === undefined
        ? true
        : parseBooleanFlag(req.query.includeOpen);
      const parsedLimit = Number(req.query.limit);
      const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;

      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      if (!Number.isInteger(headquarterId)) {
        return res.status(400).json({ error: 'id de sede inválido' });
      }

      const headquarter = await findHeadquarterOrFail(headquarterId, storeId);
      if (!headquarter) {
        return res.status(404).json({ error: 'Sede no encontrada para esta tienda' });
      }

      const movements = await CashRegisterMovement.findAll({
        where: { storeId, headquarterId },
        include: [
          {
            model: User,
            as: 'createdBy',
            attributes: ['id', 'firstname', 'lastname', 'username'],
          },
        ],
        order: [
          ['movementDate', 'ASC'],
          ['id', 'ASC'],
        ],
      });

      const periods = buildPeriodsFromMovements(movements, includeMovements)
        .filter((period) => includeOpen || period.status === 'closed')
        .filter((period) => periodOverlapsRange(period, from, to))
        .sort((firstPeriod, secondPeriod) => {
          const firstDate = new Date(firstPeriod.startedAt).getTime();
          const secondDate = new Date(secondPeriod.startedAt).getTime();
          return secondDate - firstDate;
        });

      return res.status(200).json({
        headquarter: {
          id: headquarter.id,
          name: headquarter.name,
          location: headquarter.location,
          store: headquarter.Store,
        },
        filters: {
          from: from || null,
          to: to || null,
          includeMovements,
          includeOpen,
          limit,
        },
        totalPeriods: periods.length,
        periods: periods.slice(0, limit),
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
}

export default CashRegisterController;
