# Raw Idea: Reports History & PDF Export

## Milestone 4 Overview

This milestone focuses on building a comprehensive reports history system and PDF export functionality for published reports.

## Features (Items 33-39)

### 33. Reports History Index
Build paginated list of all published report weeks for a tenant with year/month filtering

**Size:** M

### 34. Historical Report Detail
Create detail view for accessing any historical published report with all sections

**Size:** S

### 35. Year/Month Filter Controls
Add dropdown filters for browsing reports by year and month

**Size:** S

### 36. PDF Export Feature Flag
Implement feature flag system to enable/disable PDF export per tenant

**Size:** XS

### 37. PDF Template Design
Create Playwright-compatible HTML template matching the portal report layout for PDF generation

**Size:** M

### 38. PDF Generation Worker
Build background worker using Playwright to render and generate PDF files from published reports

**Size:** L

### 39. PDF Download UI
Add download button on published reports that triggers PDF generation and provides download link

**Size:** S

## Dependencies

- Milestone 4 depends on published reports existing from Milestone 2
- Requires the report week data model, draft/publish workflow, and published report views to be complete

## Context from Roadmap

The product roadmap shows that:
- Milestone 1 (Foundations) is complete
- Milestone 2 (Report Weeks & Manual Content) is complete
- Milestone 3 (Data Sync & Dashboards) is complete
- Milestone 4 builds on the published reports infrastructure to add historical browsing and PDF export capabilities
