const mongoose = require('mongoose');
const Division = require('../models/Division');

const divisionData = [
  { namaDivisi: 'Logistik Nasional' },
  { namaDivisi: 'Distribusi Regional' },
  { namaDivisi: 'Ekspedisi Khusus' },
  { namaDivisi: 'Layanan Kargo' },
  { namaDivisi: 'Supir' },
  { namaDivisi: 'Kenek' }
];

const seedDivisions = async () => {
  try {
    // Hapus data existing
    await Division.deleteMany({});
    
    // Tambahkan data baru
    const divisions = await Division.create(divisionData);
    
    console.log('Divisi berhasil ditambahkan:', divisions.length);
    return divisions;
  } catch (error) {
    console.error('Gagal menambahkan divisi:', error);
    throw error;
  }
};

module.exports = seedDivisions;