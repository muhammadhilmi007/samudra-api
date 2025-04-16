// seeders/permissionSeeder.js
const Permission = require('../models/Permission');
const Role = require('../models/Role');
const colors = require('colors');

// Function to seed permissions
const seedPermissions = async () => {
  try {
    // Get all available permissions from Role model
    const availablePermissions = Role.AVAILABLE_PERMISSIONS;
    
    // Create permissions for each available permission code
    const permissionsToCreate = availablePermissions.map(code => {
      // Generate a readable name from the code
      const name = code
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Determine category based on code prefix
      let category = 'dashboard';
      
      if (code.startsWith('manage_employees') || code.includes('employee')) {
        category = 'user_management';
      } else if (code.includes('branch')) {
        category = 'branch_management';
      } else if (code.includes('division')) {
        category = 'division_management';
      } else if (code.includes('role')) {
        category = 'role_management';
      } else if (code.includes('customer')) {
        category = 'customer_management';
      } else if (code.includes('report')) {
        category = 'reports';
      } else if (code.includes('finance')) {
        category = 'finances';
      } else if (code.includes('vehicle')) {
        category = 'vehicles';
      } else if (code.includes('stt')) {
        category = 'stt_management';
      } else if (code.includes('loading')) {
        category = 'loadings';
      } else if (code.includes('delivery')) {
        category = 'deliveries';
      } else if (code.includes('return')) {
        category = 'returns';
      } else if (code.includes('pickup')) {
        category = 'pickups';
      } else if (code.includes('collection')) {
        category = 'collections';
      } else if (code.includes('truck_queue')) {
        category = 'truck_queues';
      } else if (code.includes('menu')) {
        category = 'menu_management';
      }
      
      return {
        name,
        code,
        description: `Permission to ${code.replace(/_/g, ' ')}`,
        category,
        isActive: true
      };
    });
    
    // Insert all permissions
    await Permission.insertMany(permissionsToCreate);
    
    console.log(`${permissionsToCreate.length} permissions created`.green);
    
  } catch (error) {
    console.error(`Error seeding permissions: ${error.message}`.red);
    throw error;
  }
};

// Export the seeder function
module.exports = seedPermissions;