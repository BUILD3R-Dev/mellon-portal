/**
 * @vitest-environment jsdom
 */
/**
 * Gap analysis tests for DashboardIsland component.
 *
 * Covers critical UI workflows identified during Task Group 6 review:
 * - Full render cycle: mount, fetch, display KPI values, toggle time window, verify re-fetch
 * - Time window toggle updates localStorage and the subtitle on New Leads KPI card
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { DashboardIsland } from '../DashboardIsland';

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

const mockKPIResponseRolling = {
  success: true,
  data: {
    newLeads: 8,
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

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

describe('Gap Analysis: DashboardIsland', () => {
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

  it('full render cycle: mount, fetch, display KPI values, toggle time window, verify re-fetch', async () => {
    // First fetch returns report-week data, second (after toggle) returns rolling-7 data
    let kpiFetchCount = 0;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/dashboard/kpi')) {
        kpiFetchCount++;
        const response = kpiFetchCount === 1 ? mockKPIResponse : mockKPIResponseRolling;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response),
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

    // Wait for initial data to load and display
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('199')).toBeInTheDocument();
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getByText('$450,000')).toBeInTheDocument();
    });

    // Verify charts rendered
    const charts = screen.getAllByTestId('echarts-mock');
    expect(charts.length).toBe(2);
    expect(screen.getByText('Lead Trends')).toBeInTheDocument();
    expect(screen.getByText('Pipeline by Stage')).toBeInTheDocument();

    // Toggle to Rolling 7 Days
    fireEvent.click(screen.getByText('Rolling 7 Days'));

    // Verify re-fetch happened with rolling-7 parameter
    await waitFor(() => {
      const rolling7Call = mockFetch.mock.calls.find(
        (call: string[]) => typeof call[0] === 'string' && call[0].includes('timeWindow=rolling-7')
      );
      expect(rolling7Call).toBeDefined();
    });

    // Wait for rolling-7 data to display
    await waitFor(() => {
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  it('time window toggle updates localStorage and the subtitle on the New Leads KPI card', async () => {
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

    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    // Default subtitle should be "Current report week"
    expect(screen.getByText('Current report week')).toBeInTheDocument();

    // Toggle to Rolling 7 Days
    fireEvent.click(screen.getByText('Rolling 7 Days'));

    // Verify localStorage was updated
    expect(localStorageMock.setItem).toHaveBeenCalledWith('dashboard-time-window', 'rolling-7');

    // Subtitle should change to "Past 7 days"
    await waitFor(() => {
      expect(screen.getByText('Past 7 days')).toBeInTheDocument();
    });

    // Toggle back to Current Report Week
    fireEvent.click(screen.getByText('Current Report Week'));

    // Verify localStorage updated again
    expect(localStorageMock.setItem).toHaveBeenCalledWith('dashboard-time-window', 'report-week');

    // Subtitle should change back
    await waitFor(() => {
      expect(screen.getByText('Current report week')).toBeInTheDocument();
    });
  });
});
