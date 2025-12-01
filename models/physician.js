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
