const express = require('express');
const authService = require('../services/authService');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, companyName } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const result = await authService.signup(email, password, name, companyName);

    logger.info('User signup successful', { email: result.user.email });

    return res.status(201).json(result);
  } catch (error) {
    logger.error('Signup error', { error: error.message });

    if (error.message.includes('already registered')) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    return res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.signin(email, password);

    logger.info('User signin successful', { email: result.user.email });

    return res.status(200).json(result);
  } catch (error) {
    logger.warn('Signin failed', { error: error.message });

    if (error.message.includes('Invalid email or password')) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    return res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await authService.getUserById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    logger.error('Error fetching user profile', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, companyName, phone } = req.body;

    const user = await authService.updateUser(req.userId, { name, companyName, phone });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('User profile updated', { userId: req.userId });

    return res.status(200).json({ user });
  } catch (error) {
    logger.error('Error updating profile', { error: error.message });
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    await authService.changePassword(req.userId, oldPassword, newPassword);

    logger.info('User password changed', { userId: req.userId });

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.warn('Password change failed', { error: error.message });

    if (error.message.includes('incorrect')) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
