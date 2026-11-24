-- Factory Twins: PROPOSED PostgreSQL schema, not deployed or connected.
-- All real tenants must be authorized server-side. Never trust tenant_id supplied by a browser.
create extension if not exists pgcrypto;

create table organizations (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(name) between 2 and 180),
 created_at timestamptz not null default now()
);
create table memberships (
 organization_id uuid not null references organizations(id) on delete cascade,
 user_id uuid not null,
 role text not null check (role in ('owner','admin','engineer','operator','viewer')),
 primary key(organization_id,user_id)
);
create table plants (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references organizations(id) on delete cascade,
 name text not null,
 mode text not null check (mode in ('DEMO','REAL')),
 created_at timestamptz not null default now(),
 unique(id,organization_id)
);
create table assets (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 plant_id uuid not null,
 external_code text not null,
 name text not null,
 equipment_type text not null,
 enabled boolean not null default true,
 foreign key (plant_id,organization_id) references plants(id,organization_id) on delete cascade,
 unique (organization_id,plant_id,external_code),
 unique (id,organization_id)
);
create table telemetry_readings (
 id bigint generated always as identity primary key,
 organization_id uuid not null,
 asset_id uuid not null,
 recorded_at timestamptz not null,
 ingested_at timestamptz not null default now(),
 source text not null check (source in ('DEMO','GATEWAY')),
 temperature_c numeric(10,3),
 vibration_mms numeric(10,3),
 power_kw numeric(10,3),
 health_pct numeric(6,2),
 payload_id text,
 foreign key (asset_id,organization_id) references assets(id,organization_id) on delete cascade,
 unique (organization_id,asset_id,payload_id)
);
create index on telemetry_readings (organization_id,asset_id,recorded_at desc);
create table incidents (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 asset_id uuid not null,
 opened_at timestamptz not null default now(),
 acknowledged_at timestamptz,
 acknowledged_by uuid,
 status text not null check (status in ('OPEN','ACKNOWLEDGED','CLOSED')),
 type text not null,
 description text not null,
 foreign key (asset_id,organization_id) references assets(id,organization_id) on delete cascade
);
create table maintenance_actions (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null,
 asset_id uuid not null,
 occurred_at timestamptz not null,
 created_by uuid not null,
 description text not null,
 foreign key (asset_id,organization_id) references assets(id,organization_id) on delete cascade
);

-- Blueprint: in a real deployment, enforce RLS on EVERY tenant-scoped table.
-- Policy predicates must resolve the authenticated user ID using a verified auth
-- token, join memberships for this organization, and check role per operation.
-- Apply tenant checks to inserts AND updates (WITH CHECK), not only reads.
-- Do not expose service credentials to the browser.
-- Gateways authenticate with scoped machine credentials to a dedicated
-- ingestion API; verify signatures, replay IDs, units, timestamps and rate limits.
-- Do not send control commands to PLCs from this MVP.
