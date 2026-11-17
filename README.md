# LanderServeis (Pràctica E-commerce Full Stack)

Plataforma perquè els clients contactin amb el seu equip de professionals de la llar
(lampistes, fontaners, paletes...) i gestionin incidències.

## Tecnologies
React, Node.js/Express, MongoDB (Mongoose), Docker, bcrypt, JSON Web Token (JWT, access + refresh token), Postman

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

Editar el fitxer `.env` creat a `api/` i posar-hi la contrasenya de Mongo i els dos secrets dels tokens:

```
PORT=3000
MONGO_URI=mongodb://admin:<contrasenya>@localhost:27017/ecommerce?authSource=admin
JWT_SECRET=<secret llarg i aleatori per als access tokens>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<un altre secret diferent per als refresh tokens>
JWT_REFRESH_EXPIRES_IN=7d
```

Es pot generar cada secret aleatori amb:

```bash
openssl rand -base64 48
```

`JWT_SECRET` i `JWT_REFRESH_SECRET` són obligatoris, han de tenir **com a mínim 32 caràcters** i han de ser **diferents entre ells**: si falta algun, és massa curt o són iguals, l'API no arrenca. No s'han de pujar mai a Git (el `.env` està ignorat; només es puja `.env.example`, sense valors reals).

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
│   │   │   ├── Invoice.js               # Pressupostos i factures
│   │   │   └── RefreshToken.js          # Hash dels refresh tokens (rotació i TTL)
│   │   ├── routes/                      # category, user, incident i authRoutes
│   │   ├── controllers/                 # Part HTTP (req/res, codis d'estat)
│   │   ├── services/                    # Lògica de negoci (authService, tokenService...)
│   │   ├── middleware/
│   │   │   ├── errorHandler.js          # notFound + gestor global d'errors
│   │   │   └── auth.js                  # authenticate: valida l'access token (Bearer)
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
├── postman/
│   ├── Ecommerce API/                   # Col·lecció (una carpeta per grup i un .yaml per petició)
│   └── Ecommerce Local.environment.yaml
└── scripts/
    └── validate-auth.sh                 # Validació de l'autenticació amb curl (Sessió 8)
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
| Middleware d'autenticació | `middleware/auth.js` | Valida l'access token i deixa l'usuari a `req.user` |
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
| 401 | `INVALID_CREDENTIALS` | Login amb email o contrasenya incorrectes |
| 401 | `UNAUTHORIZED` | Falta l'access token (`Authorization: Bearer ...`) |
| 401 | `INVALID_TOKEN` | Token manipulat, inventat, d'un altre tipus o d'un usuari desactivat |
| 401 | `TOKEN_EXPIRED` | Token caducat |
| 401 | `REFRESH_TOKEN_REUSED` | Refresh token ja usat o revocat: es tanca tota la cadena de sessions |
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

## API d'autenticació (registre, login i tokens)

Base URL: `http://localhost:3000/api/auth`

| Mètode | Ruta | Descripció | Codis |
|---|---|---|---|
| POST | `/api/auth/register` | Crear un compte de client nou (no retorna tokens) | 201, 409, 422 |
| POST | `/api/auth/login` | Iniciar sessió: retorna `accessToken` i `refreshToken` | 200, 401, 422 |
| GET | `/api/auth/me` | Perfil de l'usuari autenticat (**ruta protegida**) | 200, 401 |
| POST | `/api/auth/refresh` | Renovar la sessió amb rotació del refresh token | 200, 401, 422 |
| POST | `/api/auth/logout` | Revocar el refresh token rebut (idempotent) | 204, 422 |

L'enunciat parla de `Usuari.js`, `usuariController`, `usuariServices` i `usuariRoutes`, i d'un model `Tokens.js` i un `tokenService`. En aquest projecte
es **reutilitza** el model `User.js` (ja té `passwordHash`) i els fitxers són `authController.js`, `authService.js`, `authRoutes.js`,
`models/RefreshToken.js`, `services/tokenService.js` i `middleware/auth.js`.

### Com funciona (visió general)

```
1. Registre   POST /register   → es crea el compte (sense sessió)
2. Login      POST /login      → accessToken (15 min) + refreshToken (7 dies)
3. Ús         GET  /me         → Authorization: Bearer <accessToken>
4. Renovació  POST /refresh    → refreshToken antic (queda revocat) → parell nou
5. Tancament  POST /logout     → es revoca el refreshToken
```

- **Access token**: JWT (HS256) de curta durada (15 minuts, `JWT_ACCESS_EXPIRES_IN`). Payload mínim: `sub` (id de l'usuari) i `role`. S'envia a cada petició protegida a la capçalera `Authorization: Bearer <accessToken>`. Si es roba, només serveix uns minuts.
- **Refresh token**: JWT de llarga durada (7 dies, `JWT_REFRESH_EXPIRES_IN`), signat amb un **secret diferent** (`JWT_REFRESH_SECRET`) i amb un `jti` únic. Només serveix per demanar tokens nous: no és vàlid com a access token.
- **Rotació**: cada refresh token **només es pot usar una vegada**. En usar-lo es revoca, es lliura un parell nou i el token antic enllaça amb el nou (`replacedBy`).
- **Detecció de reutilització**: si algú presenta un refresh token ja usat o revocat, es considera que s'ha robat: es revoca **tota la cadena** (`family`, totes les sessions derivades d'aquell login) i es retorna `401 REFRESH_TOKEN_REUSED`. L'usuari ha de tornar a iniciar sessió.
- **Emmagatzematge**: a la col·lecció `refreshtokens` només es guarda el **hash SHA-256** del refresh token (`tokenHash`), mai el token. Així, si algú veiés la base de dades, no podria fer-lo servir.

Camps de la col·lecció `refreshtokens`:

| Camp | Descripció |
|---|---|
| `userId` | Usuari propietari del token |
| `tokenHash` | Hash SHA-256 (64 caràcters hexadecimals); índex **únic** |
| `family` | Identificador de la cadena de rotació d'un mateix login |
| `expiresAt` | Data de caducitat; índex **TTL** (`expireAfterSeconds: 0`) que esborra el document automàticament |
| `revokedAt` | Data de revocació (`null` si el token encara és vigent) |
| `replacedBy` | Token que el substitueix en una rotació |

### 1. Crear un usuari (registre)

Accepta els mateixos camps que la creació d'usuaris (`name`, `email`, `password`, `phone`, `addresses`) i reutilitza la lògica de `userService`.
`role=client` i `active=true` els fixa el servidor, i la contrasenya (mínim 12 caràcters) es guarda amb bcrypt (12 rondes). **No retorna cap token**: el
registre no inicia la sessió; cal fer login.

```bash
curl -i -X POST "http://localhost:3000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Marta Auth","email":"marta.auth@example.com","password":"ClaveDePrueba-2026"}'
```

Resposta esperada: `201 Created` amb l'usuari, sense `passwordHash`. Un email repetit retorna `409 DUPLICATE_KEY` i una contrasenya curta `422 VALIDATION_ERROR`.

### 2. Iniciar sessió (login)

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
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "expiresIn": 900,
    "user": { "_id": "...", "name": "Marta Auth", "email": "marta.auth@example.com", "role": "client", "active": true }
  }
}
```

`expiresIn` són els segons de validesa de l'**access token** (900 = 15 minuts). Errors possibles:

| Cas | Resposta |
|---|---|
| Falta `email` o `password` (o no són text) | `422 VALIDATION_ERROR` amb un error per camp a `details` |
| Email inexistent, contrasenya incorrecta, usuari desactivat o usuari sense hash | `401 INVALID_CREDENTIALS`, sempre amb el mateix missatge |

> Canvi respecte a la Sessió 7: el login retornava `{ token, expiresIn, user }`. Ara retorna `accessToken` i `refreshToken`.

### 3. Ruta protegida (GET `/api/auth/me`)

El middleware `authenticate` (`middleware/auth.js`) llegeix `Authorization: Bearer <accessToken>`, en verifica la signatura i la caducitat, i carrega l'usuari. Per fer proves amb curl es guarden els tokens en variables (cal tenir `jq`):

```bash
RESP=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"marta.auth@example.com","password":"ClaveDePrueba-2026"}')
AT=$(echo "$RESP" | jq -r '.data.accessToken')
RT=$(echo "$RESP" | jq -r '.data.refreshToken')

curl -i "http://localhost:3000/api/auth/me" -H "Authorization: Bearer $AT"
```

| Cas | Resposta |
|---|---|
| Access token vàlid | `200 OK` amb l'usuari (sense `passwordHash`) |
| Sense capçalera `Authorization` | `401 UNAUTHORIZED` |
| Token inventat o manipulat (o un refresh token) | `401 INVALID_TOKEN` |
| Token caducat | `401 TOKEN_EXPIRED` |
| Usuari desactivat (`active=false`) | `401` (es consulta la base de dades) |

### 4. Renovar la sessió (POST `/api/auth/refresh`)

```bash
curl -i -X POST "http://localhost:3000/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$RT\"}"
```

Resposta esperada: `200 OK` amb un parell **nou** (`accessToken` i `refreshToken`). El refresh token enviat queda revocat i no es pot tornar a usar.

### 5. Reutilització d'un refresh token (detecció de robatori)

Si es torna a enviar el refresh token antic (`$RT` de l'apartat anterior):

```bash
curl -i -X POST "http://localhost:3000/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$RT\"}"
```

Resposta: `401 REFRESH_TOKEN_REUSED`. A més, **tota la cadena queda revocada**: el refresh token nou que s'havia lliurat també deixa de funcionar i l'usuari ha de tornar a fer login.

### 6. Tancar la sessió (POST `/api/auth/logout`)

```bash
curl -i -X POST "http://localhost:3000/api/auth/logout" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$RT\"}"
```

Resposta: `204 No Content`. És **idempotent**: repetir-lo també retorna `204`. Després del logout, usar aquest refresh token a `/refresh` retorna `401`. L'access token no es pot revocar i segueix sent vàlid fins que caduca (màxim 15 minuts).

### Seguretat de l'autenticació

- **Missatge genèric**: tant si l'email no existeix com si la contrasenya és incorrecta o l'usuari està desactivat, la resposta és idèntica, de manera que no es pot esbrinar quins emails estan registrats.
- **Temps constant**: si l'usuari no existeix, igualment es fa una comparació bcrypt contra un hash fals, perquè el temps de resposta no delati l'existència de l'email.
- **Sense injecció NoSQL**: `email`, `password` i `refreshToken` han de ser text; un objecte com `{"$ne": null}` retorna `422` abans de consultar la base de dades.
- **`passwordHash`**: té `select: false`, per això el login el demana explícitament (`.select('+passwordHash')`), i mai surt a la resposta.
- **Dos secrets diferents**: un access token no val com a refresh token ni al revés.
- **Refresh token a la base de dades només com a hash** (SHA-256), amb índex únic i índex TTL per esborrar els caducats.
- **Usuari desactivat**: `/refresh` i `/me` consulten la base de dades i el rebutgen encara que el token no hagi caducat.
- **Secrets obligatoris**: si `JWT_SECRET` o `JWT_REFRESH_SECRET` falten, tenen menys de 32 caràcters o són iguals, l'API no arrenca.
- L'email es normalitza (espais fora i minúscules) igual que a l'esquema.
- El refresh token viatja ara al cos JSON per simplicitat. Quan hi hagi frontend (React) es valorarà una cookie `httpOnly`.

### Comprovar-ho a MongoDB

```bash
docker exec -i ecommerce-mongo sh -c 'mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin ecommerce --quiet' << 'MONGO'
db.refreshtokens.find({}, {tokenHash: 1, family: 1, revokedAt: 1, replacedBy: 1}).sort({createdAt: -1}).limit(4).forEach(d => print(d.tokenHash.length, d.family.slice(0, 8), d.revokedAt ? "revocat" : "vigent", d.replacedBy ? "amb substitut" : "sense substitut"))
db.refreshtokens.getIndexes().forEach(i => print(i.name, JSON.stringify(i.key), i.unique ? "unique" : "", i.expireAfterSeconds !== undefined ? "ttl=" + i.expireAfterSeconds : ""))
MONGO
```

Resultat esperat: `tokenHash` de 64 caràcters, i els índexs `tokenHash_1` (únic) i `expiresAt_1` (`ttl=0`).

### Validació automàtica amb curl

Amb l'API en marxa, el script `backend/scripts/validate-auth.sh` registra un usuari nou i comprova en ordre: registre, login, errors de login (anti-enumeració i NoSQL), ruta protegida, rotació, reutilització amb revocació de la cadena, validació d'entrada i logout.

```bash
cd ~/Escritorio/LanderServeis
bash backend/scripts/validate-auth.sh
```

Resultat esperat: `RESULTAT: 32 correctes, 0 errors` (cada cas mostra `OK` o `FALLO`). Es pot repetir tantes vegades com es vulgui, perquè cada execució crea un usuari amb un email únic.

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
curl -i -X PUT http://localhost:3000/api/categories/\<id_categoria\> \
  -H "Content-Type: application/json" \
  -d '{"description": "Nova descripció"}'

curl -i -X DELETE http://localhost:3000/api/categories/\<id_categoria\>
```

El PUT només modifica `name`, `slug`, `description` i `active`. Si la categoria té incidències associades, el DELETE retorna `409 CATEGORY_IN_USE`: en aquest cas cal desactivar-la (`"active": false`).

## API d'usuaris

Base URL: `http://localhost:3000/api/users`

> **Atenció:** fins que s'implementi el control d'accés per rols (RBAC), aquests endpoints **no estan protegits**
> (encara que ja existeixi el login amb JWT i el middleware `authenticate`, cap ruta de `/api/users` comprova el token). Només s'han d'executar
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
curl -i http://localhost:3000/api/incidents/\<id_incidencia\>
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

### Guia ràpida amb curl

Amb l'API en marxa (`npm run dev`), des d'una segona pestanya del terminal. Requereix `jq`.

**1. Crear un usuari** (contrasenya de 12 caràcters com a mínim). El login és l'email i el password el que s'hi ha posat:

```bash
curl -s -X POST "http://localhost:3000/api/auth/register" -H "Content-Type: application/json" -d '{"name":"Jan Prova","email":"jan.prova@example.com","password":"ClaveDePrueba-2026"}' | jq
```

Retorna `201` sense token. Si l'email ja existeix, retorna `409 DUPLICATE_KEY`.

**2. Iniciar sessió** i guardar els tokens en variables (només viuen en aquesta pestanya):

```bash
RESP=$(curl -s -X POST "http://localhost:3000/api/auth/login" -H "Content-Type: application/json" -d '{"email":"jan.prova@example.com","password":"ClaveDePrueba-2026"}')
AT=$(echo "$RESP" | jq -r '.data.accessToken')
RT=$(echo "$RESP" | jq -r '.data.refreshToken')
echo "$RESP" | jq '{success, expiresIn: .data.expiresIn, user: .data.user.email}'
```

**3. Ruta protegida** (sense la capçalera retorna `401 UNAUTHORIZED`):

```bash
curl -s "http://localhost:3000/api/auth/me" -H "Authorization: Bearer $AT" | jq
```

**4. Renovar la sessió** (rotació: el refresh token antic deixa de servir, per això es sobreescriu `RT`):

```bash
RESP=$(curl -s -X POST "http://localhost:3000/api/auth/refresh" -H "Content-Type: application/json" -d "{\"refreshToken\":\"$RT\"}")
AT=$(echo "$RESP" | jq -r '.data.accessToken')
RT=$(echo "$RESP" | jq -r '.data.refreshToken')
```

Si es torna a enviar un refresh token ja usat, retorna `401 REFRESH_TOKEN_REUSED` i es tanca tota la cadena de sessions.

**5. Tancar sessió** (retorna `204`; revoca el refresh token, però l'access token continua vàlid fins que caduca, 15 minuts com a màxim):

```bash
curl -s -o /dev/null -w 'logout: HTTP %{http_code}\n' -X POST "http://localhost:3000/api/auth/logout" -H "Content-Type: application/json" -d "{\"refreshToken\":\"$RT\"}"
```

**6. Donar de baixa un usuari** (baixa lògica, `active=false`; després el login retorna `401 INVALID_CREDENTIALS`):

```bash
USER_ID=$(curl -s "http://localhost:3000/api/users?name=jan.prova" | jq -r '.data[0]._id')
curl -s -o /dev/null -w 'baixa: HTTP %{http_code}\n' -X DELETE "http://localhost:3000/api/users/$USER_ID"
```

## Postman

A `backend/postman/` hi ha la col·lecció i l'entorn, en el format de carpetes de Postman (un fitxer `.yaml` per petició):

- `Ecommerce API/`: col·lecció «Ecommerce API», amb les carpetes `Categories`, `Users`, `Incidents` (aquesta última fa de «Products» de l'enunciat) i `Auth`. Té 35 peticions amb comprovacions automàtiques.
- `Ecommerce Local.environment.yaml`: entorn «Ecommerce Local» amb `baseUrl=http://localhost:3000`.

La carpeta `Auth` té 8 peticions: registre correcte, email duplicat, contrasenya curta, login correcte (comprova `accessToken` i `expiresIn`), contrasenya incorrecta, email inexistent, cos buit i objecte en l'email (injecció NoSQL). S'han d'executar **en ordre**: la primera genera l'email i la contrasenya que usen les altres.

**Importar-les:** Postman → *Import* → seleccionar la carpeta `backend/postman` → triar l'entorn **Ecommerce Local** (a dalt a la dreta) → *Run collection*.

Les peticions guarden soles els ids (`categoryId`, `userId`, `incidentId`) i les credencials de prova (`authEmail`, `authPassword`) a l'entorn i generen emails i slugs únics amb `Date.now()`, de manera que la col·lecció es pot executar tantes vegades com es vulgui. Les contrasenyes de prova es generen en cada execució i no hi ha cap secret als fitxers. **No s'ha d'exportar l'entorn des de Postman després d'executar-lo**, perquè s'hi guardarien aquests valors.

Les proves de la Sessió 8 (access i refresh token, rotació, reutilització i logout) es fan amb curl i el script `backend/scripts/validate-auth.sh` (vegeu «Validació automàtica amb curl»).

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
- **Dos tokens amb secrets diferents**: l'access token és curt (15 min) perquè, si es roba, el dany sigui
  limitat; el refresh token és llarg (7 dies) però només serveix per renovar i es pot revocar.
- **Rotació i famílies**: cada refresh token serveix una sola vegada. Si es reutilitza un de ja gastat,
  es revoca tota la família (`family`), perquè pot ser que algú l'hagi robat.
- **Hash del refresh token**: a MongoDB només es guarda el SHA-256, no el token. El SHA-256 (i no bcrypt)
  és suficient perquè el token ja és aleatori i llarg, i permet cercar-lo directament per l'índex únic.
- **Índex TTL**: MongoDB esborra sol els tokens quan arriba `expiresAt`, sense cap tasca de neteja.
- **Dades de prova**: encara no hi ha endpoints de professionals. Per provar-los cal crear-los amb un
  script que usi el model `Worker` (veure `src/test-validation.js` com a exemple de com carregar els models).

## Pendent

- Control d'accés per rols (RBAC); després protegir `/api/users` i `/api/incidents` amb el middleware `authenticate`.
- Límit d'intents de login (`express-rate-limit`).
- Tancar totes les sessions d'un usuari (`logout-all`) i cookie `httpOnly` per al refresh token quan hi hagi frontend.
- Canvi d'email i de contrasenya amb un flux propi.
- Endpoints (ruta, controlador i servei) per a `Worker`, `Invoice` i `IncidentWorker`.
- Paginació al llistat d'incidències.
- Revisar les vulnerabilitats de `npm audit` (`npm audit fix` sense `--force`).
- Frontend (React).
