import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ConversationService } from '../../conversations/service.js';
import { agentRegistry } from '../../agents/registry.js';
import type { StreamChunk } from '../../agents/types.js';

const router = Router();
const conversationService = new ConversationService();

// List conversations
router.get('/', async (_req: Request, res: Response) => {
  try {
    const conversations = await conversationService.list();
    res.json({ data: conversations });
  } catch (error) {
    console.error('Error listing conversations:', error);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

// Create conversation
router.post('/', async (req: Request, res: Response) => {
  try {
    const { agentId, agentVersion, userId, initialMessage } = req.body;

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

    const conversation = await conversationService.create({
      agentId,
      agentVersion: version,
      userId,
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
      const context = {
        conversationId: conversation.id,
        agentId,
        agentVersion: version,
        state: conversation.state || {},
      };

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
    console.error('Error creating conversation:', error);
    const message = error instanceof Error ? error.message : 'Failed to create conversation';
    res.status(500).json({ error: message });
  }
});

// Get conversation
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const conversation = await conversationService.get(req.params['id']!);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json({ data: conversation });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Delete conversation
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await conversationService.delete(req.params['id']!);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Get messages
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const messages = await conversationService.getMessages(req.params['id']!);
    res.json({ data: messages });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send message (SSE streaming response)
router.post('/:id/messages', async (req: Request, res: Response) => {
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
    const context = {
      conversationId,
      agentId: conversation.agentId,
      agentVersion: conversation.agentVersion,
      state: conversation.state || {},
    };

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
    console.error('Error processing message:', error);
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
