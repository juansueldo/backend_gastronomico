import bcrypt from 'bcrypt';
import { Op } from 'sequelize'
import { Store, User, Role } from '../models/index.js';
import ImageService from '../services/imageService.js';

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

    static async updateProfileImage(req, res) {
        try {
            const userId = req.user?.id;
            const storeId = req.user?.storeId;
            const image = req.body?.image ?? req.body?.profileImage ?? req.body?.profile_image ?? req.body?.avatar;

            if (!userId || !storeId) {
                return res.status(401).json({ error: 'Usuario no autenticado' });
            }

            if (!image || typeof image !== 'string') {
                return res.status(400).json({ error: 'Imagen requerida' });
            }

            if (!ImageService.isValidBase64(image)) {
                return res.status(400).json({ error: 'Imagen base64 inválida' });
            }

            const user = await User.findOne({ where: { id: userId, storeId } });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (user.profile_image_url) {
                await ImageService.deleteImage(user.profile_image_url);
            }

            const imageResult = await ImageService.saveImage(
                image,
                storeId,
                `user_${userId}_profile_${Date.now()}`
            );

            await user.update({ profile_image_url: imageResult.url });

            res.json({
                profile_image_url: imageResult.url,
                profileImageUrl: imageResult.url,
                user: {
                    id: user.id,
                    firstname: user.firstname,
                    lastname: user.lastname,
                    email: user.email,
                    username: user.username,
                    profile_image_url: imageResult.url,
                    profileImageUrl: imageResult.url,
                },
            });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default UserController;
