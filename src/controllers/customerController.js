import { Op } from 'sequelize';
import {
    Customer,
    DeliveryZone,
    Headquarter,
    Order,
    OrderItem,
    Product,
    Status,
    Store,
    Table,
    Waiter,
} from '../models/index.js';

function toPositiveInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getPagination(query) {
    const length = query.length !== undefined ? toPositiveInteger(query.length, 10) : null;
    const start = query.start !== undefined ? Math.max(Number.parseInt(query.start, 10) || 0, 0) : null;
    const page = toPositiveInteger(query.page, 1);
    const limit = Math.min(length ?? toPositiveInteger(query.limit, 10), 100);
    const offset = start ?? ((page - 1) * limit);

    return { limit, offset, page: Math.floor(offset / limit) + 1 };
}

function getSearchValue(query) {
    return String(query.search?.value ?? query['search[value]'] ?? query.search ?? query.q ?? '').trim();
}

function getCustomerOrder(query) {
    const sortableColumns = {
        id: ['id', 'ASC'],
        name: ['name', 'ASC'],
        phone: ['phone', 'ASC'],
        email: ['email', 'ASC'],
        createdAt: ['createdAt', 'DESC'],
        updatedAt: ['updatedAt', 'DESC'],
    };

    const requestedColumnIndex = query.order?.[0]?.column ?? query['order[0][column]'];
    const dataTableColumn = requestedColumnIndex !== undefined
        ? query.columns?.[requestedColumnIndex]?.data ?? query[`columns[${requestedColumnIndex}][data]`]
        : null;
    const sortBy = query.sortBy ?? query.orderBy ?? dataTableColumn ?? 'createdAt';
    const direction = String(query.sortDir ?? query.orderDir ?? query.order?.[0]?.dir ?? query['order[0][dir]'] ?? '').toUpperCase();
    const [column, defaultDirection] = sortableColumns[sortBy] ?? sortableColumns.createdAt;

    return [[column, direction === 'ASC' || direction === 'DESC' ? direction : defaultDirection]];
}

class CustomerController {
    static async create(req, res) {
        try {
            const { firstname, lastname, phone, email, metadata } = req.body;
            const storeId = req.user?.storeId;
            
            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });
            if (!firstname) return res.status(400).json({ error: 'firstname es requerido' });
            if (!lastname) return res.status(400).json({ error: 'lastname es requerido' });
            if (!phone) return res.status(400).json({ error: 'phone es requerido' });
            
            const store = await Store.findByPk(storeId);
            if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });
            
            const customer = await Customer.create({ 
                firstname,
                lastname,
                phone, 
                email,
                metadata,
                storeId,
                statusId: 1 
            });
            
            const result = await Customer.findByPk(customer.id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] }
                ]
            });
            
            res.status(201).json(result);
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getAll(req, res) {
        try {
            const storeId = req.user?.storeId;
            
            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });
            
            const customers = await Customer.findAndCountAll({
                where: { storeId },
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] }
                ],
            });
            res.json(customers);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async datatable(req, res) {
        try {
            const storeId = req.user?.storeId;

            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });

            const { limit, offset, page } = getPagination(req.query);
            const searchValue = getSearchValue(req.query);
            const where = { storeId };

            if (searchValue) {
                where[Op.or] = [
                    { name: { [Op.iLike]: `%${searchValue}%` } },
                    { phone: { [Op.iLike]: `%${searchValue}%` } },
                    { email: { [Op.iLike]: `%${searchValue}%` } },
                ];
            }

            const [recordsTotal, customers] = await Promise.all([
                Customer.count({ where: { storeId } }),
                Customer.findAndCountAll({
                    where,
                    include: [
                        { model: Status, attributes: ['id', 'name'] },
                    ],
                    limit,
                    offset,
                    order: getCustomerOrder(req.query),
                }),
            ]);

            const customerIds = customers.rows.map((customer) => customer.id);
            const orders = customerIds.length
                ? await Order.findAll({
                    where: { storeId, customerId: { [Op.in]: customerIds } },
                    attributes: ['id', 'customerId', 'total_amount', 'order_date', 'status'],
                    order: [['order_date', 'DESC']],
                })
                : [];

            const orderSummaryByCustomer = orders.reduce((summary, order) => {
                const customerId = order.customerId;
                if (!summary[customerId]) {
                    summary[customerId] = {
                        orderCount: 0,
                        totalSpent: 0,
                        lastOrder: null,
                    };
                }

                summary[customerId].orderCount += 1;
                summary[customerId].totalSpent += Number(order.total_amount) || 0;
                if (!summary[customerId].lastOrder) {
                    summary[customerId].lastOrder = {
                        id: order.id,
                        order_date: order.order_date,
                        status: order.status,
                        total_amount: order.total_amount,
                    };
                }

                return summary;
            }, {});

            const data = customers.rows.map((customer) => {
                const summary = orderSummaryByCustomer[customer.id] ?? {
                    orderCount: 0,
                    totalSpent: 0,
                    lastOrder: null,
                };

                return {
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email,
                    metadata: customer.metadata,
                    status: customer.Status ? {
                        id: customer.Status.id,
                        name: customer.Status.name,
                    } : null,
                    orderCount: summary.orderCount,
                    totalSpent: Number(summary.totalSpent.toFixed(2)),
                    lastOrder: summary.lastOrder,
                    createdAt: customer.createdAt,
                    updatedAt: customer.updatedAt,
                };
            });

            res.status(200).json({
                draw: req.query.draw !== undefined ? Number.parseInt(req.query.draw, 10) || 0 : undefined,
                recordsTotal,
                recordsFiltered: customers.count,
                data,
                page,
                limit,
                totalPages: Math.ceil(customers.count / limit),
            });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getOrders(req, res) {
        try {
            const storeId = req.user?.storeId;

            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });

            const customer = await Customer.findOne({
                where: { id: req.params.id, storeId },
                attributes: ['id', 'name', 'phone', 'email'],
            });

            if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });

            const { limit, offset, page } = getPagination(req.query);
            const orders = await Order.findAndCountAll({
                where: { storeId, customerId: customer.id },
                include: [
                    { model: OrderItem, include: [Product, { model: Status, attributes: ['id', 'name'] }] },
                    { model: Status, attributes: ['id', 'name'] },
                    { model: DeliveryZone, attributes: ['id', 'name', 'zoneid'] },
                    { model: Headquarter, attributes: ['id', 'name', 'location'] },
                    { model: Table, attributes: ['id', 'name', 'table_number'] },
                    { model: Waiter, attributes: ['id', 'firstname', 'lastname'] },
                ],
                limit,
                offset,
                order: [['order_date', 'DESC']],
                distinct: true,
            });

            res.status(200).json({
                customer,
                count: orders.count,
                rows: orders.rows,
                page,
                limit,
                totalPages: Math.ceil(orders.count / limit),
            });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getById(req, res) {
        try {
            const storeId = req.user?.storeId;
            
            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });
            
            const customer = await Customer.findByPk(req.params.id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] }
                ]
            });
            
            if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
            if (customer.storeId !== storeId) return res.status(403).json({ error: 'No tienes acceso a este cliente' });
            
            res.status(200).json(customer);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    // ─── Buscar por teléfono y/o email ────────────────────────────────────────
    // GET /customers/search?phone=...&email=...
    // Al menos uno de los dos parámetros es requerido.
    // La búsqueda por teléfono es exacta; la de email es case-insensitive.
    static async search(req, res) {
        try {
            const storeId = req.user?.storeId;

            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });

            const { phone, email } = req.query;

            if (!phone && !email) {
                return res.status(400).json({ error: 'Debés proporcionar al menos phone o email como parámetro de búsqueda' });
            }

            const conditions = [];

            if (phone) {
                conditions.push({ phone });
            }

            if (email) {
                conditions.push({ email: { [Op.iLike]: email.trim() } });
            }

            const customers = await Customer.findOne({
                where: {
                    storeId,
                    [Op.or]: conditions,
                },
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] },
                ],
            });
            console.log(customers);
            res.status(200).json(customers);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async update(req, res) {
        try {
            const storeId = req.user?.storeId;
            
            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });
            
            const customer = await Customer.findByPk(req.params.id);
            if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
            if (customer.storeId !== storeId) return res.status(403).json({ error: 'No tienes acceso a este cliente' });
            
            const { firstname, lastname, phone, email, metadata } = req.body;
            
            if (firstname) customer.firstname = firstname;
            if (lastname) customer.lastname = lastname;
            if (phone) customer.phone = phone;
            if (email) customer.email = email;
            if (metadata) customer.metadata = metadata;
            
            await customer.save();
            
            const updated = await Customer.findByPk(req.params.id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] }
                ]
            });
            
            res.status(200).json(updated);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async delete(req, res) {
        try {
            const storeId = req.user?.storeId;
            
            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });
            
            const customer = await Customer.findByPk(req.params.id);
            if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
            if (customer.storeId !== storeId) return res.status(403).json({ error: 'No tienes acceso a este cliente' });
            
            await customer.destroy();
            res.status(200).json({ message: 'Cliente eliminado' });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default CustomerController;
