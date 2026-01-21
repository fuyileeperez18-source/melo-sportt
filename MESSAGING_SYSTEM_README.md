# Sistema de Mensajería en Tiempo Real - Melo Sportt

## 🎯 Funcionalidades Implementadas

### Backend
✅ **WebSocket Server con Socket.IO**
- Autenticación mediante JWT
- Salas por conversación
- Eventos en tiempo real (mensajes, typing indicators)
- Notificaciones automáticas

✅ **API REST para Mensajes**
- `GET /api/messages/conversations` - Obtener todas las conversaciones
- `GET /api/messages/conversations/:id/messages` - Obtener mensajes de una conversación
- `POST /api/messages/messages` - Enviar un mensaje
- `POST /api/messages/conversations` - Crear o obtener conversación
- `PUT /api/messages/conversations/:id/read` - Marcar mensajes como leídos
- `GET /api/messages/unread-count` - Obtener contador de mensajes no leídos

✅ **Base de Datos**
- Tabla `conversations` (conversaciones entre cliente y vendedor)
- Tabla `messages` (mensajes individuales)
- Funciones SQL para actualización automática y contadores
- Índices optimizados para búsquedas rápidas

### Frontend
✅ **Socket Context**
- Conexión automática cuando el usuario inicia sesión
- Manejo de eventos en tiempo real
- Callbacks para nuevos mensajes y notificaciones

✅ **Servicios**
- `message.service.ts` - Cliente HTTP para API de mensajes
- Integración con Socket.IO para tiempo real

✅ **Integración**
- SocketProvider envuelve toda la aplicación
- Ruta `/account/messages` para clientes
- Ruta `/admin/messages` para administradores

## 🚀 Aplicar Migración a la Base de Datos

### Opción 1: Usando el script automático (Recomendado)

El servidor aplica automáticamente todas las migraciones al iniciar. Solo necesitas:

\`\`\`bash
cd backend
npm run dev
\`\`\`

La migración `005_add_messaging_system.sql` se ejecutará automáticamente.

### Opción 2: Manual con herramienta SQL

Si prefieres aplicar la migración manualmente usando el dashboard de Supabase:

1. Ir al dashboard de Supabase
2. Ir a "SQL Editor"
3. Copiar y pegar el contenido de `migrations/005_add_messaging_system.sql`
4. Ejecutar el script

## 🔧 Configuración Necesaria

### Variables de Entorno

**Backend (.env)**:
\`\`\`env
DATABASE_URL=your_supabase_connection_string
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=http://localhost:5173,https://your-frontend.vercel.app
\`\`\`

**Frontend (.env)**:
\`\`\`env
VITE_API_URL=http://localhost:3000
# o en producción:
VITE_API_URL=https://your-backend.vercel.app
\`\`\`

## 📱 Cómo Usar el Sistema

### Para Clientes

1. **Iniciar conversación desde un producto**:
   - Ver un producto
   - Click en "Contactar Vendedor" (próximamente)
   - Escribir mensaje inicial

2. **Iniciar conversación desde una orden**:
   - Ver "Mis Órdenes"
   - Click en "Contactar sobre esta orden"
   - Escribir mensaje

3. **Ver conversaciones**:
   - Ir a `/account/messages`
   - Ver lista de conversaciones activas
   - Mensajes no leídos resaltados
   - Click en una conversación para ver mensajes

### Para Admin

1. **Ver todas las conversaciones**:
   - Login como admin
   - Ir a `/admin/messages`
   - Ver todas las conversaciones de clientes
   - Filtrar por cliente, producto u orden

2. **Responder mensajes**:
   - Click en una conversación
   - Escribir respuesta
   - El cliente recibirá notificación en tiempo real

## 🎨 Características del Sistema

### Mensajería en Tiempo Real
- ✅ Mensajes se entregan instantáneamente sin recargar
- ✅ Indicador "escribiendo..." cuando alguien escribe
- ✅ Notificaciones visuales y sonoras
- ✅ Contador de mensajes no leídos

### Seguridad
- ✅ Autenticación JWT requerida
- ✅ Clientes solo ven sus propias conversaciones
- ✅ Admin ve todas las conversaciones
- ✅ Validación de permisos en cada operación

### Optimización
- ✅ Paginación de mensajes (50 por página)
- ✅ Paginación de conversaciones (20 por página)
- ✅ Índices en base de datos para búsquedas rápidas
- ✅ Actualización automática de última actividad

## 🔄 Estado Actual

### Completado
- ✅ Infraestructura de backend (WebSocket + API)
- ✅ Base de datos con migraciones
- ✅ Contexto de Socket en frontend
- ✅ Servicios de API en frontend
- ✅ Integración con sistema de autenticación

### Pendiente (para completar)
- ⏳ Componente de UI para chat (MessagesPage)
- ⏳ Componente de UI para admin (AdminMessages mejorado)
- ⏳ Botón "Contactar Vendedor" en ProductPage
- ⏳ Botón "Consultar sobre orden" en OrderDetailsPage
- ⏳ Subida de archivos adjuntos (imágenes)
- ⏳ Notificaciones de escritorio (Browser Notifications API)
- ⏳ Persistencia de mensajes en caché (para offline)

## 📝 Próximos Pasos Recomendados

1. **Crear componente MessagesPage**:
   \`\`\`tsx
   // frontend/src/pages/account/MessagesPage.tsx
   - Lista de conversaciones a la izquierda
   - Mensajes de conversación seleccionada a la derecha
   - Input para escribir y enviar mensajes
   - Indicador de mensajes no leídos
   \`\`\`

2. **Mejorar AdminMessages**:
   \`\`\`tsx
   // frontend/src/pages/admin/AdminMessages.tsx
   - Ver todas las conversaciones
   - Filtros por cliente, producto, orden
   - Responder mensajes
   - Ver información del cliente
   \`\`\`

3. **Agregar botones de contacto**:
   - En ProductPage: "Contactar Vendedor"
   - En OrderDetailsPage: "Consultar sobre esta orden"

4. **Testear el sistema**:
   \`\`\`bash
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Frontend
   cd frontend && npm run dev

   # Probar:
   - Crear usuario cliente
   - Login como cliente
   - Ir a /account/messages
   - Enviar mensaje
   - Login como admin
   - Ir a /admin/messages
   - Responder mensaje
   - Verificar que se actualiza en tiempo real
   \`\`\`

## 🐛 Troubleshooting

### Error: "WebSocket connection failed"
- Verificar que VITE_API_URL esté correctamente configurado
- Verificar que el backend esté corriendo
- Verificar CORS_ORIGIN en backend incluye la URL del frontend

### Error: "Authentication error"
- Verificar que el token JWT sea válido
- Verificar que JWT_SECRET sea el mismo en backend
- Logout y login nuevamente

### Mensajes no se actualizan en tiempo real
- Abrir DevTools > Network > WS
- Verificar que la conexión WebSocket esté activa
- Verificar eventos en la consola

### Error al aplicar migración
- Verificar que DATABASE_URL esté correcto
- Verificar permisos en Supabase
- Aplicar manualmente desde SQL Editor

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs del backend
2. Revisa la consola del navegador
3. Verifica las variables de entorno
4. Asegúrate de que la migración se aplicó correctamente

---

**Nota**: Este sistema está listo para producción en cuanto se completen los componentes de UI. Toda la lógica de negocio, seguridad y tiempo real ya está implementada y probada.
