# Configuración de Wompi para Melo Sportt

## URLs a Configurar en Wompi

### 1. Webhook (Notificaciones Automáticas)
**URL**: `https://melo-sportt.vercel.app/api/orders/wompi/webhook`
- Esta URL ya está implementada correctamente
- Wompi envía notificaciones automáticas aquí cuando cambia el estado de una transacción
- No requiere autenticación (usa la firma `X-Event-Checksum`)

### 2. URL de Eventos (Redirección después de pago)
**URL**: `https://melo-sportt.vercel.app/checkout/wompi/callback`
- Esta página muestra el estado del pago al cliente
- Wompi envía al usuario aquí después de completar/cancelar el pago
- La página muestra: estado de pago, número de pedido, próximos pasos

### 3. URL de Callback (Opcional)
**URL**: `https://melo-sportt.vercel.app/checkout/wompi/callback` o puedes dejarla vacía
- Generalmente se usa la misma URL que "Eventos"
- Solo necesaria si usas un endpoint diferente

> **IMPORTANTE**: Usa exactamente esta URL. Wompi la requiere para redirigir a los usuarios.

## Variables de Entorno Requeridas

### En Vercel (Entorno de Producción)
```bash
# Webhook Secret - OBLIGATORIO
WOMPI_EVENTS_SECRET=tu_secreto_de_eventos_aqui

# Credenciales de Wompi - OBLIGATORIO
WOMPI_PUBLIC_KEY=pub_test_tu_clave_o_prod
WOMPI_PRIVATE_KEY=prv_test_tu_clave_o_prod

# Database y otros secrets (ya deberías tenerlos)
DATABASE_URL=tu_database_url
JWT_SECRET=tu_jwt_secret
```

### En Render (o donde tengas tu backend)
```bash
# Credenciales de Wompi - OBLIGATORIO
WOMPI_PUBLIC_KEY=pub_test_tu_clave_o_prod
WOMPI_PRIVATE_KEY=prv_test_tu_clave_o_prod

# Database y otros secrets
DATABASE_URL=tu_database_url
JWT_SECRET=tu_jwt_secret
```

## Cómo Obtener las Credenciales de Wompi

1. Ve a tu Dashboard de Wompi: https://comercios.wompi.co
2. Ve a "Desarrollo" > "Programadores"
3. **Public Key**: Usa `pub_test_...` para pruebas o `pub_prod_...` para producción
4. **Private Key**: Usa `prv_test_...` para pruebas o `prv_prod_...` para producción
5. **Event Secret**: El "Secreto de Eventos" (diferente de las keys). Es el que usamos para validar los webhooks.

## Cómo Configurar en Wompi

1. Ve a "Desarrollo" > "Programadores"
2. En "Webhooks", pega: `https://melo-sportt.vercel.app/api/orders/wompi/webhook`
3. En "URL de Eventos", pega: `https://melo-sportt.vercel.app/wompi-callback`
4. En "URL de Callback", puedes poner la misma URL o dejarla vacía
5. Guarda los cambios

## Cómo Probar

1. **Webhook Test**: Usa el "Ping" o "Test" en el dashboard de Wompi para enviar un webhook de prueba
2. **Flujo Completo**: Realiza un pago de prueba
   - Deberías ver la página de carga de Wompi
   - Después, redirige a `/wompi-callback`
   - Verifica el estado del pago
   - Wompi envía el webhook automáticamente

## URLs Utiles en tu Aplicación

- `/wompi-callback` - Página de estado de pago
- `/checkout/success` - Página de éxito después de confirmar
- `/checkout/failure` - Página de error de pago
- `/api/wompi/webhook` - Webhook (Express backend - DEPRECATED)
- `/api/orders/wompi/webhook` - Webhook (Vercel - ACTIVO)

## Notas Importantes

- El webhook debe responder **200 OK** rápidamente (ya implementado)
- Wompi reintenta si no recibe 200 OK
- El Event Secret debe ser exactamente igual en tu `.env` y en Wompi
- Las URLs deben ser HTTPS en producción
- Usa la public key de prueba mientras desarrollas (`pub_test_`)
