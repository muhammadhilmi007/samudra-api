// seeders/index.js
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const colors = require("colors");

// Import seed functions
const seedDivisions = require("./divisionSeeder");
const seedBranches = require("./branchSeeder");
const seedRoles = require("./roleSeeder");
const seedUsers = require("./userSeeder");
const seedVehicles = require("./vehicleSeeder");
const seedVehicleQueues = require("./vehicleQueueSeeder");
const seedPickupRequests = require("./pickupRequestSeeder");
const seedPickups = require("./pickupSeeder");

// Configure environment
dotenv.config();

// Main function to run seeders
const runSeeders = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Database connection successful".cyan.underline);

    // Clear existing database if in development (be careful with this!)
    if (process.env.NODE_ENV === 'development') {
      if (process.env.SEED_CLEAR_DB === 'true') {
        console.log("Clearing database...".yellow);
        await mongoose.connection.dropDatabase();
      }
    }

    console.log("Seeding roles...".yellow);
    await seedRoles();

    console.log("Seeding divisions...".yellow);
    await seedDivisions();

    console.log("Seeding branches...".yellow);
    await seedBranches();

    console.log("Seeding users...".yellow);
    await seedUsers();

    console.log("Seeding vehicles...".yellow);
    await seedVehicles();

    console.log("Seeding vehicle queues...".yellow);
    await seedVehicleQueues();

    console.log("Seeding pickup requests...".yellow);
    await seedPickupRequests();

    console.log("Seeding pickups...".yellow);
    await seedPickups();

    console.log("Seeding completed successfully".green.bold);

    // Close database connection
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:".red, error);
    process.exit(1);
  }
};

// Execute seeders
runSeeders();