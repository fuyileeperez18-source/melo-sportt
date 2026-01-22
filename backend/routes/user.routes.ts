import { Router, Request, Response, NextFunction } from 'express';
import type { ParsedQs } from 'qs';
import { z } from 'zod';
import { userService } from '../services/user.service.js';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

const getStringParam = (param: string | string[] | undefined | ParsedQs | (string | ParsedQs)[]): string | undefined => {
    if (Array.isArray(param)) {
        return param[0] as string | undefined;
    }
    if (param && typeof param === 'object') {
        // Handle ParsedQs object - convert to string
        return String(param);
    }
    return param as string | undefined;
}

// Profile update schema with all new fields
const profileUpdateSchema = z.object({
  full_name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  birth_date: z.string().optional().nullable(),
  document_type: z.enum(['cc', 'ce', 'passport', 'nit']).optional().nullable(),
  document_number: z.string().optional().nullable(),
  preferred_size: z.string().optional().nullable(),
  preferred_shoe_size: z.string().optional().nullable(),
  gender: z.enum(['masculino', 'femenino', 'otro', 'prefiero_no_decir']).optional().nullable(),
  instagram_handle: z.string().optional().nullable(),
  preferences: z.object({
    notifications_email: z.boolean().optional(),
    notifications_sms: z.boolean().optional(),
    notifications_push: z.boolean().optional(),
    newsletter: z.boolean().optional(),
    language: z.string().optional(),
    currency: z.string().optional(),
  }).optional(),
});

// Get current user profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await userService.getProfile(req.user!.id);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

// Debug endpoint to check user role and permissions
router.get('/debug', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await userService.getProfile(req.user!.id);
    const teamMember = await userService.getTeamMember(req.user!.id);

    res.json({
      success: true,
      data: {
        user_id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
        full_profile: profile,
        team_member: teamMember,
        is_admin: req.user!.role === 'admin' || req.user!.role === 'super_admin',
        is_super_admin: req.user!.role === 'super_admin',
        has_team_member_record: !!teamMember,
        commission_percentage: teamMember?.commission_percentage || 0,
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update current user profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = profileUpdateSchema.parse(req.body);
    // Convert null values to undefined for the service
    const cleanData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value === null ? undefined : value])
    );
    const profile = await userService.updateProfile(req.user!.id, cleanData);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

// ==================== ADDRESSES ====================

const addressSchema = z.object({
  label: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postal_code: z.string().min(1),
  country: z.string().default('US'),
  is_default: z.boolean().default(false),
});

// Add address
router.post('/addresses', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = addressSchema.parse(req.body);
    const address = await userService.addAddress(req.user!.id, data);
    res.status(201).json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
});

// Update address
router.put('/addresses/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Address ID is required' });
    const data = addressSchema.partial().parse(req.body);
    const address = await userService.updateAddress(id, req.user!.id, data);
    res.json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
});

// Delete address
router.delete('/addresses/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Address ID is required' });
    await userService.deleteAddress(id, req.user!.id);
    res.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    next(error);
  }
});

// ==================== ADMIN ROUTES ====================

// Get all users (Admin)
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      role: getStringParam(req.query.role),
      search: getStringParam(req.query.search),
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };
    const result = await userService.getAll(filters);
    res.json({ success: true, data: result.data, count: result.count });
  } catch (error) {
    next(error);
  }
});

// Get user by ID (Admin)
router.get('/:id', authenticate, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'User ID is required' });
    const profile = await userService.getProfile(id);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

// Update user role (Super Admin only)
router.put('/:id/role', authenticate, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'User ID is required' });

    const data = z.object({
      role: z.enum(['customer', 'admin', 'super_admin']),
    }).parse(req.body);

    const updatedUser = await userService.updateUserRole(id, data.role);
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
});

// ==================== TEAM MEMBER ROUTES ====================

// Get current user's team member info (if they are a team member)
router.get('/team/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teamMember = await userService.getTeamMember(req.user!.id);
    res.json({ success: true, data: teamMember });
  } catch (error) {
    next(error);
  }
});

// Get all team members (Admin only)
router.get('/team/all', authenticate, requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const teamMembers = await userService.getAllTeamMembers();
    res.json({ success: true, data: teamMembers });
  } catch (error) {
    next(error);
  }
});

// Create team member (Super Admin only - owner can add team members)
router.post('/team', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = z.object({
      user_id: z.string().uuid(),
      position: z.string().min(1),
      commission_percentage: z.number().min(0).max(100).default(0),
      can_manage_products: z.boolean().default(false),
      can_manage_orders: z.boolean().default(false),
      can_view_analytics: z.boolean().default(false),
      can_manage_customers: z.boolean().default(false),
      can_manage_settings: z.boolean().default(false),
      can_manage_team: z.boolean().default(false),
      notes: z.string().optional(),
    }).parse(req.body);

    const teamMember = await userService.createTeamMember(data);
    res.status(201).json({ success: true, data: teamMember });
  } catch (error) {
    next(error);
  }
});

// Update team member (Super Admin only)
router.put('/team/:userId', authenticate, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getStringParam(req.params.userId);
    if (!userId) return res.status(400).json({ success: false, error: 'User ID is required' });

    const data = z.object({
      position: z.string().min(1).optional(),
      commission_percentage: z.number().min(0).max(100).optional(),
      can_manage_products: z.boolean().optional(),
      can_manage_orders: z.boolean().optional(),
      can_view_analytics: z.boolean().optional(),
      can_manage_customers: z.boolean().optional(),
      can_manage_settings: z.boolean().optional(),
      can_manage_team: z.boolean().optional(),
      notes: z.string().optional(),
    }).parse(req.body);

    const teamMember = await userService.updateTeamMember(userId, data);
    res.json({ success: true, data: teamMember });
  } catch (error) {
    next(error);
  }
});

// ==================== COMMISSION ROUTES ====================

// Get my commissions (for team members with commission)
router.get('/commissions/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teamMember = await userService.getTeamMember(req.user!.id);
    if (!teamMember) {
      return res.status(403).json({ success: false, error: 'No eres miembro del equipo' });
    }

    const filters = {
      status: getStringParam(req.query.status),
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await userService.getCommissions(teamMember.id, filters);
    res.json({ success: true, data: result.data, count: result.count });
  } catch (error) {
    next(error);
  }
});

// Get my commission summary
router.get('/commissions/summary', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teamMember = await userService.getTeamMember(req.user!.id);
    if (!teamMember) {
      return res.status(403).json({ success: false, error: 'No eres miembro del equipo' });
    }

    const summary = await userService.getCommissionSummary(teamMember.id);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
});

// Update commission status (Super Admin only - owner pays commissions)
router.put('/commissions/:id/status', authenticate, requireSuperAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Commission ID is required' });

    const { status } = z.object({
      status: z.enum(['pending', 'approved', 'paid', 'cancelled']),
    }).parse(req.body);

    const commission = await userService.updateCommissionStatus(id, status, req.user!.id);
    res.json({ success: true, data: commission });
  } catch (error) {
    next(error);
  }
});

// ==================== NOTIFICATION ROUTES ====================

// Get my notifications
router.get('/notifications', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const notifications = await userService.getNotifications(req.user!.id, limit);
    const unreadCount = await userService.getUnreadNotificationCount(req.user!.id);
    res.json({ success: true, data: notifications, unread_count: unreadCount });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/notifications/:id/read', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Notification ID is required' });
    await userService.markNotificationAsRead(id, req.user!.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await userService.markAllNotificationsAsRead(req.user!.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==================== OWNER DASHBOARD ====================

// Get owner dashboard stats (Super Admin only)
router.get('/dashboard/owner', authenticate, requireSuperAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await userService.getOwnerDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// ==================== ADMIN MANAGEMENT (SUPER ADMIN ONLY) ====================

// Get all admins
router.get('/admins', authenticate, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admins = await userService.getAllAdmins();
    res.json({ success: true, data: admins });
  } catch (error) {
    next(error);
  }
});

// Create a new admin
router.post('/admins', authenticate, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      full_name: z.string().min(2),
    }).parse(req.body);

    const admin = await userService.createAdmin(data);
    res.status(201).json({ success: true, data: admin });
  } catch (error) {
    next(error);
  }
});

// Update an admin
router.put('/admins/:id', authenticate, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Admin ID is required' });

    const data = z.object({
      email: z.string().email().optional(),
      password: z.string().min(8).optional(),
      full_name: z.string().min(2).optional(),
    }).parse(req.body);

    const admin = await userService.updateAdmin(id, data);
    res.json({ success: true, data: admin });
  } catch (error) {
    next(error);
  }
});

// Delete an admin
router.delete('/admins/:id', authenticate, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = getStringParam(req.params.id);
    if (!id) return res.status(400).json({ success: false, error: 'Admin ID is required' });
    await userService.deleteAdmin(id);
    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Fix admin roles - ensure only Fuyi has super_admin role (Super admin only)
router.post('/fix-admin-roles', authenticate, requireSuperAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await userService.fixAdminRoles();
    res.json({ success: true, message: 'Admin roles fixed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
