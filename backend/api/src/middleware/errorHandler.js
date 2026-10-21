const AppError = require('../utils/AppError');

const buildError = (code, message, details = []) => ({
  success: false,
  error: { code, message, details },
});

// 404 para rutas que no existen
const notFound = (req, res, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};

// Middleware global: Express lo reconoce por tener 4 parámetros
const errorHandler = (err, req, res, next) => {
  // Si la respuesta ya empezó a enviarse, delegamos en Express
  if (res.headersSent) return next(err);

  // Errores propios lanzados desde los servicios
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(buildError(err.code, err.message, err.details));
  }

  // Validación de Mongoose -> 422
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res
      .status(422)
      .json(buildError('VALIDATION_ERROR', 'Les dades no són vàlides', details));
  }

  // Índice único violado (email o slug duplicado) -> 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'desconocido';
    return res
      .status(409)
      .json(
        buildError('DUPLICATE_KEY', 'Ya existe un registro con ese valor', [
          { field, message: 'El valor ya está en uso' },
        ])
      );
  }

  // Id mal formado detectado por Mongoose -> 400
  if (err.name === 'CastError') {
    return res
      .status(400)
      .json(buildError('INVALID_ID', 'El valor recibido no tiene un formato válido', [
        { field: err.path, message: 'Formato incorrecto' },
      ]));
  }

  // JSON mal formado en el body -> 400
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(buildError('INVALID_JSON', 'El cuerpo de la petición no es un JSON válido'));
  }

  // Cualquier otra cosa es inesperada: se registra en el servidor, pero no se expone nada
  console.error(err);
  return res.status(500).json(buildError('INTERNAL_ERROR', 'Error inesperado del servidor'));
};

module.exports = { notFound, errorHandler };
