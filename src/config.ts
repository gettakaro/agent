import { z } from 'zod';

const configSchema = z.object({
  port: z.coerce.number().default(3100),
  databaseUrl: z.string().url(),
  openrouterApiKey: z.string().min(1),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const raw = {
    port: process.env['PORT'],
    databaseUrl: process.env['DATABASE_URL'],
    openrouterApiKey: process.env['OPENROUTER_API_KEY'],
  };

  const result = configSchema.safeParse(raw);
  if (!result.success) {
    console.error('Invalid configuration:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
