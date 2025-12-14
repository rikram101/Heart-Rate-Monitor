const Joi = require("joi");

// Define the Device data validation rules
module.exports.deviceSchema = Joi.object({
  _method: Joi.string().optional(),
  // The top-level key should match the object you expect in req.body
  device: Joi.object({
    hardwareId: Joi.string().trim().required().messages({
      "any.required": "Hardware ID (Device ID) is required.",
    }),
    label: Joi.string().trim().min(3).max(50).optional(),

    // isActive checkbox sends the string 'true' when checked, or is absent otherwise.
    // Use Joi.any() and accept the string 'true' for validation.
    // If you add a hidden input for false, you could use Joi.boolean().
    isActive: Joi.any().optional(),

    model: Joi.string().trim().optional(), // Included for completeness, though not editable

    // 3. Nested Configuration Object
    measurementConfig: Joi.object({
      startTime: Joi.string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) // Regex for HH:MM format
        .required()
        .messages({
          "any.required": "Measurement start time is required.",
          "string.regex": "Start time must be in HH:MM format.",
        }),

      endTime: Joi.string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/) // Regex for HH:MM format
        .required()
        .messages({
          "any.required": "Measurement end time is required.",
          "string.regex": "End time must be in HH:MM format.",
        }),

      frequencyMinutes: Joi.number()
        .integer()
        .min(5)
        .max(1440) // Max 24 hours
        .required()
        .messages({
          "any.required": "Measurement frequency is required.",
          "number.min": "Frequency must be at least 5 minutes.",
          "number.base": "Frequency must be a number.",
        }),
    }).required(), // The measurementConfig object itself is required

    // FirmwareVersion is omitted as it's not editable or required for update
  }).required(),
});

module.exports.physicianProfileSchema = Joi.object({
  // Full Name: Required, string, ensure it's not just whitespace
  name: Joi.string().trim().min(3).max(100).required().messages({
    "string.empty": "Full Name is required.",
    "string.min": "Name must be at least 3 characters long.",
  }),

  // Location: Required, string
  location: Joi.string().trim().min(5).max(100).required().messages({
    "string.empty": "Location (City, State) is required.",
    "string.min": "Location must be descriptive (e.g., City, State).",
  }),

  // Description/Bio: Required, string, ensures substantial content
  description: Joi.string().trim().min(20).max(500).required().messages({
    "string.empty": "A professional bio/description is required.",
    "string.min": "The description must be at least 20 characters long.",
  }),

  // Image URL: Optional, but if provided, must be a valid URL
  image: Joi.string()
    .allow("") // Allows the field to be empty (user keeps default image)
    .uri() // If value exists, it must be a valid URL format
    .messages({
      "string.uri":
        "Profile Image URL must be a valid link (starting with http:// or https://).",
    }),
});
