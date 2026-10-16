const incidentService = require('../services/incidentService');

// POST /api/incidents
const createIncident = async (req, res) => {
  try {
    const incident = await incidentService.createIncident(req.body);
    res.status(201).json({ status: 'success', data: incident });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// GET /api/incidents?status=pendiente&category=fontaneria&clientId=...
const getIncidents = async (req, res) => {
  try {
    const incidents = await incidentService.getIncidents(req.query);
    res.status(200).json({ status: 'success', results: incidents.length, data: incidents });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/incidents/:id
const getIncidentById = async (req, res) => {
  try {
    const incident = await incidentService.getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ status: 'error', message: 'Incidencia no encontrada' });
    }
    res.status(200).json({ status: 'success', data: incident });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ status: 'error', message: 'Id no válido' });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// PUT /api/incidents/:id
const updateIncident = async (req, res) => {
  try {
    const incident = await incidentService.updateIncident(req.params.id, req.body);
    if (!incident) {
      return res.status(404).json({ status: 'error', message: 'Incidencia no encontrada' });
    }
    res.status(200).json({ status: 'success', data: incident });
  } catch (error) {
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(400).json({ status: 'error', message: error.message });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// DELETE /api/incidents/:id
const deleteIncident = async (req, res) => {
  try {
    const incident = await incidentService.deleteIncident(req.params.id);
    if (!incident) {
      return res.status(404).json({ status: 'error', message: 'Incidencia no encontrada' });
    }
    res.status(200).json({ status: 'success', message: 'Incidencia eliminada', data: incident });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ status: 'error', message: 'Id no válido' });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncident,
  deleteIncident,
};
