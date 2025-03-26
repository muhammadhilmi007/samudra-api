const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');

// Import seed functions
const seedDivisions = require('./divisionSeeder');
const seedBranches = require('./branchSeeder');
const seedRoles = require('./roleSeeder');
const seedUsers = require('./userSeeder');

// Konfigurasi environment
dotenv.config();

// Fungsi utama untuk menjalankan seeder
const runSeeders = async () => {
  try {
    // Sambungkan ke database - changed MONGODB_URI to MONGO_URI to match your .env
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Database connection successful'.cyan.underline);

    // Clear existing database
    await mongoose.connection.dropDatabase();
    
    console.log('Seeding roles...'.yellow);
    await seedRoles();
    
    console.log('Seeding divisions...'.yellow);
    await seedDivisions();
    
    console.log('Seeding branches...'.yellow);
    await seedBranches();
    
    console.log('Seeding users...'.yellow);
    await seedUsers();

    console.log('Seeding completed successfully'.green.bold);
    
    // Tutup koneksi database
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:'.red, error);
    process.exit(1);
  }
};

// Jalankan seeder
runSeeders();