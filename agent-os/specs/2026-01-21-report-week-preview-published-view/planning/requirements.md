# Spec Requirements: Report Week Preview & Published View

## Initial Description

This spec covers the final items to complete Milestone 2:

1. **Report Week Preview (#18)** — Build preview page showing all manual content sections as they will appear to clients

2. **Published Report View (#19)** — Create read-only view of published report weeks with all content sections for tenant users

These build on the Report Week Foundation (items 11-13) and Content Sections (items 14-17) which are already complete. The report weeks CRUD, draft/publish workflow, and rich text content editing are all in place.

## Requirements Discussion

### First Round Questions

**Q1:** Preview accessed from the content edit page via a "Preview" button?
**Answer:** Confirmed

**Q2:** Open preview in new tab for side-by-side comparison?
**Answer:** Confirmed

**Q3:** Apply tenant's branding (logo, accent colors, theme) to preview?
**Answer:** Confirmed

**Q4:** Only published reports visible to tenant users - drafts completely hidden?
**Answer:** Confirmed - drafts are completely hidden from tenant users

**Q5:** Should sections be collapsible or always expanded for easy reading?
**Answer:** Sections always expanded (not collapsible) for easy reading

**Q6:** Report list for tenant users with "Latest Report" prominently featured?
**Answer:** Yes - tenant users should have a report list with "Latest Report" prominently featured

**Q7:** How to handle empty content sections?
**Answer:** Hide empty content sections entirely (don't show "No initiatives" messaging)

**Q8:** Out of scope items?
**Answer:**
- Print-friendly styling: out of scope
- Previous/next navigation between reports: out of scope
- Email notifications on publish: deferred as future enhancement (not on current roadmap)

### Existing Code to Reference

No similar existing features identified for reference in this discussion. However, this feature builds upon:
- Report Week Foundation (items 11-13) - already complete
- Content Sections (items 14-17) - already complete
- Report weeks CRUD, draft/publish workflow, and rich text content editing - all in place

### Follow-up Questions

No follow-up questions were needed.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - No visual assets to analyze.

## Requirements Summary

### Functional Requirements

**Preview Feature (Agency Admin):**
- Add "Preview" button on the report week content edit page
- Preview opens in a new browser tab for side-by-side comparison with editing
- Preview displays report content exactly as tenant users will see it
- Preview applies the tenant's branding (logo, accent colors, theme)
- Empty content sections are hidden in preview (not displayed with empty state messaging)
- All content sections are displayed expanded (non-collapsible)

**Published Report View (Tenant Users):**
- Tenant users can only see published reports - drafts are completely hidden
- Report list page for tenant users with "Latest Report" prominently featured
- Read-only view of all content sections for each published report
- Content sections are always expanded (non-collapsible) for easy reading
- Empty content sections are hidden entirely
- Tenant branding (logo, accent colors, theme) applied to the view

### Reusability Opportunities

- Existing report week CRUD and draft/publish workflow
- Existing content section components and data structures
- Existing tenant branding/theming system
- Rich text content rendering already in place

### Scope Boundaries

**In Scope:**
- Preview button on content edit page
- Preview page opening in new tab
- Preview with tenant branding applied
- Published report list for tenant users
- "Latest Report" prominent display
- Read-only published report view for tenant users
- Hiding empty content sections
- Always-expanded (non-collapsible) section layout
- Tenant branding on published views

**Out of Scope:**
- Print-friendly styling
- Previous/next navigation between reports
- Email notifications on publish (deferred as future enhancement)
- Collapsible sections
- Empty state messaging for sections without content

### Technical Considerations

- Preview and published views share similar rendering logic but different access contexts
- Agency admins access preview from edit page; tenant users access published view from their dashboard/report list
- Draft reports must be filtered out at the data layer for tenant user queries
- Tenant branding must be fetched and applied dynamically
- Content sections should be conditionally rendered based on whether they have content
