# Spec Requirements: Report Week Content Sections

## Initial Description

Content authoring capabilities for report weeks (items 14-17 from Milestone 2):

1. **Rich Text Editor Integration (#14)** - Add rich text editor component for authoring weekly narrative content with formatting support

2. **Weekly Narrative Section (#15)** - Build editable narrative field on report week with autosave and preview functionality

3. **Initiatives Section (#16)** - Add initiatives field for listing current marketing initiatives with bullet point formatting

4. **Needs From Client Section (#17)** - Add field for agency to communicate action items or requests to the client

### Context
- Report Week Foundation is complete (schema, CRUD, draft/publish workflow)
- Report weeks have status (draft/published), can be published/unpublished
- Only draft report weeks can be edited
- Three roles: Agency Admin, Tenant Admin, Tenant Viewer
- Tech stack: Astro, React, Tailwind, shadcn/ui, Drizzle ORM
- The reportWeeks table exists with tenant association
- The reportWeekManual table already exists with columns: narrativeRich, initiativesRich, needsRich, discoveryDaysRich (all text fields)

## Requirements Discussion

### First Round Questions

**Q1:** Rich text editor library - Use Tiptap?
**Answer:** Yes, use Tiptap - confirmed.

**Q2:** What formatting options should be supported?
**Answer:** Bold, italic, bullet lists, numbered lists, links, AND headings (H2/H3).

**Q3:** How should content be stored in the database?
**Answer:** Store as HTML strings (Tiptap default output) - following recommendation.

**Q4:** When should the reportWeekManual record be created?
**Answer:** Eager creation - create `reportWeekManual` record automatically when report week is created (simpler queries, record always exists).

**Q5:** What save behavior should be used for the editor?
**Answer:** Use explicit "Save" buttons with "You have unsaved changes" warning on navigation (NOT debounced autosave).

**Q6:** How should published reports behave?
**Answer:** Read-only mode for published reports - editor is view-only when report is published.

**Q7:** What UI layout should be used for the three content sections?
**Answer:** Collapsible cards/accordions for the three content sections (Narrative, Initiatives, Needs From Client).

**Q8:** What features should be explicitly excluded?
**Answer:** No image uploads, no tables, no code blocks, no mentions, no comments, no version history - keep it simple.

### Existing Code to Reference

No similar existing features identified for reference. This is the first rich text editor implementation in the portal.

### Follow-up Questions

No follow-up questions were needed - user provided comprehensive answers.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - no visual files to analyze.

## Requirements Summary

### Functional Requirements

**Rich Text Editor Component**
- Integrate Tiptap as the rich text editor library
- Support formatting: bold, italic, bullet lists, numbered lists, links, headings (H2/H3)
- Output content as HTML strings for storage
- Exclude: image uploads, tables, code blocks, mentions, comments, version history

**Content Sections**
- Three editable content sections on report week edit page:
  1. Weekly Narrative (narrativeRich field)
  2. Initiatives (initiativesRich field)
  3. Needs From Client (needsRich field)
- Each section uses the same Tiptap editor configuration
- UI layout: collapsible cards/accordions for each section

**Data Management**
- Eager creation: automatically create `reportWeekManual` record when a new report week is created
- Store all rich text content as HTML strings in the existing text columns
- One-to-one relationship between reportWeeks and reportWeekManual tables

**Save Behavior**
- Explicit "Save" button for each section (or single save for all)
- Display "You have unsaved changes" warning when navigating away with unsaved edits
- No debounced autosave - user controls when content is saved

**Read-Only Mode**
- When report week status is "published", editor displays content in view-only mode
- Users can read content but cannot modify it
- Only draft report weeks allow editing

### Reusability Opportunities

- The Tiptap editor component should be built as a reusable React component for potential future use
- Collapsible card/accordion pattern may be reusable across other areas of the portal
- Unsaved changes warning logic could be extracted as a reusable hook

### Scope Boundaries

**In Scope:**
- Tiptap rich text editor integration
- Three content sections (Narrative, Initiatives, Needs From Client)
- Collapsible accordion UI for sections
- Explicit save with unsaved changes warning
- Read-only mode for published reports
- Eager creation of reportWeekManual records
- Basic formatting: bold, italic, bullets, numbered lists, links, H2/H3 headings

**Out of Scope:**
- Image uploads
- Tables
- Code blocks
- Mentions (@user)
- Comments/annotations
- Version history/revision tracking
- Debounced autosave
- discoveryDaysRich field (exists in schema but not part of this spec)
- Preview page (separate roadmap item #18)
- Published report view for clients (separate roadmap item #19)

### Technical Considerations

- **Editor Library:** Tiptap (React-compatible, outputs HTML)
- **Storage Format:** HTML strings in existing text columns (narrativeRich, initiativesRich, needsRich)
- **Database:** reportWeekManual table already exists with required columns
- **UI Framework:** React island within Astro page, using shadcn/ui components for accordion/collapsible cards
- **State Management:** Local React state for editor content with dirty tracking for unsaved changes warning
- **API Pattern:** Follow existing patterns for report week CRUD operations
- **Permission Check:** Agency Admin only (consistent with report week edit permissions)
- **Status Check:** Verify report week is in "draft" status before allowing edits
