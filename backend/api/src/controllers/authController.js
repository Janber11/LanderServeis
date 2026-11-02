const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json({ success: true, data: user });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({ success: true, data: result });
});

module.exports = { register, login };
