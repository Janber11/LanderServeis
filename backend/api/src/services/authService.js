const bcrypt = require('bcrypt');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const userService = require('./userService');
const tokenService = require('./tokenService');

const MAX_PASSWORD_BYTES = 72;

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

  // Login nuevo = familia nueva de refresh tokens
  const { accessToken, refreshToken, expiresIn } = await tokenService.issueTokens(user);
  return { accessToken, refreshToken, expiresIn, user: user.toJSON() };
};

// Renueva la sesión: el refresh token se gasta y se entrega uno nuevo (rotación)
const refresh = async (refreshToken) => {
  const { tokens, user } = await tokenService.rotateRefreshToken(refreshToken);
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    user: user.toJSON(),
  };
};

const logout = (refreshToken) => tokenService.revokeRefreshToken(refreshToken);

// Perfil del usuario autenticado. Se consulta la BD: un usuario desactivado ya no entra
const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.active) {
    throw new AppError(401, 'INVALID_TOKEN', 'Token no válido');
  }
  return user;
};

module.exports = { register, login, refresh, logout, getMe };
