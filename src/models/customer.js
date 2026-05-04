const db = require('../config/database');
const logger = require('../utils/logger');

const getOrCreateCustomer = async (phoneNumber, userId) => {
  try {
    const result = await db.query(
      'SELECT * FROM customers WHERE phone_number = $1 AND user_id = $2',
      [phoneNumber, userId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    const newCustomer = await db.query(
      'INSERT INTO customers (phone_number, user_id) VALUES ($1, $2) RETURNING *',
      [phoneNumber, userId]
    );

    logger.info(`New customer created: ${phoneNumber} for user ${userId}`);
    return newCustomer.rows[0];
  } catch (error) {
    logger.error('Error in getOrCreateCustomer', { phoneNumber, userId, error });
    throw error;
  }
};

const getCustomerById = async (customerId) => {
  try {
    const result = await db.query('SELECT * FROM customers WHERE id = $1', [customerId]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in getCustomerById', { customerId, error });
    throw error;
  }
};

const getCustomerByPhone = async (phoneNumber) => {
  try {
    const result = await db.query('SELECT * FROM customers WHERE phone_number = $1', [phoneNumber]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in getCustomerByPhone', { phoneNumber, error });
    throw error;
  }
};

const updateCustomer = async (customerId, updates) => {
  try {
    const { name, email } = updates;
    const result = await db.query(
      'UPDATE customers SET name = COALESCE($1, name), email = COALESCE($2, email), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [name, email, customerId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in updateCustomer', { customerId, error });
    throw error;
  }
};

const updateLastContact = async (customerId) => {
  try {
    await db.query(
      'UPDATE customers SET last_contact_date = CURRENT_TIMESTAMP WHERE id = $1',
      [customerId]
    );
  } catch (error) {
    logger.error('Error in updateLastContact', { customerId, error });
    throw error;
  }
};

const getAllCustomers = async (limit = 100, offset = 0) => {
  try {
    const result = await db.query(
      'SELECT * FROM customers ORDER BY last_contact_date DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  } catch (error) {
    logger.error('Error in getAllCustomers', { error });
    throw error;
  }
};

const updateCustomerName = async (customerId, name) => {
  try {
    const result = await db.query(
      'UPDATE customers SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [name, customerId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error in updateCustomerName', { customerId, error });
    throw error;
  }
};

module.exports = {
  getOrCreateCustomer,
  getCustomerById,
  getCustomerByPhone,
  updateCustomer,
  updateCustomerName,
  updateLastContact,
  getAllCustomers,
};
