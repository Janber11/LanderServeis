const AppError = require('./AppError');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isPositiveInt = (v) => typeof v === 'string' && /^[1-9]\d*$/.test(v);

/**
 * Aplica filtros (active, name), ordenación y paginación a un modelo.
 * config: { sortable: [campos permitidos], defaultSort, defaultLimit, maxLimit }
 */
const listQuery = async (Model, query, config) => {
  const { sortable, defaultSort, defaultLimit = 10, maxLimit = 100 } = config;
  const errors = [];
  const filter = {};

  // Filtro active=true|false
  if (query.active !== undefined) {
    if (query.active === 'true') filter.active = true;
    else if (query.active === 'false') filter.active = false;
    else errors.push({ field: 'active', message: 'Debe ser true o false' });
  }

  // Filtro name: búsqueda parcial, sin distinguir mayúsculas.
  // Solo se acepta texto y se escapa, para que no se interprete como regex.
  if (query.name !== undefined) {
    if (typeof query.name === 'string' && query.name.trim() !== '') {
      filter.name = { $regex: escapeRegex(query.name.trim()), $options: 'i' };
    } else {
      errors.push({ field: 'name', message: 'Debe ser un texto no vacío' });
    }
  }

  // Paginación
  let page = 1;
  let limit = defaultLimit;
  if (query.page !== undefined) {
    if (isPositiveInt(query.page)) page = Number(query.page);
    else errors.push({ field: 'page', message: 'Debe ser un entero positivo' });
  }
  if (query.limit !== undefined) {
    if (isPositiveInt(query.limit)) limit = Math.min(Number(query.limit), maxLimit);
    else errors.push({ field: 'limit', message: 'Debe ser un entero positivo' });
  }

  // Ordenación: ?sort=name  o  ?sort=-createdAt  (varios separados por coma)
  const sort = {};
  const sortParam = query.sort !== undefined ? query.sort : defaultSort;
  if (typeof sortParam !== 'string') {
    errors.push({ field: 'sort', message: 'Formato no válido' });
  } else {
    for (const part of sortParam.split(',')) {
      const field = part.startsWith('-') ? part.slice(1) : part;
      if (!sortable.includes(field)) {
        errors.push({ field: 'sort', message: `Campo no permitido: ${field}. Permitidos: ${sortable.join(', ')}` });
      } else {
        sort[field] = part.startsWith('-') ? -1 : 1;
      }
    }
  }
  sort._id = 1; // desempate: mantiene estable la paginación

  if (errors.length > 0) {
    throw new AppError(400, 'INVALID_QUERY', 'Parámetros de consulta no válidos', errors);
  }

  const [data, total] = await Promise.all([
    Model.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Model.countDocuments(filter),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

module.exports = listQuery;
