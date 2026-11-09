const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;

  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Falta el token de acceso (Authorization: Bearer <token>)');
  }

  const token = header.slice(7).trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(401, 'TOKEN_EXPIRED', 'El token de acceso ha caducado');
    }
    throw new AppError(401, 'INVALID_TOKEN', 'Token no válido');
  }
};

module.exports = { authenticate };
