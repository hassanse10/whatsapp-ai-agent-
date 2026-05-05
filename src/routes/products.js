const express = require('express');
const { requireAuth } = require('../middleware/auth');
const productService = require('../services/productService');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/products - List user's products
router.get('/', requireAuth, async (req, res) => {
  try {
    const products = await productService.getUserProducts(req.userId);

    return res.status(200).json({ products });
  } catch (error) {
    logger.error('Error fetching products', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/products/:productId - Get product details
router.get('/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await productService.getProductById(req.userId, productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json({ product });
  } catch (error) {
    logger.error('Error fetching product', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/products - Create new product
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, price, image_url, sizes, colors, stock_quantity } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Product name and price are required' });
    }

    const product = await productService.createProduct(req.userId, {
      name,
      description,
      price,
      imageUrl: image_url,
      sizes,
      colors,
      stockQuantity: stock_quantity,
    });

    logger.info('Product created', { userId: req.userId, productId: product.id });

    return res.status(201).json({ product });
  } catch (error) {
    logger.error('Error creating product', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/products/:productId - Update product
router.put('/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, description, price, image_url, sizes, colors, stock_quantity } = req.body;

    const product = await productService.updateProduct(req.userId, productId, {
      name,
      description,
      price,
      imageUrl: image_url,
      sizes,
      colors,
      stockQuantity: stock_quantity,
    });

    logger.info('Product updated', { userId: req.userId, productId });

    return res.status(200).json({ product });
  } catch (error) {
    logger.error('Error updating product', { error: error.message });

    if (error.message === 'Product not found') {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/products/:productId - Delete product
router.delete('/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;

    await productService.deleteProduct(req.userId, productId);

    logger.info('Product deleted', { userId: req.userId, productId });

    return res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Error deleting product', { error: error.message });

    if (error.message === 'Product not found') {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
