# Implementation Tasks: PromptFoo Agent Evaluation System

## Overview

Building a PromptFoo-based evaluation framework for testing Takaro agents (module-writer, player-moderator) via HTTP. The system creates a custom provider that talks to the running server, parses SSE responses, and validates agent behavior through structured and semantic assertions.

**4 phases**: Infrastructure → Tool Correctness Tests → Task Completion Tests → CI Integration

## Phase 1: Infrastructure Setup

**Goal**: Get a single eval test case running end-to-end with the custom HTTP provider.

**Demo**: "At standup, I can run `npm run eval` and see one test case pass/fail with tool call metadata in the output."

### Tasks

- [x] Task 1.1: Add promptfoo dependency
  - **Output**: promptfoo installed as devDependency
  - **Files**: `package.json`
  - **Verify**: `npm ls promptfoo` shows installed version

- [x] Task 1.2: Create evals directory structure
  - **Output**: Empty directory structure ready for files
  - **Files**:
    - `evals/providers/` (directory)
    - `evals/test-cases/module-writer/` (directory)
    - `evals/test-cases/shared/` (directory)
  - **Verify**: `ls -la evals/` shows structure

- [x] Task 1.3: Extend tsconfig.json to include evals/
  - **Output**: TypeScript compiles evals/ directory
  - **Files**: `tsconfig.json`
  - **Verify**: `npm run typecheck` passes with evals/ included
  - **Note**: Skipped - PromptFoo loads TypeScript providers directly, no need to compile evals/

- [x] Task 1.4: Implement custom HTTP provider skeleton
  - **Output**: Provider class with `id()` and `callApi()` methods (hardcoded response initially)
  - **Files**: `evals/providers/takaro-agent.ts`
  - **Verify**: Provider exports correct shape for PromptFoo

- [x] Task 1.5: Create minimal promptfooconfig.yaml
  - **Output**: Config referencing the custom provider with single test prompt
  - **Files**: `evals/promptfooconfig.yaml`
  - **Verify**: `npx promptfoo eval -c evals/promptfooconfig.yaml --dry-run` shows valid config

- [x] Task 1.6: Add npm scripts for eval
  - **Output**: Scripts for running evals and viewing results
  - **Files**: `package.json`
  - **Verify**: `npm run eval` command exists

- [x] Task 1.7: Implement SSE stream parsing in provider
  - **Output**: Provider creates conversation, sends message, parses SSE events
  - **Files**: `evals/providers/takaro-agent.ts`
  - **Depends on**: 1.4
  - **Verify**: Provider returns structured response with toolCalls in metadata

- [x] Task 1.8: Create first test case (TC-001)
  - **Output**: "Create a module" test with JavaScript assertion checking toolCalls
  - **Files**: `evals/test-cases/module-writer/tool-correctness.yaml`
  - **Verify**: Test runs and produces pass/fail result

### Phase 1 Checkpoint

- [x] Run lint: `npm run lint`
- [x] Run build: `npm run build`
- [x] Run typecheck: `npm run typecheck`
- [x] Manual verification: Start server (`npm run dev`), run `npm run eval`, confirm test executes
- [x] **Demo ready**: Single test case runs, shows tool calls captured, pass/fail works

## Phase 2: Tool Correctness Tests

**Goal**: Implement TC-001 through TC-005 with deterministic assertions validating correct tool selection.

**Demo**: "At standup, I can show 5 tool correctness tests passing, each validating the agent calls the right tool with correct arguments."

### Tasks

- [ ] Task 2.1: Implement TC-002 (addCommand)
  - **Output**: Test for "Add a /hello command" → addCommand tool called
  - **Files**: `evals/test-cases/module-writer/tool-correctness.yaml`
  - **Depends on**: Phase 1
  - **Verify**: Test passes when command is added

- [ ] Task 2.2: Implement TC-003 (addHook)
  - **Output**: Test for "Create a hook for player join" → addHook tool called
  - **Files**: `evals/test-cases/module-writer/tool-correctness.yaml`
  - **Verify**: Test passes when hook is created

- [ ] Task 2.3: Implement TC-004 (addCronJob)
  - **Output**: Test for "Schedule a cron every 5 minutes" → addCronJob tool called
  - **Files**: `evals/test-cases/module-writer/tool-correctness.yaml`
  - **Verify**: Test passes when cronjob is created

- [ ] Task 2.4: Implement TC-005 (listModuleDefinitions)
  - **Output**: Test for "Show my modules" → listModuleDefinitions tool called
  - **Files**: `evals/test-cases/module-writer/tool-correctness.yaml`
  - **Verify**: Test passes when modules are listed

- [ ] Task 2.5: Add cost assertion
  - **Output**: Assertion failing if token usage exceeds threshold (e.g., 5000 tokens)
  - **Files**: `evals/test-cases/shared/assertions.yaml`, update test files
  - **Verify**: High-token response triggers cost warning

- [ ] Task 2.6: Add latency assertion
  - **Output**: Assertion failing if response time > 60 seconds
  - **Files**: `evals/test-cases/shared/assertions.yaml`, update test files
  - **Verify**: Slow response triggers latency warning

- [ ] Task 2.7: Run reproducibility check
  - **Output**: Document variance across 3 runs of same tests
  - **Files**: `evals/README.md`
  - **Verify**: Run `npm run eval` 3x, note pass/fail consistency

### Phase 2 Checkpoint

- [ ] Run lint: `npm run lint`
- [ ] Run build: `npm run build`
- [ ] All 5 tool correctness tests defined and runnable
- [ ] Cost/latency assertions active
- [ ] Manual verification: Run full suite, check each test result
- [ ] **Demo ready**: Show 5 tests running with tool call validation + cost/latency metrics

## Phase 3: Task Completion Tests

**Goal**: Implement TC-101 through TC-103 testing end-to-end agent workflows with LLM-as-judge assertions.

**Demo**: "At standup, I can show multi-step task tests that validate the agent completes complex requests (module + commands + hooks)."

### Tasks

- [ ] Task 3.1: Create task-completion.yaml test file
  - **Output**: New test file for multi-step workflow tests
  - **Files**: `evals/test-cases/module-writer/task-completion.yaml`
  - **Verify**: File loads without errors

- [ ] Task 3.2: Implement TC-101 (welcome module)
  - **Output**: Test for "Build a welcome module that greets players when they join"
  - **Files**: `evals/test-cases/module-writer/task-completion.yaml`
  - **Assertions**: JavaScript check for createModule + addHook + addFunction
  - **Verify**: Test validates multi-tool workflow

- [ ] Task 3.3: Implement TC-102 (economy module)
  - **Output**: Test for "Create economy module with /balance and /pay commands"
  - **Files**: `evals/test-cases/module-writer/task-completion.yaml`
  - **Assertions**: JavaScript check for createModule + 2x addCommand
  - **Verify**: Test validates dual-command creation

- [ ] Task 3.4: Implement TC-103 (auto-restart cron)
  - **Output**: Test for "Set up auto-restart cron every 6 hours"
  - **Files**: `evals/test-cases/module-writer/task-completion.yaml`
  - **Assertions**: JavaScript check for addCronJob with "0 */6 * * *" pattern
  - **Verify**: Test validates cron expression

- [ ] Task 3.5: Add llm-rubric assertions
  - **Output**: Configure model-graded evaluation for response quality
  - **Files**: `evals/promptfooconfig.yaml`, `evals/test-cases/module-writer/task-completion.yaml`
  - **Verify**: llm-rubric runs and produces quality score

- [ ] Task 3.6: Tune pass/fail thresholds
  - **Output**: Document appropriate threshold values based on trial runs
  - **Files**: `evals/README.md`, update assertion configs
  - **Verify**: Thresholds produce reasonable pass/fail distribution

### Phase 3 Checkpoint

- [ ] Run lint: `npm run lint`
- [ ] Run build: `npm run build`
- [ ] All 3 task completion tests defined and runnable
- [ ] LLM-rubric assertions configured
- [ ] Manual verification: Run task completion tests, verify multi-step validation
- [ ] **Demo ready**: Show complex workflow tests with both structural and semantic validation

## Phase 4: CI Integration & Experiment Comparison

**Goal**: Enable eval runs in CI pipeline and support comparing multiple agent experiments.

**Demo**: "At standup, I can show CI running eval subset and a comparison of grok-fast vs concise experiments."

### Tasks

- [ ] Task 4.1: Add ci tags to critical tests
  - **Output**: Tag subset of tests with `ci: true` metadata
  - **Files**: `evals/test-cases/module-writer/*.yaml`
  - **Verify**: `npm run eval:ci` runs only tagged tests

- [ ] Task 4.2: Add eval:ci npm script
  - **Output**: Script that filters to ci-tagged tests
  - **Files**: `package.json`
  - **Verify**: `npm run eval:ci` runs faster with fewer tests

- [ ] Task 4.3: Configure multiple provider experiments
  - **Output**: Config supporting grok-fast, concise, gpt-oss comparison
  - **Files**: `evals/promptfooconfig.yaml`
  - **Verify**: Single run produces side-by-side results

- [ ] Task 4.4: Create eval documentation
  - **Output**: README explaining how to run evals, add tests, interpret results
  - **Files**: `evals/README.md`
  - **Verify**: New developer can follow docs to run evals

- [ ] Task 4.5: Add CI workflow file (optional - if CI exists)
  - **Output**: GitHub Actions workflow for eval runs on PR
  - **Files**: `.github/workflows/eval.yml` (if applicable)
  - **Verify**: PR triggers eval run

### Phase 4 Checkpoint

- [ ] Run lint: `npm run lint`
- [ ] Run build: `npm run build`
- [ ] CI-tagged tests run quickly via `npm run eval:ci`
- [ ] Multiple experiments can be compared in single run
- [ ] Documentation complete
- [ ] Manual verification: Run comparison, view results in promptfoo web UI
- [ ] **Demo ready**: Show CI-fast eval run + experiment comparison table

## Final Verification

- [ ] REQ-001: System evaluates agent responses using PromptFoo ✓
- [ ] REQ-002: HTTP-based eval execution works against running server ✓
- [ ] REQ-003: Both tool correctness and task completion tests exist ✓
- [ ] REQ-004: Tool calls, timing, and token usage captured in metadata ✓
- [ ] REQ-005: Comparison across agent experiments supported ✓
- [ ] REQ-006: Results viewable via `npm run eval:view` web UI ✓
- [ ] All tests passing consistently
- [ ] Documentation complete in `evals/README.md`
- [ ] No obsolete code introduced (greenfield implementation)
