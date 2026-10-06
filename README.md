cat >> README.md << 'EOF'

# E-commerce Full Stack

## Tecnologies
React, Node.js/Express, MongoDB, Docker

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
EOF
