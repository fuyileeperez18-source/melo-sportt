import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, pool } from '../config/database.js';

/**
 * Script para crear las cuentas de administrador
 * - Fuyi (super_admin): Programador con acceso total y comisiones del 12%
 * - Walmer (admin): Dueño del local, puede gestionar productos y pedidos
 * - Admin Test (admin): Usuario de prueba para verificar panel admin
 */

async function seedAdmins() {
  console.log('🌱 Iniciando seed de administradores...\n');

  const admins = [
    {
      email: 'fuyi@melosportt.com',
      password: 'Fuyi123!*',
      fullName: 'Fuyi Desarrollador',
      role: 'super_admin',
      description: 'Programador - Acceso total, comisión 12% por venta',
    },
    {
      email: 'walmer@melosportt.com',
      password: 'Walmer123!*',
      fullName: 'Walmer Admin',
      role: 'admin',
      description: 'Dueño del local - Gestión de productos y pedidos',
    },
    {
      email: 'admin@melosportt.com',
      password: 'Admin123!*',
      fullName: 'Admin Test',
      role: 'admin',
      description: 'Usuario admin de prueba - Panel completo',
    },
  ];

  for (const admin of admins) {
    try {
      // Verificar si ya existe
      const existing = await query('SELECT id, email FROM users WHERE email = $1', [admin.email]);

      if (existing.rows.length > 0) {
        console.log(`⚠️  Usuario ${admin.email} ya existe, actualizando...`);

        // Actualizar contraseña y rol
        const hashedPassword = await bcrypt.hash(admin.password, 12);
        await query(
          'UPDATE users SET password_hash = $1, role = $2, full_name = $3, updated_at = NOW() WHERE email = $4',
          [hashedPassword, admin.role, admin.fullName, admin.email]
        );

        console.log(`✅ Usuario ${admin.email} actualizado como ${admin.role}`);
      } else {
        // Crear nuevo usuario
        const userId = uuidv4();
        const hashedPassword = await bcrypt.hash(admin.password, 12);

        await query(
          `INSERT INTO users (id, email, full_name, password_hash, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [userId, admin.email, admin.fullName, hashedPassword, admin.role]
        );

        console.log(`✅ Usuario creado: ${admin.email}`);
        console.log(`   Rol: ${admin.role}`);
        console.log(`   ${admin.description}\n`);
      }
    } catch (error) {
      console.error(`❌ Error con ${admin.email}:`, error);
    }
  }

  // Configurar miembros del equipo para comisiones
  console.log('💼 Configurando miembros del equipo para comisiones...\n');

  const teamMembers = [
    {
      email: 'fuyi@melosportt.com',
      position: 'developer',
      commission_percentage: 12.00, // 12% commission
      permissions: {
        can_manage_products: true,
        can_manage_orders: true,
        can_view_analytics: true,
        can_manage_customers: true,
        can_manage_settings: true,
        can_manage_team: true,
      }
    },
    {
      email: 'walmer@melosportt.com',
      position: 'owner',
      commission_percentage: 0.00, // Walmer doesn't get commission, he owns the store
      permissions: {
        can_manage_products: true,
        can_manage_orders: true,
        can_view_analytics: true,
        can_manage_customers: true,
        can_manage_settings: false,
        can_manage_team: false,
      }
    }
  ];

  for (const member of teamMembers) {
    try {
      // Obtener el user_id
      const userResult = await query('SELECT id FROM users WHERE email = $1', [member.email]);

      if (userResult.rows.length === 0) {
        console.log(`⚠️  Usuario ${member.email} no encontrado, saltando configuración de equipo...`);
        continue;
      }

      const userId = userResult.rows[0].id;

      // Verificar si ya existe como miembro del equipo
      const existingTeamMember = await query('SELECT id FROM team_members WHERE user_id = $1', [userId]);

      if (existingTeamMember.rows.length > 0) {
        // Actualizar
        await query(`
          UPDATE team_members SET
            position = $1,
            commission_percentage = $2,
            can_manage_products = $3,
            can_manage_orders = $4,
            can_view_analytics = $5,
            can_manage_customers = $6,
            can_manage_settings = $7,
            can_manage_team = $8,
            updated_at = NOW()
          WHERE user_id = $9
        `, [
          member.position,
          member.commission_percentage,
          member.permissions.can_manage_products,
          member.permissions.can_manage_orders,
          member.permissions.can_view_analytics,
          member.permissions.can_manage_customers,
          member.permissions.can_manage_settings,
          member.permissions.can_manage_team,
          userId
        ]);

        console.log(`✅ Miembro del equipo actualizado: ${member.email}`);
        console.log(`   Posición: ${member.position}`);
        console.log(`   Comisión: ${member.commission_percentage}%`);
      } else {
        // Crear nuevo miembro del equipo
        const teamMemberId = uuidv4();

        await query(`
          INSERT INTO team_members (
            id, user_id, position, commission_percentage,
            can_manage_products, can_manage_orders, can_view_analytics,
            can_manage_customers, can_manage_settings, can_manage_team,
            joined_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW())
        `, [
          teamMemberId,
          userId,
          member.position,
          member.commission_percentage,
          member.permissions.can_manage_products,
          member.permissions.can_manage_orders,
          member.permissions.can_view_analytics,
          member.permissions.can_manage_customers,
          member.permissions.can_manage_settings,
          member.permissions.can_manage_team
        ]);

        console.log(`✅ Miembro del equipo creado: ${member.email}`);
        console.log(`   Posición: ${member.position}`);
        console.log(`   Comisión: ${member.commission_percentage}%`);
      }

      console.log('');
    } catch (error) {
      console.error(`❌ Error configurando miembro del equipo ${member.email}:`, error);
    }
  }

  console.log('\n📋 Resumen de roles:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUPER_ADMIN (Fuyi):');
  console.log('  • Email: fuyi@melosportt.com');
  console.log('  • Password: Fuyi123!*');
  console.log('  • Acceso total al sistema');
  console.log('  • Ver todas las ventas y comisiones (12%)');
  console.log('  • Gestionar usuarios y administradores');
  console.log('  • Configuración del sistema');
  console.log('  • Analytics y reportes completos');
  console.log('');
  console.log('ADMIN (Walmer):');
  console.log('  • Email: walmer@melosportt.com');
  console.log('  • Password: Walmer123!*');
  console.log('  • Gestionar productos (crear, editar, eliminar)');
  console.log('  • Ver y gestionar pedidos');
  console.log('  • Gestionar inventario');
  console.log('  • Ver analytics básicos de ventas');
  console.log('');
  console.log('ADMIN (Test User):');
  console.log('  • Email: admin@melosportt.com');
  console.log('  • Password: Admin123!*');
  console.log('  • Usuario de prueba para verificar panel admin');
  console.log('  • Mismos permisos que Walmer');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await pool.end();
  console.log('✨ Seed completado!');
}

seedAdmins().catch(console.error);