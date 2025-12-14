import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = knex({
  client: 'pg',
  connection: process.env['DATABASE_URL'],
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    loadExtensions: ['.js'],
  },
});

async function main() {
  console.log('Rolling back migrations...');
  const [batch, log] = await db.migrate.rollback();
  if (log.length === 0) {
    console.log('Nothing to rollback');
  } else {
    console.log(`Batch ${batch} rolled back: ${log.length} migrations`);
    log.forEach((m: string) => console.log(`  - ${m}`));
  }
  await db.destroy();
}

main().catch((err) => {
  console.error('Rollback failed:', err);
  process.exit(1);
});
