// Re-export auth middleware for compatibility
export { authenticate as authMiddleware } from './auth';
export { authenticate, optionalAuth, requireAdmin, requireSuperAdmin } from './auth';
