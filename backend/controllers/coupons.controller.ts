import { Request, Response } from 'express';
import { pool } from '../config/database';

/**
 * Get all coupons (admin only)
 */
export const getAllCoupons = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = '';
    const queryParams: any[] = [limitNum, offset];

    if (status && status !== 'all') {
      const now = new Date();
      if (status === 'active') {
        whereClause = `WHERE active = true AND (expires_at IS NULL OR expires_at > $3) AND (starts_at IS NULL OR starts_at <= $3)`;
        queryParams.push(now);
      } else if (status === 'expired') {
        whereClause = `WHERE expires_at IS NOT NULL AND expires_at <= $3`;
        queryParams.push(now);
      } else if (status === 'scheduled') {
        whereClause = `WHERE starts_at IS NOT NULL AND starts_at > $3`;
        queryParams.push(now);
      } else if (status === 'inactive') {
        whereClause = `WHERE active = false`;
      }
    }

    const result = await pool.query(
      `SELECT * FROM coupons
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      queryParams
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM coupons ${whereClause}`,
      whereClause ? queryParams.slice(2) : []
    );

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: {
        coupons: result.rows,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los cupones',
      error: error.message,
    });
  }
};

/**
 * Get coupon by ID
 */
export const getCouponById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM coupons WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cupón no encontrado',
      });
    }

    res.json({
      success: true,
      data: { coupon: result.rows[0] },
    });
  } catch (error: any) {
    console.error('Error getting coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el cupón',
      error: error.message,
    });
  }
};

/**
 * Create new coupon (admin only)
 */
export const createCoupon = async (req: Request, res: Response) => {
  try {
    const {
      code,
      discount_type,
      discount_value,
      min_purchase,
      max_discount,
      usage_limit,
      expires_at,
      starts_at,
      applicable_to,
      product_ids,
      active,
    } = req.body;

    // Validate required fields
    if (!code || !discount_type || !discount_value) {
      return res.status(400).json({
        success: false,
        message: 'El código, tipo y valor del descuento son requeridos',
      });
    }

    // Check if code already exists
    const existingCoupon = await pool.query(
      `SELECT id FROM coupons WHERE UPPER(code) = UPPER($1)`,
      [code]
    );

    if (existingCoupon.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El código de cupón ya existe',
      });
    }

    // Validate discount value
    if (discount_type === 'percentage' && (discount_value <= 0 || discount_value > 100)) {
      return res.status(400).json({
        success: false,
        message: 'El porcentaje de descuento debe estar entre 1 y 100',
      });
    }

    if (discount_type === 'fixed' && discount_value <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El valor del descuento debe ser mayor a 0',
      });
    }

    const result = await pool.query(
      `INSERT INTO coupons (
        code,
        discount_type,
        discount_value,
        min_purchase,
        max_discount,
        usage_limit,
        expires_at,
        starts_at,
        applicable_to,
        product_ids,
        active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        code.toUpperCase(),
        discount_type,
        discount_value,
        min_purchase || null,
        max_discount || null,
        usage_limit || null,
        expires_at || null,
        starts_at || null,
        applicable_to || 'all',
        product_ids ? JSON.stringify(product_ids) : null,
        active !== false,
      ]
    );

    res.status(201).json({
      success: true,
      data: { coupon: result.rows[0] },
      message: 'Cupón creado exitosamente',
    });
  } catch (error: any) {
    console.error('Error creating coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el cupón',
      error: error.message,
    });
  }
};

/**
 * Update coupon (admin only)
 */
export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      code,
      discount_type,
      discount_value,
      min_purchase,
      max_discount,
      usage_limit,
      expires_at,
      starts_at,
      applicable_to,
      product_ids,
      active,
    } = req.body;

    // Check if coupon exists
    const existingCoupon = await pool.query(
      `SELECT * FROM coupons WHERE id = $1`,
      [id]
    );

    if (existingCoupon.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cupón no encontrado',
      });
    }

    // If code is being changed, check if new code already exists
    if (code && code.toUpperCase() !== existingCoupon.rows[0].code) {
      const codeCheck = await pool.query(
        `SELECT id FROM coupons WHERE UPPER(code) = UPPER($1) AND id != $2`,
        [code, id]
      );

      if (codeCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'El código de cupón ya existe',
        });
      }
    }

    const result = await pool.query(
      `UPDATE coupons SET
        code = COALESCE($1, code),
        discount_type = COALESCE($2, discount_type),
        discount_value = COALESCE($3, discount_value),
        min_purchase = COALESCE($4, min_purchase),
        max_discount = COALESCE($5, max_discount),
        usage_limit = COALESCE($6, usage_limit),
        expires_at = COALESCE($7, expires_at),
        starts_at = COALESCE($8, starts_at),
        applicable_to = COALESCE($9, applicable_to),
        product_ids = COALESCE($10, product_ids),
        active = COALESCE($11, active),
        updated_at = NOW()
      WHERE id = $12
      RETURNING *`,
      [
        code?.toUpperCase(),
        discount_type,
        discount_value,
        min_purchase,
        max_discount,
        usage_limit,
        expires_at,
        starts_at,
        applicable_to,
        product_ids ? JSON.stringify(product_ids) : null,
        active,
        id,
      ]
    );

    res.json({
      success: true,
      data: { coupon: result.rows[0] },
      message: 'Cupón actualizado exitosamente',
    });
  } catch (error: any) {
    console.error('Error updating coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el cupón',
      error: error.message,
    });
  }
};

/**
 * Delete coupon (admin only)
 */
export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM coupons WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cupón no encontrado',
      });
    }

    res.json({
      success: true,
      message: 'Cupón eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el cupón',
      error: error.message,
    });
  }
};

/**
 * Validate and apply coupon (public)
 */
export const validateCoupon = async (req: Request, res: Response) => {
  try {
    const { code, cartItems, subtotal } = req.body;

    if (!code || !cartItems || subtotal === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Código de cupón, items del carrito y subtotal son requeridos',
      });
    }

    // Get coupon
    const result = await pool.query(
      `SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND active = true`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cupón no válido o inactivo',
      });
    }

    const coupon = result.rows[0];
    const now = new Date();

    // Check if coupon has started
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return res.status(400).json({
        success: false,
        message: 'Este cupón aún no está disponible',
      });
    }

    // Check if coupon has expired
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return res.status(400).json({
        success: false,
        message: 'Este cupón ha expirado',
      });
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({
        success: false,
        message: 'Este cupón ha alcanzado su límite de uso',
      });
    }

    // Check minimum purchase
    if (coupon.min_purchase && subtotal < coupon.min_purchase) {
      return res.status(400).json({
        success: false,
        message: `El mínimo de compra para este cupón es de $${coupon.min_purchase}`,
      });
    }

    // Check if applicable to products
    if (coupon.applicable_to === 'specific' && coupon.product_ids) {
      const productIds = JSON.parse(coupon.product_ids);
      const hasApplicableProducts = cartItems.some((item: any) =>
        productIds.includes(item.product_id)
      );

      if (!hasApplicableProducts) {
        return res.status(400).json({
          success: false,
          message: 'Este cupón no es aplicable a los productos en tu carrito',
        });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (subtotal * coupon.discount_value) / 100;
      if (coupon.max_discount && discountAmount > coupon.max_discount) {
        discountAmount = coupon.max_discount;
      }
    } else if (coupon.discount_type === 'fixed') {
      discountAmount = coupon.discount_value;
    }

    // Discount cannot exceed subtotal
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }

    res.json({
      success: true,
      data: {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
        },
        discount_amount: Math.round(discountAmount * 100) / 100,
      },
      message: 'Cupón aplicado exitosamente',
    });
  } catch (error: any) {
    console.error('Error validating coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar el cupón',
      error: error.message,
    });
  }
};

/**
 * Increment coupon usage (called when order is confirmed)
 */
export const incrementCouponUsage = async (req: Request, res: Response) => {
  try {
    const { couponId } = req.body;

    if (!couponId) {
      return res.status(400).json({
        success: false,
        message: 'ID del cupón es requerido',
      });
    }

    await pool.query(
      `UPDATE coupons SET used_count = used_count + 1 WHERE id = $1`,
      [couponId]
    );

    res.json({
      success: true,
      message: 'Uso del cupón incrementado',
    });
  } catch (error: any) {
    console.error('Error incrementing coupon usage:', error);
    res.status(500).json({
      success: false,
      message: 'Error al incrementar uso del cupón',
      error: error.message,
    });
  }
};
