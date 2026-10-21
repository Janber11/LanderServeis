require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
require('./models/User');
require('./models/Worker');
require('./models/Invoice');
require('./models/Incident');
require('./models/IncidentWorker');
require('./models/Category');
const incidentRoutes = require('./routes/incidentRoutes'); // Importem les rutes
const categoryRoutes = require('./routes/categoryRoutes');
const userRoutes = require('./routes/userRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(express.json());

connectDB();

app.get('/', (req, res) => res.send('API Ecommerce en marxa 🚀'));

// Muntem les rutes d'incidències sota el prefix '/api/incidents'
app.use('/api/incidents', incidentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escoltant al port ${PORT}`));
