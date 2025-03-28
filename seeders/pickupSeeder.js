// seeders/pickupSeeder.js
const mongoose = require('mongoose');
const faker = require('faker');
const PickupRequest = require('../models/PickupRequest');
const Pickup = require('../models/Pickup');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Branch = require('../models/Branch');

const seedPickups = async () => {
  try {
    // Get existing data for references
    const customers = await Customer.find({ tipe: 'Pengirim' }).limit(10);
    const branches = await Branch.find();
    const drivers = await User.find({ role: 'supir' });
    const assistants = await User.find({ role: 'kenek' });
    const vehicles = await Vehicle.find({ tipe: 'Lansir' });
    const staffUsers = await User.find({ role: 'staff_admin' });
    
    if (!customers.length || !branches.length || !drivers.length || !vehicles.length) {
      console.log('Required reference data not found');
      return;
    }
    
    // Create pickup requests data
    const pickupRequests = [];
    
    for (let i = 0; i < 20; i++) {
      const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
      const randomBranch = branches[Math.floor(Math.random() * branches.length)];
      const randomStaff = staffUsers[Math.floor(Math.random() * staffUsers.length)];
      const status = Math.random() > 0.3 ? 'PENDING' : 'FINISH';
      
      pickupRequests.push({
        tanggal: faker.date.recent(30),
        pengirimId: randomCustomer._id,
        alamatPengambilan: faker.address.streetAddress(),
        tujuan: faker.address.city(),
        jumlahColly: Math.floor(Math.random() * 10) + 1,
        userId: randomStaff._id,
        cabangId: randomBranch._id,
        status
      });
    }
    
    // Insert pickup requests
    await PickupRequest.insertMany(pickupRequests);
    console.log(`${pickupRequests.length} pickup requests seeded`);
    
    // Create pickups data
    const pickups = [];
    
    for (let i = 0; i < 15; i++) {
      const randomCustomer = customers[Math.floor(Math.random() * customers.length)];
      const randomBranch = branches[Math.floor(Math.random() * branches.length)];
      const randomDriver = drivers[Math.floor(Math.random() * drivers.length)];
      const randomAssistant = assistants[Math.floor(Math.random() * assistants.length)];
      const randomVehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
      const randomStaff = staffUsers[Math.floor(Math.random() * staffUsers.length)];
      
      const date = faker.date.recent(30);
      const branchCode = randomBranch.namaCabang.substring(0, 3).toUpperCase();
      const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
      const counterStr = (i + 1).toString().padStart(4, '0');
      const noPengambilan = `PKP-${branchCode}-${dateStr}-${counterStr}`;
      
      pickups.push({
        tanggal: date,
        noPengambilan,
        pengirimId: randomCustomer._id,
        sttIds: [],
        supirId: randomDriver._id,
        kenekId: randomAssistant._id,
        kendaraanId: randomVehicle._id,
        waktuBerangkat: faker.date.recent(7),
        waktuPulang: Math.random() > 0.3 ? faker.date.recent(5) : null,
        estimasiPengambilan: `${Math.floor(Math.random() * 3) + 1} jam`,
        userId: randomStaff._id,
        cabangId: randomBranch._id
      });
    }
    
    // Insert pickups
    await Pickup.insertMany(pickups);
    console.log(`${pickups.length} pickups seeded`);
    
  } catch (error) {
    console.error('Error seeding pickup data:', error);
  }
};

module.exports = seedPickups;
