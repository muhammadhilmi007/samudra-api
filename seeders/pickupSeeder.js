// seeders/pickupSeeder.js
const mongoose = require("mongoose");
const { faker } = require("@faker-js/faker");
const Pickup = require("../models/Pickup");
const Customer = require("../models/Customer");
const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const Branch = require("../models/Branch");

const seedPickups = async () => {
  faker.locale = "id_ID";

  try {
    // Get existing data for references
    const customers = await Customer.find({
      tipe: { $in: ["Pengirim", "Keduanya"] },
    }).limit(10);
    const branches = await Branch.find();

    // Get drivers
    const drivers = await User.find({
      roleId: await mongoose
        .model("Role")
        .findOne({ kodeRole: "supir" })
        .select("_id"),
    });

    // Get assistants
    const assistants = await User.find({
      roleId: await mongoose
        .model("Role")
        .findOne({ kodeRole: "kenek" })
        .select("_id"),
    });

    // Get vehicles of type lansir
    const vehicles = await Vehicle.find({ tipe: "lansir" });

    // Get staff users
    const staffUsers = await User.find({
      roleId: {
        $in: [
          await mongoose
            .model("Role")
            .find({
              $or: [
                { kodeRole: "manajer_operasional" },
                { kodeRole: "staff_admin" },
                { kodeRole: "kepala_gudang" },
              ],
            })
            .select("_id"),
        ],
      },
    });

    if (
      !customers.length ||
      !branches.length ||
      !drivers.length ||
      !vehicles.length ||
      !staffUsers.length
    ) {
      console.log(
        "Required reference data not found. Make sure to run all prerequisite seeders first."
      );
      return [];
    }

    // Delete existing data
    await Pickup.deleteMany({});

    // Create pickups data
    const pickupsData = [];

    for (let i = 0; i < 20; i++) {
      const randomCustomer =
        customers[Math.floor(Math.random() * customers.length)];
      const randomBranch =
        branches[Math.floor(Math.random() * branches.length)];
      const randomDriver = drivers[Math.floor(Math.random() * drivers.length)];
      const randomAssistant = assistants.length
        ? assistants[Math.floor(Math.random() * assistants.length)]
        : null;
      const randomVehicle =
        vehicles[Math.floor(Math.random() * vehicles.length)];
      const randomStaff =
        staffUsers[Math.floor(Math.random() * staffUsers.length)];

      // Generate a date within last 30 days
      const createdDate = faker.date.recent(30);

      // Generate pickup number manually for seeding
      const branchCode = randomBranch.namaCabang.substring(0, 3).toUpperCase();
      const dateStr = createdDate.toISOString().slice(2, 10).replace(/-/g, "");
      const counterStr = (i + 1).toString().padStart(4, "0");
      const noPengambilan = `PKP-${branchCode}-${dateStr}-${counterStr}`;

      // Determine status and timestamps
      const status = faker.random.arrayElement([
        "PENDING",
        "BERANGKAT",
        "SELESAI",
      ]);
      let waktuBerangkat = null;
      let waktuPulang = null;

      if (status === "BERANGKAT" || status === "SELESAI") {
        waktuBerangkat = new Date(createdDate);
        waktuBerangkat.setHours(waktuBerangkat.getHours() + 1);
      }

      if (status === "SELESAI") {
        waktuPulang = new Date(waktuBerangkat);
        waktuPulang.setHours(
          waktuPulang.getHours() + Math.floor(Math.random() * 4) + 1
        );
      }

      pickupsData.push({
        tanggal: createdDate,
        noPengambilan,
        pengirimId: randomCustomer._id,
        sttIds: [], // Initially empty, can be populated later
        supirId: randomDriver._id,
        kenekId: randomAssistant ? randomAssistant._id : undefined,
        kendaraanId: randomVehicle._id,
        waktuBerangkat,
        waktuPulang,
        estimasiPengambilan: `${Math.floor(Math.random() * 3) + 1} jam`,
        alamatPengambilan: faker.address.streetAddress(),
        tujuan: faker.address.city(),
        jumlahColly: Math.floor(Math.random() * 10) + 1,
        userId: randomStaff._id,
        cabangId: randomBranch._id,
        status,
        createdAt: createdDate,
        updatedAt: createdDate,
      });
    }

    // Insert pickups
    const pickups = await Pickup.insertMany(pickupsData);
    console.log(`${pickups.length} pickups seeded successfully`);
    return pickups;
  } catch (error) {
    console.error("Error seeding pickup data:", error);
    return [];
  }
};

module.exports = seedPickups;
