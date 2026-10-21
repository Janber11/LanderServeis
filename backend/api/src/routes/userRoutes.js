const express = require('express');
const controller = require('../controllers/userController');

const router = express.Router();

// ATENCIÓN: sin JWT ni RBAC estos endpoints solo deben usarse en local, con datos ficticios.
// El registro público pasará a /api/auth/register y la gestión quedará protegida.
router.route('/').post(controller.create).get(controller.list);

router
  .route('/:id')
  .get(controller.getOne)
  .put(controller.update)
  .delete(controller.deactivate);

module.exports = router;
