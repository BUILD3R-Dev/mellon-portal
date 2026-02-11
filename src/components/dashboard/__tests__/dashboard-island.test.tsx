/**
 * @vitest-environment jsdom
 */
/**
 * Tests for DashboardIsland component
 *
 * Task Group 5.1: Write 4 focused tests for dashboard UI components
 * - Test that DashboardIsland renders 4 KPICard components with correct labels
 * - Test that DashboardIsland shows loading skeleton state while fetching data
 * - Test that toggling time window triggers a re-fetch of KPI data with updated timeWindow parameter
 * - Test that chart time range selector re-fetches pipeline data with updated weeks parameter
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DashboardIsland } from '../DashboardIsland';

// Mock ECharts to avoid canvas issues in jsdom
vi.mock('echarts-for-react', () => ({
  default: ({ option }: { option: { title?: { text?: string } } }) => (
    <div data-testid="echarts-mock">{option?.title?.text ?? 'chart'}</div>
  ),
}));

const mockKPIResponse = {
  success: true,
  data: {
    newLeads: 12,
    totalPipeline: 199,
    priorityCandidates: 35,
    weightedPipelineValue: '450000.00',
  },
};

const mockPipelineResponse = {
  success: true,
  data: {
    pipelineByStage: [
      { stage: 'New Lead', count: 50 },
      { stage: 'QR Returned', count: 10 },
    ],
    leadTrends: [
      { source: '2026-01-26', leads: 8 },
      { source: '2026-02-02', leads: 12 },
    ],
  },
};

const mockFetch = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

describe('DashboardIsland', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders 4 KPICard components with correct labels', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/kpi')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockKPIResponse),
        });
      }
      if (url.includes('/api/dashboard/pipeline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPipelineResponse),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<DashboardIsland />);

    await waitFor(() => {
      expect(screen.getByText('New Leads')).toBeInTheDocument();
      expect(screen.getByText('Total Leads in Pipeline')).toBeInTheDocument();
      expect(screen.getByText('Priority Candidates')).toBeInTheDocument();
      expect(screen.getByText('Weighted Pipeline Value')).toBeInTheDocument();
    });

    // Verify KPI values are displayed after loading
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('199')).toBeInTheDocument();
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getByText('$450,000')).toBeInTheDocument();
    });
  });

  it('shows loading skeleton state while fetching data', async () => {
    // Never resolve fetch to keep component in loading state
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<DashboardIsland />);

    // Should show skeleton pulses for KPI cards while loading
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);

    // KPI labels should still be visible even during loading
    expect(screen.getByText('New Leads')).toBeInTheDocument();
    expect(screen.getByText('Total Leads in Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Priority Candidates')).toBeInTheDocument();
    expect(screen.getByText('Weighted Pipeline Value')).toBeInTheDocument();
  });

  it('changing period triggers a re-fetch of KPI data with updated period parameter', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/kpi')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockKPIResponse),
        });
      }
      if (url.includes('/api/dashboard/pipeline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPipelineResponse),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<DashboardIsland />);

    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    // Initial fetch should use period=week
    const initialKpiCall = mockFetch.mock.calls.find(
      (call: string[]) => typeof call[0] === 'string' && call[0].includes('/api/dashboard/kpi')
    );
    expect(initialKpiCall?.[0]).toContain('period=week');

    // Clear mock to track new calls
    mockFetch.mockClear();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/kpi')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockKPIResponse),
        });
      }
      if (url.includes('/api/dashboard/pipeline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPipelineResponse),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    // Change period to "Past Quarter"
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'quarter' } });

    // Should re-fetch with period=quarter
    await waitFor(() => {
      const quarterCall = mockFetch.mock.calls.find(
        (call: string[]) => typeof call[0] === 'string' && call[0].includes('/api/dashboard/kpi')
      );
      expect(quarterCall?.[0]).toContain('period=quarter');
    });

    // Should persist to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('dashboard-period', 'quarter');
  });

  it('changing period to quarter re-fetches pipeline data with weeks=13', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/kpi')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockKPIResponse),
        });
      }
      if (url.includes('/api/dashboard/pipeline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPipelineResponse),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(<DashboardIsland />);

    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    // Initial pipeline fetch should use weeks=4
    const initialPipelineCall = mockFetch.mock.calls.find(
      (call: string[]) => typeof call[0] === 'string' && call[0].includes('/api/dashboard/pipeline')
    );
    expect(initialPipelineCall?.[0]).toContain('weeks=4');

    // Clear mock to track new calls
    mockFetch.mockClear();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/kpi')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockKPIResponse),
        });
      }
      if (url.includes('/api/dashboard/pipeline')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPipelineResponse),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    // Change period to quarter
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'quarter' } });

    // Should re-fetch pipeline with weeks=13
    await waitFor(() => {
      const quarterPipelineCall = mockFetch.mock.calls.find(
        (call: string[]) => typeof call[0] === 'string' && call[0].includes('/api/dashboard/pipeline')
      );
      expect(quarterPipelineCall?.[0]).toContain('weeks=13');
    });
  });
});
