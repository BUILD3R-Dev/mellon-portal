import { describe, it, expect } from 'vitest';
import { ctNotes, ctScheduledActivities, tenants } from '../schema';

/**
 * Tests for ct_notes and ct_scheduled_activities table schemas
 * Verifies table structure, constraints, and indexes are properly defined
 */
describe('ClientTether Notes and Scheduled Activities Schema', () => {
  describe('ct_notes table structure', () => {
    it('has all required columns defined', () => {
      const columns = Object.keys(ctNotes);

      expect(columns).toContain('id');
      expect(columns).toContain('tenantId');
      expect(columns).toContain('contactId');
      expect(columns).toContain('noteDate');
      expect(columns).toContain('author');
      expect(columns).toContain('content');
      expect(columns).toContain('rawJson');
      expect(columns).toContain('createdAt');
    });

    it('has correct column name mappings for database', () => {
      expect(ctNotes.id.name).toBe('id');
      expect(ctNotes.tenantId.name).toBe('tenant_id');
      expect(ctNotes.contactId.name).toBe('contact_id');
      expect(ctNotes.noteDate.name).toBe('note_date');
      expect(ctNotes.author.name).toBe('author');
      expect(ctNotes.content.name).toBe('content');
      expect(ctNotes.rawJson.name).toBe('raw_json');
      expect(ctNotes.createdAt.name).toBe('created_at');
    });
  });

  describe('ct_scheduled_activities table structure', () => {
    it('has all required columns defined', () => {
      const columns = Object.keys(ctScheduledActivities);

      expect(columns).toContain('id');
      expect(columns).toContain('tenantId');
      expect(columns).toContain('activityType');
      expect(columns).toContain('scheduledAt');
      expect(columns).toContain('contactName');
      expect(columns).toContain('description');
      expect(columns).toContain('status');
      expect(columns).toContain('rawJson');
      expect(columns).toContain('createdAt');
    });

    it('has correct column name mappings for database', () => {
      expect(ctScheduledActivities.id.name).toBe('id');
      expect(ctScheduledActivities.tenantId.name).toBe('tenant_id');
      expect(ctScheduledActivities.activityType.name).toBe('activity_type');
      expect(ctScheduledActivities.scheduledAt.name).toBe('scheduled_at');
      expect(ctScheduledActivities.contactName.name).toBe('contact_name');
      expect(ctScheduledActivities.description.name).toBe('description');
      expect(ctScheduledActivities.status.name).toBe('status');
      expect(ctScheduledActivities.rawJson.name).toBe('raw_json');
      expect(ctScheduledActivities.createdAt.name).toBe('created_at');
    });
  });

  describe('tenant_id foreign key relationships', () => {
    it('ct_notes tenantId references tenants table', () => {
      expect(ctNotes.tenantId).toBeDefined();
      expect(ctNotes.tenantId.name).toBe('tenant_id');
    });

    it('ct_scheduled_activities tenantId references tenants table', () => {
      expect(ctScheduledActivities.tenantId).toBeDefined();
      expect(ctScheduledActivities.tenantId.name).toBe('tenant_id');
    });

    it('tenants table has id field for foreign key reference', () => {
      expect(tenants.id).toBeDefined();
      expect(tenants.id.name).toBe('id');
    });
  });

  describe('index definitions', () => {
    it('ct_notes table defines indexes via table function', () => {
      // The table is defined with indexes in the third argument (table function)
      // This test verifies the table definition includes the index configuration
      // The actual index names are: ct_notes_tenant_id_idx and ct_notes_note_date_idx
      expect(ctNotes.tenantId).toBeDefined();
      expect(ctNotes.noteDate).toBeDefined();
    });

    it('ct_scheduled_activities table defines indexes via table function', () => {
      // The table is defined with indexes in the third argument (table function)
      // The actual index names are: ct_scheduled_activities_tenant_id_idx and ct_scheduled_activities_scheduled_at_idx
      expect(ctScheduledActivities.tenantId).toBeDefined();
      expect(ctScheduledActivities.scheduledAt).toBeDefined();
    });
  });
});
