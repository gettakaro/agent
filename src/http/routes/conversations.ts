import { Router, Response } from 'express';
import { ConversationService } from '../../conversations/service.js';
import { agentRegistry } from '../../agents/registry.js';
import {
  authMiddleware,
  AuthenticatedRequest,
} from '../middleware/auth.js';
import type { StreamChunk, LLMProvider, ToolContext } from '../../agents/types.js';
import { formatError } from '../../utils/formatError.js';
import { ClaudeTokenService } from '../../auth/claude-token.service.js';
import { ApiKeyService } from '../../auth/api-key.service.js';

const router = Router();
const conversationService = new ConversationService();
const claudeTokenService = new ClaudeTokenService();
const apiKeyService = new ApiKeyService();

interface ProviderStatus {
  providers: {
    openrouter: { connected: boolean };
    claude: { connected: boolean };
  };
  hasAnyProvider: boolean;
}

async function getProviderStatus(userId: string): Promise<ProviderStatus> {
  const hasOpenRouter = await apiKeyService.hasApiKey(userId, 'openrouter');
  const hasClaude = await claudeTokenService.hasToken(userId);
  return {
    providers: {
      openrouter: { connected: hasOpenRouter },
      claude: { connected: hasClaude },
    },
    hasAnyProvider: hasOpenRouter || hasClaude,
  };
}

// Apply auth middleware to all API routes
router.use(authMiddleware({ redirect: false }));

// List conversations
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversations = await conversationService.listByUserId(req.user!.id);
    res.json({ data: conversations });
  } catch (error) {
    console.error('Error listing conversations:', formatError(error));
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// Helper to build context with provider info
async function buildContext(
  req: AuthenticatedRequest,
  conversationId: string,
  agentId: string,
  agentVersion: string,
  state: Record<string, unknown>,
  provider: LLMProvider
): Promise<ToolContext> {
  const context: ToolContext = {
    conversationId,
    agentId,
    agentVersion,
    state,
    userId: req.user!.id,
    takaroClient: req.takaroClient,
    provider,
  };

  // Fetch credentials based on provider
  if (provider === 'anthropic') {
    const claudeToken = await claudeTokenService.getTokenForUser(req.user!.id);
    if (claudeToken) {
      context.anthropicAccessToken = claudeToken.accessToken;
    }
  } else if (provider === 'openrouter') {
    const apiKey = await apiKeyService.getApiKey(req.user!.id, 'openrouter');
    if (apiKey) {
      context.openrouterApiKey = apiKey;
    }
  }

  return context;
}

// Create conversation
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { agentId, agentVersion, initialMessage, provider } = req.body;

    if (!agentId) {
      res.status(400).json({ error: 'agentId is required' });
      return;
    }

    const factory = agentRegistry.getFactory(agentId);
    if (!factory) {
      res.status(400).json({ error: `Unknown agent: ${agentId}` });
      return;
    }

    const version = agentVersion || factory.getDefaultVersion();
    if (!factory.listVersions().includes(version)) {
      res.status(400).json({ error: `Unknown version: ${version}` });
      return;
    }

    // Check user has at least one provider configured
    const status = await getProviderStatus(req.user!.id);
    if (!status.hasAnyProvider) {
      res.status(400).json({
        error: 'No API credentials configured. Please add your OpenRouter key or connect Claude.',
        code: 'NO_CREDENTIALS',
      });
      return;
    }

    // Determine provider to use
    let selectedProvider: LLMProvider;
    if (provider === 'anthropic' || provider === 'openrouter') {
      selectedProvider = provider;
    } else if (!provider) {
      // Auto-select if only one available
      if (status.providers.openrouter.connected && !status.providers.claude.connected) {
        selectedProvider = 'openrouter';
      } else if (status.providers.claude.connected && !status.providers.openrouter.connected) {
        selectedProvider = 'anthropic';
      } else {
        // Both available, require explicit selection
        res.status(400).json({
          error: 'Multiple providers available. Please specify provider.',
          code: 'PROVIDER_REQUIRED',
        });
        return;
      }
    } else {
      res.status(400).json({
        error: 'Invalid provider. Must be "openrouter" or "anthropic".',
        code: 'INVALID_PROVIDER',
      });
      return;
    }

    // Validate selected provider is connected
    if (selectedProvider === 'openrouter' && !status.providers.openrouter.connected) {
      res.status(400).json({
        error: 'OpenRouter not configured. Please add your API key.',
        code: 'PROVIDER_NOT_CONFIGURED',
      });
      return;
    }
    if (selectedProvider === 'anthropic' && !status.providers.claude.connected) {
      res.status(400).json({
        error: 'Claude not connected. Please connect your Claude account.',
        code: 'PROVIDER_NOT_CONFIGURED',
      });
      return;
    }

    const conversation = await conversationService.create({
      agentId,
      agentVersion: version,
      userId: req.user!.id,
      provider: selectedProvider,
    });

    // If initial message provided, process it
    if (initialMessage) {
      await conversationService.addMessage(conversation.id, {
        role: 'user',
        content: initialMessage,
      });

      // Process with agent (non-streaming for initial message)
      const agent = factory.createAgent(version);
      const messages = await conversationService.getMessages(conversation.id);
      const context = await buildContext(
        req,
        conversation.id,
        agentId,
        version,
        conversation.state || {},
        conversation.provider
      );

      const response = await agent.chat(messages, context);

      // Store assistant response
      for (const msg of response.messages) {
        await conversationService.addMessage(conversation.id, msg, {
          tokenCount:
            msg.role === 'assistant'
              ? response.usage.outputTokens
              : response.usage.inputTokens,
          latencyMs: response.latencyMs,
        });
      }

      // Update conversation state
      await conversationService.updateState(conversation.id, context.state);

      const updatedConversation = await conversationService.get(conversation.id);
      const allMessages = await conversationService.getMessages(conversation.id);

      res.json({
        data: updatedConversation,
        messages: allMessages,
      });
      return;
    }

    res.json({ data: conversation });
  } catch (error) {
    console.error('Error creating conversation:', formatError(error));
    const message = error instanceof Error ? error.message : 'Failed to create conversation';
    res.status(500).json({ error: message });
  }
});

// Get conversation
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversation = await conversationService.get(req.params['id']!);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // Check ownership
    if (conversation.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ data: conversation });
  } catch (error) {
    console.error('Error getting conversation:', formatError(error));
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Delete conversation
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversation = await conversationService.get(req.params['id']!);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // Check ownership
    if (conversation.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await conversationService.delete(req.params['id']!);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', formatError(error));
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Get messages
router.get('/:id/messages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversation = await conversationService.get(req.params['id']!);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // Check ownership
    if (conversation.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const messages = await conversationService.getMessages(req.params['id']!);
    res.json({ data: messages });
  } catch (error) {
    console.error('Error getting messages:', formatError(error));
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send message (SSE streaming response)
router.post('/:id/messages', async (req: AuthenticatedRequest, res: Response) => {
  const conversationId = req.params['id']!;
  const { content } = req.body;

  if (!content) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  let sseStarted = false;

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const conversation = await conversationService.get(conversationId);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }

    // Check ownership
    if (conversation.userId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const factory = agentRegistry.getFactory(conversation.agentId);
    if (!factory) {
      res.status(500).json({ error: 'Agent not found' });
      return;
    }

    // Store user message
    await conversationService.addMessage(conversationId, {
      role: 'user',
      content,
    });

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    sseStarted = true;

    // Process with agent
    const agent = factory.createAgent(conversation.agentVersion);
    const messages = await conversationService.getMessages(conversationId);
    const context = await buildContext(
      req,
      conversationId,
      conversation.agentId,
      conversation.agentVersion,
      conversation.state || {},
      conversation.provider
    );

    const onChunk = (chunk: StreamChunk) => {
      sendEvent(chunk.type, chunk);
    };

    const startTime = Date.now();
    const response = await agent.chat(messages, context, onChunk);
    const latencyMs = Date.now() - startTime;

    // Store assistant response
    for (const msg of response.messages) {
      await conversationService.addMessage(conversationId, msg, {
        tokenCount:
          msg.role === 'assistant'
            ? response.usage.outputTokens
            : response.usage.inputTokens,
        latencyMs,
      });
    }

    // Update conversation state
    await conversationService.updateState(conversationId, context.state);

    res.end();
  } catch (error) {
    console.error('Error processing message:', formatError(error));
    const message = error instanceof Error ? error.message : 'Failed to process message';

    if (sseStarted) {
      // Send error through SSE
      sendEvent('error', { error: message });
      res.end();
    } else {
      res.status(500).json({ error: message });
    }
  }
});

export { router as conversationRoutes };
