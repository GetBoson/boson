import { invoke } from "@tauri-apps/api/core";

export type PgColumn = {
  name: string;
  data_type: string;
  is_nullable: boolean;
};

export type PgTable = {
  schema: string;
  name: string;
  primary_key: string | null;
  columns: PgColumn[];
};

export type PgForeignKey = {
  name: string;
  from_schema: string;
  from_table: string;
  from_column: string;
  to_schema: string;
  to_table: string;
  to_column: string;
};

export type PgSchemaIntrospection = {
  tables: PgTable[];
  foreign_keys: PgForeignKey[];
};

export async function pgTestConnection(conn_str: string): Promise<string> {
  return await invoke<string>("pg_test_connection", { connStr: conn_str });
}

export async function pgIntrospectSchema(conn_str: string, schema?: string): Promise<PgSchemaIntrospection> {
  return await invoke<PgSchemaIntrospection>("pg_introspect_schema", { connStr: conn_str, schema });
}

export async function pgFetchRows(args: {
  conn_str: string;
  schema: string;
  table: string;
  limit: number;
}): Promise<unknown[]> {
  return await invoke<unknown[]>("pg_fetch_rows", {
    connStr: args.conn_str,
    schema: args.schema,
    table: args.table,
    limit: args.limit,
  });
}

export async function pgFetchRecord(args: {
  conn_str: string;
  schema: string;
  table: string;
  pk_column: string;
  pk_value: string;
}): Promise<unknown | null> {
  return await invoke<unknown | null>("pg_fetch_record", {
    connStr: args.conn_str,
    schema: args.schema,
    table: args.table,
    pkColumn: args.pk_column,
    pkValue: args.pk_value,
  });
}

