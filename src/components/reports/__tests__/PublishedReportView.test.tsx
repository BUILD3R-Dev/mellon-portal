/**
 * @vitest-environment jsdom
 */
/**
 * Tests for Published Report View
 *
 * Task Group 4.1: Write 4-5 focused tests for published report view
 * - Test published report page renders content sections
 * - Test all sections are always expanded (no collapse)
 * - Test empty sections are hidden
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportSectionCard } from '../ReportSectionCard';

describe('Published Report View - Content Sections', () => {
  it('renders content sections with HTML content', () => {
    render(
      <>
        <ReportSectionCard
          title="Narrative"
          htmlContent="<p>This is the weekly narrative.</p>"
        />
        <ReportSectionCard
          title="Initiatives"
          htmlContent="<p>Current initiatives list.</p>"
        />
        <ReportSectionCard
          title="Needs From Client"
          htmlContent="<p>Action items needed.</p>"
        />
        <ReportSectionCard
          title="Discovery Days"
          htmlContent="<p>Discovery day notes.</p>"
        />
      </>
    );

    expect(screen.getByText('Narrative')).toBeInTheDocument();
    expect(screen.getByText('This is the weekly narrative.')).toBeInTheDocument();
    expect(screen.getByText('Initiatives')).toBeInTheDocument();
    expect(screen.getByText('Current initiatives list.')).toBeInTheDocument();
    expect(screen.getByText('Needs From Client')).toBeInTheDocument();
    expect(screen.getByText('Action items needed.')).toBeInTheDocument();
    expect(screen.getByText('Discovery Days')).toBeInTheDocument();
    expect(screen.getByText('Discovery day notes.')).toBeInTheDocument();
  });

  it('all sections are always expanded (no collapse/expand buttons)', () => {
    render(
      <ReportSectionCard
        title="Narrative"
        htmlContent="<p>Content is visible.</p>"
      />
    );

    // Content should be immediately visible
    expect(screen.getByText('Content is visible.')).toBeInTheDocument();

    // Should NOT have any collapse/expand button
    expect(screen.queryByRole('button', { name: /expand/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /collapse/i })).not.toBeInTheDocument();
  });

  it('hides sections entirely when content is null', () => {
    const { container } = render(
      <ReportSectionCard
        title="Narrative"
        htmlContent={null}
      />
    );

    // Component should return null, no content rendered
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Narrative')).not.toBeInTheDocument();
  });

  it('hides sections entirely when content is empty string', () => {
    const { container } = render(
      <ReportSectionCard
        title="Initiatives"
        htmlContent=""
      />
    );

    // Component should return null, no content rendered
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Initiatives')).not.toBeInTheDocument();
  });

  it('renders multiple sections correctly with mixed content', () => {
    render(
      <>
        <ReportSectionCard
          title="Narrative"
          htmlContent="<p>Has content</p>"
        />
        <ReportSectionCard
          title="Initiatives"
          htmlContent={null}
        />
        <ReportSectionCard
          title="Needs From Client"
          htmlContent="<p>Also has content</p>"
        />
        <ReportSectionCard
          title="Discovery Days"
          htmlContent=""
        />
      </>
    );

    // Only sections with content should be visible
    expect(screen.getByText('Narrative')).toBeInTheDocument();
    expect(screen.getByText('Has content')).toBeInTheDocument();
    expect(screen.getByText('Needs From Client')).toBeInTheDocument();
    expect(screen.getByText('Also has content')).toBeInTheDocument();

    // Empty sections should not be visible
    expect(screen.queryByText('Initiatives')).not.toBeInTheDocument();
    expect(screen.queryByText('Discovery Days')).not.toBeInTheDocument();
  });
});
