const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const Branch = require('../models/Branch');

const vehicleData = [
  {
    noPolisi: 'B 1234 KLM',
    namaKendaraan: 'Toyota Hiace',
    noTeleponSupir: '081234567890',
    noKTPSupir: '3201012345678901',
    alamatSupir: 'Jl. Raya Jakarta No. 10',
    noTeleponKenek: '081234567891',
    noKTPKenek: '3201012345678902',
    alamatKenek: 'Jl. Raya Jakarta No. 11',
    tipe: 'lansir',
    grup: 'Express'
  },
  {
    noPolisi: 'B 5678 XYZ',
    namaKendaraan: 'Mitsubishi Colt Diesel',
    noTeleponSupir: '081234567892',
    noKTPSupir: '3201012345678903',
    alamatSupir: 'Jl. Raya Jakarta No. 12',
    tipe: 'antar_cabang',
    grup: 'Heavy Duty'
  },
  {
    noPolisi: 'D 9012 ABC',
    namaKendaraan: 'Isuzu ELF',
    noTeleponSupir: '081234567893',
    noKTPSupir: '3201012345678904',
    alamatSupir: 'Jl. Raya Bandung No. 15',
    noTeleponKenek: '081234567894',
    noKTPKenek: '3201012345678905',
    alamatKenek: 'Jl. Raya Bandung No. 16',
    tipe: 'lansir'
  },
  {
    noPolisi: 'D 3456 DEF',
    namaKendaraan: 'Hino Dutro',
    noTeleponSupir: '081234567895',
    noKTPSupir: '3201012345678906',
    alamatSupir: 'Jl. Raya Bandung No. 17',
    tipe: 'antar_cabang',
    grup: 'Heavy Duty'
  },
  {
    noPolisi: 'L 7890 GHI',
    namaKendaraan: 'Daihatsu Gran Max',
    noTeleponSupir: '081234567896',
    noKTPSupir: '3201012345678907',
    alamatSupir: 'Jl. Raya Surabaya No. 20',
    tipe: 'lansir',
    grup: 'Express'
  },
  {
    noPolisi: 'L 1234 JKL',
    namaKendaraan: 'Mitsubishi Fuso',
    noTeleponSupir: '081234567897',
    noKTPSupir: '3201012345678908',
    alamatSupir: 'Jl. Raya Surabaya No. 21',
    noTeleponKenek: '081234567898',
    noKTPKenek: '3201012345678909',
    alamatKenek: 'Jl. Raya Surabaya No. 22',
    tipe: 'antar_cabang',
    grup: 'Logistics'
  }
];

const seedVehicles = async () => {
  try {
    // Delete existing data
    await Vehicle.deleteMany({});
    
    // Get branches
    const branches = await Branch.find({});
    if (branches.length === 0) {
      throw new Error('No branches available. Run branch seeder first.');
    }
    
    // Get drivers and assistants
    const drivers = await User.find({ role: { $in: ['supir', 'driver'] } });
    const assistants = await User.find({ role: { $in: ['kenek', 'assistant'] } });
    
    if (drivers.length === 0) {
      throw new Error('No drivers available. Run user seeder first.');
    }
    
    // Map data with real IDs
    const seedVehicleData = vehicleData.map((vehicle, index) => {
      const branchIndex = index % branches.length;
      const driverIndex = index % drivers.length;
      const assistantIndex = index % assistants.length;
      
      return {
        ...vehicle,
        cabangId: branches[branchIndex]._id,
        supirId: drivers[driverIndex]._id,
        kenekId: vehicle.noTeleponKenek ? assistants[assistantIndex]._id : undefined
      };
    });
    
    // Add data
    const vehicles = await Vehicle.create(seedVehicleData);
    
    console.log('Vehicles successfully added:', vehicles.length);
    return vehicles;
  } catch (error) {
    console.error('Failed to add vehicles:', error);
    throw error;
  }
};

module.exports = seedVehicles;