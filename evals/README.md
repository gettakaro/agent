# Takaro Agent Evaluation Suite

This directory contains the PromptFoo-based evaluation framework for testing Takaro agents (module-writer, player-moderator) against expected behavior.

## Prerequisites

### Required Services

1. **Running Takaro Agent Server**
   ```bash
   # Option 1: Docker (recommended)
   docker compose up

   # Option 2: Local Node.js
   docker compose up -d postgres redis
   npm run dev
   ```

   The server must be running at `http://localhost:3100` (configurable in `promptfooconfig.yaml`).

2. **Database Setup**
   ```bash
   # Run migrations (first time only)
   docker compose exec app npm run db:migrate
   # OR if running locally:
   npm run db:migrate
   ```

3. **Takaro API Credentials**

   Set environment variables for authentication:
   ```bash
   export TAKARO_USERNAME="your-service-account-username"
   export TAKARO_PASSWORD="your-service-account-password"
   export TAKARO_URL="https://api.takaro.io"  # or your instance URL
   ```

   For development, these can be in your `.env` file (already loaded by the app).

4. **OpenRouter API Key**
   ```bash
   export OPENROUTER_API_KEY="your-api-key"
   ```

   This is used by the agent to call LLM models during evaluation.

### Node.js Dependencies

```bash
npm install  # Installs promptfoo and other dependencies
```

## Usage

### Run Full Evaluation Suite

```bash
npm run eval
```

This will:
1. Load test cases from `test-cases/`
2. Execute prompts against the agent via HTTP
3. Display results in terminal
4. Open web UI for detailed analysis

### Run Specific Test Category

```bash
npm run eval -- --filter-pattern "Create"
```

Only test cases whose description matches the pattern will execute. Examples:
- `--filter-pattern "Create"` - Matches "TC-001: Create a module", "TC-002: Add a command", etc.
- `--filter-pattern "TC-001"` - Runs only TC-001
- `--filter-pattern "welcome"` - Matches "TC-101: Build a welcome module..."

### View Previous Results

```bash
npm run eval:view
```

Opens the PromptFoo web UI to browse past evaluation runs.

### CI Mode (Subset of Critical Tests)

```bash
npm run eval:ci
```

Runs only tests tagged with `ci: true` for faster PR validation.

**To tag a test for CI**, add metadata to the test case:

```yaml
- description: "TC-001: Create a module"
  metadata:
    ci: true  # This test will run in CI mode
  vars:
    prompt: "Create a module called TestModule"
  assert:
    # ... assertions
```

## Directory Structure

```
evals/
├── providers/
│   └── takaro-agent.ts         # Custom HTTP provider for agent API
├── test-cases/
│   ├── module-writer/
│   │   ├── tool-correctness.yaml   # Tool selection tests
│   │   └── task-completion.yaml    # End-to-end workflows
│   └── shared/
│       └── assertions.yaml     # Reusable assertion definitions
├── promptfooconfig.yaml        # Main configuration
└── README.md                   # This file
```

## Configuration

### Changing Agent or Experiment

Edit `promptfooconfig.yaml`:

```yaml
providers:
  - id: file://providers/takaro-agent.ts
    config:
      baseUrl: http://localhost:3100
      agentId: module-writer/grok-fast  # Change experiment here
```

### Testing Multiple Experiments

Compare experiments side-by-side:

```yaml
providers:
  - id: file://providers/takaro-agent.ts
    label: grok-fast
    config:
      baseUrl: http://localhost:3100
      agentId: module-writer/grok-fast

  - id: file://providers/takaro-agent.ts
    label: concise
    config:
      baseUrl: http://localhost:3100
      agentId: module-writer/concise
```

Run `npm run eval` to see performance differences in the web UI.

## Writing Test Cases

### Basic Structure

```yaml
tests:
  - description: "Create a module called Economy"
    vars:
      prompt: "Create a module called 'Economy'"
    assert:
      - type: javascript
        value: |
          const metadata = context.providerResponse?.metadata || {};
          const toolCalls = metadata.toolCalls || [];
          return toolCalls.some(
            t => t.name === 'createModule' &&
                 t.input.name === 'Economy'
          );
      - type: contains
        value: "created successfully"
```

### Available Assertions

**Structural (fast, deterministic):**
- `contains`: Check for expected strings in output
- `javascript`: Validate tool call structure and sequence
- `json-schema`: Ensure output format compliance

**Semantic (LLM-graded):**
- `llm-rubric`: Evaluate response quality and correctness
- `factuality`: Compare against expected outcomes

**Operational:**
- `cost`: Alert if token usage exceeds threshold
- `latency`: Fail if response time > threshold

### Accessing Tool Calls

The custom provider exposes tool execution data via `context.providerResponse.metadata`:

```javascript
// Access metadata
const metadata = context.providerResponse?.metadata || {};
const toolCalls = metadata.toolCalls || [];
const toolResults = metadata.toolResults || [];

// Check which tools were called
toolCalls.map(t => t.name)

// Validate tool input
toolCalls.find(t => t.name === 'createModule')?.input.name

// Check tool results
toolResults.some(r => r.success)

// Get conversation ID for debugging
metadata.conversationId
```

## Debugging Failed Tests

### 1. Check SSE Stream Output

When a test fails, look for the real-time SSE events in the eval output to see:
- Which tools were called
- Tool execution success/failure
- Error messages
- Full text response

### 2. Inspect Conversation via API

```bash
# Get conversation ID from test metadata
# Look for lines like: "conversationId": "conv_abc123" in test output
CONV_ID="conv_abc123"

# Retrieve full conversation
curl http://localhost:3100/api/conversations/$CONV_ID/messages | jq .
```

The conversation ID appears in the test metadata output. When a test completes, PromptFoo displays the provider response metadata which includes the conversation ID for debugging.

### 3. Run Test Case Manually

```bash
# Create conversation
CONV_ID=$(curl -s -X POST http://localhost:3100/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"agentId": "module-writer"}' | jq -r '.data.id')

# Send test prompt
curl -N -X POST http://localhost:3100/api/conversations/$CONV_ID/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "Create a module called TestModule"}'
```

### 4. Check Server Logs

```bash
# Docker
docker compose logs -f app

# Local
# See output in terminal running npm run dev
```

## Troubleshooting

### "Connection refused" errors

- Ensure server is running: `curl http://localhost:3100/health`
- Check port in `promptfooconfig.yaml` matches server port

### "Authentication failed" errors

- Verify `TAKARO_USERNAME` and `TAKARO_PASSWORD` are set
- Check credentials work: `curl http://localhost:3100/api/conversations`

### "Timeout" errors

- Increase timeout in `promptfooconfig.yaml` → `defaultTest.options.timeout`
- Agent may be slow if LLM provider is rate-limited

### Tool execution failures

- Check Takaro API is accessible from agent server
- Verify service account has necessary permissions
- Look for error details in conversation messages

## Performance Notes

- **Eval suite runtime**: Target < 5 minutes for core test cases
- **LLM costs**: Track via PromptFoo cost assertions or OpenRouter dashboard
- **Reproducibility**: Same test may have minor variance due to LLM non-determinism
  - Run multiple times (`--repeat 3`) to check stability
  - Use temperature=0 in agent config for more determinism

## CI Integration

Example GitHub Actions workflow:

```yaml
- name: Run agent evaluations
  run: npm run eval:ci
  env:
    TAKARO_USERNAME: ${{ secrets.TAKARO_TEST_USER }}
    TAKARO_PASSWORD: ${{ secrets.TAKARO_TEST_PASS }}
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_KEY }}
```

Mark critical tests with `ci: true` tag in test case YAML to include in CI runs.

## References

- [PromptFoo Documentation](https://www.promptfoo.dev/docs/intro/)
- [Evaluate Coding Agents Guide](https://www.promptfoo.dev/docs/guides/evaluate-coding-agents/)
- [Design Document](../docs/design/2026-01-01-promptfoo-agent-eval/design.md)
