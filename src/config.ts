import { z } from 'zod';

const configSchema = z.object({
  port: z.coerce.number().default(3100),
  databaseUrl: z.string().url(),
  openrouterApiKey: z.string().min(1),
  takaroApiUrl: z.string().url().default('https://api.takaro.io'),
  takaroLoginUrl: z.string().url().default('https://dashboard.takaro.io/login'),
  corsOrigins: z
    .string()
    .default('')
    .transform((s) => (s ? s.split(',').map((o) => o.trim()) : [])),
  takaroUsername: z.string().optional(),
  takaroPassword: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const raw = {
    port: process.env['PORT'],
    databaseUrl: process.env['DATABASE_URL'],
    openrouterApiKey: process.env['OPENROUTER_API_KEY'],
    takaroApiUrl: process.env['TAKARO_API_URL'],
    takaroLoginUrl: process.env['TAKARO_LOGIN_URL'],
    corsOrigins: process.env['CORS_ORIGINS'],
    takaroUsername: process.env['TAKARO_USERNAME'],
    takaroPassword: process.env['TAKARO_PASSWORD'],
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
