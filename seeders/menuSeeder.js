// seeders/menuSeeder.js
const Menu = require('../models/Menu');
const MenuAccess = require('../models/MenuAccess');
const Role = require('../models/Role');
const colors = require('colors');

// Define menu structure
const menus = [
  {
    name: 'Dashboard',
    code: 'dashboard',
    path: '/dashboard',
    icon: 'home',
    order: 1,
    requiredPermissions: ['view_dashboard']
  },
  {
    name: 'Manajemen Pengguna',
    code: 'user_management',
    path: '/pengguna',
    icon: 'users',
    order: 2,
    requiredPermissions: ['manage_employees', 'view_employees']
  },
  {
    name: 'Pegawai',
    code: 'employees',
    path: '/pegawai',
    icon: 'user',
    parentCode: 'user_management',
    order: 1,
    requiredPermissions: ['manage_employees', 'view_employees']
  },
  {
    name: 'Role & Hak Akses',
    code: 'roles',
    path: '/roles',
    icon: 'shield',
    parentCode: 'user_management',
    order: 2,
    requiredPermissions: ['manage_roles', 'view_roles']
  },
  {
    name: 'Menu & Akses Menu',
    code: 'menu_management',
    path: '/menu',
    icon: 'menu',
    parentCode: 'user_management',
    order: 3,
    requiredPermissions: ['manage_menus', 'view_menus']
  },
  {
    name: 'Cabang',
    code: 'branches',
    path: '/cabang',
    icon: 'building',
    order: 3,
    requiredPermissions: ['manage_branches', 'view_branches']
  },
  {
    name: 'Divisi',
    code: 'divisions',
    path: '/divisi',
    icon: 'grid',
    order: 4,
    requiredPermissions: ['manage_divisions', 'view_divisions']
  },
  {
    name: 'Pelanggan',
    code: 'customers',
    path: '/pelanggan',
    icon: 'briefcase',
    order: 5,
    requiredPermissions: ['manage_customers', 'view_customers', 'view_branch_customers']
  },
  {
    name: 'Kendaraan',
    code: 'vehicles',
    path: '/kendaraan',
    icon: 'truck',
    order: 6,
    requiredPermissions: ['manage_vehicles', 'view_vehicles', 'view_branch_vehicles']
  },
  {
    name: 'Antrian Kendaraan',
    code: 'vehicle_queues',
    path: '/antrian-kendaraan',
    icon: 'list-ordered',
    order: 7,
    requiredPermissions: ['manage_truck_queues', 'manage_branch_truck_queues', 'view_truck_queues']
  },
  {
    name: 'Pengambilan',
    code: 'pickups',
    path: '/pengambilan',
    icon: 'package',
    order: 8,
    requiredPermissions: ['manage_pickups', 'manage_branch_pickups']
  },
  {
    name: 'STT',
    code: 'stt',
    path: '/stt',
    icon: 'file-text',
    order: 9,
    requiredPermissions: ['view_stt', 'view_branch_stt', 'create_stt', 'create_branch_stt']
  },
  {
    name: 'Muat',
    code: 'loadings',
    path: '/muat',
    icon: 'upload',
    order: 10,
    requiredPermissions: ['manage_loadings', 'manage_branch_loadings', 'view_branch_loadings']
  },
  {
    name: 'Lansir',
    code: 'deliveries',
    path: '/lansir',
    icon: 'send',
    order: 11,
    requiredPermissions: ['manage_deliveries', 'manage_branch_deliveries', 'view_branch_deliveries']
  },
  {
    name: 'Retur',
    code: 'returns',
    path: '/retur',
    icon: 'rotate-ccw',
    order: 12,
    requiredPermissions: ['manage_returns', 'manage_branch_returns']
  },
  {
    name: 'Penagihan',
    code: 'collections',
    path: '/penagihan',
    icon: 'dollar-sign',
    order: 13,
    requiredPermissions: ['manage_collections', 'manage_branch_collections', 'view_collections']
  },
  {
    name: 'Keuangan',
    code: 'finances',
    path: '/keuangan',
    icon: 'credit-card',
    order: 14,
    requiredPermissions: ['manage_finances', 'view_finances', 'view_branch_finances']
  },
  {
    name: 'Aset',
    code: 'assets',
    path: '/aset',
    icon: 'box',
    order: 15,
    requiredPermissions: ['manage_finances']
  },
  {
    name: 'Laporan',
    code: 'reports',
    path: '/laporan',
    icon: 'bar-chart-2',
    order: 16,
    requiredPermissions: ['view_reports', 'view_branch_reports', 'export_reports']
  },
  {
    name: 'Tracking',
    code: 'tracking',
    path: '/tracking',
    icon: 'map-pin',
    order: 17,
    requiredPermissions: []
  }
];

// Function to seed menus
const seedMenus = async () => {
  try {
    // Create parent-child relationships
    const menuMap = {};
    
    // First pass: create all menus without parent relationships
    for (const menuData of menus) {
      const { parentCode, ...menuInfo } = menuData;
      
      const menu = await Menu.create({
        ...menuInfo,
        parentId: null,
        isActive: true
      });
      
      menuMap[menuInfo.code] = menu;
    }
    
    // Second pass: update parent relationships
    for (const menuData of menus) {
      if (menuData.parentCode && menuMap[menuData.parentCode] && menuMap[menuData.code]) {
        const menu = menuMap[menuData.code];
        menu.parentId = menuMap[menuData.parentCode]._id;
        await menu.save();
      }
    }
    
    console.log(`${Object.keys(menuMap).length} menus created`.green);
    
    // Create menu access for all roles
    const roles = await Role.find();
    
    for (const role of roles) {
      const menuAccessPromises = Object.values(menuMap).map(menu => {
        // Determine access based on role and required permissions
        const hasRequiredPermission = menu.requiredPermissions.length === 0 ||
          menu.requiredPermissions.some(permission => role.permissions.includes(permission));
        
        // By default, only direktur has full access
        const isAdmin = role.kodeRole === 'direktur';
        
        return MenuAccess.create({
          roleId: role._id,
          menuId: menu._id,
          canView: isAdmin || hasRequiredPermission,
          canCreate: isAdmin,
          canEdit: isAdmin,
          canDelete: isAdmin
        });
      });
      
      await Promise.all(menuAccessPromises);
    }
    
    console.log(`Menu access created for ${roles.length} roles`.green);
    
  } catch (error) {
    console.error(`Error seeding menus: ${error.message}`.red);
    throw error;
  }
};

// Export the seeder function
module.exports = seedMenus;