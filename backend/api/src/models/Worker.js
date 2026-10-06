const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  phone: {
    type: String,
    required: true,
    set: v => (typeof v === 'string' ? v.replace(/[\s-]/g, '') : v),
    match: [/^(\+34)?[6-9]\d{8}$/, 'Teléfono no válido'],
  },
  specialty: {
    type: String,
    required: true,
    enum: ['fontanero', 'lampista', 'paleta', 'otros'],
  },
  active: { type: Boolean, default: true },
}, { timestamps: true });

workerSchema.index({ specialty: 1, active: 1 });

module.exports = mongoose.model('Worker', workerSchema);
