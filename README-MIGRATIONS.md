# 🚀 Migraciones Automáticas - GOOMELOOSKIN

## 📋 Configuración Inicial

### 1. Configurar Variables de Entorno

Copia el archivo de ejemplo y configura tus credenciales de Supabase:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales reales:

```env
DATABASE_URL=postgresql://postgres:[TU-PASSWORD]@db.[TU-PROJECT-REF].supabase.co:5432/postgres
```

### 2. Ejecutar Todas las Migraciones

```bash
# Ejecutar todas las migraciones automáticamente
npm run migrate:all

# O ejecutar setup completo (migraciones + seed)
npm run db:setup
```

### 3. Crear Usuarios Administradores

```bash
npm run seed:admins
```

## 🛠️ Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run migrate:all` | Ejecuta todas las migraciones pendientes |
| `npm run migrate <name>` | Ejecuta una migración específica |
| `npm run db:setup` | Setup completo: migraciones + seed |
| `npm run seed:admins` | Crea/actualiza usuarios admin |

## 🔄 Migraciones Automáticas

### ✅ **Opción Recomendada: Auto-ejecución al Iniciar Servidor**

Las migraciones ahora se ejecutan **automáticamente** cada vez que inicias el servidor:

```bash
# Simplemente inicia tu servidor normalmente
npm run dev
# o
npm run start
```

**Qué sucede automáticamente:**
1. ✅ Se verifican migraciones pendientes
2. ✅ Se ejecutan todas las migraciones nuevas
3. ✅ Se crean usuarios admin si no existen
4. ✅ El servidor inicia normalmente

**Ventajas:**
- 🚀 **Cero intervención manual**
- 🔄 **Siempre actualizado** en desarrollo
- 📦 **Funciona en producción** (Railway, Render, etc.)
- 🛡️ **A prueba de errores** (continúa si ya están aplicadas)

### Opción 2: Deploy Hooks (Railway/Render)

Si usas plataformas que requieren configuración específica:

```bash
# Railway/Render build command
npm run build
# (Las migraciones se ejecutan automáticamente al iniciar)
```

### Opción 3: Manual (Solo si necesitas control total)

```bash
# Ejecutar migraciones manualmente
npm run migrate:all
npm run seed:admins
```

## 📁 Estructura de Migraciones

```
migrations/
├── 000_initial_schema.sql       # Schema inicial
├── 001_add_password_hash.sql    # Campos de autenticación
├── 002_add_product_filters.sql  # Filtros de productos
├── 003_enhanced_user_profiles.sql # Perfiles avanzados
└── 004_add_commission_system.sql # Sistema de comisiones
```

## 🚨 Solución de Problemas

### Error: "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string"

1. Verifica que `.env` existe y tiene `DATABASE_URL` correcta
2. Confirma que las credenciales de Supabase son válidas
3. Asegúrate de que la base de datos esté activa

### Error: "Table already exists"

Las migraciones están diseñadas para ser idempotentes. Si una tabla ya existe, continúa con la siguiente migración.

### Para Resetear Base de Datos

```bash
# ⚠️ PELIGRO: Borra todos los datos
# En Supabase Dashboard > SQL Editor:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO authenticated;
```

## 📊 Usuarios de Prueba

Después de ejecutar `npm run seed:admins`:

- **admin@melosportt.com** / `Admin123!*` (admin) - Para testing
- **walmer@melosportt.com** / `Walmer123!*` (admin) - Dueño
- **fuyi@melosportt.com** / `Fuyi123!*` (super_admin) - Desarrollador

## 🎯 Mejores Prácticas

1. **Siempre ejecuta migraciones antes de commits**
2. **Testea en desarrollo antes de producción**
3. **Mantén backups de la base de datos**
4. **Usa nombres descriptivos para nuevas migraciones**
5. **Documenta cambios importantes en el schema**

## 🔧 Crear Nueva Migración

1. Crea archivo en `migrations/005_new_feature.sql`
2. Usa `IF NOT EXISTS` para evitar errores
3. Incluye `GRANT` permissions si es necesario
4. Testea la migración individualmente
5. Actualiza este README