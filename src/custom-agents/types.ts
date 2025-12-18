export interface CustomAgent {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  tools: string[];
  knowledgeBases: string[];
  model: string;
  temperature: number;
  maxTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomAgentCreate {
  name: string;
  description?: string;
  systemPrompt: string;
  tools: string[];
  knowledgeBases: string[];
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CustomAgentUpdate {
  name?: string;
  description?: string;
  systemPrompt?: string;
  tools?: string[];
  knowledgeBases?: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
