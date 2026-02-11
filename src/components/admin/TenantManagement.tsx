import * as React from 'react';
import { TenantModal } from './TenantModal';
import { DeactivationConfirmModal } from './DeactivationConfirmModal';
import { StatusChangeDialog } from './StatusChangeDialog';

interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  timezone: string;
  createdAt: string;
  clienttetherWebKey?: string | null;
  clienttetherAccessToken?: string | null;
  branding?: {
    id: string;
    themeId: string;
    accentColorOverride: string | null;
    tenantLogoUrl: string | null;
    mellonLogoUrl?: string | null;
  } | null;
}

interface TenantManagementProps {
  initialTenants: Tenant[];
}

type SortField = 'name' | 'status' | 'timezone' | 'createdAt';
type SortDirection = 'asc' | 'desc';

/**
 * Formats tenant status for display with appropriate styling
 */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-amber-100 text-amber-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/**
 * Formats date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Sort indicator component
 */
function SortIndicator({ field, currentField, direction }: { field: SortField; currentField: SortField; direction: SortDirection }) {
  if (field !== currentField) {
    return (
      <svg className="w-4 h-4" style={{ color: 'var(--border, #D1D5DB)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }

  return direction === 'asc' ? (
    <svg className="w-4 h-4" style={{ color: 'var(--foreground, #111827)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-4 h-4" style={{ color: 'var(--foreground, #111827)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function TenantManagement({ initialTenants }: TenantManagementProps) {
  const [tenants, setTenants] = React.useState<Tenant[]>(initialTenants);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [editingTenant, setEditingTenant] = React.useState<Tenant | null>(null);
  const [deactivatingTenant, setDeactivatingTenant] = React.useState<Tenant | null>(null);
  const [statusChangeTenant, setStatusChangeTenant] = React.useState<{ tenant: Tenant; newStatus: 'active' | 'inactive' | 'suspended' } | null>(null);
  const [isDeactivating, setIsDeactivating] = React.useState(false);
  const [isChangingStatus, setIsChangingStatus] = React.useState(false);
  const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'inactive' | 'suspended'>('all');

  // Sorting state
  const [sortField, setSortField] = React.useState<SortField>('name');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');

  // Auto-hide notification after 5 seconds
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Filter and sort tenants
  const filteredTenants = React.useMemo(() => {
    let result = [...tenants];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(query));
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'timezone':
          comparison = a.timezone.localeCompare(b.timezone);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [tenants, searchQuery, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleCreateSuccess = (data: Tenant) => {
    setTenants((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNotification({
      type: 'success',
      message: `Tenant "${data.name}" created successfully`,
    });
  };

  const handleEditSuccess = (data: Tenant) => {
    setTenants((prev) =>
      prev
        .map((t) => (t.id === data.id ? { ...t, ...data } : t))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    setNotification({
      type: 'success',
      message: `Tenant "${data.name}" updated successfully`,
    });
  };

  const handleDeactivate = async () => {
    if (!deactivatingTenant) return;

    setIsDeactivating(true);

    try {
      const response = await fetch(`/api/tenants/${deactivatingTenant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'inactive' }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to deactivate tenant',
        });
        return;
      }

      setTenants((prev) =>
        prev.map((t) =>
          t.id === deactivatingTenant.id ? { ...t, status: 'inactive' as const } : t
        )
      );

      const sessionsMessage = data.data.sessionsInvalidated
        ? ` ${data.data.sessionsInvalidated} user session(s) invalidated.`
        : '';

      setNotification({
        type: 'success',
        message: `Tenant "${deactivatingTenant.name}" has been deactivated.${sessionsMessage}`,
      });
    } catch (error) {
      console.error('Deactivation error:', error);
      setNotification({
        type: 'error',
        message: 'Failed to deactivate tenant. Please try again.',
      });
    } finally {
      setIsDeactivating(false);
      setDeactivatingTenant(null);
    }
  };

  const handleStatusChange = async () => {
    if (!statusChangeTenant) return;

    setIsChangingStatus(true);

    try {
      const response = await fetch(`/api/tenants/${statusChangeTenant.tenant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: statusChangeTenant.newStatus }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to change tenant status',
        });
        return;
      }

      setTenants((prev) =>
        prev.map((t) =>
          t.id === statusChangeTenant.tenant.id ? { ...t, status: statusChangeTenant.newStatus } : t
        )
      );

      const sessionsMessage = data.data.sessionsInvalidated
        ? ` ${data.data.sessionsInvalidated} user session(s) invalidated.`
        : '';

      setNotification({
        type: 'success',
        message: `Tenant "${statusChangeTenant.tenant.name}" status changed to ${statusChangeTenant.newStatus}.${sessionsMessage}`,
      });
    } catch (error) {
      console.error('Status change error:', error);
      setNotification({
        type: 'error',
        message: 'Failed to change tenant status. Please try again.',
      });
    } finally {
      setIsChangingStatus(false);
      setStatusChangeTenant(null);
    }
  };

  const handleActivate = (tenant: Tenant) => {
    setStatusChangeTenant({ tenant, newStatus: 'active' });
  };

  const handleSuspend = (tenant: Tenant) => {
    setStatusChangeTenant({ tenant, newStatus: 'suspended' });
  };

  return (
    <div className="space-y-6">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground, #111827)' }}>Tenants</h2>
          <p className="text-sm" style={{ color: 'var(--foreground-muted, #6B7280)' }}>Manage franchise brand tenants</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--accent-color, #2563EB)', color: 'var(--accent-text, #FFFFFF)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Tenant
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">Search tenants</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5" style={{ color: 'var(--foreground-muted, #9CA3AF)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              placeholder="Search tenants by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              style={{ backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--border, #E5E7EB)', color: 'var(--foreground, #111827)' }}
            />
          </div>
        </div>
        <div className="sm:w-48">
          <label htmlFor="status-filter" className="sr-only">Filter by status</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="block w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            style={{ backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--border, #E5E7EB)', color: 'var(--foreground, #111827)' }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-lg border ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm">{notification.message}</p>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-current opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Tenants table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--card-border, #E5E7EB)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border, #E5E7EB)', backgroundColor: 'var(--background-secondary, #F9FAFB)' }}>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                  style={{ color: 'var(--foreground-muted, #6B7280)' }}
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Tenant
                    <SortIndicator field="name" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                  style={{ color: 'var(--foreground-muted, #6B7280)' }}
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    <SortIndicator field="status" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                  style={{ color: 'var(--foreground-muted, #6B7280)' }}
                  onClick={() => handleSort('timezone')}
                >
                  <div className="flex items-center gap-2">
                    Timezone
                    <SortIndicator field="timezone" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors"
                  style={{ color: 'var(--foreground-muted, #6B7280)' }}
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-2">
                    Created
                    <SortIndicator field="createdAt" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border, #E5E7EB)' }}>
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-12 h-12" style={{ color: 'var(--border, #D1D5DB)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {searchQuery || statusFilter !== 'all' ? (
                        <>
                          <p className="font-medium" style={{ color: 'var(--foreground, #111827)' }}>No tenants match your filters</p>
                          <p className="text-sm">Try adjusting your search or filter criteria</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setStatusFilter('all');
                            }}
                            className="mt-2 text-sm font-medium hover:underline"
                            style={{ color: 'var(--accent-color, #2563EB)' }}
                          >
                            Clear filters
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="font-medium" style={{ color: 'var(--foreground, #111827)' }}>No tenants yet</p>
                          <p className="text-sm">Get started by creating your first tenant</p>
                          <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="mt-2 text-sm font-medium hover:underline"
                            style={{ color: 'var(--accent-color, #2563EB)' }}
                          >
                            Create your first tenant
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="themed-table-row" style={{ borderColor: 'var(--border, #E5E7EB)' }}>
                    <td className="px-6 py-4">
                      <div>
                        <span
                          className="text-sm font-medium"
                          style={{ color: 'var(--foreground, #111827)' }}
                        >
                          {tenant.name}
                        </span>
                        <p className="text-xs" style={{ color: 'var(--foreground-muted, #6B7280)' }}>{tenant.id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tenant.status} />
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--foreground-muted, #6B7280)' }}>{tenant.timezone}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--foreground-muted, #6B7280)' }}>{formatDate(tenant.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingTenant(tenant)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors"
                          style={{ color: 'var(--foreground, #111827)', backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--border, #E5E7EB)' }}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        {tenant.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() => setDeactivatingTenant(tenant)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivate(tenant)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results summary */}
      {tenants.length > 0 && (
        <p className="text-sm" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
          Showing {filteredTenants.length} of {tenants.length} tenant{tenants.length !== 1 ? 's' : ''}
          {(searchQuery || statusFilter !== 'all') && ' (filtered)'}
        </p>
      )}

      {/* Create Modal */}
      <TenantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
        mode="create"
      />

      {/* Edit Modal */}
      {editingTenant && (
        <TenantModal
          isOpen={true}
          onClose={() => setEditingTenant(null)}
          onSuccess={handleEditSuccess}
          mode="edit"
          tenant={editingTenant}
        />
      )}

      {/* Deactivation Confirmation Modal */}
      <DeactivationConfirmModal
        isOpen={!!deactivatingTenant}
        onClose={() => setDeactivatingTenant(null)}
        onConfirm={handleDeactivate}
        tenantName={deactivatingTenant?.name || ''}
        isLoading={isDeactivating}
      />

      {/* Status Change Dialog */}
      <StatusChangeDialog
        isOpen={!!statusChangeTenant}
        onClose={() => setStatusChangeTenant(null)}
        onConfirm={handleStatusChange}
        tenantName={statusChangeTenant?.tenant.name || ''}
        newStatus={statusChangeTenant?.newStatus || 'active'}
        isLoading={isChangingStatus}
      />

      <style>{`
        .themed-table-row:hover {
          background-color: var(--border-muted, #F3F4F6);
        }
        .divide-y > :not([hidden]) ~ :not([hidden]) {
          border-color: var(--border, #E5E7EB);
        }
      `}</style>
    </div>
  );
}
