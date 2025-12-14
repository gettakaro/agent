export interface Conversation {
  id: string;
  agentId: string;
  agentVersion: string;
  userId?: string;
  title?: string;
  metadata: Record<string, unknown>;
  state: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationCreate {
  agentId: string;
  agentVersion: string;
  userId?: string;
  title?: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  toolExecutions?: unknown;
  tokenCount?: number;
  latencyMs?: number;
  createdAt: Date;
}

export interface MessageCreate {
  role: string;
  content: string;
  toolExecutions?: unknown;
}
