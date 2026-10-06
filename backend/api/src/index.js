require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
require('./models/User');
require('./models/Worker');
require('./models/Invoice');
require('./models/Incident');
require('./models/IncidentWorker');

const app = express();
app.use(express.json());

connectDB();

app.get('/', (req, res) => res.send('API Ecommerce en marxa 🚀'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escoltant al port ${PORT}`));
