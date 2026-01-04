# Testing

Testing framework with mock LLM provider for free, fast, deterministic tests. Three layers: unit tests (Node.js built-in runner), integration tests (Testcontainers PostgreSQL), and E2E tests (Playwright).

## Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all unit and integration tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests (requires Docker) |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:file <path>` | Run a single test file |
| `npm run test:filter <pattern>` | Filter tests by name pattern |
| `npm run eval` | Run agent evaluations (PromptFoo) |
| `npm run eval:view` | View previous eval results in web UI |
| `npm run eval:ci` | Run CI subset of evaluations |

## Mock Provider

Tests use `MockLLMProvider` instead of OpenRouter to avoid API costs and ensure determinism.

```bash
# Auto-enabled in test scripts
USE_MOCK_PROVIDER=true npm run test:unit

# Configure mock responses in tests
MockLLMProvider.getInstance().setResponses([
  { content: "Mock response", toolCalls: [], usage: { inputTokens: 10, outputTokens: 5 }, stopReason: "end_turn" }
]);
```

The mock provider:
- Returns predefined responses from a queue
- Tracks call history for assertions
- Simulates streaming chunks
- In E2E tests: Returns fallback response when queue exhausted (auto-enabled)
- In unit/integration tests: Throws error when queue exhausted (call `reset()` to disable fallback)

## Unit Tests

Location: `tests/unit/`

```bash
# Run all unit tests
npm run test:unit

# Run single file
npm run test:file tests/unit/tools/getModule.test.ts

# Filter by test name
npm run test:filter "should return module" tests/unit/**/*.test.ts
```

Unit tests mock external dependencies (takaroClient, database) and test functions in isolation.

## Integration Tests

Location: `tests/integration/`

```bash
# Run all integration tests (requires Docker)
npm run test:integration
```

Integration tests use Testcontainers to spin up ephemeral PostgreSQL containers:
- Fresh database per test suite
- Migrations run automatically
- No manual cleanup needed

Prerequisites:
- Docker must be running
- Docker socket accessible

## E2E Tests

Location: `tests/e2e/`

```bash
# Run Playwright tests
npm run test:e2e

# Run with UI
npx playwright test --ui

# Run specific test
npx playwright test conversation-flow
```

E2E tests run against the frontend (`packages/web-agent/`) with backend using mock provider.

## Agent Evaluations (PromptFoo)

Location: `evals/`

```bash
# Run full evaluation suite (requires running server)
npm run eval

# View previous results in web UI
npm run eval:view

# Run CI subset (critical tests only)
npm run eval:ci

# Run specific test category
npm run eval -- --filter-pattern "Create"
```

Agent evals test end-to-end behavior against a **running server** with **real LLM provider**. Unlike unit/integration tests that use MockLLMProvider, evals execute actual agent workflows to measure:
- Tool selection correctness
- Task completion quality
- Response accuracy
- Token usage and latency

Prerequisites:
- Server must be running (`npm run dev` or `docker compose up`)
- Valid Takaro API credentials (TAKARO_USERNAME, TAKARO_PASSWORD)
- OpenRouter API key (OPENROUTER_API_KEY)

**WARNING:** Evals create real test data in the database. Use a development environment, not production.

See `evals/README.md` for detailed documentation on writing test cases and debugging.

## Writing Tests

### Adding a Unit Test

Create file in `tests/unit/` matching the source structure:

```typescript
import { describe, it } from "node:test";
import assert from "node:assert";
import { createMockToolContext } from "../../fixtures/test-data.js";

describe("myFunction", () => {
  it("should do something", async () => {
    const context = createMockToolContext();
    // Test implementation
    assert.strictEqual(result, expected);
  });
});
```

### Adding an Integration Test

Use `tests/integration/setup.ts` for database:

```typescript
import { describe, it, before, after } from "node:test";
import { setupTestDatabase, teardownTestDatabase } from "../setup.js";

describe("MyService", () => {
  let db: TestDatabase;

  before(async () => {
    db = await setupTestDatabase();
  });

  after(async () => {
    await teardownTestDatabase(db);
  });

  it("should persist data", async () => {
    // Test with real database
  });
});
```

### Adding an API Integration Test

API tests use supertest + test app factory for HTTP endpoint testing:

```typescript
import { describe, it, before, after } from "node:test";
import supertest from "supertest";
import { setupTestDatabase, teardownTestDatabase } from "../setup.js";
import { createTestApp, createTestUser } from "../../helpers/test-app.js";

describe("My API", () => {
  let db, agent, user;

  before(async () => {
    db = await setupTestDatabase();
    user = createTestUser({ id: "user_123" });
    const app = createTestApp({ user }); // Injects test auth
    agent = supertest.agent(app);
  });

  after(async () => {
    await teardownTestDatabase(db);
  });

  it("should return 200", async () => {
    const res = await agent.get("/api/conversations").expect(200);
    assert.ok(res.body.data);
  });

  it("should return 401 when unauthenticated", async () => {
    const unauthApp = createTestApp(); // No user = 401
    await supertest(unauthApp).get("/api/conversations").expect(401);
  });
});
```

Key helpers:
- `createTestApp({ user })` - Creates Express app with test auth middleware
- `createTestUser()` - Creates a test user object
- Routes use Zod validation - invalid input returns 400 with `{ error, details }`

## Test Directory Structure

```text
playwright.config.ts            # Playwright config (project root)
tests/
├── helpers/
│   └── test-app.ts         # Test app factory + auth helpers
├── unit/
│   └── tools/              # Tool function tests
├── integration/
│   ├── setup.ts            # Testcontainers setup
│   ├── api/                # HTTP API tests
│   ├── conversations/      # ConversationService tests
│   └── agents/             # AgentRuntime tests
├── e2e/
│   └── chat/               # Chat UI flow tests
└── fixtures/
    ├── mock-responses.ts   # Predefined LLM responses
    └── test-data.ts        # Factory functions
```

## Gotchas

- **Docker required** for integration tests - Testcontainers needs Docker socket
- **Mock provider queue** - Responses are consumed in order; ensure enough responses for your test
- **Call history** - Use `MockLLMProvider.getInstance().getCallHistory()` to assert on LLM calls
- **Reset between tests** - Call `MockLLMProvider.getInstance().reset()` in beforeEach if reusing
- **Streaming** - Mock provider emits chunks synchronously; no actual delay simulation
- **Sequential integration tests** - Integration tests run with `--test-concurrency=1` because each test file starts its own PostgreSQL container; parallel execution would overwhelm Docker
