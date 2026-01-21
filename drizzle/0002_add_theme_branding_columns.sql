-- Add themeId column to tenant_branding table
ALTER TABLE "tenant_branding" ADD COLUMN "theme_id" varchar(50) NOT NULL DEFAULT 'light';

-- Add accentColorOverride column to tenant_branding table (nullable hex value)
ALTER TABLE "tenant_branding" ADD COLUMN "accent_color_override" varchar(7);
