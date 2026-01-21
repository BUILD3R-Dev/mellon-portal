import * as React from 'react';
import { InviteUserModal } from './InviteUserModal';

interface User {
  id: string;
  email: string;
  name: string | null;
  status: 'active' | 'inactive' | 'pending';
  role: string;
  tenantName: string | null;
  createdAt: string;
}

interface Tenant {
  id: string;
  name: string;
}

interface UserManagementProps {
  initialUsers: User[];
  tenants: Tenant[];
}

/**
 * Formats user status for display with appropriate styling
 */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-amber-100 text-amber-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.inactive}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/**
 * Formats role for display
 */
function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    agency_admin: 'Agency Admin',
    tenant_admin: 'Tenant Admin',
    tenant_viewer: 'Tenant Viewer',
  };
  return roleMap[role] || role;
}

export function UserManagement({ initialUsers, tenants }: UserManagementProps) {
  const [users, setUsers] = React.useState<User[]>(initialUsers);
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
  const [resendingId, setResendingId] = React.useState<string | null>(null);
  const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-hide notification after 5 seconds
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleInviteSuccess = (data: { userId: string; email: string }) => {
    // Refresh user list or optimistically add the new user
    // For now, we'll show a notification and let the page refresh handle it
    setNotification({
      type: 'success',
      message: `Invitation sent to ${data.email}`,
    });
  };

  const handleResendInvite = async (userId: string, email: string) => {
    setResendingId(userId);

    try {
      const response = await fetch(`/api/invites/${userId}/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to resend invite',
        });
        return;
      }

      setNotification({
        type: 'success',
        message: `Invitation resent to ${email}`,
      });
    } catch (error) {
      console.error('Resend error:', error);
      setNotification({
        type: 'error',
        message: 'Failed to resend invite. Please try again.',
      });
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Invite button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500">Manage user access and invitations</p>
        </div>
        <button
          type="button"
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Invite User
        </button>
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

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <p className="mb-2">No users found</p>
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(true)}
                      className="text-sm text-gray-900 hover:underline"
                    >
                      Invite your first user
                    </button>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name || 'Pending'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatRole(user.role)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.tenantName || '-'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleResendInvite(user.id, user.email)}
                          disabled={resendingId === user.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {resendingId === user.id ? (
                            <>
                              <svg
                                className="animate-spin h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              Resending...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              Resend Invite
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={handleInviteSuccess}
        tenants={tenants}
      />
    </div>
  );
}
