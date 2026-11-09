const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Fallan al arrancar si falta algún secreto o si son iguales
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET no definido o demasiado corto (mínimo 32 caracteres) en el .env');
}
if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) {
  throw new Error('JWT_REFRESH_SECRET no definido o demasiado corto (mínimo 32 caracteres) en el .env');
}
if (JWT_SECRET === JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET y JWT_REFRESH_SECRET deben ser distintos');
}

// En la base de datos solo se guarda el hash del refresh token, nunca el token
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const invalidToken = () => new AppError(401, 'INVALID_TOKEN', 'Token no válido');

const signAccessToken = (user) =>
  jwt.sign({ role: user.role }, JWT_SECRET, {
    algorithm: 'HS256',
    subject: String(user._id),
    expiresIn: ACCESS_EXPIRES_IN,
  });

// jwtid único: dos refresh tokens nunca son iguales, ni emitidos en el mismo segundo
const signRefreshToken = (user, family) =>
  jwt.sign({ family }, JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    subject: String(user._id),
    expiresIn: REFRESH_EXPIRES_IN,
    jwtid: crypto.randomUUID(),
  });

// Crea el par de tokens y guarda el hash del refresh. 'family' identifica la cadena de rotaciones
const issueTokens = async (user, family = crypto.randomUUID()) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, family);

  const { iat, exp } = jwt.decode(accessToken);
  const refreshExp = jwt.decode(refreshToken).exp;

  const doc = await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: new Date(refreshExp * 1000),
  });

  return { accessToken, refreshToken, expiresIn: exp - iat, tokenId: doc._id };
};

// Verifica la firma y la caducidad del refresh token (todavía no mira la base de datos)
const verifyRefreshJwt = (refreshToken) => {
  if (typeof refreshToken !== 'string' || refreshToken === '') {
    throw new AppError(422, 'VALIDATION_ERROR', 'Les dades no són vàlides', [
      { field: 'refreshToken', message: 'El refresh token es obligatorio' },
    ]);
  }
  try {
    return jwt.verify(refreshToken, JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(401, 'TOKEN_EXPIRED', 'El refresh token ha caducado');
    }
    throw invalidToken();
  }
};

// Rotación: el refresh token solo sirve una vez
const rotateRefreshToken = async (refreshToken) => {
  const payload = verifyRefreshJwt(refreshToken);
  const tokenHash = hashToken(refreshToken);

  // Reclamación atómica: solo uno puede pasar de revokedAt:null a revocado
  const claimed = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null },
    { revokedAt: new Date() }
  );

  if (!claimed) {
    const existing = await RefreshToken.findOne({ tokenHash });
    if (existing) {
      // Token ya usado o revocado: posible robo. Se cierra TODA la cadena de sesiones
      await RefreshToken.updateMany(
        { family: existing.family, revokedAt: null },
        { revokedAt: new Date() }
      );
      throw new AppError(
        401,
        'REFRESH_TOKEN_REUSED',
        'Refresh token ya utilizado. Se han cerrado las sesiones asociadas; inicia sesión de nuevo'
      );
    }
    throw invalidToken();
  }

  // El usuario debe seguir existiendo y activo
  const user = await User.findById(payload.sub);
  if (!user || !user.active) {
    await RefreshToken.updateMany(
      { family: claimed.family, revokedAt: null },
      { revokedAt: new Date() }
    );
    throw invalidToken();
  }

  const tokens = await issueTokens(user, claimed.family);
  await RefreshToken.updateOne({ _id: claimed._id }, { replacedBy: tokens.tokenId });

  return { tokens, user };
};

// Logout: revoca el refresh token recibido (idempotente: no falla si ya estaba revocado)
const revokeRefreshToken = async (refreshToken) => {
  if (typeof refreshToken !== 'string' || refreshToken === '') {
    throw new AppError(422, 'VALIDATION_ERROR', 'Les dades no són vàlides', [
      { field: 'refreshToken', message: 'El refresh token es obligatorio' },
    ]);
  }
  await RefreshToken.updateOne(
    { tokenHash: hashToken(refreshToken), revokedAt: null },
    { revokedAt: new Date() }
  );
};

module.exports = {
  signAccessToken,
  issueTokens,
  rotateRefreshToken,
  revokeRefreshToken,
};
