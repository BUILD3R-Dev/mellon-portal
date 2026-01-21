/**
 * @vitest-environment jsdom
 */
/**
 * Tests for CollapsibleSection component
 *
 * Task Group 4.1: Write 4 focused tests for CollapsibleSection component
 * - Test section renders with title and content
 * - Test collapse/expand toggle works
 * - Test section is expanded when content exists
 * - Test section is collapsed when content is empty
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsibleSection } from '../CollapsibleSection';

describe('CollapsibleSection', () => {
  it('renders with title and content', () => {
    render(
      <CollapsibleSection title="Test Section" defaultExpanded>
        <p>Test content</p>
      </CollapsibleSection>
    );

    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('toggles collapse/expand on click', () => {
    render(
      <CollapsibleSection title="Test Section" defaultExpanded>
        <p>Test content</p>
      </CollapsibleSection>
    );

    const header = screen.getByRole('button', { name: /test section/i });

    // Initially expanded
    expect(header).toHaveAttribute('aria-expanded', 'true');

    // Click to collapse
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'false');

    // Click to expand again
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });

  it('is expanded by default when hasContent is true', () => {
    render(
      <CollapsibleSection title="Test Section" hasContent>
        <p>Test content</p>
      </CollapsibleSection>
    );

    const header = screen.getByRole('button', { name: /test section/i });
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });

  it('is collapsed by default when hasContent is false', () => {
    render(
      <CollapsibleSection title="Test Section" hasContent={false}>
        <p>Test content</p>
      </CollapsibleSection>
    );

    const header = screen.getByRole('button', { name: /test section/i });
    expect(header).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports keyboard navigation with Enter and Space', () => {
    render(
      <CollapsibleSection title="Test Section">
        <p>Test content</p>
      </CollapsibleSection>
    );

    const header = screen.getByRole('button', { name: /test section/i });

    // Initial state (collapsed because no content)
    expect(header).toHaveAttribute('aria-expanded', 'false');

    // Press Enter to expand
    fireEvent.keyDown(header, { key: 'Enter' });
    expect(header).toHaveAttribute('aria-expanded', 'true');

    // Press Space to collapse
    fireEvent.keyDown(header, { key: ' ' });
    expect(header).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports controlled expanded state', () => {
    const handleExpandedChange = vi.fn();

    const { rerender } = render(
      <CollapsibleSection
        title="Test Section"
        expanded={false}
        onExpandedChange={handleExpandedChange}
      >
        <p>Test content</p>
      </CollapsibleSection>
    );

    const header = screen.getByRole('button', { name: /test section/i });

    // Controlled state should be false
    expect(header).toHaveAttribute('aria-expanded', 'false');

    // Click should call handler
    fireEvent.click(header);
    expect(handleExpandedChange).toHaveBeenCalledWith(true);

    // Update controlled state
    rerender(
      <CollapsibleSection
        title="Test Section"
        expanded={true}
        onExpandedChange={handleExpandedChange}
      >
        <p>Test content</p>
      </CollapsibleSection>
    );

    expect(header).toHaveAttribute('aria-expanded', 'true');
  });
});
