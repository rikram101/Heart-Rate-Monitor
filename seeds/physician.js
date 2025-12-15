const mongoose = require("mongoose");
const Physician = require("../models/physician");

mongoose.connect("mongodb://127.0.0.1:27017/heart-rate-monitor", {
  useNewUrlParser: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

// --- Dummy Data ---
const seedPhysicians = [
  {
    email: "dr.smith@clinic.com",
    name: "Dr. Evelyn Smith",
    description:
      "Experienced cardiologist specializing in rhythm disorders and interventional procedures.",
    location: "New York, NY",
    licenseId: "NY-CARD-90123",
    // Note: passportLocalMongoose will require a password, which is hashed.
    // We pass it directly to the register method.
    password: "password123",
  },
  {
    email: "dr.jones@clinic.com",
    name: "Dr. Ben Jones",
    description:
      "Pediatric primary care physician with a focus on preventative child health and wellness.",
    location: "Chicago, IL",
    licenseId: "IL-PEDS-34567",
    password: "password123",
  },
  {
    email: "dr.lee@clinic.com",
    name: "Dr. Michelle Lee",
    description:
      "Dermatologist with expertise in cosmetic procedures and skin cancer detection.",
    location: "Los Angeles, CA",
    licenseId: "CA-DERM-78901",
    password: "password123",
  },
  {
    email: "dr.patel@clinic.com",
    name: "Dr. Anil Patel",
    description: "Orthopedic surgeon specializing in knee and hip replacement.",
    location: "Houston, TX",
    licenseId: "TX-ORTH-21098",
    password: "password123",
  },
  {
    email: "dr.chen@clinic.com",
    name: "Dr. Amy Chen",
    description:
      "Neurologist focusing on treating migraines, epilepsy, and multiple sclerosis.",
    location: "Miami, FL",
    licenseId: "FL-NEUR-65432",
    password: "password123",
  },
  {
    email: "dr.davis@clinic.com",
    name: "Dr. Michael Davis",
    description:
      "General practitioner providing comprehensive care for all ages.",
    location: "Seattle, WA",
    licenseId: "WA-GP-13579",
    password: "password123",
  },
  {
    email: "dr.garcia@clinic.com",
    name: "Dr. Sofia Garcia",
    description:
      "Endocrinologist specializing in diabetes management and thyroid disorders.",
    location: "Boston, MA",
    licenseId: "MA-ENDO-24680",
    password: "password123",
  },
];
// --------------------

const seedDB = async () => {
  await Physician.deleteMany({});
  console.log("Existing physicians deleted.");

  for (const physData of seedPhysicians) {
    // The passport-local-mongoose plugin adds a 'register' static method
    // that handles salting and hashing the password before saving.
    const newPhysician = new Physician({
      email: physData.email,
      description: physData.description,
      location: physData.location,
      name: physData.name,
      licenseId: physData.licenseId,
      // image and patients fields are optional/defaulted and omitted here
    });

    // Register method handles password hashing and saving
    await Physician.register(newPhysician, physData.password);
    console.log(`Successfully registered physician: ${physData.name}`);
  }

  console.log(
    `Database successfully seeded with ${seedPhysicians.length} physicians!`
  );
};

seedDB().then(() => {
  mongoose.connection.close();
  console.log("Database connection closed.");
});
