/**
 * PDF module exports
 *
 * Provides PDF generation and template functions for report export.
 * The generateReportPDF function checks for a cached PDF before generating
 * a new one via Playwright headless browser rendering.
 */

export { generateReportPDF, closeBrowser } from './generate';

export { generateReportHTML } from './template';

export type { ReportPDFData } from './template';
