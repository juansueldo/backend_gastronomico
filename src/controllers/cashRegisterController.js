import { Op } from 'sequelize';
import {
  CashRegisterMovement,
  Headquarter,
  Status,
  Store,
  User,
} from '../models/index.js';

const ALLOWED_TYPES = ['opening', 'income', 'expense', 'adjustment', 'closing'];

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

async function findHeadquarterOrFail(headquarterId, storeId) {
  return Headquarter.findOne({
    where: { id: headquarterId, storeId },
    include: [{ model: Store, attributes: ['id', 'name'] }],
  });
}

class CashRegisterController {
  static async createMovement(req, res) {
    try {
      const storeId = req.user?.storeId;
      const createdByUserId = req.user?.id || null;
      const headquarterId = Number(req.params.id);
      const { type, amount, description, reference, movementDate, metadata } = req.body;

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

      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount === 0) {
        return res.status(400).json({ error: 'amount debe ser un número distinto de 0' });
      }

      if (type !== 'adjustment' && numericAmount < 0) {
        return res.status(400).json({
          error: 'amount debe ser positivo para opening, income, expense y closing',
        });
      }

      const headquarter = await findHeadquarterOrFail(headquarterId, storeId);
      if (!headquarter) {
        return res.status(404).json({ error: 'Sede no encontrada para esta tienda' });
      }

      const createdMovement = await CashRegisterMovement.create({
        storeId,
        headquarterId,
        createdByUserId,
        type,
        amount: numericAmount,
        description: description.trim(),
        reference: reference?.trim() || null,
        movementDate: movementDate || new Date(),
        metadata: metadata || null,
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
      const movementDate = buildDateFilter(from, to);

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
        opening: 0,
        income: 0,
        expense: 0,
        adjustment: 0,
        closing: 0,
        totalInflow: 0,
        totalOutflow: 0,
        balance: 0,
        movementCount: movements.length,
      };

      const normalizedMovements = movements.map((movement) => {
        const signedAmount = toSignedAmount(movement.type, movement.amount);

        summary[movement.type] += Number(movement.amount);
        if (signedAmount >= 0) {
          summary.totalInflow += signedAmount;
        } else {
          summary.totalOutflow += Math.abs(signedAmount);
        }
        summary.balance += signedAmount;

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
          from: from || null,
          to: to || null,
          type: type || null,
          limit,
        },
        summary,
        movements: normalizedMovements.slice(0, limit),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default CashRegisterController;
