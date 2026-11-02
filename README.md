# LanderServeis (Pràctica E-commerce Full Stack)

Plataforma perquè els clients contactin amb el seu equip de professionals de la llar
(lampistes, fontaners, paletes...) i gestionin incidències.

## Tecnologies
React, Node.js/Express, MongoDB (Mongoose), Docker, bcrypt, JSON Web Token (JWT), Postman

## Autor
Jan Bertran Sánchez

## Com executar el projecte

### 1. Inicialitzar MongoDB amb Docker

Anar a la ruta `~/Escritorio/LanderServeis/backend/docker` i crear un fitxer `.env` amb les credencials de Mongo:

```
MONGO_ROOT_USER=admin
MONGO_ROOT_PASS=<contrasenya>
```

Després executar les comandes:

```bash
sudo systemctl disable mongod   # només si tens MongoDB instal·lat localment
sudo systemctl stop mongod      # només si tens MongoDB instal·lat localment
docker compose up -d
```

Comprovar amb `docker ps` que apareixen `mongo:latest` i `mongo-express:latest`.

> Nota: amb el kernel de Linux 6.19 o superior, MongoDB 8 no arrenca sense la variable
> `GLIBC_TUNABLES=glibc.pthread.rseq=1`, que ja està inclosa al `docker-compose.yml`
> (solució temporal fins que es corregeixi el problema).
> No executar mai `docker compose down -v`: esborraria les dades.

### 2. Iniciar l'API (backend)

```bash
cd ~/Escritorio/LanderServeis/backend/api
npm install
cp .env.example .env
```

Editar el fitxer `.env` creat a `api/` i posar-hi la contrasenya de Mongo i un secret per als tokens:

```
PORT=3000
MONGO_URI=mongodb://admin:<contrasenya>@localhost:27017/ecommerce?authSource=admin
JWT_SECRET=<secret llarg i aleatori>
JWT_EXPIRES_IN=1h
```

Es pot generar un secret aleatori amb:

```bash
openssl rand -base64 48
```

`JWT_SECRET` és obligatori i ha de tenir **com a mínim 32 caràcters**: si falta, l'API no arrenca. No s'ha de pujar mai a Git (el `.env` està ignorat; només es puja `.env.example`, sense valors reals).

Arrencar en mode desenvolupament:

```bash
npm run dev
```

Ha de mostrar `Servidor escoltant al port 3000` i `MongoDB connectat correctament`.
Si es canvia el `.env`, cal aturar nodemon (Ctrl+C) i tornar-lo a arrencar.

## Estructura del backend

```
backend/
├── api/
│   ├── src/
│   │   ├── index.js                     # Arrencada, middleware i muntatge de rutes
│   │   ├── config/db.js                 # Connexió a MongoDB
│   │   ├── models/                      # Esquemes Mongoose
│   │   │   ├── Category.js              # Categories d'incidència
│   │   │   ├── User.js                  # Clients i administradors (amb passwordHash)
│   │   │   ├── Worker.js                # Professionals
│   │   │   ├── Incident.js              # Incidències (entitat central)
│   │   │   ├── IncidentWorker.js        # Assignacions N:N incidència-professional
│   │   │   └── Invoice.js               # Pressupostos i factures
│   │   ├── routes/                      # category, user, incident i authRoutes
│   │   ├── controllers/                 # Part HTTP (req/res, codis d'estat)
│   │   ├── services/                    # Lògica de negoci (inclou authService)
│   │   ├── middleware/errorHandler.js   # notFound + gestor global d'errors
│   │   ├── utils/
│   │   │   ├── AppError.js              # Error amb codi HTTP i codi intern
│   │   │   ├── asyncHandler.js          # Envolta els controladors async
│   │   │   ├── listQuery.js             # Filtres, ordenació i paginació
│   │   │   └── validateId.js            # Validació d'ObjectId
│   │   ├── test-validation.js           # Script de prova de validacions
│   │   └── test-category-service.js     # Script de prova del servei de categories
│   ├── .env                             # (no es puja a Git)
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
├── docker/
│   └── docker-compose.yml
└── postman/
    ├── ecommerce.postman_collection.json
    └── ecommerce-local.postman_environment.json
```

## Arquitectura en capes

Cada petició segueix aquest flux:

```
Request HTTP → [RUTA] → [CONTROLADOR] → [SERVEI] → [MODEL] → Base de dades
                                  ↓ (qualsevol error)
                       [MIDDLEWARE D'ERRORS] → Resposta JSON
```

| Capa | Fitxers | Responsabilitat |
|---|---|---|
| Ruta | `routes/*Routes.js` | Només defineix l'endpoint i el connecta amb el controlador |
| Controlador | `controllers/*Controller.js` | Gestiona HTTP: llegeix `req`, respon amb `res` i el codi d'estat |
| Servei | `services/*Service.js` | Lògica de negoci i accés al model; no coneix `req` ni `res`; llança `AppError` |
| Model | `models/*.js` | Esquema, validacions i hooks |
| Middleware d'errors | `middleware/errorHandler.js` | Tradueix qualsevol error a una resposta JSON coherent |

A `index.js` les rutes es munten sota un prefix, i el middleware d'errors va **després** de totes les rutes:

```js
app.use('/api/incidents', incidentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use(notFound);
app.use(errorHandler);
```

## Format de respostes i errors

Resposta correcta:

```json
{ "success": true, "data": { } }
```

Llistes amb paginació (categories i usuaris):

```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 }
}
```

Errors: sempre el mateix format i sense traces internes.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Les dades no són vàlides",
    "details": [{ "field": "name", "message": "El nombre es obligatorio" }]
  }
}
```

| Codi HTTP | `error.code` | Quan |
|---|---|---|
| 400 | `INVALID_ID` | Id amb format incorrecte |
| 400 | `INVALID_QUERY` | Paràmetres de consulta no vàlids (`page`, `limit`, `sort`, `active`...) |
| 400 | `INVALID_JSON` | Cos de la petició que no és JSON |
| 401 | `INVALID_CREDENTIALS` | Login amb email o contrasenya incorrectes (vegeu l'API d'autenticació) |
| 404 | `NOT_FOUND` | Recurs inexistent |
| 404 | `ROUTE_NOT_FOUND` | Ruta inexistent |
| 409 | `DUPLICATE_KEY` | Email o slug duplicat (índex únic) |
| 409 | `CATEGORY_IN_USE` | Esborrar una categoria que té incidències |
| 422 | `VALIDATION_ERROR` | Dades que no passen les validacions |
| 500 | `INTERNAL_ERROR` | Error inesperat (el detall només es registra al servidor) |

Les eliminacions correctes retornen `204 No Content`, sense cos.

## Filtres, ordenació i paginació

Disponibles a `GET /api/categories` i `GET /api/users`.

| Paràmetre | Descripció |
|---|---|
| `active` | `true` o `false` |
| `name` | Cerca parcial, sense distingir majúscules |
| `sort` | Camp permès; prefix `-` per ordre descendent (ex. `-createdAt`) |
| `page` | Enter positiu (per defecte 1) |
| `limit` | Enter positiu (per defecte 10, màxim 100) |

Camps d'ordenació permesos: a categories `name`, `slug`, `createdAt` i `updatedAt`; a usuaris `name`, `email`, `createdAt` i `updatedAt`.

```bash
curl -i "http://localhost:3000/api/categories?active=true&sort=name"
curl -i "http://localhost:3000/api/categories?name=fontan"
curl -i "http://localhost:3000/api/users?name=anna"
curl -i "http://localhost:3000/api/users?sort=-createdAt&page=2&limit=5"
```

## API d'autenticació (registre i login)

Base URL: `http://localhost:3000/api/auth`

| Mètode | Ruta | Descripció | Codis |
|---|---|---|---|
| POST | `/api/auth/register` | Registrar un client nou | 201, 409, 422 |
| POST | `/api/auth/login` | Iniciar sessió i obtenir un token JWT | 200, 401, 422 |

L'enunciat de la Sessió 7 parla de `Usuari.js`, `usuariController`, `usuariServices` i `usuariRoutes`. En aquest projecte
es **reutilitza** el model `User.js` (ja té `passwordHash`) i els fitxers nous són `authController.js`, `authService.js` i `authRoutes.js`.

### Registre (POST `/api/auth/register`)

Accepta els mateixos camps que la creació d'usuaris (`name`, `email`, `password`, `phone`, `addresses`) i reutilitza la lògica de `userService`:
`role=client` i `active=true` els fixa el servidor, i la contrasenya es guarda amb bcrypt (12 rondes). **No retorna cap token**: el
registre no inicia la sessió; cal fer login.

```bash
curl -i -X POST "http://localhost:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Marta Auth","email":"marta.auth@example.com","password":"ClaveDePrueba-2026"}'
```

Resposta esperada: `201 Created` amb l'usuari, sense `passwordHash`. Un email repetit retorna `409 DUPLICATE_KEY` i una contrasenya curta `422 VALIDATION_ERROR`.

### Login (POST `/api/auth/login`)

```bash
curl -i -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"marta.auth@example.com","password":"ClaveDePrueba-2026"}'
```

Resposta esperada: `200 OK`:

```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "expiresIn": 3600,
    "user": { "_id": "...", "name": "Marta Auth", "email": "marta.auth@example.com", "role": "client", "active": true }
  }
}
```

`expiresIn` són els segons de validesa del token. Els errors possibles:

| Cas | Resposta |
|---|---|
| Falta `email` o `password` (o no són text) | `422 VALIDATION_ERROR` amb un error per camp a `details` |
| Email inexistent, contrasenya incorrecta, usuari desactivat o usuari sense hash | `401 INVALID_CREDENTIALS`, sempre amb el mateix missatge |

### Seguretat de l'autenticació

- **Missatge genèric**: tant si l'email no existeix com si la contrasenya és incorrecta o l'usuari està desactivat, la resposta és idèntica, de manera que no es pot esbrinar quins emails estan registrats.
- **Temps constant**: si l'usuari no existeix, igualment es fa una comparació bcrypt contra un hash fals, perquè el temps de resposta no delati l'existència de l'email.
- **Sense injecció NoSQL**: `email` i `password` han de ser text; un objecte com `{"$ne": null}` retorna `422` abans de consultar la base de dades.
- **`passwordHash`**: té `select: false`, per això el login el demana explícitament (`.select('+passwordHash')`), i mai surt a la resposta.
- **Token**: signat amb **HS256** i el secret `JWT_SECRET`; caduca segons `JWT_EXPIRES_IN` (1 hora per defecte). El payload és mínim: `sub` (id de l'usuari) i `role`, sense email ni dades personals.
- **Secret obligatori**: si `JWT_SECRET` falta o té menys de 32 caràcters, l'API no arrenca.
- L'email es normalitza (espais fora i minúscules) igual que a l'esquema.

## API de categories

Base URL: `http://localhost:3000/api/categories`

| Mètode | Ruta | Descripció | Codis |
|---|---|---|---|
| POST | `/api/categories` | Crear una categoria | 201, 409, 422 |
| GET | `/api/categories` | Llistar categories (filtres, ordre, paginació) | 200, 400 |
| GET | `/api/categories/:id` | Obtenir una categoria | 200, 400, 404 |
| PUT | `/api/categories/:id` | Modificar una categoria | 200, 400, 404, 409, 422 |
| DELETE | `/api/categories/:id` | Esborrar una categoria (si no té incidències) | 204, 400, 404, 409 |

### Camps d'una categoria

| Camp | Obligatori | Descripció |
|---|---|---|
| `name` | Sí | Nom (mínim 3 caràcters) |
| `slug` | Sí | Únic; minúscules, xifres i guions (ex. `reformes-bany`) |
| `description` | No | Descripció (màxim 500 caràcters) |
| `active` | No | `true` per defecte |

### Afegir (POST)

```bash
curl -i -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fontaneria",
    "slug": "fontaneria",
    "description": "Fuites, aixetes i canonades"
  }'
```

Resposta esperada: `201 Created`. Un `slug` repetit retorna `409 DUPLICATE_KEY` i un nom absent `422 VALIDATION_ERROR`.

### Modificar i esborrar

```bash
curl -i -X PUT http://localhost:3000/api/categories/<id_categoria> \
  -H "Content-Type: application/json" \
  -d '{"description": "Nova descripció"}'

curl -i -X DELETE http://localhost:3000/api/categories/<id_categoria>
```

El PUT només modifica `name`, `slug`, `description` i `active`. Si la categoria té incidències associades, el DELETE retorna `409 CATEGORY_IN_USE`: en aquest cas cal desactivar-la (`"active": false`).

## API d'usuaris

Base URL: `http://localhost:3000/api/users`

> **Atenció:** fins que s'implementi el control d'accés per rols (RBAC), aquests endpoints **no estan protegits**
> (encara que ja existeixi el login amb JWT, cap ruta de `/api/users` comprova el token). Només s'han d'executar
> en local amb dades fictícies i no s'han de desplegar públicament. El registre públic és `/api/auth/register`
> i la gestió administrativa quedarà protegida.

| Mètode | Ruta | Descripció | Codis |
|---|---|---|---|
| POST | `/api/users` | Crear un usuari | 201, 409, 422 |
| GET | `/api/users` | Llistar usuaris (filtres, ordre, paginació) | 200, 400 |
| GET | `/api/users/:id` | Obtenir un usuari | 200, 400, 404 |
| PUT | `/api/users/:id` | Modificar un usuari | 200, 400, 404, 422 |
| DELETE | `/api/users/:id` | Desactivar un usuari (`active=false`) | 204, 400, 404 |

### Camps d'un usuari

| Camp | Obligatori | Descripció |
|---|---|---|
| `name` | Sí | Nom (2 a 80 caràcters) |
| `email` | Sí | Format vàlid i únic |
| `password` | Sí (només a l'alta) | Mínim 12 caràcters i màxim 72 bytes; mai es guarda ni es retorna |
| `phone` | No | Mòbil espanyol; s'eliminen espais i guions |
| `addresses` | No | Llista d'adreces (`street`, `city`, `postalCode`, `notes`) |

### Afegir (POST)

```bash
curl -i -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Anna Prova",
    "email": "anna.prova@example.com",
    "password": "ClaveDePrueba-2026"
  }'
```

### Seguretat de les contrasenyes i dels camps

- La contrasenya es transforma amb **bcrypt** (12 rondes) i només es guarda el hash a `passwordHash`. El hash comença per `$2b$12$` i és diferent per a cada usuari, encara que tinguin la mateixa contrasenya, gràcies a la **sal** que bcrypt afegeix.
- `passwordHash` té `select: false` al model (cap consulta el retorna per defecte) i s'esborra a `toJSON`. Cap resposta l'exposa.
- El servidor assigna `role=client` i `active=true`. El cos de la petició **no pot** fixar `role`, `active` ni `passwordHash`: s'ignoren.
- El PUT només accepta `name`, `phone` i `addresses`. El canvi d'email i de contrasenya es farà amb un flux propi.
- La baixa és **lògica**: l'usuari no s'esborra, només es marca `active=false`.

## API d'incidències

Base URL: `http://localhost:3000/api/incidents`

| Mètode | Ruta | Descripció | Codis |
|---|---|---|---|
| POST | `/api/incidents` | Crear una incidència | 201, 422 |
| GET | `/api/incidents` | Llistar incidències (amb filtres opcionals) | 200, 400 |
| GET | `/api/incidents/:id` | Obtenir una incidència | 200, 400, 404 |
| PUT | `/api/incidents/:id` | Modificar una incidència | 200, 400, 404, 422 |
| DELETE | `/api/incidents/:id` | Esborrar una incidència | 204, 400, 404 |

### Camps d'una incidència

| Camp | Obligatori | Descripció |
|---|---|---|
| `clientId` | Sí | `_id` d'un usuari existent (client) |
| `title` | Sí | Títol breu (5 a 120 caràcters) |
| `description` | No | Descripció del problema (màxim 2000 caràcters) |
| `category` | Sí | `_id` d'una **categoria existent i activa** (`ref: Category`) |
| `status` | No | `pendiente` (per defecte), `asignada`, `en_curso`, `finalizada` o `cancelada` |
| `photos` | No | Llista de textos (màxim 10) |

`statusHistory` s'omple sol cada vegada que canvia l'estat. No es pot enviar ni modificar manualment.
Les respostes inclouen `clientId` (`name`, `email`, `phone`) i `category` (`name`, `slug`) gràcies a `populate()`.

### Afegir (POST)

```bash
curl -i -X POST http://localhost:3000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "<id_client>",
    "title": "Fuita d'\''aigua al bany",
    "description": "Degota el sifó del lavabo.",
    "category": "<id_categoria>"
  }'
```

Resposta esperada: `201 Created`, amb `status: "pendiente"` i una entrada a `statusHistory`.
Una categoria inexistent, inactiva o amb un format que no és un id retorna `422` amb `field: "category"`.

### Llistar i filtrar (GET)

```bash
# Totes
curl -i http://localhost:3000/api/incidents

# Filtrar per estat, categoria i/o client
curl -i "http://localhost:3000/api/incidents?status=pendiente"
curl -i "http://localhost:3000/api/incidents?category=<id_categoria>&status=en_curso"
curl -i "http://localhost:3000/api/incidents?clientId=<id_client>"
```

El llistat d'incidències encara no té paginació.

### Obtenir-ne una (GET per id)

```bash
curl -i http://localhost:3000/api/incidents/<id_incidencia>
```

Retorna `404` si no existeix i `400` si l'id no té un format vàlid.

### Modificar (PUT)

Admet actualitzacions parcials: només cal enviar els camps que canvien.

```bash
# Canviar l'estat (afegeix una entrada a statusHistory)
curl -i -X PUT http://localhost:3000/api/incidents/<id_incidencia> \
  -H "Content-Type: application/json" \
  -d '{"status": "en_curso"}'

# Canviar el títol i la descripció
curl -i -X PUT http://localhost:3000/api/incidents/<id_incidencia> \
  -H "Content-Type: application/json" \
  -d '{"title": "Nou títol", "description": "Nova descripció"}'
```

Només es poden modificar `title`, `description`, `category`, `status` i `photos`.
Qualsevol altre camp (com `clientId`, `invoiceId` o `statusHistory`) s'ignora.

### Esborrar (DELETE)

```bash
curl -i -X DELETE http://localhost:3000/api/incidents/<id_incidencia>
```

Retorna `204`. Esborra la incidència i, en cascada, les seves assignacions de professionals
(`IncidentWorker`), perquè no quedin registres orfes.

## Postman

A `backend/postman/` hi ha la col·lecció i l'entorn:

- `ecommerce.postman_collection.json`: col·lecció «Ecommerce API», amb les carpetes `Categories`, `Users`, `Incidents` (aquesta última fa de «Products» de l'enunciat) i `Auth`. Té 35 peticions amb comprovacions automàtiques (128 comprovacions).
- `ecommerce-local.postman_environment.json`: entorn «Ecommerce Local» amb `baseUrl=http://localhost:3000`.

La carpeta `Auth` té 8 peticions: registre correcte, email duplicat, contrasenya curta, login correcte, contrasenya incorrecta, email inexistent, cos buit i objecte en l'email (injecció NoSQL). S'han d'executar **en ordre**: la primera genera l'email i la contrasenya que usen les altres.

**Importar-les:** Postman → *Import* → seleccionar els dos fitxers → triar l'entorn **Ecommerce Local** (a dalt a la dreta) → *Run collection*.

Les peticions guarden soles els ids (`categoryId`, `userId`, `incidentId`) i les credencials de prova (`authEmail`, `authPassword`) a l'entorn i generen emails i slugs únics amb `Date.now()`, de manera que la col·lecció es pot executar tantes vegades com es vulgui. Les contrasenyes de prova es generen en cada execució i no hi ha cap secret als fitxers. **No s'ha d'exportar l'entorn des de Postman després d'executar-lo**, perquè s'hi guardarien aquests valors.

Sense obrir Postman, des de la línia d'ordres (amb l'API en marxa):

```bash
cd ~/Escritorio/LanderServeis/backend
npx --yes newman run postman/ecommerce.postman_collection.json \
  -e postman/ecommerce-local.postman_environment.json
```

Resultat esperat: 35 peticions, 0 errors.

## Notes de disseny

- **PUT amb `findById` + `save()`**: no s'usa `findByIdAndUpdate` perquè aquest no executa el
  hook `pre('save')` que manté `statusHistory`, ni les validacions del model.
- **Llistes blanques de camps**: tant a l'alta com a la modificació, perquè ningú pugui canviar
  camps sensibles (`role`, `passwordHash`, `clientId`, `statusHistory`...).
- **`unique` no és una validació**: és un índex de MongoDB. Un duplicat genera un error amb
  `code 11000`, que el middleware tradueix a `409 DUPLICATE_KEY`.
- **Categoria com a col·lecció**: `Incident.category` és un `ObjectId` amb `ref: 'Category'`. El servei
  comprova que existeix i que està activa, i no deixa esborrar categories amb incidències associades
  (és millor desactivar-les).
- **Esborrat en cascada d'incidències**: primer s'esborren les assignacions i després la incidència.
  A llarg termini, per a un negoci real pot ser millor un esborrat lògic (marcar com a `cancelada`)
  per conservar l'historial.
- **Paginació estable**: `listQuery` afegeix `_id` com a criteri d'ordre secundari, perquè dos registres
  amb el mateix valor no es repeteixin ni desapareguin entre pàgines.
- **Cerca per nom segura**: el text s'escapa abans de convertir-lo en expressió regular i només
  s'accepten textos, de manera que no es poden injectar operadors de MongoDB.
- **Errors centralitzats**: els serveis llancen `AppError` i el middleware és l'únic lloc que decideix
  el codi HTTP i el format. Els errors inesperats només es registren a la consola del servidor.
- **Registre sense token**: el registre només crea el compte i el login és qui crea la sessió, perquè
  cada endpoint tingui una única responsabilitat.
- **Registre reutilitzat**: `authService.register` crida `userService.createUser`, així la lògica de
  contrasenyes i camps permesos només existeix en un lloc.
- **Dades de prova**: encara no hi ha endpoints de professionals. Per provar-los cal crear-los amb un
  script que usi el model `Worker` (veure `src/test-validation.js` com a exemple de com carregar els models).

## Pendent

- Middleware `auth` que verifiqui el token JWT i `GET /api/auth/me` (opcional).
- Control d'accés per rols (RBAC); després protegir `/api/users` i la resta de rutes.
- Límit d'intents de login (`express-rate-limit`).
- Canvi d'email i de contrasenya amb un flux propi.
- Endpoints (ruta, controlador i servei) per a `Worker`, `Invoice` i `IncidentWorker`.
- Paginació al llistat d'incidències.
- Revisar les vulnerabilitats de `npm audit` (`npm audit fix` sense `--force`).
- Frontend (React).
