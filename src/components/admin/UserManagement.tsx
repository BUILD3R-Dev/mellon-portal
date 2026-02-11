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
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground, #111827)' }}>Users</h2>
          <p className="text-sm" style={{ color: 'var(--foreground-muted, #6B7280)' }}>Manage user access and invitations</p>
        </div>
        <button
          type="button"
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--accent-color, #2563EB)', color: 'var(--accent-text, #FFFFFF)' }}
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
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--card-border, #E5E7EB)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border, #E5E7EB)', backgroundColor: 'var(--background-secondary, #F9FAFB)' }}>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                  Tenant
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border, #E5E7EB)' }}>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center" style={{ color: 'var(--foreground-muted, #6B7280)' }}>
                    <p className="mb-2">No users found</p>
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(true)}
                      className="text-sm hover:underline"
                      style={{ color: 'var(--accent-color, #2563EB)' }}
                    >
                      Invite your first user
                    </button>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="themed-table-row" style={{ borderColor: 'var(--border, #E5E7EB)' }}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--foreground, #111827)' }}>{user.name || 'Pending'}</p>
                        <p className="text-sm" style={{ color: 'var(--foreground-muted, #6B7280)' }}>{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--foreground, #111827)' }}>{formatRole(user.role)}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--foreground-muted, #6B7280)' }}>{user.tenantName || '-'}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleResendInvite(user.id, user.email)}
                          disabled={resendingId === user.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ color: 'var(--foreground, #111827)', backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--border, #E5E7EB)' }}
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
