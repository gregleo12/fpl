const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function auditDatabase() {
  try {
    console.log('='.repeat(80));
    console.log('DATABASE SCHEMA AUDIT');
    console.log('='.repeat(80));
    console.log();

    // Step 1: Get all table names
    console.log('STEP 1: All Tables in Database\n');
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map(r => r.table_name);
    console.log(`Found ${tables.length} tables:\n`);
    tables.forEach((table, i) => {
      console.log(`  ${i + 1}. ${table}`);
    });
    console.log();

    // Step 2: Get row counts for all tables
    console.log('='.repeat(80));
    console.log('STEP 2: Row Counts\n');

    const rowCounts = [];
    for (const table of tables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);
        rowCounts.push({ table, count });
        console.log(`  ${table.padEnd(30)} ${count.toLocaleString().padStart(12)} rows`);
      } catch (err) {
        console.log(`  ${table.padEnd(30)} ERROR: ${err.message}`);
      }
    }
    console.log();

    // Step 3: Get detailed schema for each table
    console.log('='.repeat(80));
    console.log('STEP 3: Detailed Schema\n');

    for (const table of tables) {
      console.log(`\n--- ${table.toUpperCase()} ---`);

      try {
        const schemaResult = await pool.query(`
          SELECT
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table]);

        console.log('');
        schemaResult.rows.forEach(col => {
          let type = col.data_type;
          if (col.character_maximum_length) {
            type += `(${col.character_maximum_length})`;
          }
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          console.log(`  ${col.column_name.padEnd(30)} ${type.padEnd(20)} ${nullable.padEnd(10)}${defaultVal}`);
        });

        // Get primary keys
        const pkResult = await pool.query(`
          SELECT a.attname
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = $1::regclass AND i.indisprimary
        `, [table]);

        if (pkResult.rows.length > 0) {
          console.log(`\n  PRIMARY KEY: ${pkResult.rows.map(r => r.attname).join(', ')}`);
        }

        // Get indexes
        const indexResult = await pool.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = $1 AND indexname NOT LIKE '%_pkey'
          ORDER BY indexname
        `, [table]);

        if (indexResult.rows.length > 0) {
          console.log(`\n  INDEXES:`);
          indexResult.rows.forEach(idx => {
            console.log(`    - ${idx.indexname}`);
          });
        }

      } catch (err) {
        console.log(`  ERROR: ${err.message}`);
      }
    }

    console.log();
    console.log('='.repeat(80));
    console.log('STEP 4: Sample Data (First Row from Each Table)\n');

    for (const table of tables) {
      try {
        const sampleResult = await pool.query(`SELECT * FROM ${table} LIMIT 1`);
        if (sampleResult.rows.length > 0) {
          console.log(`\n--- ${table.toUpperCase()} ---`);
          const sample = sampleResult.rows[0];
          Object.keys(sample).forEach(key => {
            let value = sample[key];
            if (value === null) {
              value = 'NULL';
            } else if (typeof value === 'object') {
              value = JSON.stringify(value);
            }
            const displayValue = String(value).length > 50 ? String(value).substring(0, 47) + '...' : String(value);
            console.log(`  ${key.padEnd(30)} = ${displayValue}`);
          });
        }
      } catch (err) {
        console.log(`\n--- ${table.toUpperCase()} ---`);
        console.log(`  ERROR: ${err.message}`);
      }
    }

    console.log();
    console.log('='.repeat(80));
    console.log('AUDIT COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await pool.end();
  }
}

auditDatabase();
