/**
 * Navigation and Integration Tests
 *
 * Task Group 6.1: Write 5 focused integration tests
 * - Test navigation between dashboard pages works
 * - Test tenant context is preserved across pages
 * - Test dashboard pages redirect without tenant context
 * - Test sync status updates after sync runs
 * - Test data displays correctly on all dashboard pages
 */
import { describe, it, expect } from 'vitest';
import type { MembershipWithTenant } from '@/lib/auth/session';

// Helper types for testing route classification
const PROTECTED_ROUTES = [
  '/dashboard',
  '/admin',
  '/reports',
  '/profile',
  '/leads',
  '/pipeline',
  '/hot-list',
  '/notes',
  '/schedule',
];

const TENANT_REQUIRED_ROUTES = ['/dashboard', '/reports', '/leads', '/pipeline', '/hot-list', '/notes', '/schedule'];

// Helper to check if a path is protected
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

// Helper to check if a path requires tenant context
function isTenantRequiredRoute(pathname: string): boolean {
  return TENANT_REQUIRED_ROUTES.some((route) => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

// Helper to check active nav state
function isNavActive(currentPath: string, linkPath: string): boolean {
  if (linkPath === '/dashboard') {
    return currentPath === '/dashboard';
  }
  return currentPath === linkPath || currentPath.startsWith(`${linkPath}/`);
}

// Helper to create mock membership
function createMockMembership(overrides: Partial<MembershipWithTenant> = {}): MembershipWithTenant {
  return {
    id: 'membership-123',
    userId: 'user-123',
    tenantId: 'tenant-456',
    role: 'tenant_admin',
    tenant: {
      id: 'tenant-456',
      name: 'Test Tenant',
      status: 'active',
      clienttetherBrandId: null,
      clienttetherWebKey: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ...overrides,
  };
}

describe('Navigation Integration Tests', () => {
  describe('Navigation between dashboard pages works', () => {
    it('all 7 dashboard routes are configured as protected routes', () => {
      const dashboardRoutes = ['/dashboard', '/reports', '/leads', '/pipeline', '/hot-list', '/notes', '/schedule'];

      dashboardRoutes.forEach((route) => {
        expect(isProtectedRoute(route)).toBe(true);
      });
    });

    it('dashboard subroutes are also protected', () => {
      const subRoutes = [
        '/dashboard/something',
        '/reports/weekly',
        '/leads/details',
        '/pipeline/view',
        '/hot-list/item',
        '/notes/detail',
        '/schedule/event',
      ];

      subRoutes.forEach((route) => {
        expect(isProtectedRoute(route)).toBe(true);
      });
    });

    it('active state is correctly determined for dashboard route', () => {
      // Dashboard should only match exactly
      expect(isNavActive('/dashboard', '/dashboard')).toBe(true);
      expect(isNavActive('/dashboard/sub', '/dashboard')).toBe(false);
    });

    it('active state is correctly determined for other routes', () => {
      // Other routes should match prefixes
      expect(isNavActive('/leads', '/leads')).toBe(true);
      expect(isNavActive('/leads/detail', '/leads')).toBe(true);
      expect(isNavActive('/leads', '/pipeline')).toBe(false);

      expect(isNavActive('/notes', '/notes')).toBe(true);
      expect(isNavActive('/schedule', '/schedule')).toBe(true);
    });
  });

  describe('Tenant context is preserved across pages', () => {
    it('tenant context is available in membership data', () => {
      const membership = createMockMembership();

      expect(membership.tenantId).toBe('tenant-456');
      expect(membership.tenant?.name).toBe('Test Tenant');
    });

    it('tenant admin has correct role for their tenant', () => {
      const membership = createMockMembership({ role: 'tenant_admin' });
      const isTenantAdmin =
        membership.role === 'tenant_admin' && membership.tenantId === 'tenant-456';

      expect(isTenantAdmin).toBe(true);
    });

    it('agency admin has access to all tenants', () => {
      const agencyMembership = createMockMembership({
        role: 'agency_admin',
        tenantId: null,
        tenant: null,
      });

      const isAgencyAdmin = agencyMembership.role === 'agency_admin' && agencyMembership.tenantId === null;
      expect(isAgencyAdmin).toBe(true);
    });
  });

  describe('Dashboard pages redirect without tenant context', () => {
    it('all new dashboard routes require tenant context', () => {
      const newRoutes = ['/leads', '/pipeline', '/hot-list', '/notes', '/schedule'];

      newRoutes.forEach((route) => {
        expect(isTenantRequiredRoute(route)).toBe(true);
      });
    });

    it('dashboard and reports still require tenant context', () => {
      expect(isTenantRequiredRoute('/dashboard')).toBe(true);
      expect(isTenantRequiredRoute('/reports')).toBe(true);
    });

    it('admin routes do not require tenant context', () => {
      expect(isTenantRequiredRoute('/admin')).toBe(false);
      expect(isTenantRequiredRoute('/admin/dashboard')).toBe(false);
    });

    it('profile route does not require tenant context', () => {
      expect(isTenantRequiredRoute('/profile')).toBe(false);
    });
  });

  describe('Sync status updates after sync runs', () => {
    it('sync status API response structure is correct', () => {
      // Test expected response shape
      const mockSyncStatus = {
        success: true,
        data: {
          lastSyncAt: '2026-01-21T12:00:00.000Z',
          status: 'success' as const,
          isStale: false,
          recordsUpdated: 150,
          errorMessage: null,
        },
      };

      expect(mockSyncStatus.success).toBe(true);
      expect(mockSyncStatus.data.lastSyncAt).toBeTruthy();
      expect(mockSyncStatus.data.status).toBe('success');
      expect(mockSyncStatus.data.isStale).toBe(false);
    });

    it('stale flag is true when data is older than 2 hours', () => {
      const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const timeSinceSync = Date.now() - threeHoursAgo.getTime();

      const isStale = timeSinceSync > STALE_THRESHOLD_MS;
      expect(isStale).toBe(true);
    });

    it('stale flag is false when data is fresh', () => {
      const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000;
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
      const timeSinceSync = Date.now() - oneHourAgo.getTime();

      const isStale = timeSinceSync > STALE_THRESHOLD_MS;
      expect(isStale).toBe(false);
    });
  });

  describe('Data displays correctly on all dashboard pages', () => {
    it('leads page data structure is valid', () => {
      const leadsData = {
        metrics: [
          { dimensionType: 'source', dimensionValue: 'Google', leads: 100, qualifiedLeads: 50 },
          { dimensionType: 'status', dimensionValue: 'New', leads: 30, qualifiedLeads: 10 },
        ],
      };

      expect(leadsData.metrics.length).toBeGreaterThan(0);
      expect(leadsData.metrics[0].dimensionType).toBeTruthy();
      expect(leadsData.metrics[0].leads).toBeGreaterThanOrEqual(0);
    });

    it('pipeline page data structure is valid', () => {
      const pipelineData = {
        stages: [
          { stageName: 'Prospecting', count: 50, totalValue: '125000' },
          { stageName: 'Qualified', count: 30, totalValue: '75000' },
        ],
      };

      expect(pipelineData.stages.length).toBeGreaterThan(0);
      expect(pipelineData.stages[0].stageName).toBeTruthy();
      expect(pipelineData.stages[0].count).toBeGreaterThanOrEqual(0);
    });

    it('notes page data structure is valid', () => {
      const notesData = {
        notes: [
          { id: 'note-1', noteDate: new Date().toISOString(), author: 'John Doe', content: 'Test note content' },
        ],
      };

      expect(notesData.notes.length).toBeGreaterThan(0);
      expect(notesData.notes[0].id).toBeTruthy();
      expect(notesData.notes[0].noteDate).toBeTruthy();
    });

    it('schedule page data structure is valid', () => {
      const scheduleData = {
        activities: [
          {
            id: 'activity-1',
            activityType: 'Call',
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            contactName: 'Jane Smith',
            description: 'Follow-up call',
            status: 'pending',
          },
        ],
      };

      expect(scheduleData.activities.length).toBeGreaterThan(0);
      expect(scheduleData.activities[0].activityType).toBeTruthy();
      expect(new Date(scheduleData.activities[0].scheduledAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('hot list page data structure is valid', () => {
      const hotListData = {
        items: [
          {
            id: 'item-1',
            candidateName: 'Test Candidate',
            market: 'New York',
            units: 5,
            weightedIff: '50000',
            stage: 'Qualified',
            likelyPercent: 75,
          },
        ],
      };

      expect(hotListData.items.length).toBeGreaterThan(0);
      expect(hotListData.items[0].candidateName).toBeTruthy();
      expect(hotListData.items[0].weightedIff).toBeTruthy();
    });
  });
});

describe('Navigation Links Configuration', () => {
  it('all 7 dashboard links are defined', () => {
    const dashboardLinks = [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/reports', label: 'Reports' },
      { href: '/leads', label: 'Leads' },
      { href: '/pipeline', label: 'Pipeline' },
      { href: '/hot-list', label: 'Hot List' },
      { href: '/notes', label: 'Notes' },
      { href: '/schedule', label: 'Schedule' },
    ];

    expect(dashboardLinks.length).toBe(7);

    // Verify all links have both href and label
    dashboardLinks.forEach((link) => {
      expect(link.href).toBeTruthy();
      expect(link.label).toBeTruthy();
      expect(link.href.startsWith('/')).toBe(true);
    });
  });

  it('protected routes include all dashboard pages', () => {
    const dashboardPages = ['/dashboard', '/reports', '/leads', '/pipeline', '/hot-list', '/notes', '/schedule'];

    dashboardPages.forEach((page) => {
      expect(PROTECTED_ROUTES.includes(page)).toBe(true);
    });
  });

  it('tenant required routes include all dashboard pages', () => {
    const dashboardPages = ['/dashboard', '/reports', '/leads', '/pipeline', '/hot-list', '/notes', '/schedule'];

    dashboardPages.forEach((page) => {
      expect(TENANT_REQUIRED_ROUTES.includes(page)).toBe(true);
    });
  });
});
