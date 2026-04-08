use serde::{Deserialize, Serialize};
use serde_json::Value;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            pg_test_connection,
            pg_introspect_schema,
            pg_fetch_rows,
            pg_fetch_record
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PgColumn {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PgTable {
    pub schema: String,
    pub name: String,
    pub primary_key: Option<String>,
    pub columns: Vec<PgColumn>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PgForeignKey {
    pub name: String,
    pub from_schema: String,
    pub from_table: String,
    pub from_column: String,
    pub to_schema: String,
    pub to_table: String,
    pub to_column: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PgSchemaIntrospection {
    pub tables: Vec<PgTable>,
    pub foreign_keys: Vec<PgForeignKey>,
}

#[tauri::command]
async fn pg_test_connection(conn_str: String) -> Result<String, String> {
    let (client, connection) = tokio_postgres::connect(&conn_str, tokio_postgres::NoTls)
        .await
        .map_err(|e| e.to_string())?;

    tokio::spawn(async move {
        let _ = connection.await;
    });

    let row = client
        .query_one("select current_database()", &[])
        .await
        .map_err(|e| e.to_string())?;
    let db: String = row.get(0);
    Ok(db)
}

#[tauri::command]
async fn pg_introspect_schema(conn_str: String, schema: Option<String>) -> Result<PgSchemaIntrospection, String> {
    let schema = schema.unwrap_or_else(|| "public".to_string());
    let (client, connection) = tokio_postgres::connect(&conn_str, tokio_postgres::NoTls)
        .await
        .map_err(|e| e.to_string())?;

    tokio::spawn(async move {
        let _ = connection.await;
    });

    // Columns
    let col_rows = client
        .query(
            r#"
            select table_schema, table_name, column_name, data_type, is_nullable
            from information_schema.columns
            where table_schema = $1
            order by table_name, ordinal_position
            "#,
            &[&schema],
        )
        .await
        .map_err(|e| e.to_string())?;

    use std::collections::BTreeMap;
    let mut tables: BTreeMap<(String, String), PgTable> = BTreeMap::new();
    for r in col_rows {
        let table_schema: String = r.get(0);
        let table_name: String = r.get(1);
        let column_name: String = r.get(2);
        let data_type: String = r.get(3);
        let is_nullable: String = r.get(4);

        let key = (table_schema.clone(), table_name.clone());
        let entry = tables.entry(key).or_insert(PgTable {
            schema: table_schema.clone(),
            name: table_name.clone(),
            primary_key: None,
            columns: vec![],
        });
        entry.columns.push(PgColumn {
            name: column_name,
            data_type,
            is_nullable: is_nullable.to_lowercase() == "yes",
        });
    }

    // Primary keys (single-column only for v1)
    let pk_rows = client
        .query(
            r#"
            select
              tc.table_schema,
              tc.table_name,
              kcu.column_name
            from information_schema.table_constraints tc
            join information_schema.key_column_usage kcu
              on tc.constraint_name = kcu.constraint_name
             and tc.table_schema = kcu.table_schema
            where tc.constraint_type = 'PRIMARY KEY'
              and tc.table_schema = $1
            order by tc.table_name, kcu.ordinal_position
            "#,
            &[&schema],
        )
        .await
        .map_err(|e| e.to_string())?;

    for r in pk_rows {
        let table_schema: String = r.get(0);
        let table_name: String = r.get(1);
        let col: String = r.get(2);
        let key = (table_schema, table_name);
        if let Some(t) = tables.get_mut(&key) {
            if t.primary_key.is_none() {
                t.primary_key = Some(col);
            }
        }
    }

    // Foreign keys (single-column only for v1)
    let fk_rows = client
        .query(
            r#"
            select
              tc.constraint_name,
              tc.table_schema,
              tc.table_name,
              kcu.column_name,
              ccu.table_schema as foreign_table_schema,
              ccu.table_name as foreign_table_name,
              ccu.column_name as foreign_column_name
            from information_schema.table_constraints tc
            join information_schema.key_column_usage kcu
              on tc.constraint_name = kcu.constraint_name
             and tc.table_schema = kcu.table_schema
            join information_schema.constraint_column_usage ccu
              on ccu.constraint_name = tc.constraint_name
             and ccu.table_schema = tc.table_schema
            where tc.constraint_type = 'FOREIGN KEY'
              and tc.table_schema = $1
            "#,
            &[&schema],
        )
        .await
        .map_err(|e| e.to_string())?;

    let foreign_keys = fk_rows
        .into_iter()
        .map(|r| PgForeignKey {
            name: r.get(0),
            from_schema: r.get(1),
            from_table: r.get(2),
            from_column: r.get(3),
            to_schema: r.get(4),
            to_table: r.get(5),
            to_column: r.get(6),
        })
        .collect::<Vec<_>>();

    Ok(PgSchemaIntrospection {
        tables: tables.into_values().collect(),
        foreign_keys,
    })
}

fn quote_ident(ident: &str) -> String {
    format!("\"{}\"", ident.replace('"', "\"\""))
}

#[tauri::command]
async fn pg_fetch_rows(
    conn_str: String,
    schema: String,
    table: String,
    limit: i64,
) -> Result<Vec<Value>, String> {
    let (client, connection) = tokio_postgres::connect(&conn_str, tokio_postgres::NoTls)
        .await
        .map_err(|e| e.to_string())?;

    tokio::spawn(async move {
        let _ = connection.await;
    });

    let sql = format!(
        "select row_to_json(t) as row from (select * from {}.{} limit $1) t",
        quote_ident(&schema),
        quote_ident(&table)
    );
    let rows = client
        .query(&sql, &[&limit])
        .await
        .map_err(|e| e.to_string())?;
    Ok(rows.into_iter().map(|r| r.get::<_, Value>(0)).collect())
}

#[tauri::command]
async fn pg_fetch_record(
    conn_str: String,
    schema: String,
    table: String,
    pk_column: String,
    pk_value: String,
) -> Result<Option<Value>, String> {
    let (client, connection) = tokio_postgres::connect(&conn_str, tokio_postgres::NoTls)
        .await
        .map_err(|e| e.to_string())?;

    tokio::spawn(async move {
        let _ = connection.await;
    });

    // v1: match by text to avoid type-specific binding (uuid/int/etc).
    // This keeps the prototype robust across common PK types.
    let sql = format!(
        "select row_to_json(t) as row from (select * from {}.{} where ({}::text) = $1 limit 1) t",
        quote_ident(&schema),
        quote_ident(&table),
        quote_ident(&pk_column)
    );
    let rows = client
        .query(&sql, &[&pk_value])
        .await
        .map_err(|e| e.to_string())?;
    Ok(rows.into_iter().next().map(|r| r.get::<_, Value>(0)))
}
