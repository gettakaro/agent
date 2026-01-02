# Design: Testing Framework with Mock LLM Provider

## Layer 1: Problem & Requirements

### Problem Statement

The takaro-agent application currently lacks any automated testing infrastructure. Every conversation with the agent goes through the OpenRouter API, which makes testing expensive ($0.01-$1 per call depending on model) [1], slow (network latency), and non-deterministic (LLM responses vary) [2]. Without tests, refactoring is risky and regressions go unnoticed until production.

This design establishes a testing skeleton that enables free, fast, deterministic tests by mocking the LLM provider. The skeleton must prove itself by including substantive tests that exercise real functionality—not trivial "hello world" tests.

### Current State

**No testing infrastructure exists:**
- No test files in `src/` (only dependency tests in `node_modules/`)
- No `test` script in `package.json`
- No test runner configuration
- No mock providers

**Current architecture creates testing challenges:**
- `AgentRuntime.getProvider()` (line 26-28 of `src/agents/AgentRuntime.ts`) directly instantiates `OpenRouterProvider` with no injection point
- Tools like `getModule` require `context.takaroClient` which needs mocking
- SSE streaming in conversation routes requires special test handling
- Database operations use Knex connected to PostgreSQL

**Cost and determinism issues per research [1][2]:**
- Each LLM call costs money and takes 1-10 seconds
- LLM responses vary for identical inputs, breaking traditional assertions
- Rate limits prevent running tests in CI pipelines efficiently

### Requirements

#### Functional

- REQ-001: The system SHALL support a mock LLM provider that returns predefined responses without making external API calls
- REQ-002: WHEN `USE_MOCK_PROVIDER=true` environment variable is set THEN all agents SHALL use the mock provider instead of OpenRouter
- REQ-003: The mock provider SHALL support configurable responses including tool calls, streaming chunks, and error conditions
- REQ-004: Unit tests SHALL run using Node.js built-in test runner (`node --test`)
- REQ-005: Integration tests SHALL use Testcontainers [3] to provision ephemeral PostgreSQL databases
- REQ-006: E2E tests SHALL use Playwright [4] to test the frontend application (React app at `packages/web-agent/`)
- REQ-007: Tests SHALL be organized in a `tests/` directory with `unit/`, `integration/`, and `e2e/` subdirectories
- REQ-008: Test runner SHALL support filtering tests by name pattern (`--test-name-pattern`)
- REQ-009: Test runner SHALL support running individual test files

#### Non-Functional

- Performance: Unit tests SHALL complete in under 5 seconds. Integration tests SHALL complete in under 30 seconds (excluding container startup).
- Isolation: Tests SHALL not affect each other's state. Each integration test suite gets a fresh database.
- Determinism: Tests using mock provider SHALL produce identical results on every run.
- Cost: Tests using mock provider SHALL incur $0 in API costs.

### Constraints

- Must use Node.js built-in test runner (not Jest, Vitest, or Mocha)
- Must use Playwright for E2E tests (not Cypress or Puppeteer directly)
- Cannot modify the `ILLMProvider` interface signature
- Must work with existing Knex migrations
- Docker must be available for Testcontainers

### Success Criteria

1. Running `npm test` executes all unit and integration tests
2. Running `npm run test:e2e` executes Playwright tests
3. Skeleton includes at least one substantive test per layer that exercises real code paths
4. All tests pass deterministically with mock provider
5. No LLM API calls made during test runs

## Layer 2: Functional Specification

### User Workflows

**1. Developer runs unit tests locally**
- Developer executes `npm run test:unit`
- Node.js test runner discovers `tests/unit/**/*.test.ts` files
- Tests execute with mock provider (auto-enabled in test environment)
- Results displayed in terminal with pass/fail status

**2. Developer runs integration tests locally**
- Developer executes `npm run test:integration`
- Testcontainers starts PostgreSQL container
- Migrations run against test database
- Tests execute with real database, mock LLM provider
- Container cleaned up after tests complete

**3. CI pipeline runs all tests**
- Pipeline sets `USE_MOCK_PROVIDER=true`
- Docker-in-Docker or privileged mode enables Testcontainers
- All test suites run in sequence
- Exit code reflects test success/failure

### External Interfaces

**Mock Provider Response Format:**

```
MockLLMProvider.setResponses([
  {
    content: "I'll help you create a module",
    toolCalls: [{ id: "1", name: "createModule", input: { name: "test" } }],
    usage: { inputTokens: 100, outputTokens: 50 },
    stopReason: "tool_use"
  },
  {
    content: "Module created successfully!",
    toolCalls: [],
    usage: { inputTokens: 200, outputTokens: 30 },
    stopReason: "end_turn"
  }
])
```

### Alternatives Considered

| Option | Pros | Cons | Why Not Chosen |
|--------|------|------|----------------|
| Jest test runner | Rich mocking, snapshots, popular | External dependency, slower startup, different patterns than Node.js native | User specified Node.js built-in runner |
| HTTP recording (VCR pattern) [2] | Tests real API behavior | Recordings become stale, still requires initial API calls, non-deterministic | Doesn't eliminate cost/determinism issues |
| In-memory SQLite | Very fast | Postgres-specific features may break, false confidence | Testcontainers provides real Postgres per user preference |
| Dependency injection for provider | More flexible, explicit | Requires refactoring AgentRuntime constructor and all factories | Environment variable is simpler, user preference |

## Layer 3: Technical Specification

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Test Infrastructure                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  tests/                                                             │
│  ├── unit/                    # Fast, isolated unit tests           │
│  │   ├── tools/               # Tool function tests                 │
│  │   └── agents/              # Agent configuration tests           │
│  │                                                                  │
│  ├── integration/             # Database + service tests            │
│  │   ├── conversations/       # ConversationService tests           │
│  │   └── agents/              # AgentRuntime with mock provider     │
│  │                                                                  │
│  ├── e2e/                     # Frontend tests with Playwright      │
│  │   └── chat/                # Chat UI flow tests                  │
│  │                                                                  │
│  └── fixtures/                # Shared test data                    │
│      ├── mock-responses.ts    # Predefined LLM responses            │
│      └── test-data.ts         # Sample conversations, messages      │
│                                                                     │
│  src/agents/providers/                                              │
│  └── MockLLMProvider.ts       # New mock implementation             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Data Flow with Mock Provider:**

```
Test Case
    │
    ├─ Sets USE_MOCK_PROVIDER=true (or inherits from test env)
    │
    ├─ Configures MockLLMProvider with expected responses
    │
    └─ Calls agent.chat() or HTTP endpoint
           │
           ▼
    AgentRuntime.getProvider()
           │
           ├─ Checks process.env.USE_MOCK_PROVIDER
           │
           ├─ If true → new MockLLMProvider()
           │
           └─ If false → new OpenRouterProvider()
           │
           ▼
    MockLLMProvider.chat()
           │
           ├─ Returns next response from queue
           │
           ├─ Emits streaming chunks if configured
           │
           └─ Tracks call history for assertions
           │
           ▼
    AgentRuntime executes tools (if any)
           │
           ▼
    Test asserts on response/state/DB
```

### Code Change Analysis

| Component | Action | Justification |
|-----------|--------|---------------|
| `src/agents/providers/MockLLMProvider.ts` | Create | Required for deterministic testing without API calls |
| `src/agents/AgentRuntime.ts` | Extend | Add environment check in `getProvider()` to return mock |
| `tests/` directory structure | Create | Organize tests by type per testing pyramid [5] |
| `package.json` | Extend | Add test scripts and dev dependencies |
| `tests/setup/` | Create | Test setup files for database, environment |
| `.claude/skills/takaro-agent-engineer/TESTING.md` | Create | Document testing framework for AI agent efficiency |

### Code to Remove

No code removal required for this feature. The mock provider is additive.

### Implementation Approach

#### Components

**1. MockLLMProvider** (`src/agents/providers/MockLLMProvider.ts`)
- Implements `ILLMProvider` interface
- Maintains queue of predefined responses
- Supports streaming simulation (emits chunks with configurable delays)
- Records call history for test assertions
- Throws when response queue is exhausted (catches missing mock setup)

Example logic (pseudocode):
```
class MockLLMProvider:
  responseQueue = []
  callHistory = []

  setResponses(responses):
    responseQueue = responses

  chat(messages, systemPrompt, tools, options, onChunk):
    if responseQueue is empty:
      throw "No mock response configured"

    response = responseQueue.shift()
    callHistory.push({ messages, systemPrompt, tools, options })

    if onChunk and response has streamChunks:
      for chunk in response.streamChunks:
        onChunk(chunk)

    return response
```

**2. AgentRuntime modification** (`src/agents/AgentRuntime.ts:26-28`)
- Current implementation directly returns `OpenRouterProvider`
- Add environment variable check following pattern from research [6]

Example logic (pseudocode):
```
getProvider(context):
  if process.env.USE_MOCK_PROVIDER is "true":
    return MockLLMProvider.getInstance()
  return new OpenRouterProvider(context.openrouterApiKey)
```

**3. Test Database Setup** (`tests/setup/database.ts`)
- Uses `@testcontainers/postgresql` [3] to start ephemeral containers
- Runs Knex migrations before tests
- Provides connection string to tests
- Handles cleanup after test suite

Example logic (pseudocode):
```
setupTestDatabase():
  container = new PostgreSqlContainer()
  await container.start()
  connectionString = container.getConnectionUri()

  knex = createKnex(connectionString)
  await knex.migrate.latest()

  return { knex, container, cleanup: () => container.stop() }
```

**4. Test Files Structure**

```
tests/
├── unit/
│   └── tools/
│       └── getModule.test.ts       # Tests tool logic with mocked takaroClient
├── integration/
│   ├── setup.ts                    # Testcontainers setup/teardown
│   ├── conversations/
│   │   └── service.test.ts         # ConversationService with real DB
│   └── agents/
│       └── runtime.test.ts         # AgentRuntime with mock provider + real DB
├── e2e/
│   ├── playwright.config.ts
│   └── chat/
│       └── conversation-flow.test.ts   # Frontend: create conversation, send message, verify UI
└── fixtures/
    ├── mock-responses.ts           # Reusable mock LLM responses
    └── test-data.ts                # Sample data factories
```

#### Data Models

No schema changes required. Tests use existing migrations.

#### Security

- Mock provider MUST only be activated via environment variable, never in production
- Test database credentials are ephemeral (Testcontainers generates them)
- No secrets stored in test fixtures

### Test-Driven Implementation

This design creates a testing skeleton validated by substantive tests.

**Unit Test: Tool execution** (`tests/unit/tools/getModule.test.ts`)
- Tests `getModule` tool directly
- Mocks `context.takaroClient` to return sample module data
- Verifies correct output transformation
- Validates error handling when client unavailable

**Integration Test: Conversation service** (`tests/integration/conversations/service.test.ts`)
- Uses Testcontainers PostgreSQL
- Tests `ConversationService.create()`, `get()`, `addMessage()`, `getMessages()`
- Verifies data persists correctly
- Tests ownership validation

**Integration Test: Agent runtime loop** (`tests/integration/agents/runtime.test.ts`)
- Uses mock provider configured with tool call response + final response
- Tests complete conversation loop: mock LLM returns tool call → tool executes → mock returns final
- Verifies tool execution tracking, state updates

**E2E Test: Chat conversation flow** (`tests/e2e/chat/conversation-flow.test.ts`)
- Starts backend server with mock provider (`USE_MOCK_PROVIDER=true`)
- Starts frontend dev server (`packages/web-agent/` on port 3101)
- Playwright navigates to chat UI
- Creates new conversation via UI
- Types message in ChatInput, submits
- Verifies assistant response renders in MessageBubble
- Verifies tool execution displays in ToolExecution component

### Test Filtering and Selection

The Node.js test runner supports filtering to run specific tests efficiently [11].

**Running a single test file:**
```bash
node --import tsx --test tests/unit/tools/getModule.test.ts
```

**Filter by test name pattern (regex):**
```bash
node --import tsx --test --test-name-pattern="should return module" tests/**/*.test.ts
```

**Filter by suite/describe name:**
```bash
node --import tsx --test --test-name-pattern="ConversationService" tests/**/*.test.ts
```

**Skip tests matching pattern:**
```bash
node --import tsx --test --test-skip-pattern="slow" tests/**/*.test.ts
```

**npm scripts for common patterns:**
```json
{
  "test:unit": "USE_MOCK_PROVIDER=true node --import tsx --test 'tests/unit/**/*.test.ts'",
  "test:integration": "USE_MOCK_PROVIDER=true node --import tsx --test 'tests/integration/**/*.test.ts'",
  "test:e2e": "USE_MOCK_PROVIDER=true playwright test",
  "test:file": "USE_MOCK_PROVIDER=true node --import tsx --test",
  "test:filter": "USE_MOCK_PROVIDER=true node --import tsx --test --test-name-pattern"
}
```

Usage examples:
- `npm run test:file tests/unit/tools/getModule.test.ts`
- `npm run test:filter "getModule" tests/unit/**/*.test.ts`

### Skill Documentation Updates

Update the Takaro Agent Engineer skill (`.claude/skills/takaro-agent-engineer/`) to document the testing framework for future AI agents.

**Create new file: `.claude/skills/takaro-agent-engineer/TESTING.md`**

Contents:
- Test runner commands (`npm run test:unit`, `npm run test:integration`, `npm run test:e2e`)
- How to run a single test file
- How to filter tests by name pattern
- Mock provider configuration (`USE_MOCK_PROVIDER=true`)
- Testcontainers prerequisites (Docker required)
- How to add new tests to each layer

**Update `.claude/skills/takaro-agent-engineer/SKILL.md`**

Add to Quick Reference table:
```
| Testing | [TESTING.md](TESTING.md) | `npm run test:unit` |
```

**Update `.claude/skills/takaro-agent-engineer/DEVELOPMENT.md`**

Add Testing section with quick commands.

### Rollout Plan

**Phase 1: Infrastructure** (this design)
- Create MockLLMProvider
- Modify AgentRuntime to support environment-based provider selection
- Set up test directory structure
- Add npm scripts (including filtering support)
- Create TESTING.md skill documentation
- Create one test per layer to validate skeleton
- Run /verify slash command

**Phase 2: Expand Coverage** (future)
- Add unit tests for remaining tools
- Add integration tests for all services
- Add E2E tests for critical user flows
- Set up CI pipeline integration

## References

1. [Effective Practices for Mocking LLM Responses During the Software Development Lifecycle](https://home.mlops.community/public/blogs/effective-practices-for-mocking-llm-responses-during-the-software-development-lifecycle) - MLOps Community
   - Summary: Covers why mocking LLM responses is critical for development lifecycle
   - Key takeaway: API calls cost money and LLM non-determinism breaks traditional testing

2. [Mocking OpenAI - Unit testing in the age of LLMs](https://laszlo.substack.com/p/mocking-openai-unit-testing-in-the) - 2024
   - Summary: Detailed guide on mocking OpenAI SDK in tests
   - Key takeaway: HTTP recording (VCR pattern) is one approach but mock classes are more flexible

3. [Testcontainers for Node.js - PostgreSQL Module](https://node.testcontainers.org/modules/postgresql/) - Official Documentation
   - Summary: How to use PostgreSQL containers in Node.js tests
   - Key takeaway: Ephemeral containers provide test isolation without manual cleanup

4. [Playwright API Testing](https://playwright.dev/docs/api-testing) - Official Documentation
   - Summary: Using Playwright's request API for testing HTTP endpoints
   - Key takeaway: Playwright handles SSE and streaming responses natively

5. [The Testing Pyramid: How to Structure Your Test Suite](https://semaphore.io/blog/testing-pyramid) - Semaphore
   - Summary: Classic testing pyramid structure with unit/integration/e2e layers
   - Key takeaway: Many unit tests, fewer integration tests, minimal e2e tests

6. [Node.js - Mocking in tests](https://nodejs.org/en/learn/test-runner/mocking) - Official Documentation
   - Summary: Node.js built-in test runner mocking capabilities
   - Key takeaway: Use `mock.module()` for module mocking, test context for cleanup

7. [Advanced Use Cases of the Node.js Native Test Runner](https://blog.appsignal.com/2024/08/07/advanced-use-cases-of-the-nodejs-native-test-runner.html) - AppSignal, 2024
   - Summary: Advanced patterns for Node.js native test runner
   - Key takeaway: Use hooks for setup/teardown, `describe` for grouping

8. [Getting started with Testcontainers for Node.js](https://testcontainers.com/guides/getting-started-with-testcontainers-for-nodejs/) - Official Guide
   - Summary: Step-by-step guide for Testcontainers in Node.js projects
   - Key takeaway: Tests are deterministic since containers are ephemeral

9. [Playwright: Testing WebSockets and Live Data Streams](https://dzone.com/articles/playwright-for-real-time-applications-testing-webs) - DZone
   - Summary: How to test real-time applications including SSE with Playwright
   - Key takeaway: Monitor responses with page.on('response') for streaming endpoints

10. [Mock Completion() Responses - LiteLLM](https://docs.litellm.ai/docs/completion/mock_requests) - Official Documentation
    - Summary: Pattern for mocking LLM completion responses
    - Key takeaway: Mock responses should match real provider response format exactly

11. [Test runner | Node.js Documentation](https://nodejs.org/api/test.html) - Official Documentation
    - Summary: Complete Node.js test runner API including filtering options
    - Key takeaway: `--test-name-pattern` for regex filtering, supports multiple patterns

### Research Summary

**Recommended Patterns Applied:**
- Mock LLM Provider from [1][2][10]: Creates deterministic, free tests
- Testing Pyramid from [5]: Organizes tests by scope and execution speed
- Testcontainers from [3][8]: Provides real database isolation per test suite
- Node.js native test runner from [6][7]: Uses built-in capabilities without external dependencies

**Anti-Patterns Avoided:**
- Recording/replay (VCR) per [2]: Recordings go stale and still need initial API calls
- Shared test database per [8]: Leads to flaky tests from state pollution
- Mocking database per [3]: Misses real SQL issues, provides false confidence

**Technologies Used:**
- `node:test` - Node.js built-in test runner [6]
- `@testcontainers/postgresql` - Ephemeral test databases [3]
- `@playwright/test` - E2E and API testing [4]

**Standards Compliance:**
- Testing pyramid structure from [5]
- Environment-based configuration from [1]
