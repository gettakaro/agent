import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { AuthenticatedRequest, TakaroUser } from "../../src/http/middleware/auth.js";
import { conversationRoutes } from "../../src/http/routes/conversations.js";
import { createMockTakaroClient } from "../fixtures/test-data.js";

export interface TestUser extends TakaroUser {
  id: string;
  email: string;
  name?: string;
}

/**
 * Create a test user for API tests.
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: `user_test_${Date.now()}`,
    email: "test@example.com",
    name: "Test User",
    ...overrides,
  };
}

/**
 * Middleware that bypasses real auth and injects a test user.
 * Use this instead of the real authMiddleware in tests.
 */
export function testAuthMiddleware(user: TestUser) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    req.user = user;
    // biome-ignore lint/suspicious/noExplicitAny: Mock client doesn't need full type compliance
    req.takaroClient = createMockTakaroClient() as any;
    next();
  };
}

/**
 * Middleware that simulates unauthenticated requests.
 */
export function noAuthMiddleware() {
  return (_req: Request, res: Response, _next: NextFunction) => {
    res.status(401).json({ error: "Not authenticated" });
  };
}

export interface TestAppOptions {
  /** User to inject via test auth. If not provided, requests will be unauthenticated. */
  user?: TestUser;
}

/**
 * Creates an Express app configured for testing.
 * Uses test auth middleware instead of real Takaro auth.
 */
export function createTestApp(options: TestAppOptions = {}): Express {
  const app = express();

  app.use(express.json());

  // Apply test auth or no-auth based on options
  if (options.user) {
    app.use(testAuthMiddleware(options.user));
  } else {
    app.use(noAuthMiddleware());
  }

  // Mount routes
  app.use("/api/conversations", conversationRoutes);

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Test app error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  return app;
}
