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
  console.log('Running migrations...');
  const [batch, log] = await db.migrate.latest();
  if (log.length === 0) {
    console.log('Already up to date');
  } else {
    console.log(`Batch ${batch} run: ${log.length} migrations`);
    log.forEach((m: string) => console.log(`  - ${m}`));
  }
  await db.destroy();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
