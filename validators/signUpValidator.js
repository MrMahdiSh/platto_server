const Joi = require("joi");
const requestCombiner = require("../utils/requestCombiner");

const schema = Joi.object({
  username: Joi.string().min(3).required().messages({
    "string.empty": "Username is required",
    "string.min": "Username should have a minimum length of 3",
  }),
  password: Joi.string().min(3).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password should have a minimum length of 3",
  }),
  email: Joi.string().email().messages({
    "string.email": "Email is invalid",
  }),
});

const validator = (req, res, next) => {
  const { error } = schema.validate(requestCombiner(req));

  if (error) {
    return res.status(400).json({
      success: false,
      code: 400,
      message: error.message,
    });
  }

  next();
};

module.exports = validator;
