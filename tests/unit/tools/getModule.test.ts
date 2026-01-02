import { describe, it } from "node:test";
import assert from "node:assert";
import { getModule } from "../../../src/agents/module-writer/tools/module/getModule.js";
import { createMockModule, createMockToolContext, createMockToolContextWithClient } from "../../fixtures/test-data.js";

describe("getModule tool", () => {
  it("should return module data when moduleId is valid", async () => {
    // Arrange
    const mockModule = createMockModule({
      id: "mod_abc123",
      name: "my-test-module",
    });
    const context = createMockToolContextWithClient(mockModule);

    // Act
    const result = await getModule.execute({ moduleId: "mod_abc123" }, context);

    // Assert
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.error, undefined);

    const output = result.output as {
      id: string;
      name: string;
      builtin: boolean;
      latestVersion: {
        id: string;
        commands: Array<{ id: string; name: string }>;
        hooks: Array<{ id: string; name: string }>;
        cronJobs: Array<{ id: string; name: string }>;
        functions: Array<{ id: string; name: string }>;
      };
    };

    assert.strictEqual(output.id, "mod_abc123");
    assert.strictEqual(output.name, "my-test-module");
    assert.strictEqual(output.builtin, false);
    assert.ok(output.latestVersion);
    assert.ok(Array.isArray(output.latestVersion.commands));
    assert.ok(Array.isArray(output.latestVersion.hooks));
    assert.ok(Array.isArray(output.latestVersion.cronJobs));
    assert.ok(Array.isArray(output.latestVersion.functions));
  });

  it("should return error when takaroClient is missing", async () => {
    // Arrange - context without takaroClient
    const context = createMockToolContext();

    // Act
    const result = await getModule.execute({ moduleId: "mod_123" }, context);

    // Assert
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.output, null);
    assert.strictEqual(result.error, "No Takaro client available");
  });

  it("should propagate API errors", async () => {
    // Arrange - client that throws on module lookup
    const context = createMockToolContextWithClient(undefined); // No module = throws error

    // Act & Assert
    await assert.rejects(async () => {
      await getModule.execute({ moduleId: "nonexistent_module" }, context);
    }, /Module not found/);
  });

  it("should correctly transform module components", async () => {
    // Arrange
    const mockModule = createMockModule({
      latestVersion: {
        id: "ver_789",
        description: "Test version",
        configSchema: "{}",
        uiSchema: "{}",
        commands: [
          { id: "cmd_1", name: "cmd1", trigger: "!cmd1", helpText: "First command" },
          { id: "cmd_2", name: "cmd2", trigger: "!cmd2", helpText: "Second command" },
        ],
        hooks: [{ id: "hook_1", name: "hook1", eventType: "chat-message", regex: "hello" }],
        cronJobs: [],
        functions: [{ id: "fn_1", name: "func1" }],
      },
    });
    const context = createMockToolContextWithClient(mockModule);

    // Act
    const result = await getModule.execute({ moduleId: "mod_123" }, context);

    // Assert
    assert.strictEqual(result.success, true);
    const output = result.output as {
      latestVersion: {
        commands: Array<{ id: string; name: string; trigger: string; helpText: string }>;
        hooks: Array<{ id: string; name: string; eventType: string; regex: string }>;
        cronJobs: Array<{ id: string }>;
        functions: Array<{ id: string; name: string }>;
      };
    };

    // Verify commands are transformed correctly
    assert.strictEqual(output.latestVersion.commands.length, 2);
    assert.strictEqual(output.latestVersion.commands[0].trigger, "!cmd1");

    // Verify hooks are transformed correctly
    assert.strictEqual(output.latestVersion.hooks.length, 1);
    assert.strictEqual(output.latestVersion.hooks[0].eventType, "chat-message");

    // Verify empty cronJobs array
    assert.strictEqual(output.latestVersion.cronJobs.length, 0);

    // Verify functions are transformed correctly
    assert.strictEqual(output.latestVersion.functions.length, 1);
    assert.strictEqual(output.latestVersion.functions[0].name, "func1");
  });
});
