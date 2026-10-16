# LanderServeis (Pràctica E-commerce Full Stack)

Plataforma perquè els clients contactin amb el seu equip de professionals de la llar
(lampistes, fontaners, paletes...) i gestionin incidències.

## Tecnologies
React, Node.js/Express, MongoDB (Mongoose), Docker

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
```

Crear un fitxer `.env` a `api/`:

```
PORT=3000
MONGO_URI=mongodb://admin:<contrasenya>@localhost:27017/ecommerce?authSource=admin
```

Arrencar en mode desenvolupament:

```bash
npm run dev
```

Ha de mostrar `Servidor escoltant al port 3000` i `MongoDB connectat correctament`.

## Estructura del backend

```
backend/api/
├── src/
│   ├── index.js                          # Arrencada, middleware i muntatge de rutes
│   ├── config/db.js                      # Connexió a MongoDB
│   ├── models/                           # Esquemes Mongoose
│   │   ├── User.js                       # Clients i administradors
│   │   ├── Worker.js                     # Professionals
│   │   ├── Incident.js                   # Incidències (entitat central)
│   │   ├── IncidentWorker.js             # Assignacions N:N incidència-professional
│   │   └── Invoice.js                    # Pressupostos i factures
│   ├── routes/incidentRoutes.js          # Endpoints d'incidències
│   ├── controllers/incidentController.js # Part HTTP (req/res, codis d'estat)
│   └── services/incidentService.js       # Lògica de negoci
├── .env
├── .gitignore
└── package.json
```

## Arquitectura en capes (Sessió 5)

Cada petició segueix aquest flux:

```
Request HTTP → [RUTA] → [CONTROLADOR] → [SERVEI] → [MODEL] → Base de dades
```

| Capa | Fitxer | Responsabilitat |
|---|---|---|
| Ruta | `routes/incidentRoutes.js` | Només defineix l'endpoint i el connecta amb el controlador |
| Controlador | `controllers/incidentController.js` | Gestiona HTTP: llegeix `req`, respon amb `res` i el codi d'estat |
| Servei | `services/incidentService.js` | Lògica de negoci i accés al model; no coneix `req` ni `res` |
| Model | `models/Incident.js` | Esquema, validacions i hooks |

A `index.js` les rutes es munten sota un prefix:

```js
app.use('/api/incidents', incidentRoutes);
```

## API d'incidències

Base URL: `http://localhost:3000/api/incidents`

| Mètode | Ruta | Descripció | Codis |
|---|---|---|---|
| POST | `/api/incidents` | Crear una incidència | 201, 400 |
| GET | `/api/incidents` | Llistar incidències (amb filtres opcionals) | 200 |
| GET | `/api/incidents/:id` | Obtenir una incidència | 200, 400, 404 |
| PUT | `/api/incidents/:id` | Modificar una incidència | 200, 400, 404 |
| DELETE | `/api/incidents/:id` | Esborrar una incidència | 200, 400, 404 |

Totes les respostes tenen el format `{ "status": "success" | "error", ... }`.

### Camps d'una incidència

| Camp | Obligatori | Descripció |
|---|---|---|
| `clientId` | Sí | `_id` d'un usuari existent (client) |
| `title` | Sí | Títol breu |
| `description` | Sí | Descripció del problema |
| `category` | Sí | `fontaneria`, `electricidad`, `albanileria` o `otros` |
| `status` | No | `pendiente` (per defecte), `asignada`, `en_curso`, `finalizada` o `cancelada` |
| `photos` | No | Llista de textos (màxim 10) |

`statusHistory` s'omple sol cada vegada que canvia l'estat. No es pot enviar ni modificar manualment.

### Afegir (POST)

```bash
curl -i -X POST http://localhost:3000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "<id_client>",
    "title": "Fuga d'\''aigua al bany",
    "description": "Degota el sifó del lavabo.",
    "category": "fontaneria"
  }'
```

Resposta esperada: `201 Created`, amb `status: "pendiente"` i una entrada a `statusHistory`.

### Llistar i filtrar (GET)

```bash
# Totes
curl -i http://localhost:3000/api/incidents

# Filtrar per estat, categoria i/o client
curl -i "http://localhost:3000/api/incidents?status=pendiente"
curl -i "http://localhost:3000/api/incidents?category=fontaneria&status=en_curso"
curl -i "http://localhost:3000/api/incidents?clientId=<id_client>"
```

El camp `clientId` es retorna amb les dades del client (`name`, `email`, `phone`).

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
curl -i -X PUT http://localhost:3000/api/incidents/\<id_incidencia\> \
  -H "Content-Type: application/json" \
  -d '{"title": "Nou títol", "description": "Nova descripció"}'
```

Només es poden modificar `title`, `description`, `category`, `status` i `photos`.
Qualsevol altre camp (com `clientId`, `invoiceId` o `statusHistory`) s'ignora.

### Esborrar (DELETE)

```bash
curl -i -X DELETE http://localhost:3000/api/incidents/\<id_incidencia\>
```

Esborra la incidència i, en cascada, les seves assignacions de professionals
(`IncidentWorker`), perquè no quedin registres orfes.

## Notes de disseny

- **PUT amb `findById` + `save()`**: no s'usa `findByIdAndUpdate` perquè aquest no executa el
  hook `pre('save')` que manté `statusHistory`, ni les validacions del model.
- **Llista blanca de camps al PUT**: evita que un client canviï per error (o a propòsit) a qui
  pertany la incidència o el seu historial.
- **Esborrat en cascada**: primer s'esborren les assignacions i després la incidència.
  A llarg termini, per a un negoci real pot ser millor un esborrat lògic (marcar com a
  `cancelada`) per conservar l'historial.
- **Clients per a proves**: encara no hi ha endpoints d'usuaris ni de professionals. Per provar
  les incidències cal crear un client directament amb un script que usi el model `User`
  (veure `src/test-validation.js` com a exemple de com carregar els models).

## Pendent

- Endpoints (ruta, controlador i servei) per a `User`, `Worker`, `Invoice` i `IncidentWorker`.
- Contrasenya i login d'usuaris (hash amb bcrypt).
- Frontend (React).
