# Design: RAG Architecture Redesign

## Layer 1: Problem & Requirements

### Problem Statement

The current RAG (Retrieval-Augmented Generation) implementation in the Takaro agent suffers from poor retrieval quality. Agents frequently fail to find relevant documentation, leading to incomplete or incorrect responses when users ask about Takaro features, module development, or API usage.

Modern RAG systems require hybrid search combining semantic and keyword matching [1], multi-stage retrieval with reranking [2], and contextual document chunking [3]. The current implementation uses only pure vector search with minimal metadata, missing these established best practices that can improve retrieval precision by 15-48% [1][2].

### Current State

The existing implementation (`src/knowledge/`) has these limitations:

**Pure Vector Search Only** (`src/knowledge/vectorStore.ts:19-55`)
- Uses pgvector cosine similarity without keyword matching
- Misses exact term matches (API names like `moduleControllerCreate`)
- No reranking pass to refine initial results

**Minimal Chunk Context** (`src/knowledge/ingest/chunker.ts`)
- 1000 character chunks with 200 character overlap
- Metadata only includes: `sourceFile`, `chunkIndex`, `totalChunks`
- No document title, section headers, or hierarchical context
- Research shows appending document-level context improves accuracy from ~55% to 72-75% [4]

**Single Search Mode**
- No flexibility for speed vs accuracy tradeoffs
- Background tasks and real-time queries use identical retrieval
- No agentic multi-step search for complex queries

**Fixed Tool Interface** (`src/knowledge/takaro-docs/index.ts`)
- Single `searchTakaroDocs` tool with no thoroughness options
- Agent cannot choose between fast/thorough search strategies

### Requirements

#### Functional

- REQ-001: The system SHALL support three retrieval modes: fast (<200ms), balanced (<500ms), thorough (<2s)
- REQ-002: WHEN a query contains exact terms (API names, config keys) THEN keyword search SHALL contribute to results
- REQ-003: The system SHALL combine vector and keyword results using Reciprocal Rank Fusion [5]
- REQ-004: WHEN thoroughness='thorough' THEN results SHALL be reranked using LLM-based relevance scoring
- REQ-005: The system SHALL preserve document structure (title, section path) in chunk metadata
- REQ-006: Agents SHALL have access to a `researchTopic` tool for multi-step agentic retrieval
- REQ-007: The system SHALL support parallel sub-query execution for agentic search

#### Non-Functional

- **Performance**: Fast mode <200ms, balanced <500ms, thorough <2s latency [1]
- **Accuracy**: Hybrid search should improve Hit Rate by 8-15% over pure vector [1]
- **Self-hosted**: No external API dependencies beyond existing OpenRouter (for reranking)
- **Backward Compatible**: Existing KB factory pattern preserved

### Constraints

- Must use PostgreSQL (pgvector + tsvector) - no additional databases
- Must use existing OpenRouter API for LLM-based reranking
- Must maintain compatibility with existing agent tool interface
- Must support incremental document sync (existing BullMQ jobs)

### Success Criteria

1. Queries for specific API names (e.g., "moduleControllerCreate") return relevant documentation
2. Complex queries ("how do hooks work with commands") find comprehensive results
3. Latency targets met for each thoroughness level
4. All existing knowledge base tests continue to pass

## Layer 2: Functional Specification

### User Workflows

#### 1. Real-time User Query (Fast/Balanced)

```
User asks question → Agent receives query
                  → Agent calls searchDocs(query, thoroughness='balanced')
                  → Hybrid search: vector + BM25 in parallel
                  → RRF fusion combines results
                  → Top 5 results returned to agent
                  → Agent generates response with citations
```

#### 2. Background Research (Thorough)

```
Background task needs context → Agent calls searchDocs(query, thoroughness='thorough')
                             → Hybrid search retrieves 20 candidates
                             → LLM reranks candidates for relevance
                             → Top 5 reranked results returned
                             → Agent uses high-quality context
```

#### 3. Complex Topic Research (Agentic)

```
Complex question → Agent calls researchTopic(topic, maxIterations=3)
               → LLM breaks topic into 2-4 sub-queries
               → Each sub-query searched with thoroughness='thorough'
               → Results deduplicated and combined
               → IF insufficient: reformulate query and retry
               → Comprehensive findings returned
```

### External Interfaces

#### Search Tool Interface

```
searchDocs(
  query: string,           // Required: search query
  thoroughness?: string,   // Optional: 'fast' | 'balanced' | 'thorough'
  limit?: number          // Optional: 1-20, default 5
) → {
  results: [{
    content: string,
    source: string,        // File path
    section: string,       // Section hierarchy (e.g., "Modules > Hooks")
    relevance: string      // Percentage score
  }]
}
```

#### Research Tool Interface

```
researchTopic(
  topic: string,           // Required: research topic
  maxIterations?: number   // Optional: 1-5, default 3
) → {
  topic: string,
  searchesPerformed: number,
  findings: [{
    content: string,
    source: string,
    section: string
  }]
}
```

#### REST API Extension

```
GET /knowledge/:kbId/search?q=<query>&thoroughness=<mode>&limit=<n>
```

### Alternatives Considered

| Option | Pros | Cons | Why Not Chosen |
|--------|------|------|----------------|
| External RAG service (RAGFlow) | Full-featured, maintained | 16GB RAM overhead, 4 extra containers, no GitHub sync | Over-engineered for markdown docs |
| Cohere Rerank API | High quality, simple integration | External dependency, $0.10/1K cost | User requires self-hosted solution |
| ColBERT local model | Fast, no API calls | Requires Python sidecar, complex setup | LLM reranking simpler with existing OpenRouter |
| Pure vector improvements only | Less complexity | Misses keyword matches, no reranking | Research shows hybrid+rerank needed [1][2] |

## Layer 3: Technical Specification

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AGENT TOOLS                          │
│  ┌─────────────────────────┐  ┌───────────────────────┐ │
│  │ searchDocs              │  │ researchTopic         │ │
│  │ (thoroughness param)    │  │ (multi-step agentic)  │ │
│  └───────────┬─────────────┘  └───────────┬───────────┘ │
└──────────────┼────────────────────────────┼─────────────┘
               │                            │
               ▼                            ▼
┌─────────────────────────────────────────────────────────┐
│              RETRIEVAL LAYER (src/knowledge/retrieval/) │
│                                                         │
│  retrieve(query, options: RetrievalOptions)             │
│    ├─ vectorSearch()     Semantic similarity            │
│    ├─ keywordSearch()    BM25 via tsvector              │
│    ├─ fuseResults()      Reciprocal Rank Fusion (k=60)  │
│    └─ rerank()           LLM-based relevance scoring    │
└─────────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│              DATA LAYER (src/knowledge/data/)           │
│                                                         │
│  knowledge_embeddings table (extended):                 │
│    - content            Raw chunk text                  │
│    - content_with_ctx   Chunk + doc title/section       │
│    - embedding          vector(1536) with HNSW index    │
│    - content_tsvector   tsvector with GIN index         │
│    - document_title     Extracted from markdown         │
│    - section_path       Array of section headers        │
└─────────────────────────────────────────────────────────┘
```

### Code Change Analysis

| Component | Action | Justification |
|-----------|--------|---------------|
| `src/knowledge/data/` | Create | New data layer separating storage from retrieval |
| `src/knowledge/retrieval/` | Create | New retrieval layer with hybrid search + reranking |
| `src/knowledge/tools/` | Create | Agent tool factories for search and research |
| `src/knowledge/ingest/chunker.ts` | Rewrite | Add contextual chunking with metadata extraction |
| `src/knowledge/ingest/metadata.ts` | Create | Markdown structure extraction utilities |
| `src/knowledge/vectorStore.ts` | Delete | Replaced by data/ and retrieval/ layers |
| `src/knowledge/index.ts` | Rewrite | New clean exports for refactored structure |
| `src/knowledge/takaro-docs/index.ts` | Rewrite | Use new tool factories |
| `src/db/migrations/` | Create | Schema migration for new columns |

### Code to Remove

- **`src/knowledge/vectorStore.ts`**
  - Why obsolete: Mixes data operations with search logic
  - Replaced by: `data/vectorStore.ts` (pure data ops) + `retrieval/` (search logic)
  - Migration: Move vector operations to data/, search to retrieval/

- **Old exports from `src/knowledge/index.ts`**
  - `vectorSearch` - replaced by `retrieve()`
  - `upsertDocuments` - replaced by `upsertChunks()`
  - Direct vectorStore exports - replaced by data layer exports

- **`src/knowledge/takaro-docs/index.ts`** (current implementation)
  - Why obsolete: Creates old-style single search tool
  - Replaced by: New factory using `createSearchDocsTool()` and `createResearchTopicTool()`

### Implementation Approach

#### Data Layer (`src/knowledge/data/`)

- **vectorStore.ts**: Pure pgvector operations
  - `insertChunks(kbId, chunks)` - batch insert with embeddings
  - `vectorSearch(kbId, embedding, limit)` - raw vector similarity
  - `deleteByKnowledgeBase(kbId)` - cleanup operations

- **fullTextSearch.ts**: PostgreSQL tsvector operations
  - `keywordSearch(kbId, query, limit)` - BM25-style ranking via ts_rank
  - Uses GIN index on content_tsvector column

#### Retrieval Layer (`src/knowledge/retrieval/`)

- **index.ts**: Main retrieve function
  - Routes to appropriate strategy based on thoroughness
  - Coordinates vector, keyword, fusion, and reranking

- **hybrid.ts**: Hybrid search implementation
  - Parallel vector + keyword search
  - RRF fusion with k=60 constant [5]

- **reranker.ts**: LLM-based reranking
  - Uses existing OpenRouter with fast model (llama-3.1-8b-instruct)
  - Scores top candidates for relevance to query
  - Reorders results by LLM scores

#### Contextual Chunking

Current chunking loses document context. New approach:

```
if document has markdown headers:
  extract title from first H1
  track current section path as headers encountered
  for each chunk:
    prepend "# {title}\n## {section}\n\n" to create contextual version
    store both raw content and contextual content
    embed the contextual version for better semantic matching
```

#### Data Models

**Extended knowledge_embeddings schema:**

```sql
ALTER TABLE knowledge_embeddings
  ADD COLUMN content_with_context TEXT,
  ADD COLUMN content_tsvector TSVECTOR GENERATED ALWAYS AS
    (to_tsvector('english', content)) STORED,
  ADD COLUMN document_title VARCHAR(255),
  ADD COLUMN section_path TEXT[];

CREATE INDEX knowledge_embeddings_tsvector_idx
  ON knowledge_embeddings USING gin(content_tsvector);
```

#### Reciprocal Rank Fusion Algorithm

Per research [5], RRF combines multiple ranked lists effectively:

```
for each result from vector search at rank i:
  score += 1 / (k + i + 1)  where k = 60

for each result from keyword search at rank j:
  score += 1 / (k + j + 1)

sort all results by combined score descending
```

#### Security

- No new external APIs (uses existing OpenRouter)
- Query input sanitized before SQL execution
- LLM reranking prompts use parameterized content (no injection risk)
- Existing authentication preserved for all endpoints

### Test-Driven Implementation

**Unit Tests:**
- `retrieval/hybrid.test.ts`: RRF fusion produces correct ordering
- `retrieval/reranker.test.ts`: LLM reranking improves result quality
- `ingest/metadata.test.ts`: Markdown header extraction works correctly
- `ingest/chunker.test.ts`: Contextual chunks include proper metadata

**Integration Tests:**
- Search with exact API names returns relevant docs
- Hybrid search outperforms pure vector on test queries
- Thoroughness modes meet latency targets
- Agentic research finds comprehensive results

**Baseline Test Queries:**
1. "moduleControllerCreate" - should find module API docs
2. "hook.player.connected" - should find hook documentation
3. "how do cronjobs work" - should find cronjob guide
4. "ban player with reason" - should find moderation docs

### Design Decisions

Based on requirements clarification:

1. **Migration Strategy**: Clean slate - truncate existing embeddings and re-ingest with new chunking. Ensures all chunks have proper contextual metadata.

2. **Reranking Model**: Use `llama-3.1-8b-instruct` via OpenRouter (~$0.06/M tokens, ~200ms per rerank). Fast and cost-effective for relevance scoring.

3. **Research Tool Access**: Opt-in per agent configuration. Only agents explicitly configured with `createResearchTopicTool()` get agentic search capability. Prevents overuse and controls latency expectations.

### Rollout Plan

**Phase 1: Data Layer** (Foundation)
1. Create migration for schema changes (adds columns, truncates data)
2. Move vectorStore to data/ directory
3. Implement fullTextSearch.ts
4. Update chunker with contextual chunking
5. Trigger full re-sync of all knowledge bases

**Phase 2: Retrieval Layer**
1. Implement hybrid.ts with RRF
2. Implement main retrieve() with thoroughness modes
3. Validate hybrid > pure vector on test queries

**Phase 3: Reranking**
1. Implement LLM-based reranker
2. Add 'thorough' mode
3. Benchmark latency and quality

**Phase 4: Tools & Integration**
1. Create searchDocs tool factory
2. Update takaro-docs factory
3. Test with module-writer agent

**Phase 5: Agentic Search**
1. Implement researchTopic tool
2. Add sub-query generation
3. Test on complex queries

**Rollback Strategy:**
- Each phase independently deployable
- Feature flag for new retrieval (fall back to pure vector)
- Database migration adds columns (doesn't remove existing)

## References

1. [Optimizing RAG with Hybrid Search & Reranking](https://superlinked.com/vectorhub/articles/optimizing-rag-with-hybrid-search-reranking) - VectorHub by Superlinked
   - Summary: Comprehensive guide to hybrid search combining BM25 and vector search with reranking
   - Key takeaway: Hybrid search improves accuracy 8-15% over pure methods; reranking can improve quality by up to 48%

2. [Practical tips for retrieval-augmented generation (RAG)](https://stackoverflow.blog/2024/08/15/practical-tips-for-retrieval-augmented-generation-rag/) - Stack Overflow, 2024
   - Summary: Production RAG best practices from Stack Overflow's experience
   - Key takeaway: Hybrid search and reranking are now considered defaults for production RAG

3. [Chunking Strategies for LLM Applications](https://www.pinecone.io/learn/chunking-strategies/) - Pinecone
   - Summary: Guide to different chunking strategies and their tradeoffs
   - Key takeaway: Context-aware chunking preserving document structure improves retrieval quality

4. [Long-Context Isn't All You Need: How Retrieval & Chunking Impact Finance RAG](https://www.snowflake.com/en/engineering-blog/impact-retrieval-chunking-finance-rag/) - Snowflake, 2024
   - Summary: Research on chunking and metadata impact on RAG accuracy
   - Key takeaway: Appending document-level context to chunks boosts accuracy from 50-60% to 72-75%

5. [Reciprocal Rank Fusion (RRF) explained](https://medium.com/@devalshah1619/mathematical-intuition-behind-reciprocal-rank-fusion-rrf-explained-in-2-mins-002df0cc5e2a) - Medium
   - Summary: Mathematical explanation of RRF algorithm for combining ranked lists
   - Key takeaway: k=60 constant performs well across datasets; RRF requires no score normalization

6. [What is Agentic RAG?](https://www.ibm.com/think/topics/agentic-rag) - IBM
   - Summary: Overview of agentic RAG patterns including multi-step retrieval
   - Key takeaway: AI agents can dynamically manage retrieval strategies and iterate based on results

7. [Agentic Retrieval-Augmented Generation: A Survey](https://arxiv.org/abs/2501.09136) - arXiv, 2025
   - Summary: Academic survey of agentic RAG architectures and patterns
   - Key takeaway: Query planning agents break complex queries into sub-queries executed against multiple sources

8. [Hybrid search with PostgreSQL and pgvector](https://jkatz05.com/post/postgres/hybrid-search-postgres-pgvector/) - Jonathan Katz
   - Summary: Implementation guide for hybrid search in PostgreSQL
   - Key takeaway: Combine tsvector (GIN index) with pgvector (HNSW index) using CTEs

9. [Cross-Encoders, ColBERT, and LLM-Based Re-Rankers: A Practical Guide](https://medium.com/@aimichael/cross-encoders-colbert-and-llm-based-re-rankers-a-practical-guide-a23570d88548) - Medium
   - Summary: Comparison of reranking approaches for production use
   - Key takeaway: LLM reranking viable for small candidate sets; cross-encoders faster but require hosting

10. [MarkdownHeaderTextSplitter](https://python.langchain.com/docs/how_to/markdown_header_metadata_splitter/) - LangChain Documentation
    - Summary: Markdown-aware document splitting preserving header hierarchy
    - Key takeaway: Split on headers to preserve document structure; retain headers in metadata

### Research Summary

**Recommended Patterns Applied:**
- Hybrid search (vector + BM25 + RRF) from [1][8]: Combines semantic and keyword matching
- LLM-based reranking from [9]: Uses existing OpenRouter for relevance scoring
- Contextual chunking from [3][10]: Preserves document hierarchy in chunk metadata
- Agentic multi-step retrieval from [6][7]: Query decomposition and iterative search

**Anti-Patterns Avoided:**
- Pure vector search only per [1]: Misses exact keyword matches
- Fixed chunk size without context per [4]: Loses document-level semantics
- External dependencies per user requirement: Self-hosted reranking via OpenRouter

**Technologies Applied:**
- PostgreSQL tsvector for BM25: Native, no additional services per [8]
- pgvector HNSW index: Already in use, optimized for vector search
- OpenRouter LLM for reranking: Leverages existing infrastructure

**Standards Compliance:**
- Reciprocal Rank Fusion with k=60: Research-validated constant per [5]
- Latency targets aligned with industry practices per [1]
