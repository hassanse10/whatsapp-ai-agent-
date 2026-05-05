const express = require('express');
const { requireAuth } = require('../middleware/auth');
const db = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/delivery-men
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM delivery_men WHERE user_id = $1 ORDER BY name ASC',
      [req.userId]
    );
    return res.status(200).json({ deliveryMen: result.rows });
  } catch (error) {
    logger.error('Error fetching delivery men', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/delivery-men
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, phone, vehicleType, licenseId } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    const result = await db.query(
      `INSERT INTO delivery_men (user_id, name, phone, vehicle_type, license_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, name.trim(), phone.trim(), vehicleType?.trim() || null, licenseId?.trim() || null]
    );
    logger.info('Delivery man created', { userId: req.userId, name });
    return res.status(201).json({ deliveryMan: result.rows[0] });
  } catch (error) {
    logger.error('Error creating delivery man', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/delivery-men/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, phone, vehicleType, licenseId } = req.body;
    const result = await db.query(
      `UPDATE delivery_men
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           vehicle_type = COALESCE($3, vehicle_type),
           license_id = COALESCE($4, license_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [name?.trim() || null, phone?.trim() || null, vehicleType?.trim() || null, licenseId?.trim() || null, req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery man not found' });
    }
    return res.status(200).json({ deliveryMan: result.rows[0] });
  } catch (error) {
    logger.error('Error updating delivery man', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/delivery-men/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const activeOrders = await db.query(
      `SELECT COUNT(*) as count FROM orders
       WHERE delivery_man_id = $1 AND status NOT IN ('delivered', 'cancelled')`,
      [req.params.id]
    );
    if (parseInt(activeOrders.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete — assigned to active orders' });
    }
    const result = await db.query(
      'DELETE FROM delivery_men WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery man not found' });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error deleting delivery man', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
