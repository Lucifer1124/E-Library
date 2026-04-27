const mongoose = require("mongoose");
require("dotenv").config();

const { ensureAdminUser } = require("./src/users/user.service");

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.DB_URL);
    await ensureAdminUser();
    console.log("Admin account verified successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin user:", error);
    process.exit(1);
  }
}

seedAdmin();
