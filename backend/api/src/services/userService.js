const bcrypt = require('bcrypt');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const listQuery = require('../utils/listQuery');
const { assertValidId } = require('../utils/validateId');

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignora todo lo que pase de 72 bytes

// Listas blancas: role, active y passwordHash NUNCA se aceptan desde el body
const CREATABLE_FIELDS = ['name', 'email', 'phone', 'addresses'];
const UPDATABLE_FIELDS = ['name', 'phone', 'addresses'];

const pick = (data = {}, fields) =>
  Object.fromEntries(fields.filter((f) => data[f] !== undefined).map((f) => [f, data[f]]));

const passwordErrors = (password) => {
  const err = (message) => [{ field: 'password', message }];
  if (typeof password !== 'string' || password === '') return err('La contraseña es obligatoria');
  if (password.length < MIN_PASSWORD_LENGTH) {
    return err(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return err(`La contraseña no puede superar ${MAX_PASSWORD_BYTES} bytes`);
  }
  return [];
};

// Ejecuta las validaciones del modelo y devuelve los errores como [{field, message}]
const modelErrors = async (doc) => {
  try {
    await doc.validate();
    return [];
  } catch (err) {
    if (err.name !== 'ValidationError') throw err;
    return Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  }
};

const findOrFail = async (id) => {
  assertValidId(id);
  const user = await User.findById(id); // passwordHash no se carga (select: false)
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado');
  return user;
};

const createUser = async (data = {}) => {
  // El hash es un marcador temporal: solo sirve para validar el resto de campos
  const user = new User({ ...pick(data, CREATABLE_FIELDS), passwordHash: 'pendiente' });

  const details = [...(await modelErrors(user)), ...passwordErrors(data.password)];
  if (details.length > 0) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Les dades no són vàlides', details);
  }

  user.passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  await user.save(); // un email duplicado lanza code 11000 -> el middleware lo pasa a 409
  return user;
};

const getUsers = (query) =>
  listQuery(User, query, {
    sortable: ['name', 'email', 'createdAt', 'updatedAt'], // nunca passwordHash
    defaultSort: 'name',
  });

const getUserById = (id) => findOrFail(id);

const updateUser = async (id, data = {}) => {
  const user = await findOrFail(id);
  user.set(pick(data, UPDATABLE_FIELDS));
  await user.save();
  return user;
};

// Baja lógica: no se borra nada, solo se marca como inactivo
const deactivateUser = async (id) => {
  const user = await findOrFail(id);
  if (user.active) {
    user.active = false;
    await user.save();
  }
};

module.exports = { createUser, getUsers, getUserById, updateUser, deactivateUser };
