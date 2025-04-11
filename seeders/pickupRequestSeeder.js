// seeders/pickupRequestSeeder.js
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker/locale/id_ID');
const PickupRequest = require('../models/PickupRequest');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Branch = require('../models/Branch');

/**
 * Generate pickup request data
 * @param {number} count - Number of pickup requests to generate
 */
const seedPickupRequests = async (count = 30) => {
  try {
    console.log('Starting pickup request seeding...');
    
    // Get available senders
    const senders = await Customer.find({
      $or: [
        { tipe: 'pengirim' },
        { tipe: 'keduanya' }
      ]
    });
    
    if (senders.length === 0) {
      console.warn('No senders found. Please run customer seeder first.');
      return [];
    }
    
    // Get available branches
    const branches = await Branch.find({});
    
    if (branches.length === 0) {
      console.warn('No branches found. Please run branch seeder first.');
      return [];
    }
    
    // Get available staff users for userId
    const staffUsers = await User.find({
      $or: [
        { role: 'staff_admin' },
        { role: 'staff_penjualan' },
        { jabatan: { $regex: /(admin|staff|penjualan)/i } }
      ]
    });
    
    if (staffUsers.length === 0) {
      console.warn('No staff users found. Please run user seeder first.');
      return [];
    }
    
    // Delete existing pickup requests
    console.log('Deleting existing pickup requests...');
    await PickupRequest.deleteMany({});
    
    // Create pickup request data array
    const pickupRequestData = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Start from 30 days ago
    
    // Create pickup request data
    for (let i = 0; i < count; i++) {
      // Pick random entities
      const randomSender = faker.helpers.arrayElement(senders);
      const randomBranch = faker.helpers.arrayElement(branches);
      const randomStaff = faker.helpers.arrayElement(staffUsers);
      
      // Generate a random date in the past 30 days
      const randomDays = faker.number.int({ min: 0, max: 30 });
      const requestDate = new Date(startDate);
      requestDate.setDate(requestDate.getDate() + randomDays);
      
      // Determine status based on date and random factor
      const daysAgo = Math.floor((new Date() - requestDate) / (1000 * 60 * 60 * 24));
      
      let status;
      // Older requests are more likely to be completed or cancelled
      if (daysAgo > 15) {
        status = Math.random() < 0.7 ? 'PENDING' : Math.random() < 0.85 ? 'FINISH' : 'CANCELLED';
      } else if (daysAgo > 7) {
        // Medium age requests
        status = Math.random() < 0.8 ? 'PENDING' : Math.random() < 0.9 ? 'FINISH' : 'CANCELLED';
      } else {
        // Recent requests, mostly pending
        status = Math.random() < 0.9 ? 'PENDING' : Math.random() < 0.95 ? 'FINISH' : 'CANCELLED';
      }
      
      // Generate random addresses
      const alamatPengambilan = faker.location.streetAddress(true);
      const tujuanList = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Makassar', 'Semarang', 'Yogyakarta', 'Palembang'];
      const tujuan = faker.helpers.arrayElement(tujuanList);
      
      // Generate random colly count and estimations
      const jumlahColly = faker.number.int({ min: 1, max: 10 });
      const estimasiOptions = ['Pagi (08.00-12.00)', 'Siang (12.00-15.00)', 'Sore (15.00-18.00)', '1-2 jam', '2-3 jam', 'Besok pagi'];
      const estimasiPengambilan = Math.random() > 0.3 ? faker.helpers.arrayElement(estimasiOptions) : null;
      
      // Notes for some requests (30% chance)
      let notes = null;
      if (Math.random() > 0.7) {
        if (status === 'CANCELLED') {
          notes = faker.helpers.arrayElement([
            "Request dibatalkan pelanggan",
            "Pelanggan meminta reschedule",
            "Barang belum siap",
            "Pelanggan tidak dapat dihubungi"
          ]);
        } else if (status === 'FINISH') {
          notes = faker.helpers.arrayElement([
            "Pengambilan sudah dilakukan",
            "Barang sudah diambil",
            "Pengambilan berhasil"
          ]);
        } else {
          notes = faker.helpers.arrayElement([
            "Pelanggan minta diambil sore",
            "Telepon dahulu sebelum pengambilan",
            "Koordinasi dengan security",
            "Tanyakan kepada Pak Budi"
          ]);
        }
      }
      
      // Create pickup request object
      const pickupRequest = {
        tanggal: requestDate,
        pengirimId: randomSender._id,
        alamatPengambilan,
        tujuan,
        jumlahColly,
        estimasiPengambilan,
        notes,
        status,
        pickupId: null, // Will be updated if status is FINISH during pickup seeding
        userId: randomStaff._id,
        cabangId: randomBranch._id,
        createdAt: requestDate,
        updatedAt: status === 'PENDING' ? requestDate : new Date()
      };
      
      pickupRequestData.push(pickupRequest);
    }
    
    // Insert the pickup requests
    console.log(`Inserting ${pickupRequestData.length} pickup requests...`);
    const insertedPickupRequests = await PickupRequest.insertMany(pickupRequestData);
    
    console.log(`Successfully seeded ${insertedPickupRequests.length} pickup requests`);
    return insertedPickupRequests;
  } catch (error) {
    console.error('Error seeding pickup request data:', error);
    throw error;
  }
};

module.exports = seedPickupRequests;