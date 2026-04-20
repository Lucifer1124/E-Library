const mongoose = require("mongoose");
require("dotenv").config();

const { cleanupLegacyUserIndexes, ensureAdminUser } = require("./src/users/user.service");
const { createApp } = require("./app");

const app = createApp();
const port = process.env.PORT || 5000;

async function main() {
  await mongoose.connect(process.env.DB_URL);
  await cleanupLegacyUserIndexes();
  await ensureAdminUser();
  console.log("MongoDB connected and admin account verified.");
}

main().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
