const mongoose = require('mongoose');
const Role = require('../models/Role');

// Define permission groups
const PERMISSIONS = {
  DASHBOARD: [
    'view_dashboard'
  ],
  USER_MANAGEMENT: [
    'manage_employees',
    'manage_branch_employees',
    'view_employees',
    'create_employee',
    'edit_employee',
    'delete_employee'
  ],
  BRANCH_MANAGEMENT: [
    'manage_branches',
    'view_branches',
    'create_branch',
    'edit_branch',
    'delete_branch'
  ],
  DIVISION_MANAGEMENT: [
    'manage_divisions',
    'view_divisions'
  ],
  STT_MANAGEMENT: [
    'view_stt',
    'view_branch_stt',
    'create_branch_stt',
    'edit_branch_stt',
    'update_branch_stt_status'
  ],
  PICKUP_MANAGEMENT: [
    'manage_pickups',
    'manage_branch_pickups'
  ],
  VEHICLE_MANAGEMENT: [
    'manage_vehicles',
    'view_vehicles',
    'view_branch_vehicles',
    'create_vehicle',
    'edit_vehicle',
    'delete_vehicle'
  ],
  FINANCE_MANAGEMENT: [
    'manage_finances',
    'view_finances',
    'view_branch_finances',
    'manage_branch_transactions'
  ],
  CUSTOMER_MANAGEMENT: [
    'manage_customers',
    'view_customers',
    'view_branch_customers',
    'create_customers',
    'edit_customers',
    'delete_customers'
  ],
  ROLE_MANAGEMENT: [
    'manage_roles',
    'view_roles',
    'create_role',
    'edit_role',
    'delete_role'
  ],
  REPORT_MANAGEMENT: [
    'view_reports',
    'view_branch_reports',
    'export_reports'
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
      ...PERMISSIONS.CUSTOMER_MANAGEMENT,
      ...PERMISSIONS.ROLE_MANAGEMENT,
      ...PERMISSIONS.REPORT_MANAGEMENT
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
      ...PERMISSIONS.ROLE_MANAGEMENT
    ]
  },
  {
    namaRole: 'Manajer Keuangan',
    kodeRole: 'manajer_keuangan',
    permissions: [
      ...PERMISSIONS.DASHBOARD,
      ...PERMISSIONS.FINANCE_MANAGEMENT,
      'view_customers',
      'view_branches',
      'view_reports',
      'export_reports'
    ]
  },
  {
    namaRole: 'Manajer Pemasaran',
    kodeRole: 'manajer_pemasaran',
    permissions: [
      ...PERMISSIONS.DASHBOARD,
      ...PERMISSIONS.CUSTOMER_MANAGEMENT,
      'view_stt',
      'view_reports',
      'export_reports'
    ]
  },
  {
    namaRole: 'Manajer Operasional',
    kodeRole: 'manajer_operasional',
    permissions: [
      ...PERMISSIONS.DASHBOARD,
      ...PERMISSIONS.STT_MANAGEMENT,
      ...PERMISSIONS.PICKUP_MANAGEMENT,
      ...PERMISSIONS.VEHICLE_MANAGEMENT,
      'view_customers',
      'view_branches',
      'view_reports',
      'export_reports'
    ]
  },
  {
    namaRole: 'Manajer SDM',
    kodeRole: 'manajer_sdm',
    permissions: [
      ...PERMISSIONS.DASHBOARD,
      ...PERMISSIONS.USER_MANAGEMENT,
      'view_reports',
      'export_reports'
    ]
  },
  {
    namaRole: 'Manajer Distribusi',
    kodeRole: 'manajer_distribusi',
    permissions: [
      ...PERMISSIONS.DASHBOARD,
      ...PERMISSIONS.PICKUP_MANAGEMENT,
      ...PERMISSIONS.VEHICLE_MANAGEMENT,
      'view_branches',
      'view_customers',
      'view_stt',
      'view_reports',
      'export_reports'
    ]
  },
  {
    namaRole: 'Kepala Cabang',
    kodeRole: 'kepala_cabang',
    permissions: [
      ...PERMISSIONS.DASHBOARD,
      'manage_branch_employees',
      'view_branches',
      'view_branch_stt',
      'create_branch_stt',
      'edit_branch_stt',
      'manage_branch_pickups',
      'view_branch_vehicles',
      'create_vehicle',
      'edit_vehicle',
      'view_branch_finances',
      'manage_branch_transactions',
      'view_branch_customers',
      'create_customers',
      'edit_customers',
      'view_branch_reports'
    ]
  },
  {
    namaRole: 'Kepala Gudang',
    kodeRole: 'kepala_gudang',
    permissions: [
      'view_dashboard',
      'manage_branch_pickups',
      'view_branch_vehicles',
      'edit_vehicle',
      'view_branch_stt',
      'edit_branch_stt'
    ]
  },
  {
    namaRole: 'Staf Admin',
    kodeRole: 'staff_admin',
    permissions: [
      'view_dashboard',
      'view_branch_customers',
      'create_customers',
      'edit_customers',
      'view_branch_stt',
      'create_branch_stt'
    ]
  },
  {
    namaRole: 'Staf Penjualan',
    kodeRole: 'staff_penjualan',
    permissions: [
      'view_dashboard',
      'view_branch_customers',
      'create_customers',
      'view_branch_stt',
      'create_branch_stt'
    ]
  },
  {
    namaRole: 'Kasir',
    kodeRole: 'kasir',
    permissions: [
      'view_dashboard',
      'view_branch_finances',
      'manage_branch_transactions'
    ]
  },
  {
    namaRole: 'Debt Collector',
    kodeRole: 'debt_collector',
    permissions: [
      'view_dashboard',
      'view_branch_finances',
      'view_branch_customers',
      'manage_branch_transactions'
    ]
  },
  {
    namaRole: 'Checker',
    kodeRole: 'checker',
    permissions: [
      'view_dashboard',
      'view_branch_stt',
      'edit_branch_stt',
      'view_branch_vehicles'
    ]
  },
  {
    namaRole: 'Supir',
    kodeRole: 'supir',
    permissions: [
      'view_dashboard',
      'view_branch_vehicles',
      'view_branch_stt'
    ]
  },
  {
    namaRole: 'Pelanggan',
    kodeRole: 'pelanggan',
    permissions: [
      'view_dashboard',
      'view_stt'
    ]
  },
  {
    namaRole: 'Kenek',
    kodeRole: 'kenek',
    deskripsi: 'Asisten driver kendaraan',
    permissions: [
      'view_stt',
      'view_branch_vehicles'
    ]
  },
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