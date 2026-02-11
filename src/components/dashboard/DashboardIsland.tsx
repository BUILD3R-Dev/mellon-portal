/**
 * DashboardIsland component
 *
 * Parent React island component that coordinates all dashboard interactivity.
 * Manages KPI data fetching, period selector, chart data, and renders
 * KPICard, LeadsChart, and HorizontalBarChart child components.
 */
import * as React from 'react';
import { KPICard } from './KPICard';
import { LeadsChart, type LeadsChartDataPoint } from './LeadsChart';
import { HorizontalBarChart, type HorizontalBarChartDataPoint } from './HorizontalBarChart';

type Period = 'week' | 'month' | 'quarter';

interface KPIData {
  newLeads: number;
  totalPipeline: number;
  priorityCandidates: number;
  weightedPipelineValue: string;
}

interface PipelineData {
  pipelineByStage: HorizontalBarChartDataPoint[];
  leadTrends: LeadsChartDataPoint[];
}

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: 'Past Week', value: 'week' },
  { label: 'Past Month', value: 'month' },
  { label: 'Past Quarter', value: 'quarter' },
];

const PERIOD_SUBTITLES: Record<Period, string> = {
  week: 'Past 7 days',
  month: 'Past 30 days',
  quarter: 'Past 90 days',
};

const PERIOD_STORAGE_KEY = 'dashboard-period';

/**
 * Formats a dollar value string as a US currency display.
 */
function formatDollarAmount(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Reads the persisted period preference from localStorage.
 */
function getStoredPeriod(): Period {
  try {
    const stored = localStorage.getItem(PERIOD_STORAGE_KEY);
    if (stored === 'month' || stored === 'quarter') return stored;
  } catch {
    // localStorage may be unavailable in some environments
  }
  return 'week';
}

/**
 * Persists the period preference to localStorage.
 */
function storePeriod(value: Period): void {
  try {
    localStorage.setItem(PERIOD_STORAGE_KEY, value);
  } catch {
    // localStorage may be unavailable in some environments
  }
}

export function DashboardIsland() {
  const [period, setPeriod] = React.useState<Period>('week');
  const [kpiLoading, setKpiLoading] = React.useState(true);
  const [pipelineLoading, setPipelineLoading] = React.useState(true);
  const [kpiData, setKpiData] = React.useState<KPIData | null>(null);
  const [pipelineData, setPipelineData] = React.useState<PipelineData | null>(null);

  // On mount, read persisted period
  React.useEffect(() => {
    setPeriod(getStoredPeriod());
  }, []);

  // Fetch KPI data when period changes
  React.useEffect(() => {
    let cancelled = false;

    async function fetchKPI() {
      setKpiLoading(true);
      try {
        const response = await fetch(`/api/dashboard/kpi?period=${period}`);
        const result = await response.json();
        if (!cancelled && result.success) {
          setKpiData(result.data);
        }
      } catch {
        // Silently handle fetch errors; KPI cards will remain in loading state
      } finally {
        if (!cancelled) {
          setKpiLoading(false);
        }
      }
    }

    fetchKPI();
    return () => { cancelled = true; };
  }, [period]);

  // Fetch pipeline data when period changes (chart weeks depend on period)
  React.useEffect(() => {
    let cancelled = false;

    async function fetchPipeline() {
      setPipelineLoading(true);
      try {
        const response = await fetch(`/api/dashboard/pipeline?period=${period}`);
        const result = await response.json();
        if (!cancelled && result.success) {
          setPipelineData(result.data);
        }
      } catch {
        // Silently handle fetch errors; charts will show empty state
      } finally {
        if (!cancelled) {
          setPipelineLoading(false);
        }
      }
    }

    fetchPipeline();
    return () => { cancelled = true; };
  }, [period]);

  function handlePeriodChange(value: Period) {
    setPeriod(value);
    storePeriod(value);
  }

  return (
    <div className="space-y-8">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium mr-2" style={{ color: 'var(--foreground-muted, #6B7280)' }}>Time period:</span>
        <select
          value={period}
          onChange={(e) => handlePeriodChange(e.target.value as Period)}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2"
          style={{
            backgroundColor: 'var(--card-background, #FFFFFF)',
            borderColor: 'var(--border, #E5E7EB)',
            color: 'var(--foreground, #111827)',
            // @ts-ignore CSS custom property
            '--tw-ring-color': 'var(--accent-color, #2563EB)',
          } as React.CSSProperties}
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          label="New Leads"
          value={kpiData ? String(kpiData.newLeads) : '--'}
          subtitle={PERIOD_SUBTITLES[period]}
          loading={kpiLoading}
        />
        <KPICard
          label="Total Leads in Pipeline"
          value={kpiData ? String(kpiData.totalPipeline) : '--'}
          subtitle="All active contacts"
          loading={kpiLoading}
        />
        <KPICard
          label="Priority Candidates"
          value={kpiData ? String(kpiData.priorityCandidates) : '--'}
          subtitle="Past early-funnel stages"
          loading={kpiLoading}
        />
        <KPICard
          label="Weighted Pipeline Value"
          value={kpiData ? formatDollarAmount(kpiData.weightedPipelineValue) : '--'}
          subtitle="All pipeline stages"
          loading={kpiLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pipelineLoading ? (
          <>
            <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--card-border, #E5E7EB)' }}>
              <div className="h-8 w-32 rounded animate-pulse mb-4" style={{ backgroundColor: 'var(--border, #E5E7EB)' }} />
              <div className="h-64 rounded animate-pulse" style={{ backgroundColor: 'var(--border-muted, #F3F4F6)' }} />
            </div>
            <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card-background, #FFFFFF)', borderColor: 'var(--card-border, #E5E7EB)' }}>
              <div className="h-8 w-32 rounded animate-pulse mb-4" style={{ backgroundColor: 'var(--border, #E5E7EB)' }} />
              <div className="h-64 rounded animate-pulse" style={{ backgroundColor: 'var(--border-muted, #F3F4F6)' }} />
            </div>
          </>
        ) : (
          <>
            <LeadsChart
              data={pipelineData?.leadTrends ?? []}
              title="Lead Trends"
            />
            <HorizontalBarChart
              data={pipelineData?.pipelineByStage ?? []}
              title="Pipeline by Stage"
            />
          </>
        )}
      </div>
    </div>
  );
}
