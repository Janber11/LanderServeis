const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
    },
    slug: {
      type: String,
      required: [true, 'El slug es obligatorio'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug no válido (solo minúsculas, números y guiones)'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'La descripción no puede superar 500 caracteres'],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
