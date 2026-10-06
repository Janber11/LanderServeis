require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Invoice = require('./models/Invoice');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.init(); // crea los índices

  try {
    await User.create({ name: 'A', email: 'mal', phone: '123', role: 'x' });
  } catch (e) {
    console.log('User inválido ->', Object.keys(e.errors));
  }

  try {
    await Invoice.create({ type: 'presupuesto', laborCost: 50, materialCost: 20.5, isPaid: true });
  } catch (e) {
    console.log('Invoice inválida ->', Object.keys(e.errors));
  }

  const ok = new Invoice({ laborCost: 50, materialCost: 20.5 });
  await ok.validate();
  console.log('Total calculado ->', ok.totalAmount);

  await mongoose.disconnect();
})();
