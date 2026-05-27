# Despliegue en Render

Este proyecto se despliega como tres recursos:

- PostgreSQL para datos.
- Web Service Node.js para el backend NestJS.
- Static Site para el frontend Angular.

## 1. Base de datos

En Render crea un recurso `PostgreSQL`.

Guarda la cadena interna de conexion. En Render suele llamarse `Internal Database URL`.

## 2. Backend

Crea un `Web Service` conectado al repositorio de GitHub.

Configuracion:

- Root Directory: `backend`
- Runtime: `Node`
- Build Command: `npm install && npm run db:init && npm run build`
- Start Command: `npm run start:prod`

Variables de entorno:

```env
DATABASE_URL=postgresql://...
NODE_ENV=production
CORS_ORIGINS=https://TU-FRONTEND.onrender.com
DB_SSL=false
DB_SYNCHRONIZE=false
```

Notas:

- Si usas una base externa como Neon o Supabase, pon `DB_SSL=true`.
- `npm run db:init` crea las tablas y registra los 10 sensores iniciales.
- El backend escucha en `0.0.0.0`, necesario para Render.

## 3. Frontend

Crea un `Static Site` conectado al mismo repositorio.

Configuracion:

- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist/frontend/browser`

Variables de entorno:

```env
API_URL=https://TU-BACKEND.onrender.com
```

En el Static Site agrega una regla de rewrite para Angular:

```text
Source: /*
Destination: /index.html
Action: Rewrite
```

## 4. CORS final

Cuando tengas la URL real del frontend, vuelve al backend y actualiza:

```env
CORS_ORIGINS=https://TU-FRONTEND.onrender.com
```

Luego haz `Manual Deploy` del backend.

## 5. Credenciales demo

```text
admin / admin123
iot / montanini
```
