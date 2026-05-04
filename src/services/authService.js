const db = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

// Hash password with bcrypt
const hashPassword = async (password) => {
  try {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    logger.error('Error hashing password', { error: error.message });
    throw error;
  }
};

// Compare password with hash
const comparePassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error('Error comparing password', { error: error.message });
    throw error;
  }
};

// Generate JWT token
const generateToken = (userId) => {
  try {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  } catch (error) {
    logger.error('Error generating token', { error: error.message });
    throw error;
  }
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.error('Error verifying token', { error: error.message });
    throw error;
  }
};

// Signup new user
const signup = async (email, password, name, companyName) => {
  try {
    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userResult = await db.query(
      `INSERT INTO users (email, password_hash, name, company_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, company_name, created_at`,
      [email.toLowerCase(), passwordHash, name, companyName]
    );

    const user = userResult.rows[0];

    // Create default agent for user
    await db.query(
      `INSERT INTO user_agents (user_id, agent_name, language, tone, response_style)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, `${name}'s AI Agent`, 'darija', 'professional', 'concise']
    );

    // Create free subscription
    await db.query(
      `INSERT INTO subscriptions (user_id, plan_type, status)
       VALUES ($1, $2, $3)`,
      [user.id, 'free', 'active']
    );

    logger.info('User signed up', { userId: user.id, email: user.email });

    // Generate token
    const token = generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.company_name,
      },
      token,
    };
  } catch (error) {
    logger.error('Error in signup', { error: error.message });
    throw error;
  }
};

// Signin user
const signin = async (email, password) => {
  try {
    // Find user
    const userResult = await db.query(
      'SELECT id, email, name, company_name, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = userResult.rows[0];

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    logger.info('User signed in', { userId: user.id, email: user.email });

    // Generate token
    const token = generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.company_name,
      },
      token,
    };
  } catch (error) {
    logger.error('Error in signin', { error: error.message });
    throw error;
  }
};

// Get user by ID
const getUserById = async (userId) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, company_name, created_at FROM users WHERE id = $1',
      [userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in getUserById', { error: error.message });
    throw error;
  }
};

// Update user profile
const updateUser = async (userId, { name, companyName, phone }) => {
  try {
    const result = await db.query(
      `UPDATE users
       SET name = COALESCE($2, name),
           company_name = COALESCE($3, company_name),
           phone = COALESCE($4, phone),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, name, company_name, phone`,
      [userId, name, companyName, phone]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in updateUser', { error: error.message });
    throw error;
  }
};

// Change password
const changePassword = async (userId, oldPassword, newPassword) => {
  try {
    // Get user
    const userResult = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    // Verify old password
    const isPasswordValid = await comparePassword(oldPassword, user.password_hash);

    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    logger.info('User changed password', { userId });

    return { success: true };
  } catch (error) {
    logger.error('Error in changePassword', { error: error.message });
    throw error;
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  signup,
  signin,
  getUserById,
  updateUser,
  changePassword,
};
