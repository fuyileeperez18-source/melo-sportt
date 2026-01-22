import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import type { User, Address, TeamMember, Commission, CommissionSummary, UserNotification, PublicUser } from '../types/index.js';

interface UserFilters {
  role?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

const USER_SELECT_FIELDS = `
  u.id, u.email, u.full_name, u.phone, u.avatar_url, u.role,
  u.bio, u.birth_date, u.document_type, u.document_number,
  u.preferred_size, u.preferred_shoe_size, u.gender,
  u.instagram_handle, u.is_active, u.last_login, u.preferences,
  u.created_at, u.updated_at
`;

export const userService = {
  async getProfile(userId: string): Promise<PublicUser & { addresses: Address[]; team_member?: TeamMember }> {
    const result = await query(
      `SELECT ${USER_SELECT_FIELDS},
        COALESCE(
          (SELECT json_agg(ua) FROM user_addresses ua WHERE ua.user_id = u.id), '[]'
        ) as addresses,
        (SELECT row_to_json(tm) FROM team_members tm WHERE tm.user_id = u.id) as team_member
       FROM users u
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    // Update last_login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);

    return result.rows[0] as PublicUser & { addresses: Address[]; team_member?: TeamMember };
  },

  async updateProfile(userId: string, updates: Partial<User>): Promise<PublicUser> {
    const allowedFields = [
      'full_name', 'phone', 'avatar_url', 'bio', 'birth_date',
      'document_type', 'document_number', 'preferred_size',
      'preferred_shoe_size', 'gender', 'instagram_handle', 'preferences'
    ];
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'preferences' && typeof value === 'object') {
          fields.push(`${key} = $${paramIndex}::jsonb`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    values.push(userId);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING ${USER_SELECT_FIELDS.replace(/u\./g, '')}`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    return result.rows[0] as PublicUser;
  },

  async updateUserRole(userId: string, role: string): Promise<PublicUser> {
    const result = await query(
      `UPDATE users SET role = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING ${USER_SELECT_FIELDS.replace(/u\./g, '')}`,
      [role, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    return result.rows[0] as PublicUser;
  },

  async getAll(filters?: UserFilters): Promise<{ data: PublicUser[]; count: number }> {
    let sql = `
      SELECT id, email, full_name, phone, avatar_url, role, created_at, updated_at
      FROM users
      WHERE 1=1
    `;

    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters?.role) {
      sql += ` AND role = $${paramIndex}`;
      params.push(filters.role);
      paramIndex++;
    }

    if (filters?.search) {
      sql += ` AND (full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    // Get count
    const countSql = sql.replace(
      'SELECT id, email, full_name, phone, avatar_url, role, created_at, updated_at',
      'SELECT COUNT(*)'
    );
    const countResult = await query(countSql, params);
    const count = parseInt(countResult.rows[0].count);

    sql += ' ORDER BY created_at DESC';

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
    return { data: result.rows as PublicUser[], count };
  },

  // Address management
  async addAddress(userId: string, address: Partial<Address>): Promise<Address> {
    // If this is the first address or marked as default, update other addresses
    if (address.is_default) {
      await query('UPDATE user_addresses SET is_default = false WHERE user_id = $1', [userId]);
    }

    const result = await query(
      `INSERT INTO user_addresses (user_id, label, street, city, state, postal_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        userId,
        address.label,
        address.street,
        address.city,
        address.state,
        address.postal_code,
        address.country || 'US',
        address.is_default || false,
      ]
    );

    return result.rows[0] as Address;
  },

  async updateAddress(addressId: string, userId: string, updates: Partial<Address>): Promise<Address> {
    if (updates.is_default) {
      await query('UPDATE user_addresses SET is_default = false WHERE user_id = $1', [userId]);
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const allowedFields = ['label', 'street', 'city', 'state', 'postal_code', 'country', 'is_default'];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    values.push(addressId, userId);
    const result = await query(
      `UPDATE user_addresses SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Address not found', 404);
    }

    return result.rows[0] as Address;
  },

  async deleteAddress(addressId: string, userId: string): Promise<void> {
    const result = await query(
      'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Address not found', 404);
    }
  },

  // ==================== TEAM MEMBERS ====================

  async getTeamMember(userId: string): Promise<TeamMember | null> {
    const result = await query(
      `SELECT tm.*,
        json_build_object(
          'id', u.id,
          'email', u.email,
          'full_name', u.full_name,
          'avatar_url', u.avatar_url,
          'role', u.role
        ) as user
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  },

  async getAllTeamMembers(): Promise<TeamMember[]> {
    const result = await query(
      `SELECT tm.*,
        json_build_object(
          'id', u.id,
          'email', u.email,
          'full_name', u.full_name,
          'avatar_url', u.avatar_url,
          'role', u.role
        ) as user
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       ORDER BY tm.joined_at ASC`
    );
    return result.rows as TeamMember[];
  },

  async createTeamMember(data: Partial<TeamMember>): Promise<TeamMember> {
    const result = await query(
      `INSERT INTO team_members (
        user_id, position, commission_percentage,
        can_manage_products, can_manage_orders, can_view_analytics,
        can_manage_customers, can_manage_settings, can_manage_team, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.user_id,
        data.position,
        data.commission_percentage || 0,
        data.can_manage_products || false,
        data.can_manage_orders || false,
        data.can_view_analytics || false,
        data.can_manage_customers || false,
        data.can_manage_settings || false,
        data.can_manage_team || false,
        data.notes
      ]
    );
    return result.rows[0] as TeamMember;
  },

  async updateTeamMember(userId: string, updates: Partial<TeamMember>): Promise<TeamMember> {
    const allowedFields = [
      'position', 'commission_percentage',
      'can_manage_products', 'can_manage_orders', 'can_view_analytics',
      'can_manage_customers', 'can_manage_settings', 'can_manage_team', 'notes'
    ];
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    values.push(userId);
    const result = await query(
      `UPDATE team_members SET ${fields.join(', ')}, updated_at = NOW()
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Team member not found', 404);
    }

    return result.rows[0] as TeamMember;
  },

  // ==================== COMMISSIONS ====================

  async getCommissions(teamMemberId: string, filters?: { status?: string; limit?: number; offset?: number }): Promise<{ data: Commission[]; count: number }> {
    let sql = `
      SELECT c.*, row_to_json(o) as order
      FROM commissions c
      LEFT JOIN orders o ON o.id = c.order_id
      WHERE c.team_member_id = $1
    `;
    const params: unknown[] = [teamMemberId];
    let paramIndex = 2;

    if (filters?.status) {
      sql += ` AND c.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    // Count query
    const countSql = sql.replace('SELECT c.*, row_to_json(o) as order', 'SELECT COUNT(*)');
    const countResult = await query(countSql, params);
    const count = parseInt(countResult.rows[0].count);

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
    return { data: result.rows as Commission[], count };
  },

  async getCommissionSummary(teamMemberId: string): Promise<CommissionSummary> {
    const result = await query(
      `SELECT
        COALESCE(SUM(commission_amount), 0) as total_earned,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN
          created_at >= date_trunc('month', CURRENT_DATE)
          THEN commission_amount ELSE 0 END), 0) as this_month_earned,
        COALESCE(SUM(CASE WHEN
          created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
          AND created_at < date_trunc('month', CURRENT_DATE)
          THEN commission_amount ELSE 0 END), 0) as last_month_earned,
        COUNT(*) as orders_count
       FROM commissions
       WHERE team_member_id = $1`,
      [teamMemberId]
    );

    return {
      total_earned: parseFloat(result.rows[0].total_earned) || 0,
      total_pending: parseFloat(result.rows[0].total_pending) || 0,
      total_paid: parseFloat(result.rows[0].total_paid) || 0,
      this_month_earned: parseFloat(result.rows[0].this_month_earned) || 0,
      last_month_earned: parseFloat(result.rows[0].last_month_earned) || 0,
      orders_count: parseInt(result.rows[0].orders_count) || 0
    };
  },

  async updateCommissionStatus(commissionId: string, status: string, paidBy?: string): Promise<Commission> {
    const result = await query(
      `UPDATE commissions
       SET status = $1,
           paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, commissionId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Commission not found', 404);
    }

    return result.rows[0] as Commission;
  },

  // ==================== NOTIFICATIONS ====================

  async getNotifications(userId: string, limit = 20): Promise<UserNotification[]> {
    const result = await query(
      `SELECT * FROM user_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows as UserNotification[];
  },

  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    await query(
      'UPDATE user_notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  },

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await query(
      'UPDATE user_notifications SET is_read = true WHERE user_id = $1',
      [userId]
    );
  },

  async createNotification(userId: string, notification: Partial<UserNotification>): Promise<UserNotification> {
    const result = await query(
      `INSERT INTO user_notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, notification.type, notification.title, notification.message, JSON.stringify(notification.data || {})]
    );
    return result.rows[0] as UserNotification;
  },

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await query(
      'SELECT COUNT(*) FROM user_notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return parseInt(result.rows[0].count) || 0;
  },

  // ==================== ANALYTICS FOR OWNER ====================

  async getOwnerDashboardStats(): Promise<{
    total_revenue: number;
    total_orders: number;
    total_customers: number;
    total_products: number;
    pending_commissions: number;
    monthly_revenue: { month: string; revenue: number }[];
  }> {
    const revenueResult = await query(
      `SELECT
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(*) as total_orders
       FROM orders
       WHERE payment_status = 'paid'`
    );

    const customersResult = await query(
      `SELECT COUNT(*) as total_customers FROM users WHERE role = 'customer'`
    );

    const productsResult = await query(
      `SELECT COUNT(*) as total_products FROM products WHERE is_active = true`
    );

    const commissionsResult = await query(
      `SELECT COALESCE(SUM(commission_amount), 0) as pending_commissions
       FROM commissions WHERE status = 'pending'`
    );

    const monthlyResult = await query(
      `SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COALESCE(SUM(total), 0) as revenue
       FROM orders
       WHERE payment_status = 'paid'
         AND created_at >= NOW() - INTERVAL '12 months'
       GROUP BY TO_CHAR(created_at, 'YYYY-MM')
       ORDER BY month DESC`
    );

    return {
      total_revenue: parseFloat(revenueResult.rows[0].total_revenue) || 0,
      total_orders: parseInt(revenueResult.rows[0].total_orders) || 0,
      total_customers: parseInt(customersResult.rows[0].total_customers) || 0,
      total_products: parseInt(productsResult.rows[0].total_products) || 0,
      pending_commissions: parseFloat(commissionsResult.rows[0].pending_commissions) || 0,
      monthly_revenue: monthlyResult.rows.map(r => ({
        month: r.month,
        revenue: parseFloat(r.revenue) || 0
      }))
    };
  },

  // ==================== ADMIN MANAGEMENT ====================

  async getAllAdmins(): Promise<PublicUser[]> {
    const result = await query(
      `SELECT id, email, full_name, phone, avatar_url, role, created_at, updated_at
       FROM users
       WHERE role IN ('admin', 'super_admin')
       ORDER BY
         CASE role
           WHEN 'super_admin' THEN 1
           WHEN 'admin' THEN 2
         END,
         created_at ASC`
    );
    return result.rows as PublicUser[];
  },

  async createAdmin(data: { email: string; password: string; full_name: string }): Promise<PublicUser> {
    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [data.email]);
    if (existingUser.rows.length > 0) {
      throw new AppError('Email already registered', 400);
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const result = await query(
      `INSERT INTO users (id, email, full_name, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, email, full_name, phone, avatar_url, role, created_at, updated_at`,
      [userId, data.email, data.full_name, hashedPassword]
    );

    return result.rows[0] as PublicUser;
  },

  async updateAdmin(adminId: string, updates: { full_name?: string; email?: string; password?: string }): Promise<PublicUser> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.full_name) {
      fields.push(`full_name = $${paramIndex}`);
      values.push(updates.full_name);
      paramIndex++;
    }

    if (updates.email) {
      // Check if email is already in use by another user
      const existing = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [updates.email, adminId]);
      if (existing.rows.length > 0) {
        throw new AppError('Email already in use', 400);
      }
      fields.push(`email = $${paramIndex}`);
      values.push(updates.email);
      paramIndex++;
    }

    if (updates.password) {
      const hashedPassword = await bcrypt.hash(updates.password, 12);
      fields.push(`password_hash = $${paramIndex}`);
      values.push(hashedPassword);
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    values.push(adminId);
    const result = await query(
      `UPDATE users
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND role = 'admin'
       RETURNING id, email, full_name, phone, avatar_url, role, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Admin not found or cannot be updated', 404);
    }

    return result.rows[0] as PublicUser;
  },

  async deleteAdmin(adminId: string): Promise<void> {
    // Check if the admin exists and is not super_admin
    const adminCheck = await query(
      'SELECT role FROM users WHERE id = $1',
      [adminId]
    );

    if (adminCheck.rows.length === 0) {
      throw new AppError('Admin not found', 404);
    }

    if (adminCheck.rows[0].role === 'super_admin') {
      throw new AppError('Cannot delete super admin', 403);
    }

    if (adminCheck.rows[0].role !== 'admin') {
      throw new AppError('User is not an admin', 400);
    }

    const result = await query(
      'DELETE FROM users WHERE id = $1 AND role = \'admin\'',
      [adminId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Failed to delete admin', 500);
    }
  },

  /**
   * Fix admin roles - ensure only Fuyi has super_admin role
   * This is a helper function to correct any role misconfigurations
   */
  async fixAdminRoles(): Promise<void> {
    try {
      console.log('🔧 [USER SERVICE] Fixing admin roles...');

      // First, find all users with super_admin role
      const superAdmins = await query(
        'SELECT id, email, full_name FROM users WHERE role = \'super_admin\''
      );

      console.log(`Found ${superAdmins.rows.length} super admins:`, superAdmins.rows);

      // If there are multiple super admins, keep only Fuyi (assuming Fuyi is the one with fuyi@yuyyg.com)
      if (superAdmins.rows.length > 1) {
        const fuyiUser = superAdmins.rows.find(user => user.email === 'fuyi@yuyyg.com');

        if (fuyiUser) {
          // Convert all other super admins to regular admins
          for (const user of superAdmins.rows) {
            if (user.email !== 'fuyi@yuyyg.com') {
              console.log(`🔄 Converting ${user.email} from super_admin to admin`);
              await query(
                'UPDATE users SET role = \'admin\' WHERE id = $1',
                [user.id]
              );
            }
          }
          console.log('✅ Admin roles fixed successfully');
        } else {
          console.warn('⚠️  Fuyi (fuyi@yuyyg.com) not found among super admins');
        }
      } else if (superAdmins.rows.length === 0) {
        console.warn('⚠️  No super admins found');
      } else {
        console.log('✅ Only one super admin found (Fuyi), roles are correct');
      }
    } catch (error) {
      console.error('❌ [USER SERVICE] Error fixing admin roles:', error);
      throw error;
    }
  }
};