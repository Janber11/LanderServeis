const mongoose = require('mongoose');

const incidentWorkerSchema = new mongoose.Schema({
  incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
  role: { type: String, enum: ['principal', 'apoyo'], default: 'principal' },
  assignedAt: { type: Date, default: Date.now },
});

// Un mismo profesional no puede asignarse dos veces a la misma incidencia
incidentWorkerSchema.index({ incidentId: 1, workerId: 1 }, { unique: true });
incidentWorkerSchema.index({ workerId: 1 });

module.exports = mongoose.model('IncidentWorker', incidentWorkerSchema);
