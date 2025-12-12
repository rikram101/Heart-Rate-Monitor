const Joi = require("joi");

// Define the Device data validation rules
module.exports.deviceSchema = Joi.object({
  // The top-level key should match the object you expect in req.body
  device: Joi.object({
    hardwareId: Joi.string().trim().required().messages({
      "any.required": "Hardware ID (Device ID) is required.",
    }),
    label: Joi.string().trim().optional(),
    model: Joi.string().trim().optional(),
  }).required(),
});
