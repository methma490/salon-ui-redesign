import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionGuard } from '../tenant/guards/permission.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { REQUIRE_PERMISSION_KEY } from '../tenant/constants/tenant.constants';

describe('RBAC & Role Bypass Security Tests', () => {
  let rolesGuard: RolesGuard;
  let permissionGuard: PermissionGuard;
  let reflector: Reflector;
  let mockTenantPermissionService: any;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
    mockTenantPermissionService = {
      userHasPermission: jest.fn(),
    };
    permissionGuard = new PermissionGuard(reflector, mockTenantPermissionService);
  });

  function createMockContext(user: any, tenantContext?: any, method: string = 'GET'): ExecutionContext {
    const req = {
      method,
      user,
      tenantContext: tenantContext || (user?.tenantId ? {
        tenantId: user.tenantId,
        schemaName: user.schemaName,
        userId: user.id,
      } : undefined),
    };

    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  describe('Super Admin Boundary Enforcement', () => {
    const superAdminUser = {
      id: 'super-1',
      email: 'admin@platform.com',
      roles: ['SUPER_ADMIN'],
    };

    const salonAdminUser = {
      id: 'salon-admin-1',
      email: 'owner@salon.com',
      tenantId: 'tenant-1',
      schemaName: 'tenant_000001',
      roles: ['SALON_ADMIN'],
    };

    const cashierUser = {
      id: 'cashier-1',
      email: 'cashier@salon.com',
      tenantId: 'tenant-1',
      schemaName: 'tenant_000001',
      roles: ['CASHIER'],
    };

    const stockKeeperUser = {
      id: 'stock-1',
      email: 'stock@salon.com',
      tenantId: 'tenant-1',
      schemaName: 'tenant_000001',
      roles: ['STOCK_KEEPER'],
    };

    it('permits SUPER_ADMIN on Super Admin endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);
      const ctx = createMockContext(superAdminUser, undefined, 'POST');
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it.each([
      ['SALON_ADMIN', salonAdminUser, 'POST'],
      ['SALON_ADMIN', salonAdminUser, 'DELETE'],
      ['CASHIER', cashierUser, 'GET'],
      ['STOCK_KEEPER', stockKeeperUser, 'PATCH'],
    ])('rejects %s on Super Admin endpoint (%s)', (_, user, method) => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);
      const ctx = createMockContext(user, undefined, method);
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('blocks Salon Admin from modifying subscription plans or manual payment confirmations', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);
      const ctx = createMockContext(salonAdminUser, undefined, 'POST');
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('Tenant Multi-Role RBAC & Permission Boundaries', () => {
    it('blocks CASHIER from modifying roles or user permissions (users:manage)', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['users:manage']);
      
      const cashierUser = {
        id: 'cashier-1',
        email: 'cashier@salon.com',
        tenantId: 'tenant-1',
        schemaName: 'tenant_000001',
        roles: ['CASHIER'],
        permissions: ['sales:create', 'sales:read'],
      };

      const ctx = createMockContext(cashierUser, undefined, 'POST');
      await expect(permissionGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('blocks STOCK_KEEPER from accessing payroll endpoints (payroll:read / payroll:manage)', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['payroll:read']);

      const stockKeeperUser = {
        id: 'stock-1',
        email: 'stock@salon.com',
        tenantId: 'tenant-1',
        schemaName: 'tenant_000001',
        roles: ['STOCK_KEEPER'],
        permissions: ['inventory:read', 'inventory:manage', 'grn:create'],
      };

      const ctx = createMockContext(stockKeeperUser, undefined, 'GET');
      await expect(permissionGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('allows STOCK_KEEPER on inventory management endpoints', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['inventory:manage']);

      const stockKeeperUser = {
        id: 'stock-1',
        email: 'stock@salon.com',
        tenantId: 'tenant-1',
        schemaName: 'tenant_000001',
        roles: ['STOCK_KEEPER'],
        permissions: ['inventory:read', 'inventory:manage'],
      };

      const ctx = createMockContext(stockKeeperUser, undefined, 'POST');
      const result = await permissionGuard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('allows SALON_ADMIN with comprehensive permissions to access administrative endpoints', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['payroll:manage']);

      const salonAdminUser = {
        id: 'salon-admin-1',
        email: 'owner@salon.com',
        tenantId: 'tenant-1',
        schemaName: 'tenant_000001',
        roles: ['SALON_ADMIN'],
        permissions: ['payroll:manage', 'payroll:read', 'users:manage'],
      };

      const ctx = createMockContext(salonAdminUser, undefined, 'POST');
      const result = await permissionGuard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('rejects unauthenticated requests without tenant context or user', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['inventory:read']);
      const ctx = createMockContext(null, null, 'GET');
      await expect(permissionGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });
  });
});
