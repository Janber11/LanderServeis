const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const Incident = require('../models/Incident');
const listQuery = require('../utils/listQuery');

// Lista blanca: solo estos campos se aceptan desde fuera
const ALLOWED_FIELDS = ['name', 'slug', 'description', 'active'];

const pickAllowed = (data = {}) =>
  Object.fromEntries(
    ALLOWED_FIELDS.filter((f) => data[f] !== undefined).map((f) => [f, data[f]])
  );

const assertValidId = (id) => {
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new AppError(400, 'INVALID_ID', 'El id no tiene un formato válido');
  }
};

const findOrFail = async (id) => {
  assertValidId(id);
  const category = await Category.findById(id);
  if (!category) {
    throw new AppError(404, 'NOT_FOUND', 'Categoría no encontrada');
  }
  return category;
};

const createCategory = async (data) => {
  return Category.create(pickAllowed(data));
};

// Los filtros, la ordenación y la paginación llegarán en el apartado 4.5
const getCategories = (query) =>
  listQuery(Category, query, {
    sortable: ['name', 'slug', 'createdAt', 'updatedAt'],
    defaultSort: 'name',
  });

const getCategoryById = async (id) => {
  return findOrFail(id);
};

const updateCategory = async (id, data) => {
  const category = await findOrFail(id);
  category.set(pickAllowed(data));
  return category.save(); // save() ejecuta las validaciones del modelo
};

const deleteCategory = async (id) => {
  const category = await findOrFail(id);
  const inUse = await Incident.exists({ category: category._id });
  if (inUse) {
    throw new AppError(409, 'CATEGORY_IN_USE', 'No se puede borrar una categoría con incidencias asociadas', [
      { field: 'category', message: 'Desactívala (active=false) en vez de borrarla' },
    ]);
  }
  await category.deleteOne();
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
