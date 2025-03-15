const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const Division = require('../models/Division');

const branchData = [
  {
    namaCabang: 'Cabang Jakarta',
    divisiId: null, // akan diisi saat seeding
    alamat: 'Jl. Raya Jakarta No. 10',
    kelurahan: 'Kebayoran Baru',
    kecamatan: 'Kebayoran Baru',
    kota: 'Jakarta Selatan',
    provinsi: 'DKI Jakarta',
    kontakPenanggungJawab: {
      nama: 'Budi Santoso',
      telepon: '081234567890',
      email: 'budi.santoso@samudra.co.id'
    }
  },
  {
    namaCabang: 'Cabang Surabaya',
    divisiId: null, // akan diisi saat seeding
    alamat: 'Jl. Raya Surabaya No. 25',
    kelurahan: 'Gubeng',
    kecamatan: 'Gubeng',
    kota: 'Surabaya',
    provinsi: 'Jawa Timur',
    kontakPenanggungJawab: {
      nama: 'Ani Widianti',
      telepon: '082345678901',
      email: 'ani.widianti@samudra.co.id'
    }
  },
  {
    namaCabang: 'Cabang Medan',
    divisiId: null, // akan diisi saat seeding
    alamat: 'Jl. Raya Medan No. 35',
    kelurahan: 'Helvetia',
    kecamatan: 'Medan Helvetia',
    kota: 'Medan',
    provinsi: 'Sumatera Utara',
    kontakPenanggungJawab: {
      nama: 'Ahmad Rifai',
      telepon: '083456789012',
      email: 'ahmad.rifai@samudra.co.id'
    }
  }
];

const seedBranches = async () => {
  try {
    // Hapus data existing
    await Branch.deleteMany({});
    
    // Ambil divisi yang sudah ada
    const divisions = await Division.find({});
    
    // Tambahkan divisi ke data cabang
    const seedBranchData = branchData.map((branch, index) => ({
      ...branch,
      divisiId: divisions[index % divisions.length]._id
    }));
    
    // Tambahkan data baru
    const branches = await Branch.create(seedBranchData);
    
    console.log('Cabang berhasil ditambahkan:', branches.length);
    return branches;
  } catch (error) {
    console.error('Gagal menambahkan cabang:', error);
    throw error;
  }
};

module.exports = seedBranches;