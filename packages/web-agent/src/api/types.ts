// API types matching backend responses

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Conversation {
  id: string;
  title: string;
  agentId: string;
  agentVersion: string;
  createdAt: string;
  updatedAt: string;
  state?: Record<string, unknown>;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolExecutions?: ToolExecution[];
  tokenUsage?: TokenUsage;
}

export interface ToolExecution {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result: {
    output?: unknown;
    error?: string;
    success: boolean;
  };
  startedAt?: string;
  durationMs?: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  experiment?: string;
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  tools: string[];
  knowledgeBases?: string[];
}

export interface CustomAgent {
  id: string;
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  tools: string[];
  knowledgeBases: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  version: string;
  documentCount: number;
  lastCommitSha?: string;
  lastSyncedAt?: string;
  refreshSchedule?: string;
  source?: string;
}

export interface Provider {
  id: string;
  name: string;
  connected: boolean;
}

// SSE Event types - must match backend StreamChunk types
export interface SSETextEvent {
  type: 'text';
  content: string;
}

export interface SSEToolUseEvent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface SSEToolResultEvent {
  type: 'tool_result';
  id: string;
  name: string;
  result: {
    output?: unknown;
    error?: string;
    success: boolean;
  };
  durationMs: number;
}

export interface SSEDoneEvent {
  type: 'done';
  tokenUsage: TokenUsage;
}

export interface SSEErrorEvent {
  type: 'error';
  error: string;
}

export type SSEEvent =
  | SSETextEvent
  | SSEToolUseEvent
  | SSEToolResultEvent
  | SSEDoneEvent
  | SSEErrorEvent;

// Custom agent management types
export interface AvailableTool {
  name: string;
  description: string;
}

export interface AvailableModel {
  id: string;
  name: string;
  provider: string;
}

// Knowledge base search result
export interface SearchResult {
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}
