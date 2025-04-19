# Role-Based Access Control (RBAC) System Documentation

## Overview

The Samudra ERP system implements a dynamic Role-Based Access Control (RBAC) system that allows administrators to manage user roles and permissions without modifying code. This document explains the architecture, components, and usage of the RBAC system.

## Architecture

The RBAC system consists of the following components:

1. **Users**: System users who need access to various features
2. **Roles**: Collections of permissions that define what actions users can perform
3. **Permissions**: Individual access rights to specific features or actions
4. **Menus**: UI components that are displayed based on user permissions
5. **Menu Access**: Mapping between roles and menus with specific access rights

The system uses a many-to-many relationship model:
- A user can have multiple roles
- A role can have multiple permissions
- A menu can require multiple permissions
- A role can have access to multiple menus

## Database Schema

### User Model
- Basic user information (name, username, email, etc.)
- Legacy fields for backward compatibility:
  - `roleId`: Reference to the primary role
  - `role`: String code of the primary role

### Role Model
- `namaRole`: Role name
- `kodeRole`: Unique role code
- `deskripsi`: Role description
- `permissions`: Array of permission codes (legacy field)
- `isActive`: Whether the role is active
- `isSystem`: Whether the role is a system role that cannot be deleted

### Permission Model
- `name`: Permission name
- `code`: Unique permission code
- `description`: Permission description
- `category`: Category for grouping permissions
- `isActive`: Whether the permission is active

### UserRole Model (Many-to-Many)
- `userId`: Reference to User
- `roleId`: Reference to Role
- `isPrimary`: Whether this is the user's primary role

### RolePermission Model (Many-to-Many)
- `roleId`: Reference to Role
- `permissionId`: Reference to Permission

### Menu Model
- `name`: Menu name
- `code`: Unique menu code
- `path`: URL path
- `icon`: Icon name
- `parentId`: Reference to parent menu (for nested menus)
- `order`: Display order
- `isActive`: Whether the menu is active
- `requiredPermissions`: Array of permission codes required to access this menu

### MenuAccess Model
- `roleId`: Reference to Role
- `menuId`: Reference to Menu
- `canView`: Whether the role can view the menu
- `canCreate`: Whether the role can create items in the menu
- `canEdit`: Whether the role can edit items in the menu
- `canDelete`: Whether the role can delete items in the menu

## API Endpoints

### User Role Management

- `GET /api/user-roles`: Get all user-role mappings
- `GET /api/user-roles/by-user/:userId`: Get roles for a specific user
- `GET /api/user-roles/by-role/:roleId`: Get users with a specific role
- `POST /api/user-roles`: Create a user-role mapping
- `PUT /api/user-roles/:id`: Update a user-role mapping
- `DELETE /api/user-roles/:id`: Delete a user-role mapping
- `POST /api/user-roles/batch`: Batch update user roles

### Role Permission Management

- `GET /api/role-permissions`: Get all role-permission mappings
- `GET /api/role-permissions/by-role/:roleId`: Get permissions for a specific role
- `GET /api/role-permissions/by-permission/:permissionId`: Get roles with a specific permission
- `POST /api/role-permissions`: Create a role-permission mapping
- `DELETE /api/role-permissions/:id`: Delete a role-permission mapping
- `POST /api/role-permissions/batch`: Batch update role permissions

### Role Management

- `GET /api/roles`: Get all roles
- `GET /api/roles/:id`: Get a specific role
- `POST /api/roles`: Create a role
- `PUT /api/roles/:id`: Update a role
- `DELETE /api/roles/:id`: Delete a role

### Permission Management

- `GET /api/permissions`: Get all permissions
- `GET /api/permissions/by-category`: Get permissions grouped by category
- `GET /api/permissions/:id`: Get a specific permission
- `POST /api/permissions`: Create a permission
- `PUT /api/permissions/:id`: Update a permission
- `DELETE /api/permissions/:id`: Delete a permission
- `GET /api/permissions/categories`: Get all permission categories
- `POST /api/permissions/sync`: Sync permissions with Role model

### Menu Access Management

- `GET /api/menu-access`: Get all menu access entries
- `GET /api/menu-access/by-role/:roleId`: Get menu access for a specific role
- `GET /api/menu-access/by-menu/:menuId`: Get role access for a specific menu
- `POST /api/menu-access`: Create or update menu access
- `PUT /api/menu-access/:id`: Update menu access
- `DELETE /api/menu-access/:id`: Delete menu access
- `PUT /api/menu-access/batch/role/:roleId`: Batch update menu access for a role

## Authentication and Authorization

### Authentication

The system uses JWT (JSON Web Token) for authentication. When a user logs in, the system:

1. Verifies the username and password
2. Retrieves the user's roles and permissions
3. Generates a JWT token
4. Returns the token and user data (including roles and permissions)

### Authorization

The system provides several middleware functions for authorization:

1. `protect`: Verifies the JWT token and loads the user
2. `authorize`: Checks if the user has one of the specified roles
3. `authorizeRole`: Enhanced version that supports multiple roles per user
4. `checkPermission`: Checks if the user has one of the specified permissions
5. `checkMenuAccess`: Checks if the user has access to a specific menu with a specific access type

## Migration from Legacy System

A migration script (`scripts/migrateRbac.js`) is provided to migrate data from the legacy RBAC system to the new system. The script:

1. Creates Permission records based on the available permissions in the Role model
2. Creates RolePermission mappings based on the permissions array in each Role
3. Creates UserRole mappings based on the roleId in each User

To run the migration:

```bash
node scripts/migrateRbac.js
```

## Best Practices

1. **Use the new API endpoints**: Use the new endpoints for managing roles, permissions, and access rights.
2. **Assign multiple roles**: Users can have multiple roles, which provides more flexibility than the legacy single-role system.
3. **Use fine-grained permissions**: Create specific permissions for different actions rather than broad permissions.
4. **Group permissions by category**: Use categories to organize permissions and make them easier to manage.
5. **Use menu access control**: Control access to UI components based on roles and permissions.
6. **Keep backward compatibility**: The system maintains backward compatibility with the legacy RBAC system.

## Example Usage

### Creating a new role with permissions

```javascript
// 1. Create a new role
const role = await Role.create({
  namaRole: 'Branch Manager',
  kodeRole: 'branch_manager',
  deskripsi: 'Manager of a branch office',
  isActive: true
});

// 2. Get permissions
const permissions = await Permission.find({
  code: {
    $in: [
      'view_dashboard',
      'manage_branch_employees',
      'view_branch_customers',
      'manage_branch_transactions'
    ]
  }
});

// 3. Create role-permission mappings
for (const permission of permissions) {
  await RolePermission.create({
    roleId: role._id,
    permissionId: permission._id
  });
}
```

### Assigning roles to a user

```javascript
// 1. Create a new user
const user = await User.create({
  nama: 'John Doe',
  username: 'johndoe',
  email: 'john@example.com',
  password: 'securepassword',
  jabatan: 'Branch Manager',
  roleId: primaryRoleId, // Legacy field
  role: primaryRoleCode, // Legacy field
  telepon: '081234567890',
  alamat: 'Jl. Example No. 123',
  cabangId: branchId,
  aktif: true
});

// 2. Assign roles to the user
await UserRole.create({
  userId: user._id,
  roleId: branchManagerRoleId,
  isPrimary: true
});

await UserRole.create({
  userId: user._id,
  roleId: customerServiceRoleId,
  isPrimary: false
});
```

### Checking permissions

```javascript
// Using the middleware
router.get(
  '/branch-reports',
  checkPermission('view_branch_reports', 'view_reports'),
  getBranchReports
);

// Manually in a controller
if (await req.user.hasPermission('manage_branch_employees')) {
  // Allow the action
} else {
  // Deny the action
}
```

## Conclusion

The dynamic RBAC system provides a flexible and powerful way to manage access control in the Samudra ERP system. By separating users, roles, and permissions, and using many-to-many relationships, the system allows for fine-grained access control that can be managed by administrators without modifying code.