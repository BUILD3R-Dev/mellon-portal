import * as React from 'react';

interface Tenant {
  id: string;
  name: string;
  status: string;
}

interface WorkspaceSelectorProps {
  currentTenantId: string | null;
  currentTenantName: string | null;
  isAgencyAdmin: boolean;
  initialTenants?: Tenant[];
}

export function WorkspaceSelector({
  currentTenantId,
  currentTenantName,
  isAgencyAdmin,
  initialTenants = [],
}: WorkspaceSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tenants, setTenants] = React.useState<Tenant[]>(initialTenants);
  const [isLoading, setIsLoading] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Fetch tenants when opening dropdown
  const handleOpenDropdown = async () => {
    setIsOpen(!isOpen);

    // Fetch fresh tenant list if opening
    if (!isOpen) {
      setIsLoading(true);
      try {
        const response = await fetch('/api/tenants/list');
        const data = await response.json();
        if (data.success) {
          setTenants(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch tenants:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSelectTenant = async (tenantId: string) => {
    // Set the tenant cookie and redirect
    document.cookie = `mellon_tenant=${tenantId}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30 days

    // Redirect to dashboard with the selected tenant
    window.location.href = '/dashboard';
  };

  const handleGoToAdmin = () => {
    // Clear tenant cookie and go to admin
    document.cookie = 'mellon_tenant=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/admin/dashboard';
  };

  // Determine display text
  const displayText = currentTenantName || (isAgencyAdmin ? 'Select workspace' : 'Select workspace');

  // Filter to only active tenants
  const activeTenants = tenants.filter((t) => t.status === 'active');

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleOpenDropdown}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <span className="max-w-[150px] truncate">{displayText}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          role="listbox"
        >
          {/* Admin option for agency admins */}
          {isAgencyAdmin && (
            <>
              <button
                type="button"
                onClick={handleGoToAdmin}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3"
                role="option"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Admin Dashboard</p>
                  <p className="text-xs text-gray-500">Manage all tenants</p>
                </div>
              </button>
              <div className="border-t border-gray-100 my-1" />
            </>
          )}

          {/* Tenants section */}
          <div className="px-4 py-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Workspaces
            </p>
          </div>

          {isLoading ? (
            <div className="px-4 py-4 text-center">
              <svg
                className="animate-spin h-5 w-5 text-gray-400 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
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
            </div>
          ) : activeTenants.length === 0 ? (
            <div className="px-4 py-4 text-center text-sm text-gray-500">
              No workspaces available
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {activeTenants.map((tenant) => (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => handleSelectTenant(tenant.id)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-3 ${
                    tenant.id === currentTenantId ? 'bg-gray-50' : ''
                  }`}
                  role="option"
                  aria-selected={tenant.id === currentTenantId}
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-600">
                      {tenant.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{tenant.name}</p>
                  </div>
                  {tenant.id === currentTenantId && (
                    <svg
                      className="w-4 h-4 text-green-500 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
