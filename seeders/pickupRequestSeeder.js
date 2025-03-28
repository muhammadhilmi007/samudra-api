// seeders/pickupRequestSeeder.js
const mongoose = require("mongoose");
const { faker } = require("@faker-js/faker");
const PickupRequest = require("../models/PickupRequest");
const Customer = require("../models/Customer");
const User = require("../models/User");
const Branch = require("../models/Branch");

const seedPickupRequests = async () => {
  faker.locale = "id_ID";

  try {
    // Get existing data for references
    const customers = await Customer.find({
      tipe: { $in: ["Pengirim", "Keduanya"] },
    }).limit(10);
    const branches = await Branch.find();
    const staffUsers = await User.find({
      roleId: {
        $in: [
          // Get users with admin, staff, or operational roles
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

    for (let i = 0; i < 30; i++) {
      const randomCustomer =
        customers[Math.floor(Math.random() * customers.length)];
      const randomBranch =
        branches[Math.floor(Math.random() * branches.length)];
      // seeders/pickupRequestSeeder.js (continued)
      const randomStaff =
        staffUsers[Math.floor(Math.random() * staffUsers.length)];
      const status = Math.random() > 0.3 ? "PENDING" : "FINISH";

      // Generate a date within last 60 days
      const createdDate = faker.date.recent(60);

      pickupRequestsData.push({
        tanggal: createdDate,
        pengirimId: randomCustomer._id,
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
