import { z } from 'zod';

const configSchema = z.object({
  port: z.coerce.number().default(3100),
  databaseUrl: z.string().url(),
  redisUrl: z.string().url().default('redis://localhost:6379'),
  // Legacy/testing only - users now provide their own keys
  openrouterApiKey: z.string().optional(),
  takaroApiUrl: z.string().url().default('https://api.takaro.io'),
  takaroLoginUrl: z.string().url().default('https://dashboard.takaro.io/login'),
  corsOrigins: z
    .string()
    .default('')
    .transform((s) => (s ? s.split(',').map((o) => o.trim()) : [])),
  takaroUsername: z.string().optional(),
  takaroPassword: z.string().optional(),
  // Claude OAuth configuration
  claudeOauthClientId: z.string().default('9d1c250a-e61b-44d9-88ed-5944d1962f5e'),
  claudeOauthRedirectUri: z.string().url().optional(),
  appBaseUrl: z.string().url().optional(),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const raw = {
    port: process.env['PORT'],
    databaseUrl: process.env['DATABASE_URL'],
    redisUrl: process.env['REDIS_URL'],
    openrouterApiKey: process.env['OPENROUTER_API_KEY'],
    takaroApiUrl: process.env['TAKARO_API_URL'],
    takaroLoginUrl: process.env['TAKARO_LOGIN_URL'],
    corsOrigins: process.env['CORS_ORIGINS'],
    takaroUsername: process.env['TAKARO_USERNAME'],
    takaroPassword: process.env['TAKARO_PASSWORD'],
    claudeOauthClientId: process.env['CLAUDE_OAUTH_CLIENT_ID'],
    claudeOauthRedirectUri: process.env['CLAUDE_OAUTH_REDIRECT_URI'],
    appBaseUrl: process.env['APP_BASE_URL'],
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
