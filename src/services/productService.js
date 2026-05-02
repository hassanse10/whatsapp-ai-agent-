const db = require('../config/database');
const logger = require('../utils/logger');

// Get all products for a user
const getUserProducts = async (userId) => {
  try {
    const result = await db.query(
      `SELECT id, user_id, name, description, price, image_url, sizes, colors,
              stock_quantity, created_at, updated_at
       FROM user_products
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error in getUserProducts', { error: error.message });
    throw error;
  }
};

// Get single product
const getProductById = async (userId, productId) => {
  try {
    const result = await db.query(
      `SELECT id, user_id, name, description, price, image_url, sizes, colors,
              stock_quantity, created_at, updated_at
       FROM user_products
       WHERE id = $1 AND user_id = $2`,
      [productId, userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in getProductById', { error: error.message });
    throw error;
  }
};

// Create product
const createProduct = async (userId, {
  name,
  description,
  price,
  imageUrl,
  sizes,
  colors,
  stockQuantity,
}) => {
  try {
    const result = await db.query(
      `INSERT INTO user_products (user_id, name, description, price, image_url, sizes, colors, stock_quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, user_id, name, description, price, image_url, sizes, colors, stock_quantity, created_at`,
      [userId, name, description, price, imageUrl, sizes || [], colors || [], stockQuantity || 0]
    );

    logger.info('Product created', { userId, productName: name });

    return result.rows[0];
  } catch (error) {
    logger.error('Error in createProduct', { error: error.message });
    throw error;
  }
};

// Update product
const updateProduct = async (userId, productId, {
  name,
  description,
  price,
  imageUrl,
  sizes,
  colors,
  stockQuantity,
}) => {
  try {
    const result = await db.query(
      `UPDATE user_products
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           price = COALESCE($4, price),
           image_url = COALESCE($5, image_url),
           sizes = COALESCE($6, sizes),
           colors = COALESCE($7, colors),
           stock_quantity = COALESCE($8, stock_quantity),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $9
       RETURNING id, user_id, name, description, price, image_url, sizes, colors, stock_quantity, updated_at`,
      [productId, name, description, price, imageUrl, sizes, colors, stockQuantity, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Product not found');
    }

    logger.info('Product updated', { userId, productId });

    return result.rows[0];
  } catch (error) {
    logger.error('Error in updateProduct', { error: error.message });
    throw error;
  }
};

// Delete product
const deleteProduct = async (userId, productId) => {
  try {
    const result = await db.query(
      'DELETE FROM user_products WHERE id = $1 AND user_id = $2 RETURNING id',
      [productId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Product not found');
    }

    logger.info('Product deleted', { userId, productId });

    return { success: true };
  } catch (error) {
    logger.error('Error in deleteProduct', { error: error.message });
    throw error;
  }
};

// Find product by name (for WhatsApp agent)
const findProductByName = async (userId, productName) => {
  try {
    const result = await db.query(
      `SELECT id, user_id, name, description, price, image_url, sizes, colors
       FROM user_products
       WHERE user_id = $1 AND name ILIKE $2`,
      [userId, `%${productName}%`]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in findProductByName', { error: error.message });
    throw error;
  }
};

module.exports = {
  getUserProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  findProductByName,
};
