require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const service = require('./services/categoryService');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Category.init(); // asegura que el índice único existe

  const c = await service.createCategory({
    name: 'Test categoria',
    slug: 'test-categoria',
    campoInventado: 'esto se ignora',
  });
  console.log('1. Creada:', c.toObject());

  try {
    await service.createCategory({ name: 'Otra', slug: 'test-categoria' });
  } catch (e) {
    console.log('2. Duplicado -> code:', e.code);
  }

  try {
    await service.createCategory({ slug: 'sin-nombre' });
  } catch (e) {
    console.log('3. Sin nombre ->', e.name);
  }

  try {
    await service.getCategoryById('abc');
  } catch (e) {
    console.log('4. Id inválido ->', e.statusCode, e.code);
  }

  try {
    await service.getCategoryById('000000000000000000000000');
  } catch (e) {
    console.log('5. No existe ->', e.statusCode, e.code);
  }

  await service.deleteCategory(c._id);
  console.log('6. Borrada la categoría de prueba');

  await mongoose.disconnect();
})();
