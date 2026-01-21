# 🚀 Configuración de Render para MELO SPORTT Backend

## 📋 Variables de Entorno Requeridas

Ve a tu proyecto en Render > Environment y configura las siguientes variables:

### 🔐 Variables Obligatorias

```bash
# Base de Datos (Neon)
DATABASE_URL=postgresql://neondb_owner:XXXXX@ep-XXXXX.us-east-2.aws.neon.tech/neondb?sslmode=require

# JWT (generar uno seguro)
JWT_SECRET=tu-secret-super-seguro-de-al-menos-32-caracteres-aqui

# Configuración de Servidor
NODE_ENV=production
PORT=3000

# Frontend (Vercel)
FRONTEND_URL=https://walmer-store.vercel.app
ALLOWED_ORIGINS=https://walmer-store.vercel.app,https://melo-sportt-frontend.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### 🎨 Variables Opcionales (Cloudinary)

```bash
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

### 💳 Variables Opcionales (Stripe)

```bash
STRIPE_SECRET_KEY=sk_test_XXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXX
```

---

## 🔑 Generar JWT_SECRET Seguro

Ejecuta este comando en tu terminal para generar un JWT_SECRET aleatorio y seguro:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

O usa este:
```
a7f8d9e2b4c6a1f3e5d7b9c2a4f6e8d0b2c4a6f8e0d2b4c6a8f0e2d4b6c8a0f2
```

---

## 📦 Comandos de Build y Start

### Build Command:
```bash
npm install && npm run build
```

### Start Command:
```bash
npm run start
```

---

## 🌱 Después del Deploy

Una vez que el backend esté funcionando en Render, ejecuta los siguientes comandos para crear los usuarios administradores:

### 1. Verificar que el backend esté funcionando:
```bash
curl https://melo-sportt-backend.onrender.com/health
```

Deberías ver: `{"status":"healthy","database":"connected"}`

### 2. Crear usuarios administradores desde tu máquina local:

Primero, actualiza la `DATABASE_URL` en tu archivo `.env` local con la URL de Neon en producción, luego ejecuta:

```bash
npm run seed:admins
```

Esto creará/actualizará los siguientes usuarios:

**SUPER_ADMIN (Fuyi):**
- Email: `fuyi@melosportt.com`
- Password: `Fuyi123!*`
- Acceso total al sistema

**ADMIN (Walmer):**
- Email: `walmer@melosportt.com`
- Password: `Walmer123!*`
- Gestión de productos y pedidos

**ADMIN (Test):**
- Email: `admin@melosportt.com`
- Password: `Admin123!*`
- Usuario de prueba

---

## 🧪 Probar el Backend

### 1. Health Check:
```bash
curl https://melo-sportt-backend.onrender.com/health
```

### 2. Probar Login:
```bash
curl -X POST https://melo-sportt-backend.onrender.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"walmer@melosportt.com","password":"Walmer123!*"}'
```

Deberías ver una respuesta con:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "walmer@melosportt.com",
      "role": "admin",
      ...
    },
    "token": "..."
  }
}
```

---

## 🔧 Troubleshooting

### Error: "Invalid environment variables"
- Verifica que todas las variables obligatorias estén configuradas en Render
- Especialmente `DATABASE_URL` y `JWT_SECRET` (mínimo 32 caracteres)

### Error: "Internal server error" en /api/auth/signin
1. Verifica los logs en Render Dashboard
2. Asegúrate de que la `DATABASE_URL` sea correcta
3. Verifica que los usuarios admin existan ejecutando `npm run seed:admins`

### Error: "database disconnected"
- Verifica que la `DATABASE_URL` de Neon sea correcta
- Asegúrate de que el proyecto de Neon esté activo (no en modo sleep)

### CORS Error
- Agrega tu dominio de Vercel a `ALLOWED_ORIGINS`
- Formato: `https://tu-app.vercel.app,https://otra-app.vercel.app`

---

## 📝 Checklist de Deploy

- [ ] Variables de entorno configuradas en Render
- [ ] `JWT_SECRET` tiene al menos 32 caracteres
- [ ] `DATABASE_URL` apunta a Neon
- [ ] `FRONTEND_URL` y `ALLOWED_ORIGINS` incluyen tu dominio de Vercel
- [ ] Build exitoso en Render
- [ ] Health check devuelve "healthy"
- [ ] Usuarios admin creados con `npm run seed:admins`
- [ ] Login funciona correctamente
- [ ] Frontend en Vercel puede conectarse al backend

---

## 🎯 URLs Finales

- **Backend Health:** https://melo-sportt-backend.onrender.com/health
- **Backend API:** https://melo-sportt-backend.onrender.com/api
- **Frontend:** https://walmer-store.vercel.app
- **Panel Admin:** https://walmer-store.vercel.app/admin

---

## 🆘 Soporte

Si tienes problemas, revisa los logs en:
- Render Dashboard > Logs
- Vercel Dashboard > Deployments > Function Logs
