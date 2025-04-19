# Dynamic RBAC System Enhancement

## Overview

This enhancement implements a dynamic Role-Based Access Control (RBAC) system for the Samudra ERP application. The new system allows administrators to manage user roles and permissions without modifying code, providing greater flexibility and security.

## Key Features

- **Multiple Roles per User**: Users can now have multiple roles, with one designated as the primary role
- **Dynamic Permission Management**: Permissions can be created, updated, and assigned to roles through the API
- **Role-Permission Mapping**: Many-to-many relationship between roles and permissions
- **User-Role Mapping**: Many-to-many relationship between users and roles
- **Backward Compatibility**: Maintains compatibility with the existing RBAC implementation
- **Enhanced Authorization Middleware**: Updated to support the new RBAC structure
- **Menu Access Control**: Controls access to UI components based on roles and permissions

## Implementation Details

### New Models

1. **RolePermission**: Maps roles to permissions (many-to-many)
2. **UserRole**: Maps users to roles (many-to-many)

### Updated Models

1. **User**: Added methods to work with multiple roles and get all permissions
2. **Role**: Added methods to work with the new permission mapping system
3. **Permission**: Enhanced with categories and additional metadata

### New API Endpoints

1. **Role-Permission Management**:
   - `GET /api/role-permissions`: Get all role-permission mappings
   - `GET /api/role-permissions/by-role/:roleId`: Get permissions for a specific role
   - `GET /api/role-permissions/by-permission/:permissionId`: Get roles with a specific permission
   - `POST /api/role-permissions`: Create a role-permission mapping
   - `DELETE /api/role-permissions/:id`: Delete a role-permission mapping
   - `POST /api/role-permissions/batch`: Batch update role permissions

2. **User-Role Management**:
   - `GET /api/user-roles`: Get all user-role mappings
   - `GET /api/user-roles/by-user/:userId`: Get roles for a specific user
   - `GET /api/user-roles/by-role/:roleId`: Get users with a specific role
   - `POST /api/user-roles`: Create a user-role mapping
   - `PUT /api/user-roles/:id`: Update a user-role mapping
   - `DELETE /api/user-roles/:id`: Delete a user-role mapping
   - `POST /api/user-roles/batch`: Batch update user roles

### Enhanced Middleware

1. **auth.js**: Updated to support multiple roles and dynamic permissions
2. **menuAuth.js**: Updated to check permissions from all user roles

### Frontend Components

1. **UserRoles.js**: Component to display user roles
2. **UserPermissions.js**: Component to display user permissions
3. **Role Management Pages**: Pages for managing role permissions
4. **User Role Management Pages**: Pages for managing user roles

## Migration

A migration script (`scripts/migrateRbac.js`) is provided to migrate data from the legacy RBAC system to the new system. The script:

1. Creates Permission records based on the available permissions in the Role model
2. Creates RolePermission mappings based on the permissions array in each Role
3. Creates UserRole mappings based on the roleId in each User

To run the migration:

```bash
node scripts/migrateRbac.js
```

## Usage Examples

### Checking Permissions in Controllers

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

### Checking Permissions in Frontend

```javascript
import { useAuth } from '@/hooks/auth';

function MyComponent() {
  const { hasPermission } = useAuth();
  
  return (
    <div>
      {hasPermission('manage_employees') && (
        <Button>Add Employee</Button>
      )}
    </div>
  );
}
```

### Assigning Roles to a User

```javascript
// Create user-role mappings
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

### Assigning Permissions to a Role

```javascript
// Batch update role permissions
await axios.post(
  `${API_URL}/role-permissions/batch`,
  {
    roleId: roleId,
    permissions: ['view_dashboard', 'manage_branch_employees', 'view_branch_customers']
  },
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);
```

## Documentation

For more detailed documentation, see:

- [RBAC.md](./docs/RBAC.md): Comprehensive documentation of the RBAC system
- API endpoint documentation in the respective controller files

## Future Enhancements

1. **Permission Groups**: Group permissions for easier management
2. **Role Inheritance**: Allow roles to inherit permissions from other roles
3. **Time-Based Access Control**: Set expiration dates for roles and permissions
4. **Context-Based Access Control**: Define permissions based on context (e.g., time, location)
5. **Audit Logging**: Log all permission checks and access attempts