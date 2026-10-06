const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let i = 0;
  const len = sql.length;

  while (i < len) {
    // 1. Single-line comment: -- ... \n
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < len && sql[i] !== '\n') {
        current += sql[i];
        i++;
      }
      if (i < len) {
        current += sql[i];
        i++;
      }
      continue;
    }

    // 2. Block comment: /* ... */
    if (sql[i] === '/' && sql[i + 1] === '*') {
      current += '/*';
      i += 2;
      while (i < len && !(sql[i] === '*' && sql[i + 1] === '/')) {
        current += sql[i];
        i++;
      }
      if (i < len) {
        current += '*/';
        i += 2;
      }
      continue;
    }

    // 3. Dollar quote: $$ ... $$ or $<tag>$ ... $<tag>$
    if (sql[i] === '$') {
      const match = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/);
      if (match) {
        const tag = match[0];
        current += tag;
        i += tag.length;
        const endIdx = sql.indexOf(tag, i);
        if (endIdx !== -1) {
          current += sql.slice(i, endIdx + tag.length);
          i = endIdx + tag.length;
        } else {
          current += sql.slice(i);
          i = len;
        }
        continue;
      }
    }

    // 4. Single-quoted string
    if (sql[i] === "'") {
      current += "'";
      i++;
      while (i < len) {
        if (sql[i] === "'") {
          current += "'";
          i++;
          if (i < len && sql[i] === "'") {
            current += "'";
            i++;
          } else {
            break;
          }
        } else {
          current += sql[i];
          i++;
        }
      }
      continue;
    }

    // 5. Statement delimiter
    if (sql[i] === ';') {
      current += ';';
      i++;
      statements.push(current);
      current = '';
      continue;
    }

    current += sql[i];
    i++;
  }

  if (current.trim().length > 0) {
    statements.push(current);
  }

  return statements;
}

async function main() {
  console.log('Connecting to database...');
  await prisma.$connect();

  const migrationSqlPath = path.join(__dirname, '../src/database/tenant-migrations/026_suppliers_grn_module.sql');
  const sql = fs.readFileSync(migrationSqlPath, 'utf8');
  const statements = splitSqlStatements(sql);
  console.log(`Parsed ${statements.length} SQL statements from 026_suppliers_grn_module.sql`);

  const schemaRows = await prisma.$queryRawUnsafe(`SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`);
  console.log(`Found ${schemaRows.length} tenant schemas:`, schemaRows.map(s => s.schema_name));

  for (const row of schemaRows) {
    const schema = row.schema_name;
    console.log(`\nApplying migration 026 to schema [${schema}]...`);

    await prisma.$executeRawUnsafe(`SET search_path TO "${schema}", public`);

    for (let j = 0; j < statements.length; j++) {
      const stmt = statements[j].trim();
      const exec = stmt.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (!exec) continue;

      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (err) {
        console.error(`Error executing statement #${j + 1} on ${schema}:`, err.message);
        console.error('Statement was:', stmt);
        throw err;
      }
    }
    console.log(`Successfully migrated schema [${schema}]!`);
  }

  console.log('\n--- Verification ---');
  for (const row of schemaRows) {
    const schema = row.schema_name;
    const tables = await prisma.$queryRawUnsafe(`SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name IN ('suppliers', 'grns', 'grn_items', 'supplier_payments', 'supplier_payment_allocations')`);
    console.log(`Schema [${schema}] supplier tables:`, tables.map(t => t.table_name));

    const perms = await prisma.$queryRawUnsafe(`SELECT * FROM "${schema}".permissions WHERE code LIKE 'SUPPLIER%' OR code LIKE 'GRN%'`);
    console.log(`Schema [${schema}] supplier permissions:`, perms.map(p => p.code));
  }
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
