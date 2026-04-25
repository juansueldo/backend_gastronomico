
import bcrypt from 'bcrypt';
import { Store, User, Role, Headquarter } from '../models/index.js';
import { generateToken } from '../middleware/token.js';

class AuthController {
  
  static async register(req, res) {
    try {
        const { storename, slug, timezone, location, firstname, username, lastname, email, password } = req.body;
        const store = await Store.create({ name: storename, slug, timezone, location, email, statusId: 1 });
        if(await Store.findOne({ where: { slug } })) throw new Error('Store slug already exists');
        if(await Store.findOne({ where: { email } })) throw new Error('Store email already exists');
        if(await Store.findOne({ where: { name: storename } })) throw new Error('Store name already exists');
        if(await User.findOne({ where:  { username } })) throw new Error('Username already exists');
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!store) throw new Error('Error creating store');
        const headquarter = await Headquarter.create({name:'central', phone: '', location});
        if(!headquarter) throw new Error('Error create headquarter')
        const user = await User.create({ firstname, username, lastname, email, password: hashedPassword, storeId: store.id, headquarterId: headquarter.id,statusId: 1, roleId: 1 });
        if (!user) throw new Error('Error creating user');
        res.status(201).json({ store, user });
    }catch (err) {
      res.status(400).json({ error: err });
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