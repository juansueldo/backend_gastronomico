import express from 'express';
import HeadquarterController from "../controllers/headquaterController.js";
import CashRegisterController from '../controllers/cashRegisterController.js';

const router = express.Router();

/**
 * @swagger
 * /headquarter:
 *   post:
 *     summary: Crear una nueva sede
 *     description: Crea una sede para la tienda autenticada.
 *     tags:
 *       - Headquarter
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Sucursal Centro"
 *               phone:
 *                 type: string
 *                 example: "+54 11 5555 1234"
 *               location:
 *                 type: string
 *                 example: "Av. Corrientes 1234"
 *               latitude:
 *                 type: number
 *                 format: double
 *                 nullable: true
 *                 minimum: -90
 *                 maximum: 90
 *                 example: -34.70673
 *               longitude:
 *                 type: number
 *                 format: double
 *                 nullable: true
 *                 minimum: -180
 *                 maximum: 180
 *                 example: -58.28587
 *               open_time:
 *                 type: string
 *                 example: "09:00"
 *                 description: Hora de apertura en formato HH:mm
 *               close_time:
 *                 type: string
 *                 example: "22:30"
 *                 description: Hora de cierre en formato HH:mm
 *               working_days:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *                 example: ["monday", "tuesday", "wednesday", "thursday", "friday"]
 *               closure_periods:
 *                 type: array
 *                 description: Períodos excepcionales de cierre (vacaciones, feriados especiales). Para un día puntual usar start_date igual a end_date.
 *                 items:
 *                   type: object
 *                   properties:
 *                     start_date:
 *                       type: string
 *                       format: date
 *                       example: "2026-07-15"
 *                     end_date:
 *                       type: string
 *                       format: date
 *                       example: "2026-07-20"
 *                     reason:
 *                       type: string
 *                       example: "Vacaciones de invierno"
 *     responses:
 *       201:
 *         description: Sede creada exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *   get:
 *     summary: Obtener sedes de la tienda
 *     description: Lista todas las sedes asociadas a la tienda autenticada.
 *     tags:
 *       - Headquarter
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de sedes
 *       401:
 *         description: No autorizado
 * /headquarter/{id}:
 *   get:
 *     summary: Obtener una sede por ID
 *     tags:
 *       - Headquarter
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sede encontrada
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Sede no encontrada
 *   put:
 *     summary: Actualizar una sede por ID
 *     tags:
 *       - Headquarter
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Sucursal Centro Renovada"
 *               phone:
 *                 type: string
 *                 example: "+54 11 5555 8888"
 *               location:
 *                 type: string
 *                 example: "Av. Corrientes 999"
 *               latitude:
 *                 type: number
 *                 format: double
 *                 nullable: true
 *                 minimum: -90
 *                 maximum: 90
 *                 example: -34.70673
 *               longitude:
 *                 type: number
 *                 format: double
 *                 nullable: true
 *                 minimum: -180
 *                 maximum: 180
 *                 example: -58.28587
 *               open_time:
 *                 type: string
 *                 example: "10:00"
 *               close_time:
 *                 type: string
 *                 example: "23:00"
 *               working_days:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *               closure_periods:
 *                 type: array
 *                 description: Períodos excepcionales de cierre. Para un día puntual usar start_date igual a end_date.
 *                 items:
 *                   type: object
 *                   properties:
 *                     start_date:
 *                       type: string
 *                       format: date
 *                     end_date:
 *                       type: string
 *                       format: date
 *                     reason:
 *                       type: string
 *     responses:
 *       200:
 *         description: Sede actualizada correctamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Sede no encontrada
 * /headquarter/{id}/cash-register:
 *   get:
 *     summary: Obtener resumen de caja por sede
 *     description: Retorna el balance actual y los movimientos registrados para la sede indicada. Se pueden filtrar movimientos por fecha y tipo.
 *     tags:
 *       - CashRegister
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha desde la cual incluir movimientos
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha hasta la cual incluir movimientos
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [opening, income, expense, adjustment, closing]
 *         description: Filtrar por tipo de movimiento
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 50
 *         description: Máximo de movimientos a devolver
 *     responses:
 *       200:
 *         description: Resumen de caja generado correctamente
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Sede no encontrada
 *   post:
 *     summary: Registrar un movimiento de caja
 *     description: Permite registrar aperturas, ingresos, egresos, ajustes o cierres para una sede específica.
 *     tags:
 *       - CashRegister
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - amount
 *               - description
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [opening, income, expense, adjustment, closing]
 *                 example: "income"
 *               amount:
 *                 type: number
 *                 example: 12500.5
 *                 description: Para adjustment se permiten valores positivos o negativos. Para el resto debe ser positivo.
 *               description:
 *                 type: string
 *                 example: "Cobro en efectivo del turno mañana"
 *               reference:
 *                 type: string
 *                 example: "TICKET-000123"
 *               movementDate:
 *                 type: string
 *                 format: date-time
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Movimiento registrado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Sede no encontrada
 * /headquarter/{id}/cash-register/close:
 *   post:
 *     summary: Realizar cierre de caja
 *     description: Cierra la caja abierta para la sede, calculando el saldo esperado del período abierto y permitiendo informar el monto contado.
 *     tags:
 *       - CashRegister
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               countedAmount:
 *                 type: number
 *                 example: 55000
 *                 description: Monto contado al cierre. Si no se envía, se usa el saldo esperado.
 *               description:
 *                 type: string
 *                 example: "Cierre de turno noche"
 *               reference:
 *                 type: string
 *                 example: "CIERRE-2026-05-12"
 *               movementDate:
 *                 type: string
 *                 format: date-time
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Cierre registrado correctamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Sede no encontrada
 *       409:
 *         description: No hay caja abierta para cerrar
 * /headquarter/{id}/cash-register/periods:
 *   get:
 *     summary: Obtener períodos de caja
 *     description: Lista períodos de caja (abiertos y/o cerrados) con resumen financiero y opcionalmente sus movimientos.
 *     tags:
 *       - CashRegister
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha mínima para filtrar períodos
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Fecha máxima para filtrar períodos
 *       - in: query
 *         name: includeOpen
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Incluir períodos abiertos (sin cierre registrado)
 *       - in: query
 *         name: includeMovements
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Incluir detalle de movimientos dentro de cada período
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *         description: Cantidad máxima de períodos a devolver
 *     responses:
 *       200:
 *         description: Períodos obtenidos correctamente
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Sede no encontrada
 */
router.post('/', async (req, res) => {
  await HeadquarterController.create(req, res);
});

router.get('/', async (req, res) => {
  await HeadquarterController.getList(req, res);
});

router.get('/:id', async(req, res)=>{
  await HeadquarterController.getById(req, res);
});

router.put('/:id', async (req, res) => {
  await HeadquarterController.update(req, res);
});

router.patch('/:id', async (req, res) => {
  await HeadquarterController.update(req, res);
});

router.put('/:id/schedules', async (req, res) => {
  await HeadquarterController.configureSchedules(req, res);
});

router.get('/:id/cash-register', async (req, res) => {
  await CashRegisterController.getSummary(req, res);
});

router.post('/:id/cash-register', async (req, res) => {
  await CashRegisterController.createMovement(req, res);
});

router.post('/:id/cash-register/close', async (req, res) => {
  await CashRegisterController.closeCashRegister(req, res);
});

router.get('/:id/cash-register/periods', async (req, res) => {
  await CashRegisterController.getPeriods(req, res);
});

export default router;
