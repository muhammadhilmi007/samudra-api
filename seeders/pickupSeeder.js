// seeders/pickupRequestSeeder.js
const mongoose = require("mongoose");
const { faker } = require("@faker-js/faker");
const PickupRequest = require("../models/PickupRequest");
const Customer = require("../models/Customer");
const User = require("../models/User");
const Branch = require("../models/Branch");
const Pickup = require("../models/Pickup");

const seedPickupRequests = async (count = 50) => {
  faker.locale = "id_ID";

  try {
    // Get existing data for references
    const customers = await Customer.find({
      tipe: { $in: ["pengirim", "keduanya"] },
    });
    
    const branches = await Branch.find({});
    
    const staffUsers = await User.find({
      roleId: {
        $in: [
          // Get users with admin, staff, or operational roles
          await mongoose
            .model("Role")
            .find({
              $or: [
                { kodeRole: "manajerOperasional" },
                { kodeRole: "staff_admin" },
                { kodeRole: "kepalaGudang" },
              ],
            })
            .select("_id"),
        ],
      },
    });

    // Get some pickups to link to some requests
    const pickups = await Pickup.find({}).limit(10);

    if (!customers.length || !branches.length || !staffUsers.length) {
      console.log(
        "Required reference data not found. Make sure to run customer, branch, and user seeders first."
      );
      return [];
    }

    // Delete existing data
    await PickupRequest.deleteMany({});

    // Create pickup requests data
    const pickupRequestsData = [];

    for (let i = 0; i < count; i++) {
      const randomCustomer =
        customers[Math.floor(Math.random() * customers.length)];
      const randomBranch =
        branches[Math.floor(Math.random() * branches.length)];
      const randomStaff =
        staffUsers[Math.floor(Math.random() * staffUsers.length)];
      
      // Determine status and dates
      let status;
      let pickupId = null;
      const createdDate = faker.date.recent({ days: 60 });
      const updatedDate = new Date(createdDate);
      updatedDate.setHours(updatedDate.getHours() + Math.floor(Math.random() * 48));
      
      // Determine status with probabilities
      const statusRoll = Math.random();
      
      if (statusRoll < 0.6) {
        // 60% chance of PENDING
        status = 'PENDING';
      } else if (statusRoll < 0.9) {
        // 30% chance of FINISH
        status = 'FINISH';
        
        // Link some finished requests to pickups
        if (pickups.length > 0 && Math.random() > 0.5) {
          pickupId = pickups[Math.floor(Math.random() * pickups.length)]._id;
        }
      } else {
        // 10% chance of CANCELLED
        status = 'CANCELLED';
      }
      
      // Generate notes for some requests
      let notes = null;
      if (Math.random() > 0.7) {
        if (status === 'CANCELLED') {
          notes = faker.helpers.arrayElement([
            "Pelanggan membatalkan request",
            "Alamat tidak ditemukan",
            "Barang belum siap",
            "Dibatalkan karena hujan deras",
            "Alasan lain: hubungi CS"
          ]);
        } else if (status === 'FINISH') {
          notes = faker.helpers.arrayElement([
            "Pengambilan telah selesai",
            "Barang telah diambil",
            "Diserahkan ke kurir",
            "Proses lancar"
          ]);
        }
      }

      // Generate random addresses
      const alamatPengambilan = faker.location.streetAddress(true);
      const tujuanList = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Makassar', 'Semarang', 'Yogyakarta', 'Palembang'];
      const tujuan = faker.helpers.arrayElement(tujuanList);
      
      // Generate random colly count and estimations
      const jumlahColly = Math.floor(Math.random() * 10) + 1;
      const estimasiOptions = ['Pagi (08.00-12.00)', 'Siang (12.00-15.00)', 'Sore (15.00-18.00)', '1-2 jam', '2-3 jam', 'Besok pagi'];
      const estimasiPengambilan = Math.random() > 0.3 ? faker.helpers.arrayElement(estimasiOptions) : null;

      // Create the pickup request data
      pickupRequestsData.push({
        pengirimId: randomCustomer._id,
        alamatPengambilan,
        tujuan,
        jumlahColly,
        estimasiPengambilan,
        userId: randomStaff._id,
        cabangId: randomBranch._id,
        status,
        pickupId,
        notes,
        tanggal: createdDate,
        createdAt: createdDate,
        updatedAt: updatedDate,
      });
    }

    // Insert pickup requests
    const pickupRequests = await PickupRequest.insertMany(pickupRequestsData);
    console.log(`${pickupRequests.length} pickup requests seeded successfully`);
    return pickupRequests;
  } catch (error) {
    console.error("Error seeding pickup request data:", error);
    return [];
  }
};

module.exports = seedPickupRequests;