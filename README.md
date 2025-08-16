# 📚 Backend API - Book Library

Este proyecto implementa un backend para gestionar una librería de libros, con soporte para portadas en base64 y despliegue en Railway.

---

## 🚀 Endpoints principales

### 1. Crear libro
```http
POST /books
```
Crea un libro con campos: `title`, `author`, `year`, `coverBase64` (opcional).

### 2. Obtener lista de libros (sin base64)
```http
GET /books/my-library
```
Retorna todos los libros, excluyendo `coverBase64` por optimización.

### 3. Obtener portada
```http
GET /books/library/front-cover/:id
```
Retorna la portada en formato `image/png`.

---

## 🌡️ Health Check (`/healthz`)

El backend expone un endpoint de verificación de estado que Railway usará como **health check**.

```bash
GET /healthz
```

#### Respuesta esperada:
```json
{
  "status": "ok",
  "uptime": 1234.56,
  "timestamp": "2025-08-16T14:35:22.123Z"
}
```

Esto confirma que el servicio está corriendo.  

### Verificación de MongoDB
Al arrancar el servicio, se intenta conectar a MongoDB. Si falla, el arranque no continúa y se mostrará en logs:

```
❌ Error al conectar a MongoDB: Authentication failed
```

Si se conecta correctamente:

```
✅ MongoDB conectado: mongodb+srv://<cluster>/<db>
```

---

## ✅ Checklist rápido
- [ ] `MONGO_URI` válido (Mongo Atlas o Railway Mongo)
- [ ] `bodyParsers.limit` ≥ 10mb para base64
- [ ] **Proyección** sin `coverBase64` en listados
- [ ] Manejo de errores + logs
- [ ] CORS ajustado en producción ✅
- [ ] Endpoint `/healthz` responde `status: ok`
- [ ] Logs confirman conexión a MongoDB al inicio

---

## 🛠️ Configuración en Nuxt (Frontend)
En `nuxt.config.ts` asegurarse de definir la variable de entorno:

```ts
runtimeConfig: {
  public: {
    apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:3002/api"
  }
}
```

En producción (Vercel/Railway), asignar:

```
NUXT_PUBLIC_API_BASE=https://<tu-backend>.up.railway.app/api
```

---

## 📦 Despliegue
1. Subir a **Railway** (`railway up` o GitHub deploy).
2. Configurar `MONGO_URI` y `NUXT_PUBLIC_API_BASE` en Railway y Vercel.
3. Verificar `/healthz` en Railway.
4. Probar integración desde frontend desplegado en Vercel.

---

© 2025 - Book Library API
