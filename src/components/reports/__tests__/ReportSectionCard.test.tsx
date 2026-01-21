/**
 * @vitest-environment jsdom
 */
/**
 * Tests for ReportSectionCard component
 *
 * Task Group 1.1: Write 3-4 focused tests for ReportSectionCard
 * - Test component renders title and HTML content correctly
 * - Test component returns null when htmlContent is empty/null
 * - Test prose styling applied to content container
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportSectionCard } from '../ReportSectionCard';

describe('ReportSectionCard', () => {
  it('renders title and HTML content correctly', () => {
    render(
      <ReportSectionCard
        title="Narrative"
        htmlContent="<p>This is the weekly narrative content.</p>"
      />
    );

    expect(screen.getByText('Narrative')).toBeInTheDocument();
    expect(screen.getByText('This is the weekly narrative content.')).toBeInTheDocument();
  });

  it('returns null when htmlContent is null', () => {
    const { container } = render(
      <ReportSectionCard title="Narrative" htmlContent={null} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('returns null when htmlContent is empty string', () => {
    const { container } = render(
      <ReportSectionCard title="Narrative" htmlContent="" />
    );

    expect(container.firstChild).toBeNull();
  });

  it('applies prose styling to content container', () => {
    render(
      <ReportSectionCard
        title="Initiatives"
        htmlContent="<h2>Initiative 1</h2><p>Description here</p>"
      />
    );

    // Find the content container with prose class
    const contentContainer = document.querySelector('.prose');
    expect(contentContainer).toBeInTheDocument();
  });

  it('renders optional description when provided', () => {
    render(
      <ReportSectionCard
        title="Needs From Client"
        htmlContent="<p>Action items</p>"
        description="Items requiring client action"
      />
    );

    expect(screen.getByText('Items requiring client action')).toBeInTheDocument();
  });
});
