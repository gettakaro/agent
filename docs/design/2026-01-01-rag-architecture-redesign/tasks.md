# Implementation Tasks: RAG Architecture Redesign

## Overview

Redesign the RAG system from pure vector search to a layered architecture with:
- Hybrid search (vector + BM25 + RRF fusion)
- Configurable thoroughness modes (fast/balanced/thorough)
- LLM-based reranking for thorough mode
- Agentic multi-step research tool

**6 phases** to incrementally build and validate each layer, with cleanup at each step.

---

## Phase 1: Database Schema & Data Layer Foundation

**Goal**: Extend database schema and create the new data layer structure
**Demo**: "At standup, I can show: migration runs successfully, new data/ directory with types compiling"

### Tasks

- [ ] Task 1.1: Create database migration for extended schema
  - **Output**: Migration file adding new columns and indexes
  - **Files**: `src/db/migrations/011_knowledge_hybrid_search.ts`
  - **Verify**: `npm run db:migrate` succeeds, columns visible in database

- [ ] Task 1.2: Create data layer directory structure and types
  - **Output**: New data/ directory with shared types
  - **Files**:
    - `src/knowledge/data/index.ts`
    - `src/knowledge/data/types.ts`
  - **Verify**: `npm run typecheck` passes

- [ ] Task 1.3: Move vector operations to data layer
  - **Output**: Pure vector data operations separated from search logic
  - **Files**: `src/knowledge/data/vectorStore.ts`
  - **Verify**: Existing functionality unchanged, imports updated

- [ ] Task 1.4: Implement full-text search data operations
  - **Output**: BM25-style keyword search using tsvector
  - **Files**: `src/knowledge/data/fullTextSearch.ts`
  - **Verify**: Can query with `ts_rank` and get ranked results

- [ ] Task 1.5: Delete old vectorStore.ts from root
  - **Depends on**: 1.3
  - **Output**: Old file removed, all imports updated
  - **Files**:
    - **Remove**: `src/knowledge/vectorStore.ts`
    - **Update**: `src/knowledge/index.ts`, any files importing old location
  - **Verify**: `npm run typecheck` passes, no dangling imports

### Phase 1 Checkpoint
- [ ] Run lint: `npm run lint`
- [ ] Run build: `npm run build`
- [ ] Run typecheck: `npm run typecheck`
- [ ] Manual verification: Query database, verify new columns exist
- [ ] **Demo ready**: Show migration output, new directory structure, old file deleted

---

## Phase 2: Contextual Chunking & Metadata Extraction

**Goal**: Improve document ingestion with context-aware chunking
**Demo**: "At standup, I can show: markdown doc chunked with title and section path in metadata"

### Tasks

- [ ] Task 2.1: Create markdown metadata extraction utility
  - **Output**: Functions to extract title, headers, section hierarchy from markdown
  - **Files**: `src/knowledge/ingest/metadata.ts`
  - **Verify**: Unit test extracts correct structure from sample markdown

- [ ] Task 2.2: Rewrite chunker with contextual chunking
  - **Output**: Chunks include document title and section path, contextual content field
  - **Files**: `src/knowledge/ingest/chunker.ts` (rewrite)
  - **Verify**: Chunks have `contentWithContext`, `documentTitle`, `sectionPath` fields

- [ ] Task 2.3: Update ingest pipeline to use new chunking
  - **Output**: Ingestion creates chunks with full context and metadata
  - **Files**:
    - `src/knowledge/ingest/index.ts`
    - `src/knowledge/jobs/worker.ts` (minor updates)
  - **Verify**: Re-ingesting a doc produces chunks with new metadata

- [ ] Task 2.4: Update types for new chunk structure
  - **Output**: Type definitions reflect new fields
  - **Files**: `src/knowledge/types.ts`
  - **Verify**: TypeScript compiles with new field usage

### Phase 2 Checkpoint
- [ ] Run lint: `npm run lint`
- [ ] Run build: `npm run build`
- [ ] Manual verification: Ingest a test markdown file, inspect chunk metadata in DB
- [ ] **Demo ready**: Show a chunk with document_title and section_path populated

---

## Phase 3: Retrieval Layer with Hybrid Search

**Goal**: Implement hybrid search combining vector and keyword results with RRF
**Demo**: "At standup, I can show: search query returning fused results from both vector and keyword search"

### Tasks

- [ ] Task 3.1: Create retrieval layer directory and types
  - **Output**: Retrieval layer structure with types
  - **Files**:
    - `src/knowledge/retrieval/index.ts`
    - `src/knowledge/retrieval/types.ts`
  - **Verify**: Types compile, exports work

- [ ] Task 3.2: Implement RRF fusion algorithm
  - **Output**: Function to combine ranked lists using Reciprocal Rank Fusion (k=60)
  - **Files**: `src/knowledge/retrieval/fusion.ts`
  - **Verify**: Unit test confirms correct score calculation and ordering

- [ ] Task 3.3: Implement hybrid search
  - **Output**: Parallel vector + keyword search with RRF fusion
  - **Files**: `src/knowledge/retrieval/hybrid.ts`
  - **Verify**: Returns combined results from both search types

- [ ] Task 3.4: Implement main retrieve() function with fast/balanced modes
  - **Output**: `retrieve(query, { thoroughness })` routing to appropriate strategy
  - **Files**: `src/knowledge/retrieval/index.ts`
  - **Verify**:
    - `fast` returns vector-only results
    - `balanced` returns hybrid results

- [ ] Task 3.5: Update main knowledge index exports
  - **Output**: Clean exports for new retrieval layer
  - **Files**: `src/knowledge/index.ts` (rewrite)
  - **Remove**: Old `vectorSearch` export, direct vectorStore exports
  - **Verify**: Imports work from new locations

### Phase 3 Checkpoint
- [ ] Run lint: `npm run lint`
- [ ] Run build: `npm run build`
- [ ] Manual verification: Call retrieve() with different thoroughness, compare results
- [ ] Test query: "moduleControllerCreate" should appear higher with hybrid than pure vector
- [ ] **Demo ready**: Show hybrid search finding exact API name that pure vector might miss

---

## Phase 4: LLM-Based Reranking

**Goal**: Add reranking for thorough mode using LLM relevance scoring
**Demo**: "At standup, I can show: thorough search reranking candidates with LLM scores"

### Tasks

- [ ] Task 4.1: Implement LLM reranker
  - **Output**: Function to rerank search results using llama-3.1-8b-instruct via OpenRouter
  - **Files**: `src/knowledge/retrieval/reranker.ts`
  - **Verify**: Returns results reordered by LLM relevance scores

- [ ] Task 4.2: Add thorough mode to retrieve()
  - **Output**: `thoroughness='thorough'` triggers hybrid + rerank pipeline
  - **Files**: `src/knowledge/retrieval/index.ts`
  - **Verify**: Thorough mode calls reranker with candidate results

- [ ] Task 4.3: Add latency logging for each mode
  - **Output**: Debug logs showing time spent in each retrieval stage
  - **Files**: `src/knowledge/retrieval/index.ts`
  - **Verify**: Can see latency breakdown in logs

### Phase 4 Checkpoint
- [ ] Run lint: `npm run lint`
- [ ] Run build: `npm run build`
- [ ] Manual verification:
  - Fast mode: <200ms
  - Balanced mode: <500ms
  - Thorough mode: <2s
- [ ] **Demo ready**: Show same query with different thoroughness levels, observe latency and result quality differences

---

## Phase 5: Agent Tools & Integration

**Goal**: Create new search tool with thoroughness parameter, integrate with agents
**Demo**: "At standup, I can show: agent using searchDocs with thoroughness parameter"

### Tasks

- [ ] Task 5.1: Create tools directory and searchDocs tool factory
  - **Output**: `createSearchDocsTool(kbId)` returning tool with thoroughness param
  - **Files**:
    - `src/knowledge/tools/index.ts`
    - `src/knowledge/tools/searchDocs.ts`
  - **Verify**: Tool definition has correct parameters schema

- [ ] Task 5.2: Rewrite takaro-docs factory to use new tools
  - **Output**: Factory creates KB with new searchDocs tool
  - **Files**: `src/knowledge/takaro-docs/index.ts` (rewrite)
  - **Remove**: Old `createSearchTool` function
  - **Verify**: Factory returns KB with thoroughness-aware search tool

- [ ] Task 5.3: Update knowledge REST API
  - **Output**: `/knowledge/:kbId/search` accepts `thoroughness` query param
  - **Files**: `src/http/routes/knowledge.ts`
  - **Verify**: API responds correctly to thoroughness parameter

- [ ] Task 5.4: Update agent integration
  - **Output**: Module-writer agent uses new search tool
  - **Files**: `src/agents/module-writer/versions.ts`
  - **Verify**: Agent can call searchDocs with thoroughness

### Phase 5 Checkpoint
- [ ] Run lint: `npm run lint`
- [ ] Run build: `npm run build`
- [ ] Manual verification: Send message to agent, observe search tool usage in logs
- [ ] Test API: `curl "http://localhost:3100/knowledge/takaro-docs/search?q=hooks&thoroughness=balanced"`
- [ ] **Demo ready**: Show agent conversation using new search tool with thoroughness selection

---

## Phase 6: Agentic Research Tool

**Goal**: Implement multi-step research tool for complex queries
**Demo**: "At standup, I can show: researchTopic breaking query into sub-queries and synthesizing results"

### Tasks

- [ ] Task 6.1: Implement sub-query generation
  - **Output**: Function to break topic into 2-4 specific search queries using LLM
  - **Files**: `src/knowledge/tools/queryPlanning.ts`
  - **Verify**: Complex topic returns sensible sub-queries

- [ ] Task 6.2: Implement query reformulation
  - **Output**: Function to reformulate query when initial results insufficient
  - **Files**: `src/knowledge/tools/queryPlanning.ts`
  - **Verify**: Given poor results, generates alternative query

- [ ] Task 6.3: Implement researchTopic tool
  - **Output**: Multi-step agentic tool with iteration, deduplication, synthesis
  - **Files**: `src/knowledge/tools/researchTopic.ts`
  - **Verify**: Returns comprehensive findings from multiple sub-queries

- [ ] Task 6.4: Add research tool to opt-in agents
  - **Output**: Agents can be configured with research tool
  - **Files**:
    - `src/knowledge/tools/index.ts` (export)
    - `src/knowledge/takaro-docs/index.ts` (optional tool)
  - **Verify**: Agent with research tool can call researchTopic

- [ ] Task 6.5: Final cleanup - verify no dead code remains
  - **Output**: All obsolete code removed, imports clean
  - **Files**: Audit all knowledge/ files
  - **Remove**: Any unused functions, old exports, commented code
  - **Verify**: `npm run lint`, no unused exports warnings

### Phase 6 Checkpoint
- [ ] Run lint: `npm run lint`
- [ ] Run build: `npm run build`
- [ ] Manual verification: Call researchTopic with complex query, see multi-step execution
- [ ] **Demo ready**: Show "how do hooks interact with commands and cronjobs" returning comprehensive results

---

## Final Verification

- [ ] All requirements from design doc met:
  - [ ] REQ-001: Three retrieval modes work with target latencies
  - [ ] REQ-002: Keyword search contributes to results
  - [ ] REQ-003: RRF fusion combines vector and keyword
  - [ ] REQ-004: Thorough mode uses LLM reranking
  - [ ] REQ-005: Chunks have document structure metadata
  - [ ] REQ-006: researchTopic tool available (opt-in)
  - [ ] REQ-007: Parallel sub-query execution works

- [ ] All obsolete code removed:
  - [ ] `src/knowledge/vectorStore.ts` deleted
  - [ ] Old exports removed from `src/knowledge/index.ts`
  - [ ] Old `searchTakaroDocs` tool replaced
  - [ ] No dangling imports

- [ ] Test queries work:
  - [ ] "moduleControllerCreate" finds module API docs
  - [ ] "hook.player.connected" finds hook documentation
  - [ ] "how do cronjobs work" finds cronjob guide
  - [ ] "ban player with reason" finds moderation docs

- [ ] Documentation updated:
  - [ ] CLAUDE.md reflects new knowledge API if needed
  - [ ] Comments in code explain thoroughness modes
