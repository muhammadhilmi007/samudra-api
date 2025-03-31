// seeder/employeeSeeder.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Division = require('../models/Division');
const Branch = require('../models/Branch');
const Role = require('../models/Role');
const User = require('../models/User');
const config = require('../config/config');

// Import database connection
const { connectDB, disconnectDB } = require('../config/db');

// Define seed data
const divisionData = [
  {
    namaDivisi: 'Kantor Pusat',
  },
  {
    namaDivisi: 'Divisi Jawa',
  },
  {
    namaDivisi: 'Divisi Sumatera',
  },
  {
    namaDivisi: 'Divisi Kalimantan',
  }
];

const branchData = [
  {
    namaCabang: 'Jakarta Pusat',
    alamat: 'Jl. Jenderal Sudirman No. 10',
    kelurahan: 'Karet Tengsin',
    kecamatan: 'Tanah Abang',
    kota: 'Jakarta Pusat',
    provinsi: 'DKI Jakarta',
    kontakPenanggungJawab: {
      nama: 'Bambang Suprapto',
      telepon: '08123456789',
      email: 'bambang@samudrapaket.com'
    }
  },
  {
    namaCabang: 'Bandung',
    alamat: 'Jl. Asia Afrika No. 88',
    kelurahan: 'Pasar Baru',
    kecamatan: 'Sumur Bandung',
    kota: 'Bandung',
    provinsi: 'Jawa Barat',
    kontakPenanggungJawab: {
      nama: 'Agus Priyanto',
      telepon: '08234567890',
      email: 'agus@samudrapaket.com'
    }
  },
  {
    namaCabang: 'Surabaya',
    alamat: 'Jl. Tunjungan No. 50',
    kelurahan: 'Genteng',
    kecamatan: 'Genteng',
    kota: 'Surabaya',
    provinsi: 'Jawa Timur',
    kontakPenanggungJawab: {
      nama: 'Rudi Santoso',
      telepon: '08345678901',
      email: 'rudi@samudrapaket.com'
    }
  },
  {
    namaCabang: 'Medan',
    alamat: 'Jl. Gatot Subroto No. 44',
    kelurahan: 'Sei Sikambing',
    kecamatan: 'Medan Petisah',
    kota: 'Medan',
    provinsi: 'Sumatera Utara',
    kontakPenanggungJawab: {
      nama: 'Dedi Sinaga',
      telepon: '08456789012',
      email: 'dedi@samudrapaket.com'
    }
  },
  {
    namaCabang: 'Palembang',
    alamat: 'Jl. Jenderal Sudirman No. 20',
    kelurahan: 'Ilir Timur I',
    kecamatan: 'Ilir Timur I',
    kota: 'Palembang',
    provinsi: 'Sumatera Selatan',
    kontakPenanggungJawab: {
      nama: 'Ahmad Harun',
      telepon: '08567890123',
      email: 'ahmad@samudrapaket.com'
    }
  },
  {
    namaCabang: 'Balikpapan',
    alamat: 'Jl. Jenderal Sudirman No. 33',
    kelurahan: 'Klandasan Ilir',
    kecamatan: 'Balikpapan Kota',
    kota: 'Balikpapan',
    provinsi: 'Kalimantan Timur',
    kontakPenanggungJawab: {
      nama: 'Eko Purnomo',
      telepon: '08678901234',
      email: 'eko@samudrapaket.com'
    }
  }
];

const roleData = [
  {
    namaRole: 'Direktur',
    kodeRole: 'direktur',
    permissions: [
      'view_dashboard', 'manage_employees', 'manage_branches', 'manage_divisions',
      'manage_roles', 'manage_customers', 'view_reports', 'manage_finances',
      'manage_vehicles', 'view_stt', 'create_stt', 'edit_stt', 'delete_stt',
      'manage_loadings', 'manage_deliveries', 'manage_returns',
      'manage_pickups', 'manage_collections', 'manage_truck_queues'
    ]
  },
  {
    namaRole: 'Manajer Administrasi',
    kodeRole: 'manajer_admin',
    permissions: [
      'view_dashboard', 'manage_employees', 'view_branches', 'view_divisions',
      'manage_roles', 'view_customers', 'view_reports', 'view_finances',
      'view_vehicles', 'view_stt', 'manage_pickups', 'view_collections'
    ]
  },
  {
    namaRole: 'Manajer Keuangan',
    kodeRole: 'manajer_keuangan',
    permissions: [
      'view_dashboard', 'view_reports', 'manage_finances', 'view_collections',
      'view_stt', 'view_employees', 'view_branches'
    ]
  },
  {
    namaRole: 'Manajer Operasional',
    kodeRole: 'manajer_operasional',
    permissions: [
      'view_dashboard', 'view_reports', 'manage_vehicles', 'view_stt',
      'manage_loadings', 'manage_deliveries', 'manage_returns',
      'manage_pickups', 'view_truck_queues'
    ]
  },
  {
    namaRole: 'Manajer SDM',
    kodeRole: 'manajer_sdm',
    permissions: [
      'view_dashboard', 'manage_employees', 'view_branches',
      'view_reports', 'manage_roles'
    ]
  },
  {
    namaRole: 'Kepala Cabang',
    kodeRole: 'kepala_cabang',
    permissions: [
      'view_dashboard', 'manage_branch_employees', 'view_branch_customers',
      'view_branch_reports', 'view_branch_finances', 'view_branch_vehicles',
      'view_branch_stt', 'create_branch_stt', 'edit_branch_stt',
      'manage_branch_loadings', 'manage_branch_deliveries', 'manage_branch_returns',
      'manage_branch_pickups', 'manage_branch_collections', 'manage_branch_truck_queues'
    ]
  },
  {
    namaRole: 'Staff Administrasi',
    kodeRole: 'staff_admin',
    permissions: [
      'view_dashboard', 'view_branch_customers', 'view_branch_reports',
      'view_branch_stt', 'edit_branch_stt'
    ]
  },
  {
    namaRole: 'Staff Penjualan',
    kodeRole: 'staff_penjualan',
    permissions: [
      'view_dashboard', 'view_branch_customers', 'create_branch_customers',
      'view_branch_stt', 'create_branch_stt'
    ]
  },
  {
    namaRole: 'Kasir',
    kodeRole: 'kasir',
    permissions: [
      'view_dashboard', 'view_branch_finances', 'manage_branch_transactions'
    ]
  },
  {
    namaRole: 'Checker',
    kodeRole: 'checker',
    permissions: [
      'view_dashboard', 'view_branch_loadings', 'view_branch_deliveries',
      'view_branch_stt', 'update_branch_stt_status'
    ]
  },
  {
    namaRole: 'Supir',
    kodeRole: 'supir',
    permissions: [
      'view_dashboard', 'view_assigned_deliveries', 'update_delivery_status'
    ]
  }
];

const userData = [
  {
    nama: 'Administrator',
    jabatan: 'Direktur Utama',
    email: 'admin@samudrapaket.com',
    telepon: '081234567890',
    alamat: 'Jl. Jenderal Sudirman No. 10, Jakarta Pusat',
    username: 'admin',
    password: 'Admin123@',
    aktif: true
  },
  {
    nama: 'Bambang Suprapto',
    jabatan: 'Kepala Cabang Jakarta',
    email: 'bambang@samudrapaket.com',
    telepon: '081234567891',
    alamat: 'Jl. Kebon Jeruk No. 15, Jakarta Barat',
    username: 'bambang',
    password: 'Bambang123@',
    aktif: true
  },
  {
    nama: 'Agus Priyanto',
    jabatan: 'Kepala Cabang Bandung',
    email: 'agus@samudrapaket.com',
    telepon: '081234567892',
    alamat: 'Jl. Dipatiukur No. 23, Bandung',
    username: 'agussp',
    password: 'Agus123@',
    aktif: true
  },
  {
    nama: 'Rudi Santoso',
    jabatan: 'Kepala Cabang Surabaya',
    email: 'rudi@samudrapaket.com',
    telepon: '081234567893',
    alamat: 'Jl. Darmo No. 45, Surabaya',
    username: 'rudisp',
    password: 'Rudi123@',
    aktif: true
  },
  {
    nama: 'Dedi Sinaga',
    jabatan: 'Kepala Cabang Medan',
    email: 'dedi@samudrapaket.com',
    telepon: '081234567894',
    alamat: 'Jl. Diponegoro No. 12, Medan',
    username: 'dedisp',
    password: 'Dedi123@',
    aktif: true
  },
  {
    nama: 'Santoso Wijaya',
    jabatan: 'Staff Administrasi',
    email: 'santoso@samudrapaket.com',
    telepon: '081234567895',
    alamat: 'Jl. Kebon Sirih No. 5, Jakarta Pusat',
    username: 'santoso',
    password: 'Santoso123@',
    aktif: true
  },
  {
    nama: 'Budi Hartono',
    jabatan: 'Staff Penjualan',
    email: 'budi@samudrapaket.com',
    telepon: '081234567896',
    alamat: 'Jl. Sudirman No. 30, Jakarta Selatan',
    username: 'budisp',
    password: 'Budi123@',
    aktif: true
  },
  {
    nama: 'Wati Susilawati',
    jabatan: 'Kasir',
    email: 'wati@samudrapaket.com',
    telepon: '081234567897',
    alamat: 'Jl. Fatmawati No. 8, Jakarta Selatan',
    username: 'watisp',
    password: 'Wati123@',
    aktif: true
  },
  {
    nama: 'Joko Susilo',
    jabatan: 'Checker',
    email: 'joko@samudrapaket.com',
    telepon: '081234567898',
    alamat: 'Jl. Pramuka No. 22, Jakarta Timur',
    username: 'jokosp',
    password: 'Joko123@',
    aktif: true
  },
  {
    nama: 'Hadi Sutrisno',
    jabatan: 'Supir',
    email: 'hadi@samudrapaket.com',
    telepon: '081234567899',
    alamat: 'Jl. Tanah Abang No. 11, Jakarta Pusat',
    username: 'hadisp',
    password: 'Hadi123@',
    aktif: true
  }
];

// Seed function for Divisions
const seedDivisions = async () => {
  try {
    await Division.deleteMany({});
    console.log('Deleted existing divisions');

    const divisions = await Division.insertMany(divisionData);
    console.log(`${divisions.length} divisions inserted`);
    return divisions;
  } catch (error) {
    console.error('Error seeding divisions:', error);
    throw error;
  }
};

// Seed function for Branches
const seedBranches = async (divisions) => {
  try {
    await Branch.deleteMany({});
    console.log('Deleted existing branches');

    // Assign divisions to branches
    const branchesWithDivisions = branchData.map((branch, index) => {
      // Round-robin assignment of divisions to branches
      const divisionIndex = index % divisions.length;
      return {
        ...branch,
        divisiId: divisions[divisionIndex]._id
      };
    });

    const branches = await Branch.insertMany(branchesWithDivisions);
    console.log(`${branches.length} branches inserted`);
    return branches;
  } catch (error) {
    console.error('Error seeding branches:', error);
    throw error;
  }
};

// Seed function for Roles
const seedRoles = async () => {
  try {
    await Role.deleteMany({});
    console.log('Deleted existing roles');

    const roles = await Role.insertMany(roleData);
    console.log(`${roles.length} roles inserted`);
    return roles;
  } catch (error) {
    console.error('Error seeding roles:', error);
    throw error;
  }
};

// Seed function for Users
const seedUsers = async (branches, roles) => {
  try {
    await User.deleteMany({});
    console.log('Deleted existing users');

    // Find specific roles
    const direkturRole = roles.find(role => role.kodeRole === 'direktur');
    const kepalaCabangRole = roles.find(role => role.kodeRole === 'kepala_cabang');
    const staffAdminRole = roles.find(role => role.kodeRole === 'staff_admin');
    const staffPenjualanRole = roles.find(role => role.kodeRole === 'staff_penjualan');
    const kasirRole = roles.find(role => role.kodeRole === 'kasir');
    const checkerRole = roles.find(role => role.kodeRole === 'checker');
    const supirRole = roles.find(role => role.kodeRole === 'supir');

    // Hash the passwords before insert
    const usersWithRefs = await Promise.all(userData.map(async (user, index) => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);

      let roleId, cabangId, role;

      // Assign roles and branches based on user index or name
      if (index === 0) { // Administrator
        roleId = direkturRole._id;
        cabangId = branches[0]._id; // Jakarta Pusat (HQ)
        role = direkturRole.kodeRole;
      } else if (index >= 1 && index <= 4) { // Kepala Cabang
        roleId = kepalaCabangRole._id;
        cabangId = branches[index - 1]._id;
        role = kepalaCabangRole.kodeRole;
      } else if (index === 5) { // Staff Administrasi
        roleId = staffAdminRole._id;
        cabangId = branches[0]._id; // Jakarta Pusat
        role = staffAdminRole.kodeRole;
      } else if (index === 6) { // Staff Penjualan
        roleId = staffPenjualanRole._id;
        cabangId = branches[0]._id; // Jakarta Pusat
        role = staffPenjualanRole.kodeRole;
      } else if (index === 7) { // Kasir
        roleId = kasirRole._id;
        cabangId = branches[0]._id; // Jakarta Pusat
        role = kasirRole.kodeRole;
      } else if (index === 8) { // Checker
        roleId = checkerRole._id;
        cabangId = branches[0]._id; // Jakarta Pusat
        role = checkerRole.kodeRole;
      } else { // Supir
        roleId = supirRole._id;
        cabangId = branches[0]._id; // Jakarta Pusat
        role = supirRole.kodeRole;
      }

      return {
        ...user,
        password: hashedPassword,
        roleId,
        cabangId,
        role,
        fotoProfil: 'default.jpg'
      };
    }));

    const createdUsers = await User.insertMany(usersWithRefs);
    console.log(`${createdUsers.length} users inserted`);
    return createdUsers;
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

// Main seed function
const seedEmployeeData = async () => {
  try {
    await connectDB();
    
    const divisions = await seedDivisions();
    const branches = await seedBranches(divisions);
    const roles = await seedRoles();
    const users = await seedUsers(branches, roles);

    console.log('Employee data seeding completed successfully');
    
    // You can return the created data if needed
    return { divisions, branches, roles, users };
  } catch (error) {
    console.error('Error seeding employee data:', error);
  } finally {
    // Uncomment this when running standalone
    // await disconnectDB();
  }
};

module.exports = seedEmployeeData;

// Run the seeder directly if this file is executed directly
if (require.main === module) {
  seedEmployeeData()
    .then(() => {
      console.log('Seeding completed. Disconnecting...');
      disconnectDB();
    })
    .catch(err => {
      console.error('Seeding failed:', err);
      disconnectDB();
    });
}