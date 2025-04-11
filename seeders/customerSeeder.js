// seeders/customerSeeder.js
const mongoose = require("mongoose");
const { faker } = require("@faker-js/faker/locale/id_ID");
const Customer = require("../models/Customer");
const User = require("../models/User");
const Branch = require("../models/Branch");

/**
 * Generate customer data
 * @param {number} count - Number of customers to generate
 */
const seedCustomers = async (count = 40) => {
  try {
    console.log("Starting customer seeding...");

    // Get available staff users
    const staffUsers = await User.find({
      $or: [
        { role: "staff_admin" },
        { role: "staff_penjualan" },
        { jabatan: { $regex: /(admin|staff|penjualan)/i } },
      ],
    });

    if (staffUsers.length === 0) {
      console.warn("No staff users found. Please run user seeder first.");
      return [];
    }

    // Get available branches
    const branches = await Branch.find({});

    if (branches.length === 0) {
      console.warn("No branches found. Please run branch seeder first.");
      return [];
    }

    // Delete existing customers
    console.log("Deleting existing customers...");
    await Customer.deleteMany({});

    // Create customer data array
    const customerData = [];

    // Create customers with different types
    // 40% pengirim, 40% penerima, 20% keduanya
    for (let i = 0; i < count; i++) {
      const tipeRoll = Math.random();
      const tipe =
        tipeRoll < 0.4 ? "pengirim" : tipeRoll < 0.8 ? "penerima" : "keduanya";

      // Pick random branch and staff user
      const randomBranch = faker.helpers.arrayElement(branches);
      const randomStaff = faker.helpers.arrayElement(staffUsers);

      // Generate company name (50% chance of being a company)
      const isCompany = faker.datatype.boolean(0.5);
      const companyName = isCompany
        ? faker.helpers.arrayElement(["PT", "CV", "UD", "Toko", "Koperasi"]) +
          " " +
          faker.company.name()
        : "";

      // Generate random province from Indonesia
      const provinsiList = [
        "DKI Jakarta",
        "Jawa Barat",
        "Jawa Tengah",
        "Jawa Timur",
        "Bali",
        "Sumatera Utara",
        "Sumatera Barat",
        "Sumatera Selatan",
        "Kalimantan Timur",
        "Kalimantan Barat",
        "Sulawesi Selatan",
      ];

      // Generate random kota based on provinsi
      const kotaMap = {
        "DKI Jakarta": [
          "Jakarta Pusat",
          "Jakarta Selatan",
          "Jakarta Barat",
          "Jakarta Timur",
          "Jakarta Utara",
        ],
        "Jawa Barat": [
          "Bandung",
          "Cimahi",
          "Bekasi",
          "Depok",
          "Bogor",
          "Tasikmalaya",
        ],
        "Jawa Tengah": ["Semarang", "Solo", "Magelang", "Pekalongan", "Tegal"],
        "Jawa Timur": ["Surabaya", "Malang", "Sidoarjo", "Kediri", "Pasuruan"],
        Bali: ["Denpasar", "Badung", "Gianyar", "Tabanan"],
        "Sumatera Utara": [
          "Medan",
          "Binjai",
          "Pematang Siantar",
          "Tebing Tinggi",
        ],
        "Sumatera Barat": [
          "Padang",
          "Bukittinggi",
          "Payakumbuh",
          "Padang Panjang",
        ],
        "Sumatera Selatan": [
          "Palembang",
          "Prabumulih",
          "Lubuklinggau",
          "Pagaralam",
        ],
        "Kalimantan Timur": [
          "Samarinda",
          "Balikpapan",
          "Bontang",
          "Tenggarong",
        ],
        "Kalimantan Barat": ["Pontianak", "Singkawang", "Ketapang"],
        "Sulawesi Selatan": ["Makassar", "Parepare", "Palopo", "Maros"],
      };

      const provinsi = faker.helpers.arrayElement(provinsiList);
      const kota = faker.helpers.arrayElement(
        kotaMap[provinsi] || ["Kota Lainnya"]
      );

      // Create customer object
      const customer = {
        nama: isCompany ? companyName : faker.person.fullName(),
        tipe,
        alamat: faker.location.streetAddress(true),
        kelurahan: faker.location.street(),
        kecamatan: faker.location.county(),
        kota,
        provinsi,
        telepon: faker.phone.number("+628##########"),
        email: faker.internet.email(),
        perusahaan: isCompany ? companyName : "",
        createdBy: randomStaff._id,
        cabangId: randomBranch._id,
        createdAt: faker.date.past({ years: 1 }),
        updatedAt: faker.date.recent({ days: 30 }),
      };

      customerData.push(customer);
    }

    // Insert customers
    console.log(`Inserting ${customerData.length} customers...`);
    const insertedCustomers = await Customer.insertMany(customerData);

    console.log(`Successfully seeded ${insertedCustomers.length} customers`);
    return insertedCustomers;
  } catch (error) {
    console.error("Error seeding customer data:", error);
    throw error;
  }
};

module.exports = seedCustomers;
