const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // SHA-256 del refresh token (nunca el token en claro)
    tokenHash: { type: String, required: true, unique: true },
    // Identifica la cadena de rotaciones que nace en un mismo login
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    // null = vigente; con fecha = ya usado o revocado
    revokedAt: { type: Date, default: null },
    // Token que lo sustituyó al rotar (trazabilidad)
    replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'RefreshToken', default: null },
  },
  { timestamps: true }
);

// Índice TTL: MongoDB borra solo los documentos cuando llega expiresAt
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
