import bcrypt from 'bcrypt';
import { Op } from 'sequelize'
import { Store, User, Role } from '../models/index.js';

class UserController {
    static async createUser(req, res) {
        try {
            const { firstname, username, lastname, email, password, roleId, headquarterId } = req.body;
            const storeId = req.user?.storeId;
            if(await User.findOne({ where: { username } })) throw new Error('Username already exists');
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await User.create({ firstname, username, lastname, email, password: hashedPassword, storeId, statusId: 1, roleId, headquarterId });
            if (!user) throw new Error('Error creating user');
            res.status(201).json({ user });
        }catch (err) {
          res.status(400).json({ error: err.message });
        }   
    }

    static async getAllUsers(req, res) {
        try {
            const storeId = req.user?.storeId;
            const users = await User.findAll({ where: { storeId }, include: [{ model: Role, attributes: ['id', 'name'] }] });
            res.json(users);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getUserById(req, res) {
        try {
            const { id } = req.params;
            const storeId = req.user?.storeId;
            const user = await User.findOne({ where: { id, storeId }, include: [{ model: Role, attributes: ['id', 'name'] }] });
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json(user);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { firstname, username, lastname, email, password, roleId, headquarterId } = req.body;
            const storeId = req.user?.storeId;

            const user = await User.findOne({ where: { id, storeId } });
            if (!user) {
            return res.status(404).json({ error: 'User not found' });
            }

            if (username && username !== user.username) {
            const existingUser = await User.findOne({
                where: {
                    username,
                    id: { [Op.ne]: id }
                }
            });

                if (existingUser) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
            }

            const updateData = {};

            if (firstname !== undefined) updateData.firstname = firstname;
            if (lastname !== undefined) updateData.lastname = lastname;
            if (email !== undefined) updateData.email = email;
            if (username !== undefined) updateData.username = username;
            if (roleId !== undefined) updateData.roleId = roleId;
            if (headquarterId !== undefined) updateData.headquarterId = headquarterId;

            if (password) {
                updateData.password = await bcrypt.hash(password, 10);
            }


            if (Object.keys(updateData).length === 0) {
                return res.status(400).json({ error: 'No data to update' });
            }

            // 💾 Actualizar
            await user.update(updateData);

            // 🔒 Opcional: evitar devolver password
            const safeUser = user.toJSON();
            delete safeUser.password;

            res.json({ user: safeUser });

        } catch (err) {
            console.error('Update user error:', err); // 👈 log útil en producción
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export default UserController;