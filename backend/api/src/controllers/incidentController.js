const incidentService = require('../services/incidentService');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/incidents
const createIncident = asyncHandler(async (req, res) => {
  const incident = await incidentService.createIncident(req.body);
  res.status(201).json({ success: true, data: incident });
});

// GET /api/incidents?status=pendiente&category=<id>&clientId=<id>
const getIncidents = asyncHandler(async (req, res) => {
  const incidents = await incidentService.getIncidents(req.query);
  res.status(200).json({ success: true, results: incidents.length, data: incidents });
});

// GET /api/incidents/:id
const getIncidentById = asyncHandler(async (req, res) => {
  const incident = await incidentService.getIncidentById(req.params.id);
  res.status(200).json({ success: true, data: incident });
});

// PUT /api/incidents/:id
const updateIncident = asyncHandler(async (req, res) => {
  const incident = await incidentService.updateIncident(req.params.id, req.body);
  res.status(200).json({ success: true, data: incident });
});

// DELETE /api/incidents/:id
const deleteIncident = asyncHandler(async (req, res) => {
  await incidentService.deleteIncident(req.params.id);
  res.status(204).send();
});

module.exports = {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncident,
  deleteIncident,
};
