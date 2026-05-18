import { Headquarter, HeadquarterSchedule } from '../models/index.js';

function hasOwnProperty(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}

function normalizeDateOnly(rawValue, fieldName) {
    if (typeof rawValue !== 'string') {
        throw new Error(`${fieldName} debe ser string con formato YYYY-MM-DD`);
    }

    const normalizedValue = rawValue.trim();

    const validDateFormat = /^\d{4}-\d{2}-\d{2}$/;

    if (!validDateFormat.test(normalizedValue)) {
        throw new Error(`${fieldName} debe tener formato YYYY-MM-DD`);
    }

    const parsedDate = new Date(`${normalizedValue}T00:00:00.000Z`);

    if (Number.isNaN(parsedDate.getTime())) {
        throw new Error(`${fieldName} debe ser una fecha válida`);
    }

    return normalizedValue;
}

function normalizeClosurePeriods(rawValue) {
    if (rawValue === undefined) return undefined;

    if (rawValue === null || rawValue === '') {
        return null;
    }

    let parsedValue = rawValue;

    if (typeof parsedValue === 'string') {
        try {
            parsedValue = JSON.parse(parsedValue);
        } catch {
            throw new Error('closure_periods string debe ser JSON válido');
        }
    }

    if (!Array.isArray(parsedValue)) {
        throw new Error('closure_periods debe ser un arreglo');
    }

    return parsedValue.map((period, index) => {
        if (!period || typeof period !== 'object') {
            throw new Error(`closure_periods[${index}] debe ser un objeto`);
        }

        const rawStartDate = period.start_date ?? period.startDate;

        const rawEndDate =
            period.end_date ??
            period.endDate ??
            rawStartDate;

        const startDate = normalizeDateOnly(
            rawStartDate,
            `closure_periods[${index}].start_date`
        );

        const endDate = normalizeDateOnly(
            rawEndDate,
            `closure_periods[${index}].end_date`
        );

        if (startDate > endDate) {
            throw new Error(
                `closure_periods[${index}] tiene start_date mayor a end_date`
            );
        }

        const reason =
            period.reason === undefined ||
            period.reason === null
                ? null
                : String(period.reason).trim() || null;

        return {
            start_date: startDate,
            end_date: endDate,
            reason,
        };
    });
}

const WEEK_DAYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
];

const WEEK_DAYS_SET = new Set(WEEK_DAYS);

function normalizeBoolean(value, fieldName) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') {
        if (value === 1) return true;
        if (value === 0) return false;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') return true;
        if (normalized === 'false' || normalized === '0') return false;
    }

    throw new Error(`${fieldName} debe ser boolean`);
}

function normalizeTime(rawValue, fieldName) {
    if (typeof rawValue !== 'string') {
        throw new Error(`${fieldName} debe ser string con formato HH:mm o HH:mm:ss`);
    }

    const normalizedValue = rawValue.trim();
    const validTimeFormat = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
    const match = normalizedValue.match(validTimeFormat);

    if (!match) {
        throw new Error(`${fieldName} debe tener formato HH:mm o HH:mm:ss`);
    }

    const hours = match[1];
    const minutes = match[2];
    const seconds = match[4] ?? '00';

    return `${hours}:${minutes}:${seconds}`;
}

function normalizeHeadquarterSchedules(rawValue) {
    let parsedValue = rawValue;

    if (typeof parsedValue === 'string') {
        try {
            parsedValue = JSON.parse(parsedValue);
        } catch {
            throw new Error('schedules string debe ser JSON válido');
        }
    }

    if (!Array.isArray(parsedValue)) {
        throw new Error('schedules debe ser un arreglo');
    }

    const seenDays = new Set();

    return parsedValue.map((schedule, index) => {
        if (!schedule || typeof schedule !== 'object') {
            throw new Error(`schedules[${index}] debe ser un objeto`);
        }

        const rawDay = schedule.day_of_week ?? schedule.dayOfWeek;
        if (typeof rawDay !== 'string') {
            throw new Error(`schedules[${index}].day_of_week es requerido`);
        }

        const day = rawDay.trim().toLowerCase();
        if (!WEEK_DAYS_SET.has(day)) {
            throw new Error(`schedules[${index}].day_of_week no es válido`);
        }

        if (seenDays.has(day)) {
            throw new Error(`schedules contiene día duplicado: ${day}`);
        }
        seenDays.add(day);

        const rawIsClosed = schedule.is_closed ?? schedule.isClosed ?? false;
        const isClosed = normalizeBoolean(rawIsClosed, `schedules[${index}].is_closed`);

        if (isClosed) {
            return {
                day_of_week: day,
                open_time: null,
                close_time: null,
                is_closed: true,
            };
        }

        const rawOpenTime = schedule.open_time ?? schedule.openTime;
        const rawCloseTime = schedule.close_time ?? schedule.closeTime;

        const openTime = normalizeTime(rawOpenTime, `schedules[${index}].open_time`);
        const closeTime = normalizeTime(rawCloseTime, `schedules[${index}].close_time`);

        if (openTime >= closeTime) {
            throw new Error(`schedules[${index}] tiene open_time mayor o igual a close_time`);
        }

        return {
            day_of_week: day,
            open_time: openTime,
            close_time: closeTime,
            is_closed: false,
        };
    });
}

class HeadquarterController {

    static async create(req, res) {
        try {

            const {
                name,
                phone,
                location,
                closure_periods,
                closurePeriods,
            } = req.body;

            const storeId = req.user?.storeId;

            if (!storeId) {
                return res.status(401).json({
                    error: 'storeId no encontrado en el token',
                });
            }

            if (!name) {
                return res.status(400).json({
                    error: 'name es requerido',
                });
            }

            const normalizedClosurePeriods =
                normalizeClosurePeriods(
                    closure_periods ?? closurePeriods
                );

            const headquarter = await Headquarter.create({
                name,
                phone,
                location,
                closure_periods:
                    normalizedClosurePeriods ?? null,
                storeId,
                statusId: 1,
            });

            return res.status(201).json(headquarter);

        } catch (err) {
            return res.status(400).json({
                error: err.message,
            });
        }
    }

    static async getList(req, res) {
        try {

            const storeId = req.user?.storeId;

            if (!storeId) {
                return res.status(401).json({
                    error: 'storeId no encontrado en el token',
                });
            }

            const headquarters = await Headquarter.findAll({
                where: { storeId },
            });

            return res.json(headquarters);

        } catch (err) {
            return res.status(400).json({
                error: err.message,
            });
        }
    }

    static async getById(req, res) {
        try {

            const { id } = req.params;

            const storeId = req.user?.storeId;

            if (!storeId) {
                return res.status(401).json({
                    error: 'storeId no encontrado en el token',
                });
            }

            const headquarter = await Headquarter.findOne({
                where: {
                    id,
                    storeId,
                },
            });

            if (!headquarter) {
                return res.status(404).json({
                    error: 'Sede no encontrada',
                });
            }

            return res.json(headquarter);

        } catch (err) {
            return res.status(500).json({
                error: err.message,
            });
        }
    }

    static async update(req, res) {
        try {

            const { id } = req.params;

            const storeId = req.user?.storeId;

            if (!storeId) {
                return res.status(401).json({
                    error: 'storeId no encontrado en el token',
                });
            }

            const headquarter = await Headquarter.findOne({
                where: {
                    id,
                    storeId,
                },
            });

            if (!headquarter) {
                return res.status(404).json({
                    error: 'Sede no encontrada',
                });
            }

            const closurePeriodsField =
                hasOwnProperty(req.body, 'closure_periods')
                    ? req.body.closure_periods
                    : hasOwnProperty(req.body, 'closurePeriods')
                        ? req.body.closurePeriods
                        : undefined;

            const updateData = {};

            if (hasOwnProperty(req.body, 'name')) {

                if (!req.body.name) {
                    return res.status(400).json({
                        error: 'name no puede ser vacío',
                    });
                }

                updateData.name = req.body.name;
            }

            if (hasOwnProperty(req.body, 'phone')) {
                updateData.phone = req.body.phone;
            }

            if (hasOwnProperty(req.body, 'location')) {
                updateData.location = req.body.location;
            }

            if (closurePeriodsField !== undefined) {
                updateData.closure_periods =
                    normalizeClosurePeriods(
                        closurePeriodsField
                    );
            }

            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({
                    error: 'No hay campos para actualizar',
                });
            }

            await headquarter.update(updateData);

            return res.json(headquarter);

        } catch (err) {
            return res.status(400).json({
                error: err.message,
            });
        }
    }

    static async configureSchedules(req, res) {
        try {
            const { id } = req.params;
            const storeId = req.user?.storeId;

            if (!storeId) {
                return res.status(401).json({
                    error: 'storeId no encontrado en el token',
                });
            }

            const headquarterId = Number(id);
            if (!Number.isInteger(headquarterId) || headquarterId <= 0) {
                return res.status(400).json({
                    error: 'id debe ser un entero válido',
                });
            }

            const headquarter = await Headquarter.findOne({
                where: {
                    id: headquarterId,
                    storeId,
                },
            });

            if (!headquarter) {
                return res.status(404).json({
                    error: 'Sede no encontrada',
                });
            }

            const schedulesField =
                hasOwnProperty(req.body, 'schedules')
                    ? req.body.schedules
                    : hasOwnProperty(req.body, 'headquarterSchedules')
                        ? req.body.headquarterSchedules
                        : hasOwnProperty(req.body, 'headquarter_schedules')
                            ? req.body.headquarter_schedules
                            : undefined;

            if (schedulesField === undefined) {
                return res.status(400).json({
                    error: 'schedules es requerido',
                });
            }

            const normalizedSchedules = normalizeHeadquarterSchedules(schedulesField);

            await HeadquarterSchedule.destroy({
                where: { headquarterId },
            });

            if (normalizedSchedules.length > 0) {
                await HeadquarterSchedule.bulkCreate(
                    normalizedSchedules.map((schedule) => ({
                        ...schedule,
                        headquarterId,
                    }))
                );
            }

            const savedSchedules = await HeadquarterSchedule.findAll({
                where: { headquarterId },
                attributes: ['day_of_week', 'open_time', 'close_time', 'is_closed'],
            });

            const sortedSchedules = [...savedSchedules].sort((a, b) => {
                const dayA = WEEK_DAYS.indexOf(a.day_of_week);
                const dayB = WEEK_DAYS.indexOf(b.day_of_week);
                return dayA - dayB;
            });

            return res.status(200).json({
                headquarterId,
                schedules: sortedSchedules,
            });
        } catch (err) {
            return res.status(400).json({
                error: err.message,
            });
        }
    }
}

export default HeadquarterController;
