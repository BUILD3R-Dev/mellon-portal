/**
 * DashboardIsland component
 *
 * Parent React island component that coordinates all dashboard interactivity.
 * Manages KPI data fetching, time window toggle, chart data, and renders
 * KPICard, LeadsChart, and HorizontalBarChart child components.
 */
import * as React from 'react';
import { KPICard } from './KPICard';
import { LeadsChart, type LeadsChartDataPoint } from './LeadsChart';
import { HorizontalBarChart, type HorizontalBarChartDataPoint } from './HorizontalBarChart';

type TimeWindow = 'report-week' | 'rolling-7';

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

const CHART_RANGE_OPTIONS = [
  { label: '4 weeks', value: 4 },
];

const TIME_WINDOW_STORAGE_KEY = 'dashboard-time-window';

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
 * Reads the persisted time window preference from localStorage.
 */
function getStoredTimeWindow(): TimeWindow {
  try {
    const stored = localStorage.getItem(TIME_WINDOW_STORAGE_KEY);
    if (stored === 'rolling-7') return 'rolling-7';
  } catch {
    // localStorage may be unavailable in some environments
  }
  return 'report-week';
}

/**
 * Persists the time window preference to localStorage.
 */
function storeTimeWindow(value: TimeWindow): void {
  try {
    localStorage.setItem(TIME_WINDOW_STORAGE_KEY, value);
  } catch {
    // localStorage may be unavailable in some environments
  }
}

export function DashboardIsland() {
  const [timeWindow, setTimeWindow] = React.useState<TimeWindow>('report-week');
  const [chartWeeks, setChartWeeks] = React.useState<number>(4);
  const [kpiLoading, setKpiLoading] = React.useState(true);
  const [pipelineLoading, setPipelineLoading] = React.useState(true);
  const [kpiData, setKpiData] = React.useState<KPIData | null>(null);
  const [pipelineData, setPipelineData] = React.useState<PipelineData | null>(null);

  // On mount, read persisted time window
  React.useEffect(() => {
    setTimeWindow(getStoredTimeWindow());
  }, []);

  // Fetch KPI data when timeWindow changes
  React.useEffect(() => {
    let cancelled = false;

    async function fetchKPI() {
      setKpiLoading(true);
      try {
        const response = await fetch(`/api/dashboard/kpi?timeWindow=${timeWindow}`);
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
  }, [timeWindow]);

  // Fetch pipeline data when chartWeeks changes
  React.useEffect(() => {
    let cancelled = false;

    async function fetchPipeline() {
      setPipelineLoading(true);
      try {
        const response = await fetch(`/api/dashboard/pipeline?weeks=${chartWeeks}`);
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
  }, [chartWeeks]);

  function handleTimeWindowChange(value: TimeWindow) {
    setTimeWindow(value);
    storeTimeWindow(value);
  }

  function handleChartWeeksChange(value: number) {
    setChartWeeks(value);
  }

  const newLeadsSubtitle = timeWindow === 'rolling-7' ? 'Past 7 days' : 'Current report week';

  return (
    <div className="space-y-8">
      {/* Time Window Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600 mr-2">Time window:</span>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            type="button"
            onClick={() => handleTimeWindowChange('report-week')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              timeWindow === 'report-week'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Current Report Week
          </button>
          <button
            type="button"
            onClick={() => handleTimeWindowChange('rolling-7')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              timeWindow === 'rolling-7'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Rolling 7 Days
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          label="New Leads"
          value={kpiData ? String(kpiData.newLeads) : '--'}
          subtitle={newLeadsSubtitle}
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

      {/* Chart Time Range Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600 mr-2">Chart range:</span>
        <select
          value={chartWeeks}
          onChange={(e) => handleChartWeeksChange(Number(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CHART_RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pipelineLoading ? (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="h-64 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="h-64 bg-gray-100 rounded animate-pulse" />
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
