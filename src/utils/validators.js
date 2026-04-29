const Joi = require('joi');

const phoneNumberSchema = Joi.string()
  .pattern(/^\+?[1-9]\d{1,14}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid phone number format',
  });

const messageSchema = Joi.object({
  from: phoneNumberSchema,
  body: Joi.string().required().min(1).max(1000),
  timestamp: Joi.number().required(),
});

const orderItemSchema = Joi.object({
  product_name: Joi.string().required().min(1).max(255),
  quantity: Joi.number().required().min(1).max(100),
  size: Joi.string().optional().max(50),
  color: Joi.string().optional().max(50),
  price: Joi.number().required().positive(),
});

const createOrderSchema = Joi.object({
  customer_id: Joi.number().required(),
  items: Joi.array().items(orderItemSchema).required().min(1),
  shipping_address: Joi.string().optional().max(500),
});

const validateMessage = (data) => {
  const { error, value } = messageSchema.validate(data);
  return { error, value };
};

const validateOrder = (data) => {
  const { error, value } = createOrderSchema.validate(data);
  return { error, value };
};

const validatePhoneNumber = (phoneNumber) => {
  const { error } = phoneNumberSchema.validate(phoneNumber);
  return !error;
};

const validateEmail = (email) => {
  const schema = Joi.string().email().required();
  const { error } = schema.validate(email);
  return !error;
};

module.exports = {
  validateMessage,
  validateOrder,
  validatePhoneNumber,
  validateEmail,
  phoneNumberSchema,
  messageSchema,
  createOrderSchema,
};
