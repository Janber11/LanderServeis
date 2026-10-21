const AppError = require('./AppError');

const isValidId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

const assertValidId = (id) => {
  if (!isValidId(id)) {
    throw new AppError(400, 'INVALID_ID', 'El id no tiene un formato válido');
  }
};

module.exports = { isValidId, assertValidId };
