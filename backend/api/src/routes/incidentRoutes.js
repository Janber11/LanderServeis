const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');

router.post('/', incidentController.createIncident);
router.get('/', incidentController.getIncidents);
router.get('/:id', incidentController.getIncidentById);
router.put('/:id', incidentController.updateIncident);
router.delete('/:id', incidentController.deleteIncident);

module.exports = router;
