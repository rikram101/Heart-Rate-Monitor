const Joi = require("joi");

// Define the Device data validation rules
module.exports.deviceSchema = Joi.object({
  // The top-level key should match the object you expect in req.body
  device: Joi.object({
    // The default value is handled by Mongoose, but we ensure it's provided
    name: Joi.string().trim().required().messages({
      "any.required": "Device name is required.",
    }),
    // We validate type and requirement here; the 'unique' constraint is handled by Mongoose.
    serial_number: Joi.string().trim().required().messages({
      "any.required": "Serial number is required.",
    }),
    // Optional field, must be a number greater than 0
    last_reading_bpm: Joi.number()
      .allow(null) // Allows null if the field is omitted or explicitly set to null
      .min(0)
      .optional(),
    // Optional field, must be a valid date object or string that can be parsed as a date
    last_reading_recorded: Joi.date().allow(null).optional(),
    // Optional field, must be a number greater than 0
    reading_freq: Joi.number().allow(null).min(0).optional(),
  }).required(),
});
