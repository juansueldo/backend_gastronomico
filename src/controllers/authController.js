
import bcrypt from 'bcrypt';

import { Store, User, Role, Headquarter, sequelize } from '../models/index.js';
import { generateToken } from '../middleware/token.js';

class AuthController {
  
  static async register(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const {
        storename,
        slug,
        timezone,
        location,
        profile_image_url,
        profileImageUrl,
        firstname,
        username,
        lastname,
        email,
        password
      } = req.body;

      // ─────────────────────────────
      // Validaciones básicas
      // ─────────────────────────────
      if (
        !storename ||
        !slug ||
        !firstname ||
        !lastname ||
        !username ||
        !email ||
        !password
      ) {
        throw new Error('Missing required fields');
      }

      // ─────────────────────────────
      // Verificar duplicados
      // ─────────────────────────────
      const existingSlug = await Store.findOne({
        where: { slug },
        transaction
      });

      if (existingSlug) {
        throw new Error('Store slug already exists');
      }

      const existingStoreName = await Store.findOne({
        where: { name: storename },
        transaction
      });

      if (existingStoreName) {
        throw new Error('Store name already exists');
      }

      const existingEmail = await User.findOne({
        where: { email },
        transaction
      });

      if (existingEmail) {
        throw new Error('User email already exists');
      }

      const existingUsername = await User.findOne({
        where: { username },
        transaction
      });

      if (existingUsername) {
        throw new Error('Username already exists');
      }

      // ─────────────────────────────
      // Crear tienda
      // ─────────────────────────────
      const store = await Store.create(
        {
          name: storename,
          slug,
          timezone,
          location,
          profile_image_url: profile_image_url || profileImageUrl || null,
          statusId: 1
        },
        { transaction }
      );

      // ─────────────────────────────
      // Crear sucursal principal
      // ─────────────────────────────
      const headquarter = await Headquarter.create(
        {
          name: 'Central',
          phone: '',
          location,
          storeId: store.id,
          statusId: 1
        },
        { transaction }
      );

      // ─────────────────────────────
      // Crear usuario admin
      // ─────────────────────────────
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create(
        {
          firstname,
          lastname,
          username,
          email,
          password: hashedPassword,
          storeId: store.id,
          headquarterId: headquarter.id,
          statusId: 1,
          roleId: 1
        },
        { transaction }
      );

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        store,
        user
      });

    } catch (err) {
      await transaction.rollback();

      console.error('REGISTER ERROR:', err);

      return res.status(400).json({
        success: false,
        error: err.message || 'Unexpected error'
      });
    }
  }

  static async login(req, res) {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ where: { username } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        const token = await generateToken(user);
        const role = await Role.findOne({ where: { id: user.roleId } });
        const userData = { 
            id: user.id, 
            firstname: user.firstname, 
            lastname: user.lastname, 
            email: user.email, 
            customerId: user.customerId,
            roleId: user.roleId,
            role: role.name,
            token: token
        };
        res.json({ message: 'Login successful', user: userData });
    }catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default AuthController;
