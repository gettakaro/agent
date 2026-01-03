import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { AuthenticatedRequest, TakaroUser } from "../../src/http/middleware/auth.js";
import { conversationRoutes } from "../../src/http/routes/conversations.js";
import { createMockTakaroClient, type MockTakaroClient } from "../fixtures/test-data.js";

export interface TestUser extends TakaroUser {
  id: string;
  email: string;
  name?: string;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: `user_test_${Date.now()}`,
    email: "test@example.com",
    name: "Test User",
    ...overrides,
  };
}

export function testAuthMiddleware(user: TestUser) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    req.user = user;
    req.takaroClient = createMockTakaroClient() as MockTakaroClient;
    next();
  };
}

export function noAuthMiddleware() {
  return (_req: Request, res: Response, _next: NextFunction) => {
    res.status(401).json({ error: "Not authenticated" });
  };
}

export interface TestAppOptions {
  user?: TestUser;
}

export function createTestApp(options: TestAppOptions = {}): Express {
  const app = express();

  app.use(express.json());

  if (options.user) {
    app.use(testAuthMiddleware(options.user));
  } else {
    app.use(noAuthMiddleware());
  }

  app.use("/api/conversations", conversationRoutes);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Test app error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  return app;
}
