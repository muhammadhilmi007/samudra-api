const mongoose = require('mongoose');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Role = require('../models/Role');

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
    cabangId: null,
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
    cabangId: null,
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
    cabangId: null,
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
    cabangId: null,
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
    cabangId: null,
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
    await User.deleteMany({});

    const [branches, roles] = await Promise.all([
      Branch.find({}),
      Role.find({})
    ]);

    if (branches.length === 0) {
      throw new Error('No branches available. Run branch seeder first.');
    }

    if (roles.length === 0) {
      throw new Error('No roles available. Run role seeder first.');
    }

    const seedUserData = await Promise.all(userData.map(async (user, index) => {
      const role = roles.find(r => r.kodeRole === user.role);
      
      if (!role) {
        console.error(`Role not found for code: ${user.role}`);
        throw new Error(`Role ${user.role} not found`);
      }

      return {
        ...user,
        cabangId: branches[index % branches.length]._id,
        roleId: role._id
      };
    }));

    const users = await User.create(seedUserData);

    console.log('Users added successfully:', users.length);
    return users;
  } catch (error) {
    console.error('Failed to add users:', error);
    throw error;
  }
};

module.exports = seedUsers;