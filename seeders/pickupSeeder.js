// seeders/pickupSeeder.js - Improved pickup seeder
const mongoose = require("mongoose");
const { faker } = require("@faker-js/faker/locale/id_ID");
const Pickup = require("../models/Pickup");
const Customer = require("../models/Customer");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const Branch = require("../models/Branch");
const PickupRequest = require("../models/PickupRequest");

/**
 * Generate pickup data
 * @param {number} count - Number of pickups to create
 */
const seedPickups = async (count = 50) => {
  try {
    console.log("Starting pickup seeding...");

    // Get available senders (customers)
    const senders = await Customer.find({
      $or: [{ tipe: "pengirim" }, { tipe: "keduanya" }],
    });

    if (senders.length === 0) {
      console.warn("No senders found. Please run customer seeder first.");
      return [];
    }

    // Get available drivers and helpers
    const drivers = await User.find({
      $or: [{ role: "supir" }, { jabatan: { $regex: /supir/i } }],
    });

    const helpers = await User.find({
      $or: [{ role: "kenek" }, { jabatan: { $regex: /kenek/i } }],
    });

    if (drivers.length === 0) {
      console.warn("No drivers found. Please run employee seeder first.");
      return [];
    }

    // Get available vehicles
    const vehicles = await Vehicle.find({
      tipe: "lansir",
    });

    if (vehicles.length === 0) {
      console.warn(
        "No lansir vehicles found. Please run vehicle seeder first."
      );
      return [];
    }

    // Get available branches
    const branches = await Branch.find({});

    if (branches.length === 0) {
      console.warn("No branches found. Please run branch seeder first.");
      return [];
    }

    // Get available staff users for userId
    const staffUsers = await User.find({
      $or: [
        { role: "staff_admin" },
        { role: "staff_penjualan" },
        { role: "kepala_gudang" },
        { jabatan: { $regex: /(admin|staff|kepala)/i } },
      ],
    });

    if (staffUsers.length === 0) {
      console.warn("No staff users found. Please run employee seeder first.");
      return [];
    }

    // Get some pickup requests to link with pickups
    const pendingRequests = await PickupRequest.find({
      status: "PENDING",
    }).limit(Math.min(20, count / 2));

    // Delete existing pickups
    console.log("Deleting existing pickups...");
    await Pickup.deleteMany({});

    // Create pickup data array
    const pickupData = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60); // Start from 60 days ago

    // Create pickup data
    for (let i = 0; i < count; i++) {
      // Pick random entities
      const randomSender = faker.helpers.arrayElement(senders);
      const randomDriver = faker.helpers.arrayElement(drivers);
      // Only include helper sometimes (70% chance)
      const randomHelper = faker.datatype.boolean(0.7)
        ? faker.helpers.arrayElement(helpers)
        : null;
      const randomVehicle = faker.helpers.arrayElement(vehicles);
      const randomBranch = faker.helpers.arrayElement(branches);
      const randomStaff = faker.helpers.arrayElement(staffUsers);

      // Generate a random date in the past 60 days
      const randomDays = faker.number.int({ min: 0, max: 60 });
      const pickupDate = new Date(startDate);
      pickupDate.setDate(pickupDate.getDate() + randomDays);

      // Determine status based on date and random factor
      const daysAgo = Math.floor(
        (new Date() - pickupDate) / (1000 * 60 * 60 * 24)
      );

      let status,
        waktuBerangkat = null,
        waktuPulang = null;

      if (daysAgo > 30) {
        // Older pickups are more likely to be completed
        const statusRoll = faker.number.float({ min: 0, max: 1 });

        if (statusRoll < 0.8) {
          status = "SELESAI";

          // Add departure and return times
          waktuBerangkat = new Date(pickupDate);
          waktuBerangkat.setHours(
            waktuBerangkat.getHours() + faker.number.int({ min: 1, max: 3 })
          );

          waktuPulang = new Date(waktuBerangkat);
          waktuPulang.setHours(
            waktuPulang.getHours() + faker.number.int({ min: 2, max: 6 })
          );
        } else if (statusRoll < 0.9) {
          status = "CANCELLED";
        } else {
          status = "BERANGKAT";

          // Add only departure time
          waktuBerangkat = new Date(pickupDate);
          waktuBerangkat.setHours(
            waktuBerangkat.getHours() + faker.number.int({ min: 1, max: 3 })
          );
        }
      } else if (daysAgo > 7) {
        // Medium-aged pickups
        const statusRoll = faker.number.float({ min: 0, max: 1 });

        if (statusRoll < 0.6) {
          status = "SELESAI";

          // Add departure and return times
          waktuBerangkat = new Date(pickupDate);
          waktuBerangkat.setHours(
            waktuBerangkat.getHours() + faker.number.int({ min: 1, max: 3 })
          );

          waktuPulang = new Date(waktuBerangkat);
          waktuPulang.setHours(
            waktuPulang.getHours() + faker.number.int({ min: 2, max: 6 })
          );
        } else if (statusRoll < 0.8) {
          status = "BERANGKAT";

          // Add only departure time
          waktuBerangkat = new Date(pickupDate);
          waktuBerangkat.setHours(
            waktuBerangkat.getHours() + faker.number.int({ min: 1, max: 3 })
          );
        } else if (statusRoll < 0.9) {
          status = "CANCELLED";
        } else {
          status = "PENDING";
        }
      } else {
        // Recent pickups
        const statusRoll = faker.number.float({ min: 0, max: 1 });

        if (statusRoll < 0.4) {
          status = "PENDING";
        } else if (statusRoll < 0.7) {
          status = "BERANGKAT";

          // Add only departure time
          waktuBerangkat = new Date(pickupDate);
          waktuBerangkat.setHours(
            waktuBerangkat.getHours() + faker.number.int({ min: 1, max: 3 })
          );
        } else if (statusRoll < 0.95) {
          status = "SELESAI";

          // Add departure and return times
          waktuBerangkat = new Date(pickupDate);
          waktuBerangkat.setHours(
            waktuBerangkat.getHours() + faker.number.int({ min: 1, max: 3 })
          );

          waktuPulang = new Date(waktuBerangkat);
          waktuPulang.setHours(
            waktuPulang.getHours() + faker.number.int({ min: 2, max: 6 })
          );
        } else {
          status = "CANCELLED";
        }
      }

      // Maybe link to a request (30% chance)
      let requestId = null;
      if (pendingRequests.length > 0 && faker.datatype.boolean(0.3)) {
        // Get a random request and remove it from the array
        const randomIndex = faker.number.int({
          min: 0,
          max: pendingRequests.length - 1,
        });
        const request = pendingRequests.splice(randomIndex, 1)[0];
        if (request) {
          requestId = request._id;

          // Update the address and other details from the request
          const pickupRequest = await PickupRequest.findById(requestId);
          if (pickupRequest) {
            // Use request address and details
            var requestAddress = pickupRequest.alamatPengambilan;
            var requestTujuan = pickupRequest.tujuan;
            var requestJumlahColly = pickupRequest.jumlahColly;
          }
        }
      }

      // Generate addresses and details (either from request or random)
      const alamatPengambilan = requestId && requestAddress
        ? requestAddress
        : faker.location.streetAddress(true);
      const tujuanList = [
        "Jakarta",
        "Bandung",
        "Surabaya",
        "Medan",
        "Makassar",
        "Semarang",
        "Yogyakarta",
        "Palembang",
      ];
      const tujuan = requestId && requestTujuan
        ? requestTujuan
        : faker.helpers.arrayElement(tujuanList);

      // Generate random colly count
      const jumlahColly = requestId && requestJumlahColly
        ? requestJumlahColly
        : faker.number.int({ min: 1, max: 10 });

      // Generate estimasi pengambilan
      const estimasiOptions = [
        "Pagi (08.00-12.00)",
        "Siang (12.00-15.00)",
        "Sore (15.00-18.00)",
        "1-2 jam",
        "2-3 jam",
        "Besok pagi",
      ];
      const estimasiPengambilan = faker.helpers.arrayElement(estimasiOptions);

      // Generate notes (30% chance)
      let notes = null;
      if (faker.datatype.boolean(0.3)) {
        if (status === "CANCELLED") {
          notes = faker.helpers.arrayElement([
            "Dibatalkan oleh pelanggan",
            "Alamat tidak ditemukan",
            "Supir berhalangan",
            "Jadwal diundur",
            "Kendaraan rusak",
          ]);
        } else if (status === "SELESAI") {
          notes = faker.helpers.arrayElement([
            "Pengambilan lancar",
            "Barang sudah diterima gudang",
            "Proses berjalan normal",
            "Tidak ada kendala",
          ]);
        } else if (status === "BERANGKAT") {
          notes = faker.helpers.arrayElement([
            "Sedang dalam perjalanan",
            "Perkiraan tiba 1 jam lagi",
            "Terjebak macet",
            "Supir sudah konfirmasi keberangkatan",
          ]);
        }
      }

      // Generate pickup number
      const branchCode = randomBranch.namaCabang.substring(0, 3).toUpperCase();
      const day = String(pickupDate.getDate()).padStart(2, '0');
      const month = String(pickupDate.getMonth() + 1).padStart(2, '0');
      const year = String(pickupDate.getFullYear()).slice(-2);
      const dateStr = `${day}${month}${year}`;
      const counterStr = String(i + 1).padStart(4, '0');
      const noPengambilan = `PKP-${branchCode}-${dateStr}-${counterStr}`;

      // Create pickup object
      const pickup = {
        tanggal: pickupDate,
        noPengambilan,
        pengirimId: randomSender._id,
        alamatPengambilan: alamatPengambilan || "Alamat Default",
        tujuan: tujuan || "Jakarta",
        jumlahColly: jumlahColly || 1,
        supirId: randomDriver._id,
        kenekId: randomHelper ? randomHelper._id : null,
        kendaraanId: randomVehicle._id,
        status,
        waktuBerangkat,
        waktuPulang,
        estimasiPengambilan,
        notes,
        userId: randomStaff._id,
        cabangId: randomBranch._id,
        requestId,
        createdAt: pickupDate,
        updatedAt: status === "PENDING" ? pickupDate : new Date(),
      };

      pickupData.push(pickup);
    }

    // Insert the pickups
    console.log(`Inserting ${pickupData.length} pickups...`);
    const insertedPickups = await Pickup.insertMany(pickupData);

    // Update pickup requests that were linked to pickups
    for (const pickup of insertedPickups) {
      if (pickup.requestId) {
        await PickupRequest.findByIdAndUpdate(pickup.requestId, {
          status: "FINISH",
          pickupId: pickup._id,
        });
      }
    }

    console.log(`Successfully seeded ${insertedPickups.length} pickups`);
    return insertedPickups;
  } catch (error) {
    console.error("Error seeding pickup data:", error);
    throw error;
  }
};

module.exports = seedPickups;
