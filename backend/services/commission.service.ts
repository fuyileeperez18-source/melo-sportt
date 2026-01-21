import { query } from '../config/database.js';
import type { Commission, TeamMember, CommissionSummary, CommissionPayment, User } from '../types/index.js';

/**
 * Servicio de comisiones actualizado para trabajar con las tablas team_members y commissions
 * Sistema de comisiones: Miembros del equipo pueden tener porcentajes configurables (ej: 12% para desarrollador)
 */

export const commissionService = {
  /**
   * Obtiene todos los miembros del equipo
   */
  async getAllTeamMembers(): Promise<TeamMember[]> {
    const result = await query(`
      SELECT
        tm.*,
        u.email,
        u.full_name,
        u.avatar_url,
        u.role,
        u.is_active,
        u.created_at as user_created_at,
        u.updated_at as user_updated_at
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      ORDER BY tm.joined_at DESC
    `);

    return result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      user: {
        id: row.user_id,
        email: row.email,
        full_name: row.full_name,
        avatar_url: row.avatar_url,
        role: row.role,
        is_active: row.is_active,
        created_at: row.user_created_at,
        updated_at: row.user_updated_at,
      } as User,
      position: row.position,
      commission_percentage: parseFloat(row.commission_percentage),
      can_manage_products: row.can_manage_products,
      can_manage_orders: row.can_manage_orders,
      can_view_analytics: row.can_view_analytics,
      can_manage_customers: row.can_manage_customers,
      can_manage_settings: row.can_manage_settings,
      can_manage_team: row.can_manage_team,
      notes: row.notes,
      joined_at: row.joined_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  /**
   * Obtiene un miembro del equipo por ID
   */
  async getTeamMemberById(id: string): Promise<TeamMember | null> {
    const result = await query(`
      SELECT
        tm.*,
        u.email,
        u.full_name,
        u.avatar_url,
        u.role,
        u.is_active,
        u.created_at as user_created_at,
        u.updated_at as user_updated_at
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.id = $1
    `, [id]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      user: {
        id: row.user_id,
        email: row.email,
        full_name: row.full_name,
        avatar_url: row.avatar_url,
        role: row.role,
        is_active: row.is_active,
        created_at: row.user_created_at,
        updated_at: row.user_updated_at,
      } as User,
      position: row.position,
      commission_percentage: parseFloat(row.commission_percentage),
      can_manage_products: row.can_manage_products,
      can_manage_orders: row.can_manage_orders,
      can_view_analytics: row.can_view_analytics,
      can_manage_customers: row.can_manage_customers,
      can_manage_settings: row.can_manage_settings,
      can_manage_team: row.can_manage_team,
      notes: row.notes,
      joined_at: row.joined_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  },

  /**
   * Crea un nuevo miembro del equipo
   */
  async createTeamMember(data: Omit<TeamMember, 'id' | 'user' | 'joined_at' | 'created_at' | 'updated_at'>): Promise<TeamMember> {
    const result = await query(`
      INSERT INTO team_members (
        user_id, position, commission_percentage,
        can_manage_products, can_manage_orders, can_view_analytics,
        can_manage_customers, can_manage_settings, can_manage_team,
        notes, joined_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), NOW())
      RETURNING *
    `, [
      data.user_id,
      data.position,
      data.commission_percentage,
      data.can_manage_products,
      data.can_manage_orders,
      data.can_view_analytics,
      data.can_manage_customers,
      data.can_manage_settings,
      data.can_manage_team,
      data.notes,
    ]);

    return this.getTeamMemberById(result.rows[0].id) as Promise<TeamMember>;
  },

  /**
   * Actualiza un miembro del equipo
   */
  async updateTeamMember(id: string, data: Partial<Omit<TeamMember, 'id' | 'user' | 'joined_at' | 'created_at' | 'updated_at'>>): Promise<TeamMember | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) return this.getTeamMemberById(id);

    values.push(id);
    const sql = `UPDATE team_members SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`;

    await query(sql, values);
    return this.getTeamMemberById(id);
  },

  /**
   * Obtiene todas las comisiones
   */
  async getAllCommissions(filters?: {
    team_member_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Commission[]> {
    let sql = `
      SELECT
        c.*,
        tm.position,
        tm.commission_percentage as team_commission_percentage,
        u.full_name as team_member_name,
        u.email as team_member_email,
        o.order_number,
        o.total as order_total,
        o.status as order_status,
        o.created_at as order_created_at
      FROM commissions c
      JOIN team_members tm ON c.team_member_id = tm.id
      JOIN users u ON tm.user_id = u.id
      LEFT JOIN orders o ON c.order_id = o.id
      WHERE 1=1
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.team_member_id) {
      sql += ` AND c.team_member_id = $${paramIndex}`;
      params.push(filters.team_member_id);
      paramIndex++;
    }

    if (filters?.status) {
      sql += ` AND c.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    sql += ' ORDER BY c.created_at DESC';

    if (filters?.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters?.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    const result = await query(sql, params);

    return result.rows.map(row => ({
      id: row.id,
      team_member_id: row.team_member_id,
      team_member: {
        id: row.team_member_id,
        user_id: row.user_id,
        user: {
          id: row.user_id,
          email: row.team_member_email,
          full_name: row.team_member_name,
          role: 'admin', // Default role for team members
          is_active: true,
          created_at: row.created_at,
          updated_at: row.updated_at,
        } as User,
        position: row.position,
        commission_percentage: parseFloat(row.team_commission_percentage),
        can_manage_products: row.can_manage_products,
        can_manage_orders: row.can_manage_orders,
        can_view_analytics: row.can_view_analytics,
        can_manage_customers: row.can_manage_customers,
        can_manage_settings: row.can_manage_settings,
        can_manage_team: row.can_manage_team,
        notes: row.notes,
        joined_at: row.joined_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      } as TeamMember,
      order_id: row.order_id,
      order: row.order_id ? {
        id: row.order_id,
        order_number: row.order_number,
        user_id: '', // Required by Order type
        subtotal: 0, // Required by Order type
        discount: 0, // Required by Order type
        shipping_cost: 0, // Required by Order type
        tax: 0, // Required by Order type
        total: parseFloat(row.order_total),
        status: row.order_status as any,
        payment_status: 'paid', // Required by Order type
        payment_method: '', // Required by Order type
        shipping_address: {} as any, // Required by Order type
        billing_address: {} as any, // Required by Order type
        created_at: row.order_created_at,
        updated_at: row.order_created_at,
      } : undefined,
      order_total: parseFloat(row.order_total),
      commission_percentage: parseFloat(row.commission_percentage),
      commission_amount: parseFloat(row.commission_amount),
      status: row.status,
      paid_at: row.paid_at,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  },

  /**
   * Obtiene una comisión por ID
   */
  async getCommissionById(id: string): Promise<Commission | null> {
    const commissions = await this.getAllCommissions();
    return commissions.find(c => c.id === id) || null;
  },

  /**
   * Actualiza el estado de una comisión
   */
  async updateCommissionStatus(id: string, status: string, paidBy?: string): Promise<void> {
    const updateData: any = { status };

    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    }

    await query(
      'UPDATE commissions SET status = $1, paid_at = $2, updated_at = NOW() WHERE id = $3',
      [status, updateData.paid_at || null, id]
    );
  },

  /**
   * Obtiene el resumen de comisiones para un miembro del equipo
   */
  async getCommissionSummary(teamMemberId?: string): Promise<CommissionSummary> {
    let sql = `
      SELECT
        COALESCE(SUM(commission_amount), 0) as total_earned,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as total_paid,
        COUNT(*) as orders_count
      FROM commissions
      WHERE 1=1
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (teamMemberId) {
      sql += ` AND team_member_id = $${paramIndex}`;
      params.push(teamMemberId);
      paramIndex++;
    }

    const result = await query(sql, params);
    const row = result.rows[0];

    // Calcular este mes y mes anterior
    const now = new Date();
    const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const lastMonth = now.getMonth() === 0
      ? (now.getFullYear() - 1) + '-12'
      : now.getFullYear() + '-' + String(now.getMonth()).padStart(2, '0');

    let monthlySql = `
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        SUM(commission_amount) as earned
      FROM commissions
      WHERE TO_CHAR(created_at, 'YYYY-MM') IN ($1, $2)
    `;

    const monthlyParams = [thisMonth, lastMonth];
    if (teamMemberId) {
      monthlySql += ' AND team_member_id = $3';
      monthlyParams.push(teamMemberId);
    }

    monthlySql += ' GROUP BY TO_CHAR(created_at, \'YYYY-MM\')';

    const monthlyResult = await query(monthlySql, monthlyParams);
    const monthlyData = monthlyResult.rows.reduce((acc: any, row: any) => {
      acc[row.month] = parseFloat(row.earned) || 0;
      return acc;
    }, {});

    return {
      total_earned: parseFloat(row.total_earned) || 0,
      total_pending: (parseFloat(row.total_earned) || 0) - (parseFloat(row.total_paid) || 0),
      total_paid: parseFloat(row.total_paid) || 0,
      this_month_earned: monthlyData[thisMonth] || 0,
      last_month_earned: monthlyData[lastMonth] || 0,
      orders_count: parseInt(row.orders_count) || 0,
    };
  },

  /**
   * Registra un pago de comisión
   */
  async recordCommissionPayment(data: Omit<CommissionPayment, 'id' | 'created_at'>): Promise<CommissionPayment> {
    const result = await query(`
      INSERT INTO commission_payments (
        team_member_id, amount, payment_method, reference_number, notes, paid_by, paid_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [
      data.team_member_id,
      data.amount,
      data.payment_method,
      data.reference_number,
      data.notes,
      data.paid_by,
    ]);

    const row = result.rows[0];
    const teamMember = await this.getTeamMemberById(data.team_member_id);

    return {
      id: row.id,
      team_member_id: row.team_member_id,
      team_member: teamMember || undefined,
      amount: parseFloat(row.amount),
      payment_method: row.payment_method,
      reference_number: row.reference_number,
      notes: row.notes,
      paid_by: row.paid_by,
      created_at: row.created_at,
    };
  },

  /**
   * Obtiene el dashboard del propietario con estadísticas de comisiones
   */
  async getOwnerDashboardStats() {
    // Obtener estadísticas generales de ventas
    const salesResult = await query(`
      SELECT
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(*) as total_orders,
        COUNT(DISTINCT user_id) as total_customers,
        COUNT(DISTINCT p.id) as total_products
      FROM orders o
      LEFT JOIN products p ON p.is_active = true
      WHERE o.payment_status = 'paid'
    `);

    const salesRow = salesResult.rows[0];

    // Obtener comisiones pendientes
    const commissionsResult = await query(`
      SELECT COALESCE(SUM(commission_amount), 0) as pending_commissions
      FROM commissions
      WHERE status != 'paid'
    `);

    const commissionsRow = commissionsResult.rows[0];

    // Obtener ingresos mensuales
    const monthlyResult = await query(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        SUM(total) as revenue
      FROM orders
      WHERE payment_status = 'paid'
        AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `);

    const monthlyRevenue = monthlyResult.rows.map(row => ({
      month: row.month,
      revenue: parseFloat(row.revenue) || 0,
    }));

    return {
      total_revenue: parseFloat(salesRow.total_revenue) || 0,
      total_orders: parseInt(salesRow.total_orders) || 0,
      total_customers: parseInt(salesRow.total_customers) || 0,
      total_products: parseInt(salesRow.total_products) || 0,
      pending_commissions: parseFloat(commissionsRow.pending_commissions) || 0,
      monthly_revenue: monthlyRevenue,
    };
  },
};