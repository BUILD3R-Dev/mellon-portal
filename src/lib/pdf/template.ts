/**
 * PDF HTML template module
 *
 * Generates a complete, self-contained HTML document for Playwright
 * to render as a PDF. Includes all CSS inlined, tenant co-branding,
 * report content sections, and dashboard data rendered as HTML tables.
 */

import { generateCSSVariables } from '@/lib/themes/css-variables';
import type { KPIData, PipelineByStagePoint, LeadTrendPoint } from '@/lib/dashboard/queries';

/** Branding data for PDF co-branding */
export interface PDFBrandingData {
  tenantLogoUrl?: string | null;
  accentColorOverride?: string | null;
  themeId?: string | null;
}

/** Manual content fields from reportWeekManual */
export interface PDFManualContent {
  narrativeRich?: string | null;
  initiativesRich?: string | null;
  needsRich?: string | null;
  discoveryDaysRich?: string | null;
}

/** Report week data needed for the PDF header */
export interface PDFReportWeek {
  weekEndingDate: string;
  periodStartAt: Date;
  periodEndAt: Date;
}

/** Complete data shape for PDF generation */
export interface ReportPDFData {
  reportWeek: PDFReportWeek;
  manualContent: PDFManualContent | null;
  kpiData: KPIData;
  pipelineData: PipelineByStagePoint[];
  leadTrends: LeadTrendPoint[];
  branding: PDFBrandingData | null;
  tenantName: string;
}

/**
 * Formats a currency value with dollar sign and commas
 */
function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0';
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Formats a week period string from start and end dates
 */
function formatPeriod(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getUTCDate();
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getUTCDate();
  const year = end.getUTCFullYear();
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Renders a content section as HTML, or returns empty string if content is null/empty
 */
function renderContentSection(title: string, description: string, htmlContent: string | null | undefined): string {
  if (!htmlContent) return '';
  return `
    <div class="content-section">
      <div class="section-header">
        <h2 class="section-title">${title}</h2>
        <p class="section-description">${description}</p>
      </div>
      <div class="prose">${htmlContent}</div>
    </div>
  `;
}

/**
 * Renders KPI cards as styled HTML divs
 */
function renderKPICards(kpiData: KPIData, accentColor: string): string {
  const cards = [
    { label: 'New Leads', value: String(kpiData.newLeads) },
    { label: 'Total Pipeline', value: String(kpiData.totalPipeline) },
    { label: 'Priority Candidates', value: String(kpiData.priorityCandidates) },
    { label: 'Weighted Pipeline Value', value: formatCurrency(kpiData.weightedPipelineValue) },
  ];

  const cardHTML = cards.map((card) => `
    <div class="kpi-card">
      <div class="kpi-label">${card.label}</div>
      <div class="kpi-value">${card.value}</div>
    </div>
  `).join('');

  return `
    <div class="dashboard-section">
      <h2 class="section-title">Dashboard Summary</h2>
      <div class="kpi-grid">${cardHTML}</div>
    </div>
  `;
}

/**
 * Renders pipeline-by-stage data as an HTML table with CSS bar widths
 */
function renderPipelineTable(pipelineData: PipelineByStagePoint[], accentColor: string): string {
  if (!pipelineData || pipelineData.length === 0) return '';

  const maxCount = Math.max(...pipelineData.map((d) => d.count), 1);

  const rows = pipelineData.map((item) => {
    const widthPct = Math.max((item.count / maxCount) * 100, 2);
    return `
      <tr>
        <td class="pipeline-stage">${item.stage}</td>
        <td class="pipeline-count">${item.count}</td>
        <td class="pipeline-bar-cell">
          <div class="pipeline-bar" style="width: ${widthPct}%; background-color: ${accentColor};"></div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="pipeline-section">
      <h2 class="section-title">Pipeline by Stage</h2>
      <table class="pipeline-table">
        <thead>
          <tr>
            <th>Stage</th>
            <th>Count</th>
            <th>Distribution</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/**
 * Renders lead trends as a simple HTML table
 */
function renderLeadTrendsTable(leadTrends: LeadTrendPoint[]): string {
  if (!leadTrends || leadTrends.length === 0) return '';

  const rows = leadTrends.map((item) => `
    <tr>
      <td>${item.source}</td>
      <td>${item.leads}</td>
    </tr>
  `).join('');

  return `
    <div class="trends-section">
      <h2 class="section-title">Lead Trends</h2>
      <table class="trends-table">
        <thead>
          <tr>
            <th>Week Ending</th>
            <th>Leads</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/**
 * Generates a complete, self-contained HTML document for PDF rendering.
 *
 * The document includes all CSS inlined, tenant co-branding (logo, accent
 * color), content sections, KPI cards, pipeline table, and lead trends table.
 * Designed for A4 layout with print-friendly styling.
 *
 * @param params - Complete data for the PDF report
 * @returns Self-contained HTML document string
 */
export function generateReportHTML(params: ReportPDFData): string {
  const { reportWeek, manualContent, kpiData, pipelineData, leadTrends, branding, tenantName } = params;

  const themeId = branding?.themeId || 'light';
  const cssVars = generateCSSVariables(themeId, branding?.accentColorOverride);
  const accentColor = cssVars['--accent-color'];
  const tenantLogoUrl = branding?.tenantLogoUrl || null;

  const weekPeriod = formatPeriod(
    new Date(reportWeek.periodStartAt),
    new Date(reportWeek.periodEndAt)
  );

  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Report - ${weekPeriod}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: ${cssVars['--foreground']};
      background: ${cssVars['--background']};
      line-height: 1.6;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm 15mm;
    }

    /* Header */
    .report-header {
      border-bottom: 3px solid ${accentColor};
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .tenant-logo {
      max-height: 48px;
      max-width: 200px;
      object-fit: contain;
    }

    .mellon-badge {
      font-size: 11px;
      color: ${cssVars['--foreground-muted']};
    }

    .report-title {
      font-size: 24px;
      font-weight: 700;
      color: ${cssVars['--foreground']};
      margin-bottom: 4px;
    }

    .report-period {
      font-size: 16px;
      color: ${cssVars['--foreground-muted']};
      margin-bottom: 2px;
    }

    .tenant-name {
      font-size: 14px;
      color: ${accentColor};
      font-weight: 600;
    }

    /* Content sections */
    .content-section {
      background: ${cssVars['--card-background']};
      border: 1px solid ${cssVars['--card-border']};
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }

    .section-header {
      margin-bottom: 12px;
      border-bottom: 1px solid ${cssVars['--border-muted']};
      padding-bottom: 8px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: ${cssVars['--foreground']};
      margin-bottom: 4px;
    }

    .section-description {
      font-size: 13px;
      color: ${cssVars['--foreground-muted']};
    }

    /* Prose styling for rich text content */
    .prose {
      font-size: 14px;
      line-height: 1.7;
      color: ${cssVars['--foreground']};
    }
    .prose h1 { font-size: 1.5rem; font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem; }
    .prose h2 { font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; }
    .prose h3 { font-size: 1.125rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.25rem; }
    .prose p { margin-top: 0.5rem; margin-bottom: 0.5rem; }
    .prose ul { list-style-type: disc; padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
    .prose ol { list-style-type: decimal; padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
    .prose li { margin-top: 0.25rem; margin-bottom: 0.25rem; }
    .prose a { color: ${accentColor}; text-decoration: underline; }
    .prose strong { font-weight: 600; }
    .prose em { font-style: italic; }

    /* Dashboard section */
    .dashboard-section {
      margin-bottom: 16px;
      page-break-inside: avoid;
    }

    .dashboard-section .section-title {
      margin-bottom: 12px;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .kpi-card {
      background: ${cssVars['--card-background']};
      border: 1px solid ${cssVars['--card-border']};
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }

    .kpi-label {
      font-size: 12px;
      font-weight: 500;
      color: ${cssVars['--foreground-muted']};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .kpi-value {
      font-size: 24px;
      font-weight: 700;
      color: ${accentColor};
    }

    /* Pipeline table */
    .pipeline-section, .trends-section {
      margin-bottom: 16px;
      page-break-inside: avoid;
    }

    .pipeline-section .section-title, .trends-section .section-title {
      margin-bottom: 12px;
    }

    .pipeline-table, .trends-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .pipeline-table th, .pipeline-table td,
    .trends-table th, .trends-table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid ${cssVars['--border-muted']};
    }

    .pipeline-table th, .trends-table th {
      font-weight: 600;
      color: ${cssVars['--foreground-muted']};
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid ${cssVars['--border']};
    }

    .pipeline-stage {
      white-space: nowrap;
      font-weight: 500;
    }

    .pipeline-count {
      text-align: center;
      font-weight: 600;
      width: 60px;
    }

    .pipeline-bar-cell {
      width: 40%;
    }

    .pipeline-bar {
      height: 16px;
      border-radius: 4px;
      min-width: 4px;
    }

    /* Footer */
    .report-footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid ${cssVars['--border']};
      text-align: center;
    }

    .footer-powered {
      font-size: 12px;
      color: ${cssVars['--foreground-muted']};
    }

    .footer-powered .brand {
      font-weight: 600;
      color: ${accentColor};
    }

    .footer-copyright {
      font-size: 11px;
      color: ${cssVars['--foreground-muted']};
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="report-header">
    <div class="header-top">
      ${tenantLogoUrl ? `<img src="${tenantLogoUrl}" alt="${tenantName} logo" class="tenant-logo">` : `<span class="tenant-name">${tenantName}</span>`}
      <span class="mellon-badge">Mellon Portal</span>
    </div>
    <h1 class="report-title">Weekly Report</h1>
    <p class="report-period">${weekPeriod}</p>
    ${tenantLogoUrl ? `<p class="tenant-name">${tenantName}</p>` : ''}
  </div>

  <!-- Content Sections -->
  ${renderContentSection('Narrative', 'Weekly performance summary and key highlights', manualContent?.narrativeRich)}
  ${renderContentSection('Initiatives', 'Current marketing initiatives and activities', manualContent?.initiativesRich)}
  ${renderContentSection('Needs From Client', 'Action items or requests for the client', manualContent?.needsRich)}
  ${renderContentSection('Discovery Days', 'Discovery day activities and outcomes', manualContent?.discoveryDaysRich)}

  <!-- Dashboard KPIs -->
  ${renderKPICards(kpiData, accentColor)}

  <!-- Pipeline by Stage -->
  ${renderPipelineTable(pipelineData, accentColor)}

  <!-- Lead Trends -->
  ${renderLeadTrendsTable(leadTrends)}

  <!-- Footer -->
  <div class="report-footer">
    <p class="footer-powered">Powered by <span class="brand">Mellon Franchising</span></p>
    <p class="footer-copyright">&copy; ${currentYear} Mellon Franchising. All rights reserved.</p>
  </div>
</body>
</html>`;
}
