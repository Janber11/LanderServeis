const express = require('express');
const controller = require('../controllers/categoryController');

const router = express.Router();

router.route('/').post(controller.create).get(controller.list);

router
  .route('/:id')
  .get(controller.getOne)
  .put(controller.update)
  .delete(controller.remove);

module.exports = router;
