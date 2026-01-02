# Implementation Tasks: Testing Framework with Mock LLM Provider

## Overview

Building a testing skeleton with mock LLM provider that enables free, fast, deterministic tests. The framework includes:
- Unit tests (Node.js built-in runner)
- Integration tests (Testcontainers PostgreSQL)
- E2E tests (Playwright against React frontend)

**5 Phases** - Starting with skill documentation (enables AI efficiency), then building infrastructure layer by layer, ending with E2E tests.

---

## Phase 1: Skill Documentation
**Goal**: Document the testing framework so AI agents can efficiently run tests during development
**Demo**: "At standup, I can show: TESTING.md skill file with all commands documented"

### Tasks

- [x] Task 1.1: Create TESTING.md skill file
  - **Output**: Complete testing documentation for AI agents
  - **Files**: `.claude/skills/takaro-agent-engineer/TESTING.md`
  - **Verify**: File exists with commands for unit, integration, e2e, filtering

- [x] Task 1.2: Update SKILL.md quick reference
  - **Depends on**: 1.1
  - **Output**: Testing row in quick reference table
  - **Files**: `.claude/skills/takaro-agent-engineer/SKILL.md`
  - **Verify**: Table includes `| Testing | [TESTING.md](TESTING.md) | npm run test:unit |`

- [x] Task 1.3: Update DEVELOPMENT.md with testing section
  - **Depends on**: 1.1
  - **Output**: Testing commands section in development workflow
  - **Files**: `.claude/skills/takaro-agent-engineer/DEVELOPMENT.md`
  - **Verify**: Testing section exists with quick commands

### Phase 1 Checkpoint
- [x] All three skill files updated
- [x] Documentation is accurate and complete
- [x] **Demo ready**: Show TESTING.md with filtering commands, prerequisites, mock provider config

---

## Phase 2: Mock Provider Infrastructure
**Goal**: Create MockLLMProvider and wire it into AgentRuntime
**Demo**: "At standup, I can show: `USE_MOCK_PROVIDER=true` activates mock instead of OpenRouter"

### Tasks

- [x] Task 2.1: Create MockLLMProvider class
  - **Output**: Mock provider implementing ILLMProvider interface
  - **Files**: `src/agents/providers/MockLLMProvider.ts`
  - **Verify**: TypeScript compiles, implements all interface methods

- [x] Task 2.2: Implement singleton pattern and response queue
  - **Depends on**: 2.1
  - **Output**: `getInstance()`, `setResponses()`, `reset()`, `getCallHistory()`
  - **Files**: `src/agents/providers/MockLLMProvider.ts`
  - **Verify**: Can queue multiple responses, shifts on each call

- [x] Task 2.3: Implement streaming chunk simulation
  - **Depends on**: 2.2
  - **Output**: `onChunk` callback support with text/tool_use/done events
  - **Files**: `src/agents/providers/MockLLMProvider.ts`
  - **Verify**: Chunks emitted in correct order

- [x] Task 2.4: Modify AgentRuntime.getProvider()
  - **Depends on**: 2.1
  - **Output**: Environment variable check returns mock when `USE_MOCK_PROVIDER=true`
  - **Files**: `src/agents/AgentRuntime.ts` (lines 26-28)
  - **Verify**: `USE_MOCK_PROVIDER=true node -e "..."` uses mock

- [x] Task 2.5: Export MockLLMProvider from providers index
  - **Depends on**: 2.1
  - **Output**: Clean import path for tests
  - **Files**: `src/agents/providers/index.ts` (create if needed)
  - **Verify**: `import { MockLLMProvider } from "../src/agents/providers/index.js"` works

### Phase 2 Checkpoint
- [x] Run lint: `npm run lint`
- [x] Run build: `npm run build`
- [x] Run typecheck: `npm run typecheck`
- [x] Manual verification: Set `USE_MOCK_PROVIDER=true` and verify mock is used
- [x] **Demo ready**: Show AgentRuntime selecting mock vs real provider based on env var

---

## Phase 3: Test Infrastructure & Unit Tests
**Goal**: Set up test directory structure, npm scripts, and first unit test
**Demo**: "At standup, I can show: `npm run test:unit` runs getModule tool test"

### Tasks

- [x] Task 3.1: Add test dependencies to package.json
  - **Output**: devDependencies for testcontainers, playwright
  - **Files**: `package.json`
  - **Verify**: `npm install` succeeds

- [x] Task 3.2: Add test scripts to package.json
  - **Depends on**: 3.1
  - **Output**: test, test:unit, test:integration, test:e2e, test:file, test:filter scripts
  - **Files**: `package.json`
  - **Verify**: Scripts appear in `npm run`

- [x] Task 3.3: Create test directory structure
  - **Output**: tests/unit/tools/, tests/integration/, tests/e2e/chat/, tests/fixtures/
  - **Files**: Directory structure per design doc
  - **Verify**: Directories exist

- [x] Task 3.4: Create mock-responses.ts fixture
  - **Depends on**: 3.3
  - **Output**: Reusable mock LLM responses for tests
  - **Files**: `tests/fixtures/mock-responses.ts`
  - **Verify**: Exports `simpleResponse`, `toolCallResponse`, etc.

- [x] Task 3.5: Create test-data.ts fixture
  - **Depends on**: 3.3
  - **Output**: Factory functions for test data
  - **Files**: `tests/fixtures/test-data.ts`
  - **Verify**: Exports `createMockToolContext()`, `createMockTakaroClient()`, etc.

- [x] Task 3.6: Write getModule unit test
  - **Depends on**: 3.4, 3.5
  - **Output**: Tests getModule tool with mocked takaroClient
  - **Files**: `tests/unit/tools/getModule.test.ts`
  - **Verify**: `npm run test:unit` passes

### Phase 3 Checkpoint
- [x] Run lint: `npm run lint`
- [x] Run build: `npm run build`
- [x] Run tests: `npm run test:unit`
- [x] Manual verification: `npm run test:file tests/unit/tools/getModule.test.ts` runs single file
- [x] **Demo ready**: Show unit test passing, demonstrate test filtering

---

## Phase 4: Integration Tests with Testcontainers
**Goal**: Integration tests with real PostgreSQL via Testcontainers
**Demo**: "At standup, I can show: ConversationService test creates real DB records"

### Tasks

- [x] Task 4.1: Create Testcontainers setup module
  - **Output**: Database setup/teardown helpers
  - **Files**: `tests/integration/setup.ts`
  - **Verify**: Exports `setupTestDatabase()`, `teardownTestDatabase()`

- [x] Task 4.2: Write ConversationService integration test
  - **Depends on**: 4.1
  - **Output**: Tests create, get, addMessage, getMessages
  - **Files**: `tests/integration/conversations/service.test.ts`
  - **Verify**: `npm run test:integration` passes (Docker required)

- [x] Task 4.3: Write AgentRuntime integration test
  - **Depends on**: 4.1, Phase 2
  - **Output**: Tests full conversation loop with mock provider + real DB
  - **Files**: `tests/integration/agents/runtime.test.ts`
  - **Verify**: Mock provider returns tool call → tool executes → mock returns final

### Phase 4 Checkpoint
- [x] Run lint: `npm run lint`
- [x] Run build: `npm run build`
- [x] Run tests: `npm run test:integration` (requires Docker)
- [x] Manual verification: Check Testcontainers logs show container start/stop
- [x] **Demo ready**: Show integration test with real Postgres container

---

## Phase 5: E2E Tests with Playwright
**Goal**: Frontend tests that exercise the chat UI
**Demo**: "At standup, I can show: Playwright test creates conversation and sends message in UI"

### Tasks

- [ ] Task 5.1: Initialize Playwright
  - **Output**: Playwright config and browser installation
  - **Files**: `tests/e2e/playwright.config.ts`
  - **Verify**: `npx playwright install` completes

- [ ] Task 5.2: Create E2E test helpers
  - **Output**: Helper to start backend + frontend servers
  - **Files**: `tests/e2e/helpers.ts`
  - **Verify**: Can start servers with USE_MOCK_PROVIDER=true

- [ ] Task 5.3: Write conversation flow E2E test
  - **Depends on**: 5.1, 5.2
  - **Output**: Test navigates to chat, creates conversation, sends message, verifies response
  - **Files**: `tests/e2e/chat/conversation-flow.test.ts`
  - **Verify**: `npm run test:e2e` passes

### Phase 5 Checkpoint
- [ ] Run lint: `npm run lint`
- [ ] Run build: `npm run build`
- [ ] Run tests: `npm run test:e2e`
- [ ] All previous tests still pass: `npm test`
- [ ] **Demo ready**: Show Playwright test interacting with real UI

---

## Final Verification

- [ ] All requirements from design doc met:
  - [ ] REQ-001: Mock provider returns predefined responses ✓
  - [ ] REQ-002: `USE_MOCK_PROVIDER=true` activates mock ✓
  - [ ] REQ-003: Supports tool calls, streaming, errors ✓
  - [ ] REQ-004: Unit tests use Node.js built-in runner ✓
  - [ ] REQ-005: Integration tests use Testcontainers ✓
  - [ ] REQ-006: E2E tests use Playwright on frontend ✓
  - [ ] REQ-007: Tests organized in tests/unit/integration/e2e ✓
  - [ ] REQ-008: `--test-name-pattern` filtering works ✓
  - [ ] REQ-009: Single file execution works ✓
- [ ] No obsolete code (this feature is additive)
- [ ] Tests comprehensive: unit, integration, e2e skeleton
- [ ] Skill documentation updated
- [ ] Run `/verify` slash command
