const mongoose = require('mongoose');
const Role = require('../models/Role');

// Define permission groups
const PERMISSIONS = {
  DASHBOARD: [
    'read_dashboard',
    'full_dashboard_access'
  ],
  USER_MANAGEMENT: [
    'read_users',
    'create_users',
    'update_users',
    'delete_users'
  ],
  BRANCH_MANAGEMENT: [
    'read_branches',
    'create_branches',
    'update_branches',
    'delete_branches'
  ],
  DIVISION_MANAGEMENT: [
    'read_divisions',
    'create_divisions',
    'update_divisions',
    'delete_divisions'
  ],
  STT_MANAGEMENT: [
    'read_stt',
    'create_stt',
    'update_stt',
    'delete_stt'
  ],
  PICKUP_MANAGEMENT: [
    'read_pickups',
    'create_pickups',
    'update_pickups',
    'delete_pickups'
  ],
  VEHICLE_MANAGEMENT: [
    'read_vehicles',
    'create_vehicles',
    'update_vehicles',
    'delete_vehicles'
  ],
  FINANCE_MANAGEMENT: [
    'read_finance',
    'create_finance',
    'update_finance',
    'delete_finance',
    'generate_reports',
    'cash_management',
    'accounting_management'
  ],
  OPERATIONAL_MANAGEMENT: [
    'read_operations',
    'write_operations',
    'shipment_management',
    'vehicle_management',
    'route_optimization'
  ],
  CUSTOMER_MANAGEMENT: [
    'read_customers',
    'create_customers',
    'update_customers',
    'delete_customers'
  ],
  SYSTEM_SETTINGS: [
    'read_settings',
    'update_settings'
  ]
};

const roleData = [
  {
    namaRole: 'Direktur',
    kodeRole: 'direktur',
    permissions: [
      ...PERMISSIONS.DASHBOARD,
      ...PERMISSIONS.USER_MANAGEMENT,
      ...PERMISSIONS.BRANCH_MANAGEMENT,
      ...PERMISSIONS.DIVISION_MANAGEMENT,
      ...PERMISSIONS.STT_MANAGEMENT,
      ...PERMISSIONS.PICKUP_MANAGEMENT,
      ...PERMISSIONS.VEHICLE_MANAGEMENT,
      ...PERMISSIONS.FINANCE_MANAGEMENT,
      ...PERMISSIONS.OPERATIONAL_MANAGEMENT,
      ...PERMISSIONS.CUSTOMER_MANAGEMENT,
      ...PERMISSIONS.SYSTEM_SETTINGS,
      'read_all', 'write_all', 'delete_all'
    ]
  },
  {
    namaRole: 'Manajer Admin',
    kodeRole: 'manajer_admin',
    permissions: [
      ...PERMISSIONS.DASHBOARD,
      ...PERMISSIONS.USER_MANAGEMENT,
      ...PERMISSIONS.BRANCH_MANAGEMENT,
      ...PERMISSIONS.DIVISION_MANAGEMENT,
      ...PERMISSIONS.CUSTOMER_MANAGEMENT,
      ...PERMISSIONS.SYSTEM_SETTINGS
    ]
  },
  {
    namaRole: 'Manajer Keuangan',
    kodeRole: 'manajer_keuangan',
    permissions: [
      ...PERMISSIONS.DASHBOARD,
      ...PERMISSIONS.FINANCE_MANAGEMENT,
      'read_customers',
      'read_branches'
    ]
  },
  {
    namaRole: 'Manajer Pemasaran',
    kodeRole: 'manajer_pemasaran',
    permissions: [
      ...PERMISSIONS.DASHBOARD,
      ...PERMISSIONS.CUSTOMER_MANAGEMENT,
      'read_stt'
    ]
  },
  {
    namaRole: 'Manajer Operasional',
    kodeRole: 'manajer_operasional',
    permissions: [
      ...PERMISSIONS.DASHBOARD,
      ...PERMISSIONS.OPERATIONAL_MANAGEMENT,
      ...PERMISSIONS.STT_MANAGEMENT,
      ...PERMISSIONS.PICKUP_MANAGEMENT,
      ...PERMISSIONS.VEHICLE_MANAGEMENT,
      'read_customers',
      'read_branches'
    ]
  },
  {
    namaRole: 'Manajer SDM',
    kodeRole: 'manajer_sdm',
    permissions: [
      ...PERMISSIONS.DASHBOARD,
      ...PERMISSIONS.USER_MANAGEMENT
    ]
  },
  {
    namaRole: 'Manajer Distribusi',
    kodeRole: 'manajer_distribusi',
    permissions: [
      ...PERMISSIONS.DASHBOARD,
      ...PERMISSIONS.PICKUP_MANAGEMENT,
      ...PERMISSIONS.VEHICLE_MANAGEMENT,
      'read_branches',
      'read_customers',
      'read_stt'
    ]
  },
  {
    namaRole: 'Kepala Cabang',
    kodeRole: 'kepala_cabang',
    permissions: [
      ...PERMISSIONS.DASHBOARD,
      'create_users', 'read_users', 'update_users',
      'read_branches',
      'read_stt', 'create_stt', 'update_stt',
      'read_pickups', 'create_pickups', 'update_pickups',
      'read_vehicles', 'create_vehicles', 'update_vehicles',
      'read_operations', 'write_operations',
      'read_finance', 'create_finance',
      'read_customers', 'create_customers', 'update_customers',
      'local_reporting'
    ]
  },
  {
    namaRole: 'Kepala Gudang',
    kodeRole: 'kepala_gudang',
    permissions: [
      'read_dashboard',
      'read_pickups', 'create_pickups', 'update_pickups',
      'read_vehicles', 'update_vehicles',
      'read_stt', 'update_stt',
      'shipment_management'
    ]
  },
  {
    namaRole: 'Staf Admin',
    kodeRole: 'staff_admin',
    permissions: [
      'read_dashboard',
      'read_customers', 'create_customers', 'update_customers',
      'read_stt', 'create_stt',
      'read_pickups',
      'customer_management',
      'data_entry'
    ]
  },
  {
    namaRole: 'Staf Penjualan',
    kodeRole: 'staff_penjualan',
    permissions: [
      'read_dashboard',
      'read_customers', 'create_customers',
      'read_stt', 'create_stt',
      'read_pickups'
    ]
  },
  {
    namaRole: 'Kasir',
    kodeRole: 'kasir',
    permissions: [
      'read_dashboard',
      'read_finance', 'create_finance',
      'financial_transactions', 
      'invoice_management',
      'payment_processing'
    ]
  },
  {
    namaRole: 'Debt Collector',
    kodeRole: 'debt_collector',
    permissions: [
      'read_dashboard',
      'read_finance',
      'read_customers',
      'payment_processing'
    ]
  },
  {
    namaRole: 'Checker',
    kodeRole: 'checker',
    permissions: [
      'read_dashboard',
      'read_stt', 'update_stt',
      'read_pickups', 'update_pickups',
      'shipment_verification', 
      'loading_management',
      'cargo_inspection'
    ]
  },
  {
    namaRole: 'Supir',
    kodeRole: 'supir',
    permissions: [
      'read_dashboard',
      'delivery_tracking', 
      'pickup_management',
      'self_profile_update'
    ]
  },
  {
    namaRole: 'Pelanggan',
    kodeRole: 'pelanggan',
    permissions: [
      'read_dashboard',
      'read_stt',
      'tracking_only'
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