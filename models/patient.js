const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const PatientSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    default: "Default User",
  },
  devices: [
    {
      type: Schema.Types.ObjectId,
      ref: "Device",
    },
  ],
  assignedPhysicians: [
    {
      type: Schema.Types.ObjectId,
      ref: "Physician",
    },
  ],
});

PatientSchema.plugin(passportLocalMongoose, {
  usernameField: "email", // email becomes the username
  errorMessages: {
    UserExistsError: "A user with that email already exists.",
  },
});

module.exports = mongoose.model("Patient", PatientSchema);
