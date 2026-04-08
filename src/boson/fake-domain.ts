export type TableName = string;

export type ColumnType = string;

export type Column = {
  name: string;
  type: ColumnType;
  nullable?: boolean;
};

export type ForeignKey = {
  fromTable: TableName;
  fromColumn: string;
  toTable: TableName;
  toColumn: string;
  name: string;
};

export type TableSchema = {
  name: TableName;
  label: string;
  primaryKey: string | null;
  columns: Column[];
};

export type Row = Record<string, unknown>;

export type FakeDomain = {
  tables: Record<TableName, TableSchema>;
  foreignKeys: ForeignKey[];
  rows: Record<TableName, Row[]>;
};

export function createFakeDomain(): FakeDomain {
  const tables: Record<TableName, TableSchema> = {
    users: {
      name: "users",
      label: "Users",
      primaryKey: "id",
      columns: [
        { name: "id", type: "uuid" },
        { name: "email", type: "text" },
        { name: "name", type: "text" },
        { name: "created_at", type: "timestamp" },
        { name: "is_suspended", type: "bool" },
      ],
    },
    organizations: {
      name: "organizations",
      label: "Organizations",
      primaryKey: "id",
      columns: [
        { name: "id", type: "uuid" },
        { name: "name", type: "text" },
        { name: "plan", type: "text" },
        { name: "created_at", type: "timestamp" },
      ],
    },
    memberships: {
      name: "memberships",
      label: "Memberships",
      primaryKey: "id",
      columns: [
        { name: "id", type: "uuid" },
        { name: "org_id", type: "uuid" },
        { name: "user_id", type: "uuid" },
        { name: "role", type: "text" },
        { name: "created_at", type: "timestamp" },
      ],
    },
    subscriptions: {
      name: "subscriptions",
      label: "Subscriptions",
      primaryKey: "id",
      columns: [
        { name: "id", type: "uuid" },
        { name: "org_id", type: "uuid" },
        { name: "status", type: "text" },
        { name: "started_at", type: "timestamp" },
        { name: "renewal_day", type: "int" },
      ],
    },
    invoices: {
      name: "invoices",
      label: "Invoices",
      primaryKey: "id",
      columns: [
        { name: "id", type: "uuid" },
        { name: "org_id", type: "uuid" },
        { name: "subscription_id", type: "uuid" },
        { name: "amount_cents", type: "int" },
        { name: "status", type: "text" },
        { name: "issued_at", type: "timestamp" },
      ],
    },
    events: {
      name: "events",
      label: "Events",
      primaryKey: "id",
      columns: [
        { name: "id", type: "uuid" },
        { name: "org_id", type: "uuid" },
        { name: "actor_user_id", type: "uuid" },
        { name: "type", type: "text" },
        { name: "created_at", type: "timestamp" },
        { name: "payload", type: "json" },
      ],
    },
  };

  const foreignKeys: ForeignKey[] = [
    {
      name: "memberships_org_id_fkey",
      fromTable: "memberships",
      fromColumn: "org_id",
      toTable: "organizations",
      toColumn: "id",
    },
    {
      name: "memberships_user_id_fkey",
      fromTable: "memberships",
      fromColumn: "user_id",
      toTable: "users",
      toColumn: "id",
    },
    {
      name: "subscriptions_org_id_fkey",
      fromTable: "subscriptions",
      fromColumn: "org_id",
      toTable: "organizations",
      toColumn: "id",
    },
    {
      name: "invoices_org_id_fkey",
      fromTable: "invoices",
      fromColumn: "org_id",
      toTable: "organizations",
      toColumn: "id",
    },
    {
      name: "invoices_subscription_id_fkey",
      fromTable: "invoices",
      fromColumn: "subscription_id",
      toTable: "subscriptions",
      toColumn: "id",
    },
    {
      name: "events_org_id_fkey",
      fromTable: "events",
      fromColumn: "org_id",
      toTable: "organizations",
      toColumn: "id",
    },
    {
      name: "events_actor_user_id_fkey",
      fromTable: "events",
      fromColumn: "actor_user_id",
      toTable: "users",
      toColumn: "id",
    },
  ];

  const rows: Record<TableName, Row[]> = {
    users: [
      {
        id: "usr_2c1b0e3e-1f66-4e4c-9e09-9c3d8c2e9b1a",
        email: "maya@acme.dev",
        name: "Maya Patel",
        created_at: "2026-03-01T10:15:00Z",
        is_suspended: false,
      },
      {
        id: "usr_f3b13d7a-9c0f-4bdf-9a1d-0a77b0f5b9d2",
        email: "alex@acme.dev",
        name: "Alex Chen",
        created_at: "2026-03-05T08:02:00Z",
        is_suspended: false,
      },
      {
        id: "usr_9b7d2c12-0c52-4f6b-98a3-4c342f54ef8a",
        email: "sara@northwind.io",
        name: "Sara Kim",
        created_at: "2026-02-18T17:40:00Z",
        is_suspended: true,
      },
    ],
    organizations: [
      {
        id: "org_84bfac21-6870-4e2b-bb03-3d36b2d2b7f6",
        name: "Acme Devtools",
        plan: "pro",
        created_at: "2026-01-12T12:00:00Z",
      },
      {
        id: "org_4f5bb8b1-2f6a-4e24-9b2b-9f8a5320b4c1",
        name: "Northwind Labs",
        plan: "free",
        created_at: "2026-02-20T09:30:00Z",
      },
    ],
    memberships: [
      {
        id: "mem_2d5cc2ce-6b02-4c4f-8a06-b7a93bd9b0d1",
        org_id: "org_84bfac21-6870-4e2b-bb03-3d36b2d2b7f6",
        user_id: "usr_2c1b0e3e-1f66-4e4c-9e09-9c3d8c2e9b1a",
        role: "owner",
        created_at: "2026-01-12T12:10:00Z",
      },
      {
        id: "mem_7a6dfc3f-1a42-4d6c-b6ea-2fd36c1d1e15",
        org_id: "org_84bfac21-6870-4e2b-bb03-3d36b2d2b7f6",
        user_id: "usr_f3b13d7a-9c0f-4bdf-9a1d-0a77b0f5b9d2",
        role: "member",
        created_at: "2026-01-13T09:00:00Z",
      },
      {
        id: "mem_06c93a8a-2b64-44b5-8f65-8d7c7e5bf7b1",
        org_id: "org_4f5bb8b1-2f6a-4e24-9b2b-9f8a5320b4c1",
        user_id: "usr_9b7d2c12-0c52-4f6b-98a3-4c342f54ef8a",
        role: "owner",
        created_at: "2026-02-20T10:00:00Z",
      },
    ],
    subscriptions: [
      {
        id: "sub_40d7aa0c-56ac-4b67-a3d3-6bd20c0d9b93",
        org_id: "org_84bfac21-6870-4e2b-bb03-3d36b2d2b7f6",
        status: "active",
        started_at: "2026-01-12T12:15:00Z",
        renewal_day: 12,
      },
      {
        id: "sub_0e7c1f42-76af-4b25-9e75-9dcdfc0a3c8b",
        org_id: "org_4f5bb8b1-2f6a-4e24-9b2b-9f8a5320b4c1",
        status: "trialing",
        started_at: "2026-02-20T09:45:00Z",
        renewal_day: 20,
      },
    ],
    invoices: [
      {
        id: "inv_3a9a9b33-6f1e-43df-9c92-2d40b73a2a11",
        org_id: "org_84bfac21-6870-4e2b-bb03-3d36b2d2b7f6",
        subscription_id: "sub_40d7aa0c-56ac-4b67-a3d3-6bd20c0d9b93",
        amount_cents: 4900,
        status: "paid",
        issued_at: "2026-03-12T12:00:00Z",
      },
      {
        id: "inv_1c6d5b90-2465-4ef4-9d8d-3b0a8b6e9f77",
        org_id: "org_4f5bb8b1-2f6a-4e24-9b2b-9f8a5320b4c1",
        subscription_id: "sub_0e7c1f42-76af-4b25-9e75-9dcdfc0a3c8b",
        amount_cents: 0,
        status: "open",
        issued_at: "2026-03-20T09:30:00Z",
      },
    ],
    events: [
      {
        id: "evt_7aa88b7e-0b39-4ee7-a7cc-71f2d2b8d1bb",
        org_id: "org_84bfac21-6870-4e2b-bb03-3d36b2d2b7f6",
        actor_user_id: "usr_2c1b0e3e-1f66-4e4c-9e09-9c3d8c2e9b1a",
        type: "invoice.paid",
        created_at: "2026-03-12T12:00:05Z",
        payload: { invoice_id: "inv_3a9a9b33-6f1e-43df-9c92-2d40b73a2a11" },
      },
      {
        id: "evt_2c0bdbd2-2bde-4f9b-9fe3-2df6b3e5b1a8",
        org_id: "org_4f5bb8b1-2f6a-4e24-9b2b-9f8a5320b4c1",
        actor_user_id: "usr_9b7d2c12-0c52-4f6b-98a3-4c342f54ef8a",
        type: "subscription.trial_started",
        created_at: "2026-02-20T09:45:10Z",
        payload: { subscription_id: "sub_0e7c1f42-76af-4b25-9e75-9dcdfc0a3c8b" },
      },
    ],
  };

  return { tables, foreignKeys, rows };
}

export function getRowByPk(domain: FakeDomain, table: TableName, pk: unknown): Row | undefined {
  const schema = domain.tables[table];
  if (!schema?.primaryKey) return undefined;
  return domain.rows[table].find((r) => r[schema.primaryKey!] === pk);
}

export function formatRowLabel(domain: FakeDomain, table: TableName, row: Row): string {
  const pkCol = domain.tables[table]?.primaryKey ?? null;
  const pk = pkCol ? row[pkCol] : undefined;
  // Friendly heuristics for arbitrary Postgres tables.
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = row[k];
      if (typeof v === "string" && v.trim()) return v;
      if (typeof v === "number" || typeof v === "boolean") return String(v);
    }
    return null;
  };

  const nameish = pick("name", "title", "email", "username", "slug", "type", "status");
  const secondary = pick("code", "plan", "state", "kind");
  if (nameish && secondary) return `${nameish} (${secondary})`;
  if (nameish) return `${nameish}`;

  return `${table} (${pk ?? "—"})`;
}

