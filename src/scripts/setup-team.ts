import { query, pool } from '../config/database.js';

async function setupTeam() {
  try {
    console.log('Configurando equipo de MELO SPORTT...\n');

    // Obtener argumentos de linea de comandos
    const args = process.argv.slice(2);
    let walmerEmail = '';
    let fuyiEmail = '';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--walmer' && args[i + 1]) {
        walmerEmail = args[i + 1];
      }
      if (args[i] === '--fuyi' && args[i + 1]) {
        fuyiEmail = args[i + 1];
      }
    }

    // 1. Buscar usuario Walmer (propietario)
    let walmerResult;
    if (walmerEmail) {
      walmerResult = await query(
        `SELECT id, email, full_name, role FROM users WHERE email = $1 LIMIT 1`,
        [walmerEmail]
      );
    } else {
      // Buscar por patrones comunes
      walmerResult = await query(
        `SELECT id, email, full_name, role FROM users
         WHERE email ILIKE '%walmer%'
         OR full_name ILIKE '%walmer%'
         OR email ILIKE '%melo%'
         OR full_name ILIKE '%melo%'
         LIMIT 1`
      );
    }

    // 2. Buscar usuario Fuyi/Lee (developer)
    let fuyiResult;
    if (fuyiEmail) {
      fuyiResult = await query(
        `SELECT id, email, full_name, role FROM users WHERE email = $1 LIMIT 1`,
        [fuyiEmail]
      );
    } else {
      // Buscar por patrones comunes
      fuyiResult = await query(
        `SELECT id, email, full_name, role FROM users
         WHERE email ILIKE '%fuyi%'
         OR full_name ILIKE '%fuyi%'
         OR email ILIKE '%lee%'
         OR full_name ILIKE '%lee%'
         LIMIT 1`
      );
    }

    // Listar todos los usuarios si no se encuentran
    if (walmerResult.rows.length === 0 || fuyiResult.rows.length === 0) {
      console.log('\n📋 Usuarios disponibles en el sistema:');
      const allUsers = await query('SELECT id, email, full_name, role FROM users ORDER BY created_at DESC LIMIT 20');
      allUsers.rows.forEach((u: any, i: number) => {
        console.log(`   ${i + 1}. ${u.full_name || 'Sin nombre'} (${u.email}) - Rol: ${u.role}`);
      });
      console.log('\n💡 Puedes especificar los emails exactos asi:');
      console.log('   npm run setup:team -- --walmer walmer@email.com --fuyi fuyi@email.com\n');
    }

    // Configurar Walmer
    if (walmerResult.rows.length === 0) {
      console.log('⚠️  No se encontro usuario Walmer. Asegurate de que tenga una cuenta.');
    } else {
      const walmer = walmerResult.rows[0];
      console.log(`✅ Usuario Walmer encontrado: ${walmer.full_name} (${walmer.email})`);

      // Actualizar rol a super_admin (esto le da acceso al panel admin)
      await query(
        `UPDATE users SET role = 'super_admin' WHERE id = $1`,
        [walmer.id]
      );
      console.log('   -> Rol actualizado a: super_admin (Propietario)');

      // Crear o actualizar team_member
      await query(
        `INSERT INTO team_members (
          user_id, position, commission_percentage,
          can_manage_products, can_manage_orders, can_view_analytics,
          can_manage_customers, can_manage_settings, can_manage_team, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id) DO UPDATE SET
          position = EXCLUDED.position,
          can_manage_products = EXCLUDED.can_manage_products,
          can_manage_orders = EXCLUDED.can_manage_orders,
          can_view_analytics = EXCLUDED.can_view_analytics,
          can_manage_customers = EXCLUDED.can_manage_customers,
          can_manage_settings = EXCLUDED.can_manage_settings,
          can_manage_team = EXCLUDED.can_manage_team`,
        [
          walmer.id,
          'owner',
          0, // El owner no tiene comision, recibe todo
          true,
          true,
          true,
          true,
          true,
          true,
          'Propietario de MELO SPORTT'
        ]
      );
      console.log('   -> Configurado como Owner del equipo\n');
    }

    // Configurar Fuyi
    if (fuyiResult.rows.length === 0) {
      console.log('⚠️  No se encontro usuario Fuyi/Lee. Asegurate de que tenga una cuenta.');
    } else {
      const fuyi = fuyiResult.rows[0];
      console.log(`✅ Usuario Fuyi encontrado: ${fuyi.full_name} (${fuyi.email})`);

      // Actualizar rol a developer
      await query(
        `UPDATE users SET role = 'developer' WHERE id = $1`,
        [fuyi.id]
      );
      console.log('   -> Rol actualizado a: developer');

      // Crear o actualizar team_member
      await query(
        `INSERT INTO team_members (
          user_id, position, commission_percentage,
          can_manage_products, can_manage_orders, can_view_analytics,
          can_manage_customers, can_manage_settings, can_manage_team, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (user_id) DO UPDATE SET
          position = EXCLUDED.position,
          commission_percentage = EXCLUDED.commission_percentage,
          can_manage_products = EXCLUDED.can_manage_products,
          can_manage_orders = EXCLUDED.can_manage_orders,
          can_view_analytics = EXCLUDED.can_view_analytics,
          can_manage_customers = EXCLUDED.can_manage_customers,
          can_manage_settings = EXCLUDED.can_manage_settings,
          can_manage_team = EXCLUDED.can_manage_team`,
        [
          fuyi.id,
          'developer',
          12, // 12% de comision
          false, // No puede gestionar productos
          false, // No puede gestionar pedidos
          true,  // Puede ver analytics (para ver sus comisiones)
          false, // No puede gestionar clientes
          false, // No puede gestionar configuracion
          false, // No puede gestionar equipo
          'Desarrollador del proyecto - 12% de comision por ventas'
        ]
      );
      console.log('   -> Configurado como Developer con 12% de comision\n');
    }

    console.log('✅ Configuracion del equipo completada!');
    console.log('\nPermisos:');
    console.log('  Walmer (Owner/super_admin): Control total de la tienda');
    console.log('    - Puede ver/crear/editar/eliminar productos');
    console.log('    - Puede gestionar ordenes');
    console.log('    - Puede ver analytics');
    console.log('    - Puede gestionar clientes');
    console.log('    - Puede gestionar configuracion');
    console.log('    - Puede gestionar equipo y pagar comisiones');
    console.log('');
    console.log('  Fuyi (Developer): Ver analytics y comisiones (12%)');
    console.log('    - Puede ver sus comisiones en /account/my-commissions');
    console.log('    - Recibe 12% de cada venta completada');

  } catch (error: any) {
    console.error('❌ Error configurando equipo:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupTeam();
