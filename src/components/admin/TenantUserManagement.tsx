import * as React from 'react';
import { TenantUserInviteModal } from './TenantUserInviteModal';
import { UserDeactivationModal } from './UserDeactivationModal';
import { UserRemovalModal } from './UserRemovalModal';

interface TenantUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: string;
}

interface TenantUserManagementProps {
  tenantId: string;
  tenantName: string;
  initialUsers: TenantUser[];
  userRole: 'agency_admin' | 'tenant_admin';
}

type SortField = 'email' | 'name' | 'role' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

/**
 * Formats user role for display
 */
function formatRole(role: string): string {
  const roleLabels: Record<string, string> = {
    agency_admin: 'Agency Admin',
    tenant_admin: 'Tenant Admin',
    tenant_viewer: 'Tenant Viewer',
  };
  return roleLabels[role] || role;
}

/**
 * Formats user status with appropriate styling
 */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-amber-100 text-amber-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`}
    >
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
function SortIndicator({
  field,
  currentField,
  direction,
}: {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
}) {
  if (field !== currentField) {
    return (
      <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    );
  }

  return direction === 'asc' ? (
    <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function TenantUserManagement({
  tenantId,
  tenantName,
  initialUsers,
  userRole,
}: TenantUserManagementProps) {
  const [users, setUsers] = React.useState<TenantUser[]>(initialUsers);
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
  const [deactivatingUser, setDeactivatingUser] = React.useState<TenantUser | null>(null);
  const [removingUser, setRemovingUser] = React.useState<TenantUser | null>(null);
  const [isDeactivating, setIsDeactivating] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [notification, setNotification] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'inactive' | 'pending'>(
    'all'
  );

  // Sorting state
  const [sortField, setSortField] = React.useState<SortField>('email');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');

  // Auto-hide notification after 5 seconds
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Filter and sort users
  const filteredUsers = React.useMemo(() => {
    let result = [...users];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          (u.name && u.name.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((u) => u.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [users, searchQuery, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleInviteSuccess = (data: { userId: string; email: string }) => {
    // Refetch users list to include the new user
    fetchUsers();
    setNotification({
      type: 'success',
      message: `Invitation sent to ${data.email}`,
    });
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/tenants/${tenantId}/users`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingUser) return;

    setIsDeactivating(true);

    try {
      const response = await fetch(
        `/api/tenants/${tenantId}/users/${deactivatingUser.id}/deactivate`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to deactivate user',
        });
        return;
      }

      // Update user in list
      setUsers((prev) =>
        prev.map((u) => (u.id === deactivatingUser.id ? { ...u, status: 'inactive' } : u))
      );

      setNotification({
        type: 'success',
        message: `${deactivatingUser.name || deactivatingUser.email} has been deactivated`,
      });
    } catch (error) {
      console.error('Deactivation error:', error);
      setNotification({
        type: 'error',
        message: 'Failed to deactivate user. Please try again.',
      });
    } finally {
      setIsDeactivating(false);
      setDeactivatingUser(null);
    }
  };

  const handleRemove = async () => {
    if (!removingUser) return;

    setIsRemoving(true);

    try {
      const response = await fetch(`/api/tenants/${tenantId}/users/${removingUser.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to remove user',
        });
        return;
      }

      // Remove user from list
      setUsers((prev) => prev.filter((u) => u.id !== removingUser.id));

      setNotification({
        type: 'success',
        message: `${removingUser.name || removingUser.email} has been removed from ${tenantName}`,
      });
    } catch (error) {
      console.error('Removal error:', error);
      setNotification({
        type: 'error',
        message: 'Failed to remove user. Please try again.',
      });
    } finally {
      setIsRemoving(false);
      setRemovingUser(null);
    }
  };

  const allowedRoles =
    userRole === 'agency_admin' ? ['tenant_admin', 'tenant_viewer'] : ['tenant_admin', 'tenant_viewer'];

  return (
    <div className="space-y-6">
      {/* Header with Invite button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500">Manage users for {tenantName}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Invite User
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">
            Search users
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <label htmlFor="status-filter" className="sr-only">
            Filter by status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-2">
                    Name / Email
                    <SortIndicator field="email" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('role')}
                >
                  <div className="flex items-center gap-2">
                    Role
                    <SortIndicator field="role" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    <SortIndicator field="status" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <svg
                        className="w-12 h-12 text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      {searchQuery || statusFilter !== 'all' ? (
                        <>
                          <p className="text-gray-900 font-medium">No users match your filters</p>
                          <p className="text-sm">Try adjusting your search or filter criteria</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setStatusFilter('all');
                            }}
                            className="mt-2 text-sm font-medium text-gray-900 hover:underline"
                          >
                            Clear filters
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-gray-900 font-medium">No users yet</p>
                          <p className="text-sm">Get started by inviting your first user</p>
                          <button
                            type="button"
                            onClick={() => setIsInviteModalOpen(true)}
                            className="mt-2 text-sm font-medium text-gray-900 hover:underline"
                          >
                            Invite a user
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.name || <span className="text-gray-400 italic">No name set</span>}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatRole(user.role)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => setDeactivatingUser(user)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                              />
                            </svg>
                            Deactivate
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setRemovingUser(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Remove
                        </button>
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
      {users.length > 0 && (
        <p className="text-sm text-gray-500">
          Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
          {(searchQuery || statusFilter !== 'all') && ' (filtered)'}
        </p>
      )}

      {/* Invite Modal */}
      <TenantUserInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={handleInviteSuccess}
        tenantId={tenantId}
        tenantName={tenantName}
        allowedRoles={allowedRoles}
      />

      {/* Deactivation Modal */}
      <UserDeactivationModal
        isOpen={!!deactivatingUser}
        onClose={() => setDeactivatingUser(null)}
        onConfirm={handleDeactivate}
        userName={deactivatingUser?.name || undefined}
        userEmail={deactivatingUser?.email || ''}
        isLoading={isDeactivating}
      />

      {/* Removal Modal */}
      <UserRemovalModal
        isOpen={!!removingUser}
        onClose={() => setRemovingUser(null)}
        onConfirm={handleRemove}
        userName={removingUser?.name || undefined}
        userEmail={removingUser?.email || ''}
        isLoading={isRemoving}
      />
    </div>
  );
}
