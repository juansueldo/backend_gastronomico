
import jwt from 'jsonwebtoken';

/**
 * Genera un JWT con datos del usuario
 * @param {Object} user - Usuario con id, email, storeId, roleId
 * @returns {String} Token JWT
 */
async function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        storeId: user.storeId,
        roleId: user.roleId,
        username: user.username,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
    return token;
}

async function generateAdminToken(admin) {
    const payload = {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'admin',
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
    return token;
}

/**
 * Valida el token JWT y extrae los datos
 * @param {String} token - Token JWT
 * @returns {Object} Datos decodificados o null
 */
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (err) {
        return null;
    }
}

/**
 * Extrae el token del header Authorization
 * @param {String} authHeader - Authorization header
 * @returns {String} Token o null
 */
function extractToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.split(' ')[1];
}

export { generateToken, generateAdminToken, verifyToken, extractToken };
