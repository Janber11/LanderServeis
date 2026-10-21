const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true, trim: true, maxlength: 120 },
  city: { type: String, required: true, trim: true, maxlength: 60 },
  postalCode: { type: String, match: [/^\d{5}$/, 'Código postal no válido'] },
  notes: { type: String, maxlength: 200 },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'El nombre es obligatorio'], trim: true, minlength: 2, maxlength: 80 },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email no válido'],
  },
  phone: {
    type: String,
    set: v => (typeof v === 'string' ? v.replace(/[\s-]/g, '') : v),
    match: [/^(\+34)?[6-9]\d{8}$/, 'Teléfono no válido'],
  },
  role: { type: String, enum: ['client', 'admin'], default: 'client' },
  active: { type: Boolean, default: true },
  passwordHash: { type: String, required: true, select: false },
  addresses: [addressSchema],
}, { timestamps: true });

// Defensa en profundidad: passwordHash nunca sale en un JSON
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
