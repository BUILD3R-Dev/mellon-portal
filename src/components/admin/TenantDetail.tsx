import * as React from 'react';
import { TenantModal } from './TenantModal';
import { DeactivationConfirmModal } from './DeactivationConfirmModal';
import { StatusChangeDialog } from './StatusChangeDialog';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface TenantData {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  timezone: string;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  branding: {
    id: string;
    themeId: string;
    accentColorOverride: string | null;
    tenantLogoUrl: string | null;
    mellonLogoUrl: string | null;
    primaryColor: string | null;
    accentColor: string | null;
  } | null;
}

interface TenantDetailProps {
  tenant: TenantData;
  users: User[];
}

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

/**
 * Formats date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Coming Soon badge component
 */
function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
      Coming Soon
    </span>
  );
}

export function TenantDetail({ tenant: initialTenant, users }: TenantDetailProps) {
  const [tenant, setTenant] = React.useState(initialTenant);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isDeactivating, setIsDeactivating] = React.useState(false);
  const [showDeactivationModal, setShowDeactivationModal] = React.useState(false);
  const [statusChangeTenant, setStatusChangeTenant] = React.useState<{ newStatus: 'active' | 'inactive' | 'suspended' } | null>(null);
  const [isChangingStatus, setIsChangingStatus] = React.useState(false);
  const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-hide notification after 5 seconds
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleEditSuccess = (data: any) => {
    setTenant((prev) => ({ ...prev, ...data }));
    setNotification({
      type: 'success',
      message: `Tenant "${data.name}" updated successfully`,
    });
  };

  const handleDeactivate = async () => {
    setIsDeactivating(true);

    try {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
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

      setTenant((prev) => ({ ...prev, status: 'inactive' }));

      const sessionsMessage = data.data.sessionsInvalidated
        ? ` ${data.data.sessionsInvalidated} user session(s) invalidated.`
        : '';

      setNotification({
        type: 'success',
        message: `Tenant has been deactivated.${sessionsMessage}`,
      });
    } catch (error) {
      console.error('Deactivation error:', error);
      setNotification({
        type: 'error',
        message: 'Failed to deactivate tenant. Please try again.',
      });
    } finally {
      setIsDeactivating(false);
      setShowDeactivationModal(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusChangeTenant) return;

    setIsChangingStatus(true);

    try {
      const response = await fetch(`/api/tenants/${tenant.id}`, {
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

      setTenant((prev) => ({ ...prev, status: statusChangeTenant.newStatus }));

      const sessionsMessage = data.data.sessionsInvalidated
        ? ` ${data.data.sessionsInvalidated} user session(s) invalidated.`
        : '';

      setNotification({
        type: 'success',
        message: `Tenant status changed to ${statusChangeTenant.newStatus}.${sessionsMessage}`,
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

  return (
    <div className="space-y-6">
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

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">{tenant.name}</h1>
              <StatusBadge status={tenant.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">{tenant.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          {tenant.status === 'active' ? (
            <button
              type="button"
              onClick={() => setShowDeactivationModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStatusChangeTenant({ newStatus: 'active' })}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Activate
            </button>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tenant Information</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="text-sm text-gray-900 mt-1">{tenant.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={tenant.status} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Timezone</dt>
            <dd className="text-sm text-gray-900 mt-1">{tenant.timezone}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Users</dt>
            <dd className="text-sm text-gray-900 mt-1">{tenant.userCount} user{tenant.userCount !== 1 ? 's' : ''}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created At</dt>
            <dd className="text-sm text-gray-900 mt-1">{formatDate(tenant.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Updated At</dt>
            <dd className="text-sm text-gray-900 mt-1">{formatDate(tenant.updatedAt)}</dd>
          </div>
        </dl>

        {/* Branding info */}
        {tenant.branding && (tenant.branding.mellonLogoUrl || tenant.branding.tenantLogoUrl) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Logo Configuration</h3>
            <dl className="grid grid-cols-1 gap-4">
              {tenant.branding.mellonLogoUrl && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Mellon Logo</dt>
                  <dd className="text-sm text-gray-900 mt-1 flex items-center gap-2">
                    <img
                      src={tenant.branding.mellonLogoUrl}
                      alt="Mellon Logo"
                      className="h-8 max-w-[120px] object-contain border border-gray-200 rounded"
                    />
                    <span className="text-xs text-gray-500 truncate max-w-xs">{tenant.branding.mellonLogoUrl}</span>
                  </dd>
                </div>
              )}
              {tenant.branding.tenantLogoUrl && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tenant Logo</dt>
                  <dd className="text-sm text-gray-900 mt-1 flex items-center gap-2">
                    <img
                      src={tenant.branding.tenantLogoUrl}
                      alt="Tenant Logo"
                      className="h-8 max-w-[120px] object-contain border border-gray-200 rounded"
                    />
                    <span className="text-xs text-gray-500 truncate max-w-xs">{tenant.branding.tenantLogoUrl}</span>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      {/* Users Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Associated Users</h2>
          <a
            href="/admin/users"
            className="text-sm font-medium text-gray-900 hover:underline"
          >
            Manage Users
          </a>
        </div>
        {users.length === 0 ? (
          <p className="text-sm text-gray-500">No users associated with this tenant yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th scope="col" className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="pb-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name || 'Pending'}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3 text-sm text-gray-500">{formatRole(user.role)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Related Settings Links */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href={`/admin/tenants/${tenant.id}/branding`}
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Branding Settings</p>
              <p className="text-sm text-gray-500">Theme and logo configuration</p>
            </div>
          </a>

          <a
            href={`/admin/tenants/${tenant.id}/report-weeks`}
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Report Weeks</p>
              <p className="text-sm text-gray-500">Manage weekly reporting periods</p>
            </div>
          </a>

          <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50 opacity-75">
            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-500">Integration Settings</p>
                <ComingSoonBadge />
              </div>
              <p className="text-sm text-gray-400">ClientTether configuration</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50 opacity-75">
            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-500">Field Mappings</p>
                <ComingSoonBadge />
              </div>
              <p className="text-sm text-gray-400">Custom field configuration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <TenantModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        mode="edit"
        tenant={tenant}
      />

      {/* Deactivation Confirmation Modal */}
      <DeactivationConfirmModal
        isOpen={showDeactivationModal}
        onClose={() => setShowDeactivationModal(false)}
        onConfirm={handleDeactivate}
        tenantName={tenant.name}
        isLoading={isDeactivating}
      />

      {/* Status Change Dialog */}
      <StatusChangeDialog
        isOpen={!!statusChangeTenant}
        onClose={() => setStatusChangeTenant(null)}
        onConfirm={handleStatusChange}
        tenantName={tenant.name}
        newStatus={statusChangeTenant?.newStatus || 'active'}
        isLoading={isChangingStatus}
      />
    </div>
  );
}
