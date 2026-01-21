# Spec Initialization

## Spec Name
Report Week Content Sections

## Initial Description
Content authoring capabilities for report weeks (items 14-17 from Milestone 2):

1. **Rich Text Editor Integration (#14)** - Add rich text editor component for authoring weekly narrative content with formatting support

2. **Weekly Narrative Section (#15)** - Build editable narrative field on report week with autosave and preview functionality

3. **Initiatives Section (#16)** - Add initiatives field for listing current marketing initiatives with bullet point formatting

4. **Needs From Client Section (#17)** - Add field for agency to communicate action items or requests to the client

## Context
- Report Week Foundation is complete (schema, CRUD, draft/publish workflow)
- Report weeks have status (draft/published), can be published/unpublished
- Only draft report weeks can be edited
- Three roles: Agency Admin, Tenant Admin, Tenant Viewer
- Tech stack: Astro, React, Tailwind, shadcn/ui, Drizzle ORM
- The reportWeeks table exists with tenant association
- The reportWeekManual table already exists with columns: narrativeRich, initiativesRich, needsRich, discoveryDaysRich (all text fields)
