# Design: PromptFoo Agent Evaluation System

## Layer 1: Problem & Requirements

### Problem Statement

The Takaro agent system (module-writer, player-moderator) lacks systematic evaluation of agent behavior. While the application has unit and integration tests for functionality [1], there's no framework to measure whether agents:
- Complete tasks correctly
- Use tools appropriately
- Provide accurate responses
- Improve or regress over time as prompts and models change

Agent evals differ fundamentally from traditional tests [2]. Standard LLM evals test a function (input X → output Y meets criteria Z). Agent evals test systems with emergent behavior where non-determinism compounds across multiple tool calls and decisions [3].

### Current State

**Testing infrastructure:**
- No existing test files in `src/` directory (confirmed via glob search)
- No testing framework configured in package.json
- Development relies on manual testing via curl commands (per CLAUDE.md)
- Biome configured for linting only

**Agent architecture (src/agents/):**
- `AgentRuntime.ts` implements the agentic loop with max 10 iterations
- Tools return `ToolResult { success, output, error }` with execution timing
- All tool calls are logged with `ToolExecution` records including `durationMs`
- Conversations persist to PostgreSQL with full message history
- SSE streaming exposes granular events: `text`, `tool_use`, `tool_result`, `done`

**Module-writer agent specifics:**
- 32 tools across 7 categories (module, command, hook, cronjob, function, gameserver, debug)
- 4 experiment variants: `grok-fast`, `gpt-oss`, `concise`, `with-docs`
- State management via `context.state` (moduleId, versionId, moduleName)
- Requires Takaro API client for all tool execution

### Requirements

#### Functional
- REQ-001: The system SHALL evaluate agent responses using PromptFoo framework
- REQ-002: The system SHALL support HTTP-based eval execution against running server
- REQ-003: The system SHALL evaluate both tool correctness and task completion
- REQ-004: WHEN a test case runs, THEN tool calls, timing, and token usage SHALL be captured
- REQ-005: The system SHALL support comparison across agent experiments (grok-fast vs concise)
- REQ-006: Test results SHALL be viewable via PromptFoo web UI

#### Non-Functional
- Performance: Eval suite runs in < 5 minutes for core test cases [4]
- Isolation: Evals SHALL NOT affect production data (use dedicated test user/gameserver)
- Reproducibility: Same test case produces consistent pass/fail (within LLM variance bounds)
- CI Integration: Evals runnable via npm script for CI/CD pipelines [5]

### Constraints

- PromptFoo requires Node.js 18+ (compatible with project's Node.js requirement)
- Evals require running server instance + valid Takaro credentials
- Takaro API rate limits may affect concurrent eval execution
- LLM costs accumulate during eval runs (track with PromptFoo cost assertions [6])

### Success Criteria

1. **Baseline established**: First eval run completes with measurable pass/fail rate
2. **Regression detection**: Prompt changes can be compared via before/after eval runs
3. **Tool validation**: >90% of valid prompts result in correct tool selection
4. **Experiment comparison**: Clear metrics showing performance differences between variants
5. **Developer adoption**: Team can run evals locally with single npm command

## Layer 2: Functional Specification

### User Workflows

1. **Run Full Eval Suite**
   - Developer executes `npm run eval`
   - System starts server if not running
   - PromptFoo executes all test cases
   - Results displayed in terminal + web UI opened

2. **Run Single Test Category**
   - Developer executes `npm run eval -- --filter "module creation"`
   - Only matching test cases execute
   - Faster iteration during development

3. **Compare Experiments**
   - Developer modifies promptfooconfig.yaml to test multiple providers
   - Single run compares grok-fast vs concise vs gpt-oss
   - Side-by-side metrics in web UI

4. **CI Pipeline**
   - PR triggers eval workflow
   - Subset of critical tests run (marked with `ci: true` tag)
   - Pass/fail gates PR merge

### External Interfaces

**PromptFoo → Takaro Agent API:**
```
POST /api/conversations
  → Create conversation with agentId

POST /api/conversations/{id}/messages
  → Send test prompt, receive SSE stream
  → Parse tool_use, tool_result, text, done events

GET /api/conversations/{id}/messages
  → Retrieve full conversation for assertions
```

**Configuration File** (promptfooconfig.yaml):
```yaml
providers:
  - id: file://evals/providers/takaro-agent.ts
    config:
      baseUrl: http://localhost:3100
      agentId: module-writer/grok-fast
```

### Alternatives Considered

| Option | Pros | Cons | Why Not Chosen |
|--------|------|------|----------------|
| Direct JS Provider (import AgentRuntime) | Faster, no server needed, unit-test style | Doesn't test full HTTP/SSE flow | User preference for HTTP; can add later |
| DeepEval framework [7] | Strong LLM-as-judge, pytest-like | Python-based, less JS ecosystem fit | Project is TypeScript; PromptFoo native |
| Custom eval harness | Full control, no dependencies | Maintenance burden, reinventing wheel | PromptFoo battle-tested at scale [8] |
| LangSmith/Arize | Production observability | SaaS cost, vendor lock-in | Open-source preference per research |

## Layer 3: Technical Specification

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Eval Runner                               │
│  npm run eval → promptfoo eval → Results + Web UI                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Custom HTTP Provider (TypeScript)                   │
│  evals/providers/takaro-agent.ts                                 │
│  - Creates conversation                                          │
│  - Sends message via SSE                                         │
│  - Parses streaming response                                     │
│  - Returns structured ProviderResponse                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Takaro Agent Server                            │
│  http://localhost:3100                                           │
│  - Auth middleware (service account mode for evals)              │
│  - AgentRuntime → OpenRouter → Tool execution                    │
└─────────────────────────────────────────────────────────────────┘
```

### Code Change Analysis

| Component | Action | Justification |
|-----------|--------|---------------|
| `evals/` directory | Create | New eval infrastructure separate from src/ |
| `evals/providers/takaro-agent.ts` | Create | Custom PromptFoo provider for HTTP API [9] |
| `evals/promptfooconfig.yaml` | Create | Main eval configuration |
| `evals/test-cases/` | Create | Organized test case YAML files |
| `package.json` | Extend | Add promptfoo dependency + npm scripts |
| `tsconfig.json` | Extend | Include evals/ in compilation |

### Implementation Approach

#### Directory Structure
```
evals/
├── providers/
│   └── takaro-agent.ts       # Custom HTTP provider
├── test-cases/
│   ├── module-writer/
│   │   ├── tool-correctness.yaml   # Tool selection tests
│   │   └── task-completion.yaml    # End-to-end workflows
│   └── shared/
│       └── assertions.yaml   # Reusable assertion definitions
├── promptfooconfig.yaml      # Main config
└── README.md                 # Eval documentation
```

#### Custom Provider Design

The provider implements PromptFoo's `ApiProvider` interface [9]:

```
class TakaroAgentProvider:
  id() → "takaro-agent:{agentId}"

  callApi(prompt, context):
    1. Create conversation via POST /api/conversations
    2. Send message via POST /api/conversations/{id}/messages
    3. Parse SSE stream, collect:
       - Full text response
       - Tool calls with inputs
       - Tool results with success/error
       - Token usage from done event
    4. Return ProviderResponse:
       - output: assistant's final text
       - tokenUsage: {prompt, completion, total}
       - metadata: {toolCalls, toolResults, conversationId}
```

**SSE Stream Parsing Logic:**
```
on "tool_use" event:
  accumulate {id, name, input} to toolCalls array

on "tool_result" event:
  accumulate {id, name, result, durationMs} to toolResults array

on "text" event:
  append content to responseText

on "done" event:
  capture usage {inputTokens, outputTokens}
  resolve promise
```

#### Test Case Structure

**Tool Correctness Tests** (deterministic assertions):
```
tests:
  - vars:
      prompt: "Create a module called 'Economy'"
    assert:
      - type: javascript
        value: |
          output.metadata.toolCalls.some(
            t => t.name === 'createModule' &&
                 t.input.name === 'Economy'
          )
      - type: contains
        value: "created successfully"
```

**Task Completion Tests** (LLM-as-judge for semantic quality):
```
tests:
  - vars:
      prompt: "Build a module with a /balance command"
    assert:
      - type: javascript
        value: |
          const tools = output.metadata.toolCalls.map(t => t.name);
          tools.includes('createModule') && tools.includes('addCommand')
      - type: llm-rubric
        value: "Response confirms module and command creation with working trigger"
```

#### Assertions Strategy

Following Semgrep's multi-layered approach [10]:

1. **Structural assertions** (fast, deterministic):
   - `contains`: Check for expected strings in output
   - `javascript`: Validate tool call structure and sequence
   - `json-schema`: Ensure output format compliance

2. **Semantic assertions** (LLM-graded):
   - `llm-rubric`: Evaluate response quality and correctness
   - `factuality`: Compare against expected outcomes

3. **Operational assertions**:
   - `cost`: Alert if token usage exceeds threshold [6]
   - `latency`: Fail if response time > threshold
   - Custom: Tool success rate per conversation

#### Package.json Changes

```
scripts:
  "eval": "promptfoo eval -c evals/promptfooconfig.yaml",
  "eval:view": "promptfoo view",
  "eval:ci": "promptfoo eval -c evals/promptfooconfig.yaml --filter ci"

devDependencies:
  "promptfoo": "^0.100.0"
```

#### Environment Configuration

Evals require:
- Running server: `npm run dev` or `docker compose up`
- Valid credentials: `TAKARO_USERNAME`, `TAKARO_PASSWORD` (service account mode)
- OpenRouter key: `OPENROUTER_API_KEY`

For CI, use environment secrets + dedicated test Takaro instance.

### Initial Test Cases

**Module Writer - Tool Correctness:**

| Test ID | Prompt | Expected Tool(s) | Assertion |
|---------|--------|------------------|-----------|
| TC-001 | "Create a module called TestModule" | createModule | tool called with name="TestModule" |
| TC-002 | "Add a /hello command" | addCommand | tool called with trigger="/hello" |
| TC-003 | "Create a hook for player join" | addHook | tool called with eventType containing "player" |
| TC-004 | "Schedule a cron every 5 minutes" | addCronJob | tool called with valid cron expression |
| TC-005 | "Show my modules" | listModuleDefinitions | tool called |

**Module Writer - Task Completion:**

| Test ID | Prompt | Success Criteria |
|---------|--------|------------------|
| TC-101 | "Build a welcome module that greets players when they join" | createModule + addHook(player-connected) + addFunction |
| TC-102 | "Create economy module with /balance and /pay commands" | createModule + addCommand x2 + addFunction for logic |
| TC-103 | "Set up auto-restart cron every 6 hours" | createModule + addCronJob with "0 */6 * * *" |

### Test-Driven Implementation

**Unit tests (alongside implementation):**
- Provider SSE parsing: Mock SSE stream, verify parsed output structure
- Assertion helpers: Test custom JavaScript assertions in isolation

**Integration tests:**
- Provider → real server: Verify conversation creation and message flow
- Full eval run: Execute sample config, verify PromptFoo output format

**E2E tests (critical workflows):**
- TC-001 through TC-005 run successfully with fresh Takaro instance
- Comparison run between two experiments produces valid diff

### Rollout Plan

**Phase 1: Infrastructure Setup**
- Add promptfoo dependency
- Create evals/ directory structure
- Implement custom HTTP provider
- Verify provider works with single test case

**Phase 2: Core Test Cases**
- Implement TC-001 through TC-005 (tool correctness)
- Add cost/latency assertions
- Verify reproducibility (run 3x, check variance)

**Phase 3: Task Completion Tests**
- Implement TC-101 through TC-103
- Configure llm-rubric assertions
- Tune pass/fail thresholds

**Phase 4: CI Integration**
- Add eval workflow to CI
- Mark subset of tests with `ci: true`
- Configure failure notifications

## References

[1] [PromptFoo Introduction](https://www.promptfoo.dev/docs/intro/) - Official Documentation
   - Summary: Core concepts of PromptFoo evaluation framework
   - Key takeaway: Test-driven approach to LLM development with 5-step workflow

[2] [Evaluate Coding Agents Guide](https://www.promptfoo.dev/docs/guides/evaluate-coding-agents/) - Official Documentation
   - Summary: Specific guidance for evaluating agentic systems
   - Key takeaway: Agent evals test emergent behavior; non-determinism compounds

[3] [LLM Agent Evaluation Guide](https://www.confident-ai.com/blog/llm-agent-evaluation-complete-guide) - Confident AI, 2024
   - Summary: Comprehensive overview of agent evaluation approaches
   - Key takeaway: End-to-end vs component-level evaluation trade-offs

[4] [PromptFoo Configuration Reference](https://www.promptfoo.dev/docs/configuration/reference/) - Official Documentation
   - Summary: Complete YAML configuration options
   - Key takeaway: maxConcurrency, timeout, and repeat options for performance tuning

[5] [Semgrep PromptFoo Usage](https://semgrep.dev/blog/2024/does-your-llm-thing-work-how-we-use-promptfoo/) - Semgrep Engineering, 2024
   - Summary: Production use case of PromptFoo at scale
   - Key takeaway: ~1 minute per eval run; multi-layered assertion strategy

[6] [PromptFoo HTTP Provider](https://www.promptfoo.dev/docs/providers/http/) - Official Documentation
   - Summary: HTTP provider configuration for custom APIs
   - Key takeaway: transformResponse, authentication, and session management options

[7] [DeepEval Framework](https://github.com/confident-ai/deepeval) - GitHub
   - Summary: Python-based LLM evaluation framework
   - Key takeaway: Strong LLM-as-judge capabilities but Python-centric

[8] [PromptFoo GitHub](https://github.com/promptfoo/promptfoo) - Official Repository
   - Summary: Test prompts, agents, RAGs with CI/CD integration
   - Key takeaway: Battle-tested at companies like Shopify; A16Z funded

[9] [PromptFoo Custom JavaScript Provider](https://www.promptfoo.dev/docs/providers/custom-api/) - Official Documentation
   - Summary: How to create custom TypeScript/JavaScript providers
   - Key takeaway: callApi interface, ProviderResponse format, context access

[10] [Semgrep Assertion Strategy](https://semgrep.dev/blog/2024/does-your-llm-thing-work-how-we-use-promptfoo/) - Semgrep Engineering, 2024
   - Summary: Multi-layered assertions: deterministic → model-graded → domain-specific
   - Key takeaway: JavaScript for structure, llm-rubric for semantics

### Research Summary

**Recommended Patterns Applied:**
- Test-driven LLM development from [1]: Define test cases → configure → run → analyze
- Multi-layered assertions from [5][10]: Structural + semantic + operational
- HTTP provider pattern from [6][9]: Custom provider wrapping existing API

**Anti-Patterns Avoided:**
- Direct model testing per [2]: Focus on agent system behavior, not raw LLM output
- Over-reliance on string matching per [5]: Use llm-rubric for semantic quality
- Monolithic test files: Organize by category for maintainability

**Technologies Considered:**
- PromptFoo: Chosen for TypeScript native, CLI + library modes, CI-friendly [1][8]
- DeepEval [7]: Rejected due to Python focus; project is TypeScript
- Custom harness: Rejected to avoid reinventing wheel

**Standards Compliance:**
- PromptFoo assertion types follow established patterns [4]
- Cost tracking aligns with responsible AI practices [6]
- Reproducibility via seed/temperature control per [2]
