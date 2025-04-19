// scripts/migrateRbac.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');

// Load environment variables
dotenv.config();

// Import models
const User = require('../models/User');
const Role = require('../models/Role');
const Permission = require('../models/Permission');
const UserRole = require('../models/UserRole');
const RolePermission = require('../models/RolePermission');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'Connection error:'.red));
db.once('open', () => {
  console.log('Connected to MongoDB'.green);
});

// Migration functions
async function migratePermissions() {
  console.log('\n=== Migrating Permissions ==='.yellow);
  
  try {
    // Get all available permissions from Role model
    const availablePermissions = Role.AVAILABLE_PERMISSIONS;
    
    // Create permissions in the Permission model
    let createdCount = 0;
    
    for (const permissionCode of availablePermissions) {
      // Check if permission already exists
      const existingPermission = await Permission.findOne({ code: permissionCode });
      
      if (!existingPermission) {
        // Generate a readable name from the code
        const name = permissionCode
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        // Determine category based on code prefix
        let category = 'dashboard';
        
        if (permissionCode.startsWith('manage_employees') || permissionCode.includes('employee')) {
          category = 'user_management';
        } else if (permissionCode.includes('branch')) {
          category = 'branch_management';
        } else if (permissionCode.includes('division')) {
          category = 'division_management';
        } else if (permissionCode.includes('role')) {
          category = 'role_management';
        } else if (permissionCode.includes('customer')) {
          category = 'customer_management';
        } else if (permissionCode.includes('report')) {
          category = 'reports';
        } else if (permissionCode.includes('finance')) {
          category = 'finances';
        } else if (permissionCode.includes('vehicle')) {
          category = 'vehicles';
        } else if (permissionCode.includes('stt')) {
          category = 'stt_management';
        } else if (permissionCode.includes('loading')) {
          category = 'loadings';
        } else if (permissionCode.includes('delivery')) {
          category = 'deliveries';
        } else if (permissionCode.includes('return')) {
          category = 'returns';
        } else if (permissionCode.includes('pickup')) {
          category = 'pickups';
        } else if (permissionCode.includes('collection')) {
          category = 'collections';
        } else if (permissionCode.includes('truck_queue')) {
          category = 'truck_queues';
        } else if (permissionCode.includes('menu')) {
          category = 'menu_management';
        }
        
        // Create the permission
        await Permission.create({
          name,
          code: permissionCode,
          description: `Permission to ${permissionCode.replace(/_/g, ' ')}`,
          category,
          isActive: true
        });
        
        createdCount++;
      }
    }
    
    console.log(`Created ${createdCount} new permissions`.green);
  } catch (error) {
    console.error('Error migrating permissions:'.red, error);
  }
}

async function migrateRolePermissions() {
  console.log('\n=== Migrating Role Permissions ==='.yellow);
  
  try {
    // Get all roles
    const roles = await Role.find();
    
    // For each role, create role-permission mappings
    for (const role of roles) {
      console.log(`Processing role: ${role.namaRole}`.cyan);
      
      // Get permissions for this role
      const permissions = role.permissions || [];
      
      // Create role-permission mappings
      let createdCount = 0;
      
      for (const permissionCode of permissions) {
        // Find permission by code
        const permission = await Permission.findOne({ code: permissionCode });
        
        if (permission) {
          // Check if mapping already exists
          const existingMapping = await RolePermission.findOne({
            roleId: role._id,
            permissionId: permission._id
          });
          
          if (!existingMapping) {
            // Create mapping
            await RolePermission.create({
              roleId: role._id,
              permissionId: permission._id
            });
            
            createdCount++;
          }
        }
      }
      
      console.log(`Created ${createdCount} role-permission mappings for ${role.namaRole}`.green);
    }
  } catch (error) {
    console.error('Error migrating role permissions:'.red, error);
  }
}

async function migrateUserRoles() {
  console.log('\n=== Migrating User Roles ==='.yellow);
  
  try {
    // Get all users
    const users = await User.find();
    
    // For each user, create user-role mapping
    for (const user of users) {
      console.log(`Processing user: ${user.nama} (${user.username})`.cyan);
      
      if (user.roleId) {
        // Check if mapping already exists
        const existingMapping = await UserRole.findOne({
          userId: user._id,
          roleId: user.roleId
        });
        
        if (!existingMapping) {
          // Create mapping
          await UserRole.create({
            userId: user._id,
            roleId: user.roleId,
            isPrimary: true
          });
          
          console.log(`Created user-role mapping for ${user.username}`.green);
        } else {
          console.log(`User-role mapping already exists for ${user.username}`.yellow);
        }
      } else {
        console.log(`User ${user.username} has no roleId`.red);
      }
    }
  } catch (error) {
    console.error('Error migrating user roles:'.red, error);
  }
}

// Main migration function
async function migrate() {
  console.log('Starting RBAC migration...'.blue.bold);
  
  try {
    // Step 1: Migrate permissions
    await migratePermissions();
    
    // Step 2: Migrate role-permission mappings
    await migrateRolePermissions();
    
    // Step 3: Migrate user-role mappings
    await migrateUserRoles();
    
    console.log('\nRBAC migration completed successfully!'.green.bold);
  } catch (error) {
    console.error('\nRBAC migration failed:'.red.bold, error);
  } finally {
    // Close database connection
    mongoose.connection.close();
  }
}

// Run migration
migrate();