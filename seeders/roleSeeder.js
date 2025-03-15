const mongoose = require('mongoose');
const Role = require('../models/Role');

const roleData = [
  {
    namaRole: 'Direktur',
    kodeRole: 'direktur',
    permissions: [
      'read_all', 'write_all', 'delete_all', 
      'full_dashboard_access', 'financial_reports'
    ]
  },
  {
    namaRole: 'Manajer Keuangan',
    kodeRole: 'manajer_keuangan',
    permissions: [
      'read_finance', 'write_finance', 
      'generate_reports', 'cash_management',
      'accounting_management'
    ]
  },
  {
    namaRole: 'Manajer Operasional',
    kodeRole: 'manajer_operasional',
    permissions: [
      'read_operations', 'write_operations', 
      'shipment_management', 'vehicle_management',
      'route_optimization'
    ]
  },
  {
    namaRole: 'Kepala Cabang',
    kodeRole: 'kepala_cabang',
    permissions: [
      'read_branch', 'write_branch', 
      'local_dashboard', 'local_operations',
      'local_reporting'
    ]
  },
  {
    namaRole: 'Staff Admin',
    kodeRole: 'staff_admin',
    permissions: [
      'read_basic', 'write_basic', 
      'customer_management', 'data_entry'
    ]
  },
  {
    namaRole: 'Supir',
    kodeRole: 'supir',
    permissions: [
      'delivery_tracking', 'pickup_management',
      'self_profile_update'
    ]
  },
  {
    namaRole: 'Kasir',
    kodeRole: 'kasir',
    permissions: [
      'financial_transactions', 
      'invoice_management',
      'payment_processing'
    ]
  },
  {
    namaRole: 'Checker',
    kodeRole: 'checker',
    permissions: [
      'shipment_verification', 
      'loading_management',
      'cargo_inspection'
    ]
  }
];

const seedRoles = async () => {
  try {
    // Hapus data existing
    await Role.deleteMany({});
    
    // Tambahkan data baru
    const roles = await Role.create(roleData);
    
    console.log('Role berhasil ditambahkan:', roles.length);
    return roles;
  } catch (error) {
    console.error('Gagal menambahkan role:', error);
    throw error;
  }
};

module.exports = seedRoles;