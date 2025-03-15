const mongoose = require('mongoose');
const User = require('../models/User');
const Branch = require('../models/Branch');

const userData = [
  {
    nama: 'Ahmad Direktur',
    jabatan: 'Direktur Utama',
    role: 'direktur',
    email: 'ahmad.direktur@samudra.co.id',
    telepon: '081234567890',
    alamat: 'Jl. Direktur No. 1, Jakarta',
    username: 'ahmad.direktur',
    password: 'SamudraERP2024!',
    cabangId: null, // akan diisi saat seeding
    fotoProfil: 'default.jpg',
    dokumen: {
      ktp: 'ktp_ahmad.pdf',
      npwp: 'npwp_ahmad.pdf'
    },
    aktif: true
  },
  {
    nama: 'Budi Keuangan',
    jabatan: 'Manajer Keuangan',
    role: 'manajer_keuangan',
    email: 'budi.keuangan@samudra.co.id',
    telepon: '082345678901',
    alamat: 'Jl. Keuangan No. 2, Jakarta',
    username: 'budi.keuangan',
    password: 'SamudraERP2024!',
    cabangId: null, // akan diisi saat seeding
    fotoProfil: 'default.jpg',
    dokumen: {
      ktp: 'ktp_budi.pdf',
      npwp: 'npwp_budi.pdf'
    },
    aktif: true
  },
  {
    nama: 'Ani Operasional',
    jabatan: 'Manajer Operasional',
    role: 'manajer_operasional',
    email: 'ani.operasional@samudra.co.id',
    telepon: '083456789012',
    alamat: 'Jl. Operasional No. 3, Surabaya',
    username: 'ani.operasional',
    password: 'SamudraERP2024!',
    cabangId: null, // akan diisi saat seeding
    fotoProfil: 'default.jpg',
    dokumen: {
      ktp: 'ktp_ani.pdf',
      npwp: 'npwp_ani.pdf'
    },
    aktif: true
  },
  {
    nama: 'Rini Admin',
    jabatan: 'Staff Admin',
    role: 'staff_admin',
    email: 'rini.admin@samudra.co.id',
    telepon: '084567890123',
    alamat: 'Jl. Admin No. 4, Medan',
    username: 'rini.admin',
    password: 'SamudraERP2024!',
    cabangId: null, // akan diisi saat seeding
    fotoProfil: 'default.jpg',
    dokumen: {
      ktp: 'ktp_rini.pdf'
    },
    aktif: true
  },
  {
    nama: 'Supir Joko',
    jabatan: 'Supir Truck',
    role: 'supir',
    email: 'joko.supir@samudra.co.id',
    telepon: '085678901234',
    alamat: 'Jl. Supir No. 5, Jakarta',
    username: 'joko.supir',
    password: 'SamudraERP2024!',
    cabangId: null, // akan diisi saat seeding
    fotoProfil: 'default.jpg',
    dokumen: {
      ktp: 'ktp_joko.pdf',
      sim: 'sim_joko.pdf'
    },
    aktif: true
  }
];

const seedUsers = async () => {
  try {
    // Hapus data existing
    await User.deleteMany({});
    
    // Ambil cabang yang sudah ada
    const branches = await Branch.find({});
    
    if (branches.length === 0) {
      throw new Error('Tidak ada cabang yang tersedia. Jalankan branch seeder terlebih dahulu.');
    }
    
    // Tambahkan cabang ke data user
    const seedUserData = userData.map((user, index) => ({
      ...user,
      cabangId: branches[index % branches.length]._id
    }));
    
    // Tambahkan data baru
    const users = await User.create(seedUserData);
    
    console.log('User berhasil ditambahkan:', users.length);
    return users;
  } catch (error) {
    console.error('Gagal menambahkan user:', error);
    throw error;
  }
};

module.exports = seedUsers;