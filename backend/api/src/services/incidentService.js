const Incident = require('../models/Incident');
const IncidentWorker = require('../models/IncidentWorker');
const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const { isValidId, assertValidId } = require('../utils/validateId');

// Campos aceptados al crear y al modificar (lista blanca)
const CREATABLE_FIELDS = ['clientId', 'title', 'description', 'category', 'status', 'photos'];
const UPDATABLE_FIELDS = ['title', 'description', 'category', 'status', 'photos'];

const POPULATE = [
  { path: 'clientId', select: 'name email phone' },
  { path: 'category', select: 'name slug' },
];

const pick = (data = {}, fields) =>
  Object.fromEntries(fields.filter((f) => data[f] !== undefined).map((f) => [f, data[f]]));

// La categoría debe ser un id válido, existir y estar activa
const assertCategoryUsable = async (categoryId) => {
  const fail = (message) =>
    new AppError(422, 'VALIDATION_ERROR', 'Les dades no són vàlides', [
      { field: 'category', message },
    ]);

  if (!isValidId(categoryId)) throw fail('Debe ser el id de una categoría existente');

  const category = await Category.findById(categoryId);
  if (!category || !category.active) throw fail('La categoría no existe o no está activa');
};

const findOrFail = async (id) => {
  assertValidId(id);
  const incident = await Incident.findById(id);
  if (!incident) throw new AppError(404, 'NOT_FOUND', 'Incidencia no encontrada');
  return incident;
};

const createIncident = async (data) => {
  if (data.category !== undefined) await assertCategoryUsable(data.category);
  const incident = await Incident.create(pick(data, CREATABLE_FIELDS));
  return incident.populate(POPULATE);
};

// Filtros opcionales: status, category y clientId
const getIncidents = async (filters = {}) => {
  const query = {};
  if (typeof filters.status === 'string') query.status = filters.status;

  for (const field of ['category', 'clientId']) {
    if (filters[field] !== undefined) {
      if (!isValidId(filters[field])) {
        throw new AppError(400, 'INVALID_QUERY', 'Parámetros de consulta no válidos', [
          { field, message: 'Id con formato incorrecto' },
        ]);
      }
      query[field] = filters[field];
    }
  }

  return Incident.find(query).populate(POPULATE).sort({ createdAt: -1 });
};

const getIncidentById = async (id) => {
  assertValidId(id);
  const incident = await Incident.findById(id).populate(POPULATE);
  if (!incident) throw new AppError(404, 'NOT_FOUND', 'Incidencia no encontrada');
  return incident;
};

const updateIncident = async (id, data) => {
  const incident = await findOrFail(id);
  if (data.category !== undefined) await assertCategoryUsable(data.category);

  incident.set(pick(data, UPDATABLE_FIELDS));
  await incident.save(); // ejecuta validaciones y el hook de statusHistory
  return incident.populate(POPULATE);
};

// Borra las asignaciones primero (para no dejar huérfanas) y luego la incidencia
const deleteIncident = async (id) => {
  const incident = await findOrFail(id);
  await IncidentWorker.deleteMany({ incidentId: incident._id });
  await incident.deleteOne();
};

module.exports = {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncident,
  deleteIncident,
};
