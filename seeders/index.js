// seeders/index.js - Improved main seeder
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const colors = require("colors");

// Import seed functions
const seedDivisions = require("./divisionSeeder");
const seedBranches = require("./branchSeeder");
const seedRoles = require("./roleSeeder");
const seedUsers = require("./userSeeder");
const seedVehicles = require("./vehicleSeeder");
const seedCustomers = require("./customerSeeder");
const seedPickupRequests = require("./pickupRequestSeeder");
const seedPickups = require("./pickupSeeder");
const seedVehicleQueues = require("./vehicleQueueSeeder");
const seedMenus = require("./menuSeeder");
const seedPermissions = require("./permissionSeeder");

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
        // Don't drop the entire database - just clear specific collections
        // This prevents losing important configurations and settings
        await Promise.all([
          mongoose.connection.collection('divisions').deleteMany({}),
          mongoose.connection.collection('branches').deleteMany({}),
          mongoose.connection.collection('roles').deleteMany({}),
          mongoose.connection.collection('users').deleteMany({}),
          mongoose.connection.collection('vehicles').deleteMany({}),
          mongoose.connection.collection('customers').deleteMany({}),
          mongoose.connection.collection('pickuprequests').deleteMany({}),
          mongoose.connection.collection('pickups').deleteMany({}),
          mongoose.connection.collection('vehiclequeues').deleteMany({}),
          mongoose.connection.collection('menus').deleteMany({}),
          mongoose.connection.collection('menuaccesses').deleteMany({}),
          mongoose.connection.collection('permissions').deleteMany({})
        ]);
        console.log("Collections cleared successfully".green);
      }
    }

    // Run seeders in sequence to ensure proper relationships
    console.log("Seeding division data...".yellow);
    await seedDivisions();
    
    console.log("Seeding role data...".yellow);
    await seedRoles();
    
    console.log("Seeding permission data...".yellow);
    await seedPermissions();
    
    console.log("Seeding branch data...".yellow);
    await seedBranches();
    
    console.log("Seeding user data...".yellow);
    await seedUsers();
    
    console.log("Seeding vehicle data...".yellow);
    await seedVehicles();
    
    console.log("Seeding customer data...".yellow);
    await seedCustomers();
    
    console.log("Seeding pickup request data...".yellow);
    await seedPickupRequests(30); // Create 30 pickup requests
    
    console.log("Seeding pickup data...".yellow);
    await seedPickups(50); // Create 50 pickups
    
    console.log("Seeding vehicle queue data...".yellow);
    await seedVehicleQueues();
    
    console.log("Seeding menu and access data...".yellow);
    await seedMenus();

    console.log("All data seeded successfully".green.bold);

    // Close database connection
    await mongoose.connection.close();
    console.log("Database connection closed".cyan.underline);
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:".red, error);
    process.exit(1);
  }
};

// Execute seeders
// Check if this file is being run directly
if (require.main === module) {
  runSeeders();
} else {
  // If being imported as a module, export the function
  module.exports = runSeeders;
}