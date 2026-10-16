const Incident = require('../models/Incident');
const IncidentWorker = require('../models/IncidentWorker');

// Campos que se pueden modificar desde la API
const UPDATABLE_FIELDS = ['title', 'description', 'category', 'status', 'photos'];

// Crea una incidencia nueva
const createIncident = async (incidentData) => {
  const newIncident = new Incident(incidentData);
  return await newIncident.save();
};

// Lista incidencias; admite filtros opcionales por status, category y clientId
const getIncidents = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.category) query.category = filters.category;
  if (filters.clientId) query.clientId = filters.clientId;

  return await Incident.find(query)
    .populate('clientId', 'name email phone')
    .sort({ createdAt: -1 });
};

// Devuelve una incidencia por id (o null si no existe)
const getIncidentById = async (id) => {
  return await Incident.findById(id).populate('clientId', 'name email phone');
};

// Modifica una incidencia (actualización parcial). Devuelve null si no existe
const updateIncident = async (id, updateData) => {
  const incident = await Incident.findById(id);
  if (!incident) return null;

  UPDATABLE_FIELDS.forEach((field) => {
    if (updateData[field] !== undefined) {
      incident.set(field, updateData[field]);
    }
  });

  return await incident.save();
};

// Borra una incidencia y sus asignaciones de profesionales.
// Devuelve la incidencia borrada, o null si no existe
const deleteIncident = async (id) => {
  const incident = await Incident.findById(id);
  if (!incident) return null;

  // Primero las asignaciones (para no dejar huérfanas), luego la incidencia
  await IncidentWorker.deleteMany({ incidentId: id });
  await incident.deleteOne();

  return incident;
};

module.exports = {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncident,
  deleteIncident,
};
