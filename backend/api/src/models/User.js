const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: { type: String, required: true, trim: true, maxlength: 120 },
  city: { type: String, required: true, trim: true, maxlength: 60 },
  postalCode: { type: String, match: [/^\d{5}$/, 'Código postal no válido'] },
  notes: { type: String, maxlength: 200 },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email no válido'],
  },
  phone: {
    type: String,
    required: true,
    set: v => (typeof v === 'string' ? v.replace(/[\s-]/g, '') : v),
    match: [/^(\+34)?[6-9]\d{8}$/, 'Teléfono no válido'],
  },
  role: { type: String, enum: ['client', 'admin'], default: 'client' },
  addresses: [addressSchema],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
