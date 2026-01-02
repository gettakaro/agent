import { test, expect } from "@playwright/test";

/**
 * E2E tests for the chat conversation flow.
 *
 * These tests exercise the full React frontend UI with browser interactions.
 * The backend runs with USE_MOCK_PROVIDER=true for deterministic responses.
 *
 * Prerequisites:
 * - Docker services: `docker compose up -d postgres redis`
 * - Backend and frontend servers started by Playwright webServer config
 */

test.describe("Chat Conversation Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the conversations page
    await page.goto("/conversations");

    // Wait for the page to load
    await page.waitForLoadState("networkidle");
  });

  test("should display the chat interface", async ({ page }) => {
    // Verify sidebar is visible with "Conversations" heading
    await expect(page.getByRole("heading", { name: "Conversations" })).toBeVisible();

    // Verify "New" button is visible
    await expect(page.getByRole("button", { name: "New" })).toBeVisible();
  });

  test("should create a new conversation", async ({ page }) => {
    // Click the "New" button to open modal
    await page.getByRole("button", { name: "New" }).click();

    // Wait for modal dialog to appear
    await expect(page.getByRole("heading", { name: "New Conversation" })).toBeVisible();

    // Wait for agents to load (button becomes enabled when ready)
    const startButton = page.getByRole("button", { name: "Start Conversation" });
    await expect(startButton).toBeEnabled({ timeout: 10000 });

    // Click the "Start Conversation" button
    await startButton.click();

    // Wait for modal to close - the heading should no longer be visible
    await expect(page.getByRole("heading", { name: "New Conversation" })).not.toBeVisible({ timeout: 5000 });

    // Verify conversation is created - should see the chat input area
    await expect(page.getByPlaceholder("Type a message...")).toBeVisible();
  });

  test("should send a message and receive a response", async ({ page }) => {
    // First create a conversation
    await page.getByRole("button", { name: "New" }).click();

    // Wait for modal and agents to load
    await expect(page.getByRole("heading", { name: "New Conversation" })).toBeVisible();
    const startButton = page.getByRole("button", { name: "Start Conversation" });
    await expect(startButton).toBeEnabled({ timeout: 10000 });

    // Start the conversation
    await startButton.click();
    await expect(page.getByRole("heading", { name: "New Conversation" })).not.toBeVisible({ timeout: 5000 });

    // Type a message in the chat input
    const chatInput = page.getByPlaceholder("Type a message...");
    await expect(chatInput).toBeVisible();
    await chatInput.fill("Hello, can you help me?");

    // Click send button (the submit button in the form)
    await page.locator('form button[type="submit"]').click();

    // Wait for user message to appear
    await expect(page.getByText("Hello, can you help me?")).toBeVisible({ timeout: 10000 });

    // Wait for assistant response to appear (mock provider returns deterministic response)
    // The response contains "Hello" and greeting text - just verify any assistant message appeared
    // Use a more specific selector to avoid strict mode violations
    await expect(page.getByText(/I'd be happy to help|I'm here to help|How can I assist/i).first()).toBeVisible({
      timeout: 30000,
    });

    // Verify the input is re-enabled (streaming completed)
    await expect(chatInput).toBeEnabled({ timeout: 30000 });
  });

  test("should display conversation in sidebar after creation", async ({ page }) => {
    // Create a new conversation
    await page.getByRole("button", { name: "New" }).click();
    await expect(page.getByRole("heading", { name: "New Conversation" })).toBeVisible();
    const startButton = page.getByRole("button", { name: "Start Conversation" });
    await expect(startButton).toBeEnabled({ timeout: 10000 });

    // Start conversation
    await startButton.click();
    await expect(page.getByRole("heading", { name: "New Conversation" })).not.toBeVisible({ timeout: 5000 });

    // The conversation should now appear in the sidebar
    // Look for at least one conversation item with timestamp text
    const sidebar = page.locator("aside");
    await expect(sidebar.getByText(/ago|Just now/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("should allow typing with Enter to send", async ({ page }) => {
    // Create conversation first
    await page.getByRole("button", { name: "New" }).click();
    await expect(page.getByRole("heading", { name: "New Conversation" })).toBeVisible();
    const startButton = page.getByRole("button", { name: "Start Conversation" });
    await expect(startButton).toBeEnabled({ timeout: 10000 });
    await startButton.click();
    await expect(page.getByRole("heading", { name: "New Conversation" })).not.toBeVisible({ timeout: 5000 });

    // Type a message
    const chatInput = page.getByPlaceholder("Type a message...");
    await expect(chatInput).toBeVisible();
    await chatInput.fill("Testing Enter to send");

    // Press Enter to send
    await chatInput.press("Enter");

    // Verify message was sent (appears in chat)
    await expect(page.getByText("Testing Enter to send", { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("should support Shift+Enter for new line", async ({ page }) => {
    // Create conversation first
    await page.getByRole("button", { name: "New" }).click();
    await expect(page.getByRole("heading", { name: "New Conversation" })).toBeVisible();
    const startButton = page.getByRole("button", { name: "Start Conversation" });
    await expect(startButton).toBeEnabled({ timeout: 10000 });
    await startButton.click();
    await expect(page.getByRole("heading", { name: "New Conversation" })).not.toBeVisible({ timeout: 5000 });

    // Type with Shift+Enter
    const chatInput = page.getByPlaceholder("Type a message...");
    await expect(chatInput).toBeVisible();
    await chatInput.fill("Line 1");
    await chatInput.press("Shift+Enter");
    await chatInput.type("Line 2");

    // Verify textarea contains both lines (message not sent yet)
    const value = await chatInput.inputValue();
    expect(value).toContain("Line 1");
    expect(value).toContain("Line 2");
  });
});
