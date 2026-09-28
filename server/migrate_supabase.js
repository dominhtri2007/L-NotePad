const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '../supabase_schema.sql'), 'utf8');
  
  const directConn = process.env.DATABASE_URL || 'postgresql://postgres.gzlklljypwetgafcdamz:ANx79WCy9ACrGWYH@aws-0-ap-south-1.pooler.supabase.com:5432/postgres';

  const client = new Client({
    connectionString: directConn,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('[Migration] Connected to Supabase PostgreSQL!');

    await client.query(sql);
    console.log('[Migration] All SQL statements executed successfully!');

    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('[Migration Result] Tables in public schema:', res.rows.map(r => r.table_name));
    await client.end();
  } catch (err) {
    console.error('[Migration Error]:', err.message);
  }
}

migrate();

