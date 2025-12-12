const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const PhysicianSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ["physician"], // Restrict it to only the string 'physician'
    default: "physician", // Automatically set this value on creation
    required: true,
  },
  image: {
    type: String,
    default:
      "https://placehold.co/400x400/007bff/ffffff?text=Physician%20Photo",
  },
  description: { type: String },
  location: { type: String },
  name: {
    type: String,
    required: true,
    default: "Default User",
  },
  licenseId: {
    type: String,
    required: true,
    unique: true, // Medical License IDs should typically be unique
    trim: true,
  },
  // One-to-many: list of patients or users
  patients: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

PhysicianSchema.plugin(passportLocalMongoose, {
  usernameField: "email", // email becomes the username
  errorMessages: {
    UserExistsError: "A Physicain with that email already exists.",
  },
});

module.exports = mongoose.model("Physician", PhysicianSchema);
