/**
 * Tests for PDF template and generation service
 *
 * Task Group 4.1: 4 focused tests for PDF generation
 * - HTML template returns a complete document with report title, tenant name, and section headings
 * - HTML template includes tenant logo URL and accent color when branding data is provided
 * - HTML template renders KPI data and pipeline-by-stage data as HTML tables
 * - generatePDF checks reportExports for cached PDF and returns existing path
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateReportHTML, type ReportPDFData } from '../template';

/** Builds a minimal ReportPDFData fixture for testing */
function buildTestData(overrides: Partial<ReportPDFData> = {}): ReportPDFData {
  return {
    reportWeek: {
      weekEndingDate: '2026-02-06',
      periodStartAt: new Date('2026-02-02T05:00:00Z'),
      periodEndAt: new Date('2026-02-07T04:59:59Z'),
    },
    manualContent: {
      narrativeRich: '<p>This week we improved lead generation.</p>',
      initiativesRich: '<p>SEO campaign launched.</p>',
      needsRich: '<p>Client to approve budget.</p>',
      discoveryDaysRich: '<p>Two discovery days completed.</p>',
    },
    kpiData: {
      newLeads: 22,
      totalPipeline: 58,
      priorityCandidates: 14,
      weightedPipelineValue: '125000.00',
    },
    pipelineData: [
      { stage: 'New Lead', count: 30 },
      { stage: 'QR Returned', count: 10 },
      { stage: 'FDD Sent', count: 5 },
    ],
    leadTrends: [
      { source: '2026-01-23', leads: 15 },
      { source: '2026-01-30', leads: 18 },
      { source: '2026-02-06', leads: 22 },
    ],
    branding: null,
    tenantName: 'Acme Franchise',
    ...overrides,
  };
}

describe('generateReportHTML', () => {
  it('returns a complete HTML document containing report title, tenant name, and section headings', () => {
    const data = buildTestData();
    const html = generateReportHTML(data);

    // Should be a complete HTML document
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');

    // Report title and tenant name
    expect(html).toContain('Weekly Report');
    expect(html).toContain('Acme Franchise');

    // Section headings
    expect(html).toContain('Narrative');
    expect(html).toContain('Initiatives');
    expect(html).toContain('Needs From Client');
    expect(html).toContain('Discovery Days');
    expect(html).toContain('Dashboard Summary');
    expect(html).toContain('Pipeline by Stage');
    expect(html).toContain('Lead Trends');
  });

  it('includes tenant logo URL and accent color in inline styles when branding is provided', () => {
    const data = buildTestData({
      branding: {
        tenantLogoUrl: 'https://example.com/logo.png',
        accentColorOverride: '#FF5500',
        themeId: 'light',
      },
    });
    const html = generateReportHTML(data);

    // Tenant logo should be rendered as an img tag
    expect(html).toContain('https://example.com/logo.png');
    expect(html).toContain('<img');

    // Accent color override should appear in inline CSS
    expect(html).toContain('#FF5500');
  });

  it('renders KPI data and pipeline-by-stage data as HTML tables, not chart libraries', () => {
    const data = buildTestData();
    const html = generateReportHTML(data);

    // KPI values should appear in the output
    expect(html).toContain('22'); // newLeads
    expect(html).toContain('58'); // totalPipeline
    expect(html).toContain('14'); // priorityCandidates
    expect(html).toContain('$125,000'); // weightedPipelineValue formatted

    // Pipeline data should be in an HTML table
    expect(html).toContain('<table');
    expect(html).toContain('New Lead');
    expect(html).toContain('QR Returned');
    expect(html).toContain('FDD Sent');

    // Lead trends should also be in an HTML table
    expect(html).toContain('2026-01-23');
    expect(html).toContain('2026-02-06');

    // Should NOT contain ECharts or chart library references
    expect(html).not.toContain('echarts');
    expect(html).not.toContain('ECharts');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('<script');
  });
});

describe('generateReportPDF cache check', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  it('checks reportExports for cached PDF and returns existing path without regeneration', async () => {
    const cachedPath = '/tmp/test-cached.pdf';

    // Mock the database module
    vi.mock('@/lib/db', () => ({
      db: {
        select: vi.fn(),
      },
      reportExports: {
        tenantId: 'tenant_id',
        reportWeekId: 'report_week_id',
        pdfUrl: 'pdf_url',
      },
      tenantBranding: {
        tenantId: 'tenant_id',
        tenantLogoUrl: 'tenant_logo_url',
        themeId: 'theme_id',
        accentColorOverride: 'accent_color_override',
      },
      tenants: {
        id: 'id',
        name: 'name',
      },
    }));

    // Mock node:fs to report the cached file exists
    vi.mock('node:fs', () => ({
      existsSync: vi.fn().mockReturnValue(true),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
    }));

    // Mock report-weeks queries
    vi.mock('@/lib/report-weeks/queries', () => ({
      getReportWeekById: vi.fn(),
      getReportWeekManualByReportWeekId: vi.fn(),
    }));

    // Mock dashboard queries
    vi.mock('@/lib/dashboard/queries', () => ({
      getKPIData: vi.fn(),
      getPipelineByStage: vi.fn(),
      getLeadTrends: vi.fn(),
    }));

    // Mock playwright
    vi.mock('playwright', () => ({
      chromium: {
        launch: vi.fn(),
      },
    }));

    const { db } = await import('@/lib/db');

    // The db.select chain returns the cached PDF path
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ pdfUrl: cachedPath }]),
        }),
      }),
    } as any);

    const { generateReportPDF } = await import('../generate');
    const result = await generateReportPDF('rw-123', 'tenant-abc');

    expect(result).toBe(cachedPath);

    // db.select should have been called once for the cache check
    expect(db.select).toHaveBeenCalledTimes(1);

    // Playwright should NOT have been launched (no regeneration)
    const { chromium } = await import('playwright');
    expect(chromium.launch).not.toHaveBeenCalled();
  });
});
