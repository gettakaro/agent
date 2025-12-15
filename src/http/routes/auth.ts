import { Router, Response } from 'express';
import {
  generatePKCEChallenge,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
} from '../../auth/claude-oauth.js';
import { ClaudeTokenService } from '../../auth/claude-token.service.js';
import { ApiKeyService } from '../../auth/api-key.service.js';
import { storePKCEVerifier, getPKCEVerifier } from '../../redis/client.js';
import {
  authMiddleware,
  type AuthenticatedRequest,
} from '../middleware/auth.js';
import { config } from '../../config.js';

const router = Router();
const claudeTokenService = new ClaudeTokenService();
const apiKeyService = new ApiKeyService();

// Initiate Claude OAuth flow
router.get('/claude', authMiddleware({ redirect: false }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { codeVerifier, codeChallenge, state } = generatePKCEChallenge();

    // Store verifier in Redis with state as key
    await storePKCEVerifier(state, codeVerifier);

    const authUrl = buildAuthorizationUrl(state, codeChallenge);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Failed to initiate Claude OAuth:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth flow' });
  }
});

// OAuth callback
router.get('/claude/callback', authMiddleware({ redirect: false }), async (req: AuthenticatedRequest, res: Response) => {
  const { code, state, error, error_description } = req.query;

  // Redirect to settings page after OAuth
  const baseUrl = config.appBaseUrl || `http://localhost:${config.port}`;
  const settingsUrl = `${baseUrl}/settings`;

  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.redirect(`${settingsUrl}?claude_auth=error&message=${encodeURIComponent(String(error_description || error))}`);
  }

  if (!code || !state) {
    return res.redirect(`${settingsUrl}?claude_auth=error&message=${encodeURIComponent('Missing code or state')}`);
  }

  try {
    // Retrieve and delete the PKCE verifier
    const codeVerifier = await getPKCEVerifier(String(state));

    if (!codeVerifier) {
      return res.redirect(`${settingsUrl}?claude_auth=error&message=${encodeURIComponent('Invalid or expired state')}`);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(String(code), codeVerifier);

    // Store tokens for the user
    await claudeTokenService.saveToken(req.user!.id, tokens);

    res.redirect(`${settingsUrl}?claude_auth=success`);
  } catch (error) {
    console.error('OAuth callback failed:', error);
    res.redirect(`${settingsUrl}?claude_auth=error&message=${encodeURIComponent('Token exchange failed')}`);
  }
});

// Disconnect Claude account
router.delete('/claude', authMiddleware({ redirect: false }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await claudeTokenService.deleteToken(req.user!.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to disconnect Claude:', error);
    res.status(500).json({ error: 'Failed to disconnect Claude account' });
  }
});

// Save OpenRouter API key
router.post('/openrouter', authMiddleware({ redirect: false }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string') {
      res.status(400).json({ error: 'apiKey is required' });
      return;
    }

    await apiKeyService.saveApiKey(req.user!.id, 'openrouter', apiKey);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save OpenRouter key:', error);
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

// Delete OpenRouter API key
router.delete('/openrouter', authMiddleware({ redirect: false }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await apiKeyService.deleteApiKey(req.user!.id, 'openrouter');
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete OpenRouter key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// Check all provider connection statuses
router.get('/status', authMiddleware({ redirect: false }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const hasOpenRouter = await apiKeyService.hasApiKey(req.user!.id, 'openrouter');
    const hasClaude = await claudeTokenService.hasToken(req.user!.id);

    res.json({
      providers: {
        openrouter: { connected: hasOpenRouter },
        claude: { connected: hasClaude },
      },
      hasAnyProvider: hasOpenRouter || hasClaude,
    });
  } catch (error) {
    console.error('Failed to check auth status:', error);
    res.status(500).json({ error: 'Failed to check auth status' });
  }
});

export default router;
