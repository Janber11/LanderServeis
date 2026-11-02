const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const userService = require('./userService');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const MAX_PASSWORD_BYTES = 72;

// Falla al arrancar si falta el secreto: mejor que descubrirlo en el primer login
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET no definido o demasiado corto (mínimo 32 caracteres) en el .env');
}

// Hash falso para comparar cuando el email no existe: así tarda lo mismo
// y no se puede averiguar qué emails están registrados midiendo el tiempo
const DUMMY_HASH = bcrypt.hashSync('contrasenya-inexistent', 12);

const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos');

// Registro: reutiliza la lógica de userService (role=client, active=true, bcrypt, validaciones)
const register = (data) => userService.createUser(data);

const login = async (data = {}) => {
  const details = [];
  if (typeof data.email !== 'string' || data.email.trim() === '') {
    details.push({ field: 'email', message: 'El email es obligatorio' });
  }
  if (typeof data.password !== 'string' || data.password === '') {
    details.push({ field: 'password', message: 'La contraseña es obligatoria' });
  }
  if (details.length > 0) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Les dades no són vàlides', details);
  }

  const email = data.email.trim().toLowerCase();
  const user = await User.findOne({ email }).select('+passwordHash');

  // Siempre se hace una comparación bcrypt, exista o no el usuario
  const hash = user && user.passwordHash ? user.passwordHash : DUMMY_HASH;
  const matches = await bcrypt.compare(data.password, hash);
  const tooLong = Buffer.byteLength(data.password, 'utf8') > MAX_PASSWORD_BYTES;

  // Mismo error para: no existe, sin hash, desactivado o contraseña incorrecta
  if (!user || !user.passwordHash || !user.active || tooLong || !matches) {
    throw invalidCredentials();
  }

  // Payload mínimo: sub = id del usuario y role. Nada de email ni datos personales
  const token = jwt.sign({ role: user.role }, JWT_SECRET, {
    algorithm: 'HS256',
    subject: String(user._id),
    expiresIn: JWT_EXPIRES_IN,
  });
  const { iat, exp } = jwt.decode(token);

  return { token, expiresIn: exp - iat, user: user.toJSON() }; // toJSON quita passwordHash
};

module.exports = { register, login };
