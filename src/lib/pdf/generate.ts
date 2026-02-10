/**
 * PDF generation service
 *
 * Uses Playwright headless Chromium to render HTML templates as PDF files.
 * Implements a singleton browser pattern and caches generated PDFs in the
 * reportExports table to avoid regeneration.
 */

import { chromium, type Browser } from 'playwright';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db, reportExports, tenantBranding, tenants } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { getReportWeekById, getReportWeekManualByReportWeekId } from '@/lib/report-weeks/queries';
import { getKPIData, getPipelineByStage, getLeadTrends } from '@/lib/dashboard/queries';
import { generateReportHTML } from './template';

const STORAGE_DIR = resolve('./storage/pdfs');

/** Singleton Playwright browser instance */
let browserInstance: Browser | null = null;

/**
 * Lazily initializes and returns the singleton Playwright Chromium browser.
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

/**
 * Closes the singleton browser instance for graceful shutdown.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance && browserInstance.isConnected()) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Ensures the PDF storage directory exists.
 */
function ensureStorageDir(): void {
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

/**
 * Generates a PDF for a given report week, or returns a cached PDF path.
 *
 * Flow:
 * 1. Check reportExports for a cached PDF; return immediately if found on disk
 * 2. Gather all report data from the database
 * 3. Generate HTML via the template module
 * 4. Render to PDF with Playwright headless Chromium
 * 5. Write the PDF buffer to local storage
 * 6. Insert a cache record into reportExports
 * 7. Return the file path
 *
 * @param reportWeekId - The report week ID
 * @param tenantId - The tenant ID
 * @returns The local file path to the generated PDF
 */
export async function generateReportPDF(
  reportWeekId: string,
  tenantId: string
): Promise<string> {
  // Step 1: Check for cached PDF
  const cached = await db
    .select({ pdfUrl: reportExports.pdfUrl })
    .from(reportExports)
    .where(
      and(
        eq(reportExports.tenantId, tenantId),
        eq(reportExports.reportWeekId, reportWeekId)
      )
    )
    .limit(1);

  if (cached.length > 0 && cached[0].pdfUrl && existsSync(cached[0].pdfUrl)) {
    return cached[0].pdfUrl;
  }

  // Step 2: Gather all data
  const reportWeek = await getReportWeekById(reportWeekId, tenantId);
  if (!reportWeek) {
    throw new Error(`Report week ${reportWeekId} not found for tenant ${tenantId}`);
  }

  const [manualContent, kpiData, pipelineData, leadTrends] = await Promise.all([
    getReportWeekManualByReportWeekId(reportWeekId),
    getKPIData(tenantId, reportWeekId),
    getPipelineByStage(tenantId, reportWeekId),
    getLeadTrends(tenantId),
  ]);

  // Fetch tenant branding and name
  const brandingResult = await db
    .select({
      tenantLogoUrl: tenantBranding.tenantLogoUrl,
      themeId: tenantBranding.themeId,
      accentColorOverride: tenantBranding.accentColorOverride,
    })
    .from(tenantBranding)
    .where(eq(tenantBranding.tenantId, tenantId))
    .limit(1);

  const branding = brandingResult[0] || null;

  const tenantResult = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const tenantName = tenantResult[0]?.name || 'Your Organization';

  // Step 3: Generate HTML
  const html = generateReportHTML({
    reportWeek: {
      weekEndingDate: reportWeek.weekEndingDate,
      periodStartAt: reportWeek.periodStartAt,
      periodEndAt: reportWeek.periodEndAt,
    },
    manualContent: manualContent || null,
    kpiData,
    pipelineData,
    leadTrends,
    branding,
    tenantName,
  });

  // Step 4: Render PDF with Playwright
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    // Step 5: Write PDF to storage
    ensureStorageDir();
    const filePath = resolve(STORAGE_DIR, `${tenantId}_${reportWeekId}.pdf`);
    writeFileSync(filePath, pdfBuffer);

    // Step 6: Insert cache record
    await db
      .insert(reportExports)
      .values({
        tenantId,
        reportWeekId,
        pdfUrl: filePath,
      })
      .onConflictDoUpdate({
        target: [reportExports.tenantId, reportExports.reportWeekId],
        set: {
          pdfUrl: filePath,
          createdAt: new Date(),
        },
      });

    return filePath;
  } finally {
    // Step 7: Always close the page
    await page.close();
  }
}
