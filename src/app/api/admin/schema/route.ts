import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const db = await getDatabase();

    // Get all columns for all tables
    const columnsResult = await db.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);

    // Get table row counts
    const tablesResult = await db.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    const tables: string[] = tablesResult.rows.map((r: any) => r.tablename);
    const rowCounts: Record<string, number> = {};

    // Get row count for each table
    for (const table of tables) {
      try {
        const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        rowCounts[table] = parseInt(countResult.rows[0].count);
      } catch (err) {
        rowCounts[table] = -1; // Error getting count
      }
    }

    // Get indexes
    const indexesResult = await db.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    // Group columns by table
    const schema: Record<string, any> = {};
    columnsResult.rows.forEach((row: any) => {
      if (!schema[row.table_name]) {
        schema[row.table_name] = {
          columns: [],
          indexes: [],
          rowCount: rowCounts[row.table_name] || 0
        };
      }
      schema[row.table_name].columns.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default,
        position: row.ordinal_position
      });
    });

    // Add indexes
    indexesResult.rows.forEach((row: any) => {
      if (schema[row.tablename]) {
        schema[row.tablename].indexes.push({
          name: row.indexname,
          definition: row.indexdef
        });
      }
    });

    return NextResponse.json({
      tables: Object.keys(schema).sort(),
      schema,
      totalTables: Object.keys(schema).length,
      generatedAt: new Date().toISOString()
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error('Error fetching schema:', error);
    return NextResponse.json({
      error: error.message || 'Failed to fetch schema',
      stack: error.stack
    }, { status: 500 });
  }
}
