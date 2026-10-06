const mongoose = require('mongoose');

const money = {
  type: Number,
  min: [0, 'El importe no puede ser negativo'],
  default: 0,
  validate: {
    validator: v => Math.round(v * 100) === v * 100,
    message: 'El importe admite como máximo 2 decimales',
  },
};

const invoiceSchema = new mongoose.Schema({
  type: { type: String, enum: ['presupuesto', 'factura'], default: 'presupuesto' },
  laborCost: money,
  materialCost: money,
  totalAmount: { ...money },
  isPaid: {
    type: Boolean,
    default: false,
    validate: {
      // Custom: un presupuesto no se puede marcar como pagado
      validator: function (v) { return !v || this.type === 'factura'; },
      message: 'Solo una factura puede estar pagada',
    },
  },
}, { timestamps: true });

// El total siempre es mano de obra + materiales
invoiceSchema.pre('validate', function () {
  this.totalAmount = Math.round((this.laborCost + this.materialCost) * 100) / 100;
});

invoiceSchema.index({ type: 1, isPaid: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
