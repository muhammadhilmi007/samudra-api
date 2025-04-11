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
    username: 'ahmad_direktur',
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
    username: 'budi_keuangan',
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
    username: 'ani_operasional',
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
    username: 'rini_admin',
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
    username: 'joko_supir',
    password: 'SamudraERP2024!',
    cabangId: null,
    fotoProfil: 'default.jpg',
    dokumen: {
      ktp: 'ktp_joko.pdf',
      sim: 'sim_joko.pdf'
    },
    aktif: true
  },
  {
    nama: 'Agus Supir',
    jabatan: 'Supir',
    role: 'supir',
    email: 'agus.supir@samudra.co.id',
    telepon: '085678901235',
    alamat: 'Jl. Supir No. 6, Surabaya',
    username: 'agus_supir',
    password: 'SamudraERP2024!',
    cabangId: null,
    fotoProfil: 'default.jpg',
    dokumen: {
      ktp: 'ktp_agus.pdf',
      sim: 'sim_agus.pdf'
    },
    aktif: true
  },
  {
    nama: 'Dedi Supir',
    jabatan: 'Supir',
    role: 'supir',
    email: 'dedi.supir@samudra.co.id',
    telepon: '085678901236',
    alamat: 'Jl. Supir No. 7, Bandung',
    username: 'dedi_supir',
    password: 'SamudraERP2024!',
    cabangId: null,
    fotoProfil: 'default.jpg',
    dokumen: {
      ktp: 'ktp_dedi.pdf',
      sim: 'sim_dedi.pdf'
    },
    aktif: true
  },
  {
    nama: 'Anto Kenek',
    jabatan: 'Kenek',
    role: 'kenek',
    email: 'anto.kenek@samudra.co.id',
    telepon: '085678901237',
    alamat: 'Jl. Kenek No. 8, Jakarta',
    username: 'anto_kenek',
    password: 'SamudraERP2024!',
    cabangId: null,
    fotoProfil: 'default.jpg',
    dokumen: {
      ktp: 'ktp_anto.pdf'
    },
    aktif: true
  },
  {
    nama: 'Bejo Kenek',
    jabatan: 'Kenek',
    role: 'kenek',
    email: 'bejo.kenek@samudra.co.id',
    telepon: '085678901238',
    alamat: 'Jl. Kenek No. 9, Surabaya',
    username: 'bejo_kenek',
    password: 'SamudraERP2024!',
    cabangId: null,
    fotoProfil: 'default.jpg',
    dokumen: {
      ktp: 'ktp_bejo.pdf'
    },
    aktif: true
  },
  {
    nama: 'Candra Kenek',
    jabatan: 'Kenek',
    role: 'kenek',
    email: 'candra.kenek@samudra.co.id',
    telepon: '085678901239',
    alamat: 'Jl. Kenek No. 10, Bandung',
    username: 'candra_kenek',
    password: 'SamudraERP2024!',
    cabangId: null,
    fotoProfil: 'default.jpg',
    dokumen: {
      ktp: 'ktp_candra.pdf'
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
        console.warn(`Role not found for code: ${user.role}, using default role`);
        return null;
      }

      return {
        ...user,
        cabangId: branches[index % branches.length]._id,
        roleId: role._id
      };
    }));

    const filteredUserData = seedUserData.filter(user => user !== null);

    const users = await User.create(filteredUserData);

    console.log('Users added successfully:', users.length);
    return users;
  } catch (error) {
    console.error('Failed to add users:', error);
    throw error;
  }
};

module.exports = seedUsers;