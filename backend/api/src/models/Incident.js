const mongoose = require('mongoose');

const STATUSES = ['pendiente', 'asignada', 'en_curso', 'finalizada', 'cancelada'];

const incidentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000 },
  category: {
    type: String,
    required: true,
    enum: ['fontaneria', 'electricidad', 'albanileria', 'otros'],
  },
  status: { type: String, enum: STATUSES, default: 'pendiente' },
  photos: {
    type: [String],
    validate: {
      validator: v => v.length <= 10,
      message: 'Máximo 10 fotos por incidencia',
    },
  },
  statusHistory: [{
    _id: false,
    status: { type: String, enum: STATUSES, required: true },
    date: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

// Guarda el historial de estados automáticamente
incidentSchema.pre('save', function () {
  if (this.isNew || this.isModified('status')) {
    this.statusHistory.push({ status: this.status });
  }
});

incidentSchema.index({ clientId: 1, status: 1 });
incidentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Incident', incidentSchema);
