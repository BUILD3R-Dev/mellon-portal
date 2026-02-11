-- Migration: Add contacts table for individual lead storage
-- This enables weekly lead trend charts derived from individual contact records

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  external_id VARCHAR(100) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(100),
  company VARCHAR(255),
  lead_source VARCHAR(255),
  stage VARCHAR(100),
  contact_type VARCHAR(50),
  deal_size DECIMAL(12, 2),
  assigned_user VARCHAR(255),
  source_created_at TIMESTAMP,
  source_modified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contacts_tenant_id_idx ON contacts(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_tenant_external_id_idx ON contacts(tenant_id, external_id);
