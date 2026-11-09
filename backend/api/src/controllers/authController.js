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

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh((req.body || {}).refreshToken);
  res.status(200).json({ success: true, data: result });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout((req.body || {}).refreshToken);
  res.status(204).send();
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.auth.userId);
  res.status(200).json({ success: true, data: user });
});

module.exports = { register, login, refresh, logout, me };
