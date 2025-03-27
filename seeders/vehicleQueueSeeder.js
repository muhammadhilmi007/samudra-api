const mongoose = require('mongoose');
const VehicleQueue = require('../models/VehicleQueue');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const Branch = require('../models/Branch');

const seedVehicleQueues = async () => {
  try {
    // Delete existing data
    await VehicleQueue.deleteMany({});
    
    // Get references to vehicles, users, and branches
    const lansirVehicles = await Vehicle.find({ tipe: 'lansir' }).limit(4);
    const branches = await Branch.find({});
    const users = await User.find({ role: { $in: ['checker', 'kepala_gudang', 'staff_admin'] } });
    
    if (lansirVehicles.length === 0) {
      console.warn('No lansir vehicles found. Skipping vehicle queue seeding.');
      return [];
    }
    
    if (branches.length === 0 || users.length === 0) {
      console.warn('No branches or users found. Skipping vehicle queue seeding.');
      return [];
    }
    
    // Create queue data
    const queueData = lansirVehicles.map((vehicle, index) => {
      const statusOptions = ['MENUNGGU', 'LANSIR', 'KEMBALI'];
      const status = statusOptions[index % statusOptions.length];
      
      return {
        kendaraanId: vehicle._id,
        supirId: vehicle.supirId,
        kenekId: vehicle.kenekId || null,
        urutan: index + 1,
        status: status,
        cabangId: vehicle.cabangId,
        createdBy: users[index % users.length]._id
      };
    });
    
    // Add data
    const vehicleQueues = await VehicleQueue.create(queueData);
    
    console.log('Vehicle queues successfully added:', vehicleQueues.length);
    return vehicleQueues;
  } catch (error) {
    console.error('Failed to add vehicle queues:', error);
    throw error;
  }
};

module.exports = seedVehicleQueues;