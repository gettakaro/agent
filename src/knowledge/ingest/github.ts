import { config } from '../../config.js';

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

export interface GitHubFile {
  path: string;
  name: string;
  content: string;
}

/**
 * Parse a GitHub URL to extract owner, repo, branch, and path.
 *
 * @example
 * parseGitHubUrl('https://github.com/gettakaro/takaro/tree/development/packages/web-docs/docs')
 * // → { owner: 'gettakaro', repo: 'takaro', branch: 'development', path: 'packages/web-docs/docs' }
 */
export function parseGitHubUrl(url: string): ParsedGitHubUrl {
  // Handle both full URLs and shorthand
  // Full: https://github.com/owner/repo/tree/branch/path/to/dir
  // Raw: https://raw.githubusercontent.com/owner/repo/branch/path/to/file

  const urlObj = new URL(url);

  if (
    urlObj.hostname !== 'github.com' &&
    urlObj.hostname !== 'raw.githubusercontent.com'
  ) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }

  const pathParts = urlObj.pathname.split('/').filter(Boolean);

  if (pathParts.length < 2) {
    throw new Error(`Invalid GitHub URL: ${url}`);
  }

  const owner = pathParts[0]!;
  const repo = pathParts[1]!;

  // For github.com URLs with /tree/branch/path
  if (pathParts[2] === 'tree' && pathParts.length >= 4) {
    const branch = pathParts[3]!;
    const path = pathParts.slice(4).join('/');
    return { owner, repo, branch, path };
  }

  // For github.com URLs with /blob/branch/path (single file)
  if (pathParts[2] === 'blob' && pathParts.length >= 4) {
    const branch = pathParts[3]!;
    const path = pathParts.slice(4).join('/');
    return { owner, repo, branch, path };
  }

  // Default to main branch and root path
  return { owner, repo, branch: 'main', path: '' };
}

/**
 * Fetch the contents of a directory from GitHub recursively.
 * Returns all files matching the given extensions.
 * WARNING: This loads all file contents into memory - use listGitHubFiles() for large directories.
 */
export async function fetchGitHubDirectory(
  parsed: ParsedGitHubUrl,
  options: { extensions?: string[] } = {}
): Promise<GitHubFile[]> {
  const { extensions = ['.md', '.txt'] } = options;

  const files: GitHubFile[] = [];
  await fetchDirectoryRecursive(parsed, parsed.path, extensions, files);
  return files;
}

/**
 * List files in a GitHub directory recursively.
 * Returns only file paths (no content) - memory efficient for large directories.
 */
export async function listGitHubFiles(
  parsed: ParsedGitHubUrl,
  options: { extensions?: string[] } = {}
): Promise<string[]> {
  const { extensions = ['.md', '.txt'] } = options;
  const filePaths: string[] = [];
  await listFilesRecursive(parsed, parsed.path, extensions, filePaths);
  return filePaths;
}

async function listFilesRecursive(
  parsed: ParsedGitHubUrl,
  currentPath: string,
  extensions: string[],
  filePaths: string[]
): Promise<void> {
  const { owner, repo, branch } = parsed;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${currentPath}?ref=${branch}`;

  const response = await fetch(apiUrl, { headers: getGitHubHeaders() });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const contents = (await response.json()) as GitHubContent[];

  for (const item of contents) {
    if (item.type === 'dir') {
      await listFilesRecursive(parsed, item.path, extensions, filePaths);
    } else if (item.type === 'file') {
      const matchesExt = extensions.some((ext) =>
        item.name.toLowerCase().endsWith(ext.toLowerCase())
      );
      if (matchesExt) {
        filePaths.push(item.path);
      }
    }
  }
}

async function fetchDirectoryRecursive(
  parsed: ParsedGitHubUrl,
  currentPath: string,
  extensions: string[],
  files: GitHubFile[]
): Promise<void> {
  const { owner, repo, branch } = parsed;

  // Use GitHub Contents API to list directory
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${currentPath}?ref=${branch}`;

  const response = await fetch(apiUrl, { headers: getGitHubHeaders() });

  if (!response.ok) {
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`
    );
  }

  const contents = (await response.json()) as GitHubContent[];

  for (const item of contents) {
    if (item.type === 'dir') {
      // Recursively fetch subdirectory
      await fetchDirectoryRecursive(parsed, item.path, extensions, files);
    } else if (item.type === 'file') {
      // Check if file matches extensions
      const matchesExt = extensions.some((ext) =>
        item.name.toLowerCase().endsWith(ext.toLowerCase())
      );
      if (matchesExt) {
        // Fetch file content
        const content = await fetchFileContentInternal(parsed, item.path);
        files.push({
          path: item.path,
          name: item.name,
          content,
        });
      }
    }
  }
}

interface GitHubContent {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  download_url?: string;
}

/**
 * Fetch content of a single file from GitHub.
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<string> {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;

  const response = await fetch(rawUrl, { headers: getGitHubHeaders() });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch file ${filePath}: ${response.status} ${response.statusText}`
    );
  }

  return response.text();
}

// Internal version for directory fetching
async function fetchFileContentInternal(
  parsed: ParsedGitHubUrl,
  filePath: string
): Promise<string> {
  return fetchFileContent(parsed.owner, parsed.repo, parsed.branch, filePath);
}

/**
 * Get common GitHub API headers.
 */
function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'takaro-agent',
  };

  const githubToken = process.env['GITHUB_TOKEN'];
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }

  return headers;
}

/**
 * Get the latest commit SHA for a path in a repository.
 * Used to check if updates are needed.
 */
export async function getLatestCommitSha(
  owner: string,
  repo: string,
  branch: string,
  path?: string
): Promise<string> {
  const url = new URL(
    `https://api.github.com/repos/${owner}/${repo}/commits`
  );
  url.searchParams.set('sha', branch);
  if (path) {
    url.searchParams.set('path', path);
  }
  url.searchParams.set('per_page', '1');

  const response = await fetch(url.toString(), { headers: getGitHubHeaders() });

  if (!response.ok) {
    throw new Error(
      `Failed to get commits: ${response.status} ${response.statusText}`
    );
  }

  const commits = (await response.json()) as Array<{ sha: string }>;

  if (commits.length === 0) {
    throw new Error(`No commits found for ${owner}/${repo}/${branch}/${path || ''}`);
  }

  return commits[0]!.sha;
}

export interface ChangedFiles {
  added: string[];
  modified: string[];
  removed: string[];
}

/**
 * Get files changed between two commits.
 * Used for incremental sync.
 */
export async function getChangedFiles(
  owner: string,
  repo: string,
  baseSha: string,
  headSha: string,
  pathPrefix?: string
): Promise<ChangedFiles> {
  const url = `https://api.github.com/repos/${owner}/${repo}/compare/${baseSha}...${headSha}`;

  const response = await fetch(url, { headers: getGitHubHeaders() });

  if (!response.ok) {
    throw new Error(
      `Failed to compare commits: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    files: Array<{
      filename: string;
      status: 'added' | 'modified' | 'removed' | 'renamed' | 'copied' | 'changed' | 'unchanged';
    }>;
  };

  const result: ChangedFiles = { added: [], modified: [], removed: [] };

  for (const file of data.files || []) {
    // Filter to only files under pathPrefix if specified
    if (pathPrefix && !file.filename.startsWith(pathPrefix)) {
      continue;
    }

    switch (file.status) {
      case 'added':
      case 'copied':
        result.added.push(file.filename);
        break;
      case 'modified':
      case 'changed':
      case 'renamed':
        result.modified.push(file.filename);
        break;
      case 'removed':
        result.removed.push(file.filename);
        break;
    }
  }

  return result;
}
