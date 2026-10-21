const categoryService = require('../services/categoryService');
const asyncHandler = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body);
  res.status(201).json({ success: true, data: category });
});

const list = asyncHandler(async (req, res) => {
  const result = await categoryService.getCategories(req.query);
  res.status(200).json({ success: true, ...result });
});

const getOne = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id);
  res.status(200).json({ success: true, data: category });
});

const update = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body);
  res.status(200).json({ success: true, data: category });
});

const remove = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);
  res.status(204).send(); // 204 No Content: sin cuerpo
});

module.exports = { create, list, getOne, update, remove };
