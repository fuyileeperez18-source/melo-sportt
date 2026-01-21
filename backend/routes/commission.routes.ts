import { Router, Response } from 'express';
import { commissionService } from '../services/commission.service.js';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

/**
 * GET /api/commissions
 * Obtiene todas las comisiones con filtros (solo admin+)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { team_member_id, status, limit, offset } = req.query;
      const filters = {
        team_member_id: team_member_id as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };

      const commissions = await commissionService.getAllCommissions(filters);

      res.json({
        success: true,
        data: commissions,
      });
    } catch (error) {
      console.error('Error getting commissions:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener comisiones',
      });
    }
  }
);

/**
 * GET /api/commissions/summary
 * Obtiene el resumen de comisiones (solo admin+)
 */
router.get(
  '/summary',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { team_member_id } = req.query;
      const summary = await commissionService.getCommissionSummary(team_member_id as string);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Error getting commission summary:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener resumen de comisiones',
      });
    }
  }
);

/**
 * PUT /api/commissions/:id/status
 * Actualiza el estado de una comisión (solo admin+)
 */
router.put(
  '/:id/status',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['pending', 'approved', 'paid', 'cancelled'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Estado inválido',
        });
        return;
      }

      await commissionService.updateCommissionStatus(id, status, req.user?.id);

      res.json({
        success: true,
        message: 'Estado de comisión actualizado',
      });
    } catch (error) {
      console.error('Error updating commission status:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar estado de comisión',
      });
    }
  }
);

/**
 * GET /api/commissions/team-members
 * Obtiene todos los miembros del equipo (solo admin+)
 */
router.get(
  '/team-members',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const teamMembers = await commissionService.getAllTeamMembers();

      res.json({
        success: true,
        data: teamMembers,
      });
    } catch (error) {
      console.error('Error getting team members:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener miembros del equipo',
      });
    }
  }
);

/**
 * POST /api/commissions/team-members
 * Crea un nuevo miembro del equipo (solo super_admin)
 */
router.post(
  '/team-members',
  authenticate,
  requireSuperAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const teamMember = await commissionService.createTeamMember(req.body);

      res.status(201).json({
        success: true,
        data: teamMember,
      });
    } catch (error) {
      console.error('Error creating team member:', error);
      res.status(500).json({
        success: false,
        error: 'Error al crear miembro del equipo',
      });
    }
  }
);

/**
 * PUT /api/commissions/team-members/:id
 * Actualiza un miembro del equipo (solo super_admin)
 */
router.put(
  '/team-members/:id',
  authenticate,
  requireSuperAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const teamMember = await commissionService.updateTeamMember(id, req.body);

      res.json({
        success: true,
        data: teamMember,
      });
    } catch (error) {
      console.error('Error updating team member:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar miembro del equipo',
      });
    }
  }
);

/**
 * POST /api/commissions/payments
 * Registra un pago de comisión (solo admin+)
 */
router.post(
  '/payments',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const payment = await commissionService.recordCommissionPayment({
        ...req.body,
        paid_by: req.user?.id,
      });

      res.status(201).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      console.error('Error recording commission payment:', error);
      res.status(500).json({
        success: false,
        error: 'Error al registrar pago de comisión',
      });
    }
  }
);

/**
 * GET /api/commissions/dashboard-stats
 * Obtiene estadísticas para el dashboard del propietario (solo admin+)
 */
router.get(
  '/dashboard-stats',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const stats = await commissionService.getOwnerDashboardStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener estadísticas del dashboard',
      });
    }
  }
);

export default router;