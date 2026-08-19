# PBMP Knowledge Base Storage & Retrieval Flow

**Documentation:** How PBMP stores and retrieves knowledge from AstraDB  
**Created:** January 14, 2026  
**Technology:** RAG (Retrieval-Augmented Generation)

---

## Table of Contents
1. [Overview](#overview)
2. [Tools & Technologies](#tools--technologies)
3. [Storage Pipeline](#storage-pipeline)
4. [AstraDB Document Format](#astradb-document-format)
5. [Retrieval Process](#retrieval-process)
6. [Statistics](#statistics)
7. [Why This Approach](#why-this-approach)

---

## Overview

PBMP uses a **Vector Database (AstraDB)** with **RAG (Retrieval-Augmented Generation)** to provide accurate, grounded responses based on HBMP knowledge.

### High-Level Flow
```
Plain Text File → Chunk → Generate Embeddings → Store in AstraDB
                                                        ↓
User Question → Generate Query Embedding → Vector Search → Retrieve Context → AI Response
```

---

## Tools & Technologies

### 1. **LangChain Text Splitters** (`@langchain/textsplitters`)
```javascript
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,        // Characters per chunk
  chunkOverlap: 100,     // Overlap between chunks
});
```

**Purpose:**
- Splits large text into smaller, searchable chunks
- Maintains context across boundaries with overlap
- Preserves semantic meaning

### 2. **Google Gemini Embeddings** (`@langchain/google-genai`)
```javascript
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: GEMINI_API_KEY,
  modelName: "embedding-001",  // 768-dimensional vectors
});
```

**Purpose:**
- Converts text into numerical vectors
- Enables semantic similarity search
- Model produces 768-dimensional embeddings

### 3. **AstraDB** (`@datastax/astra-db-ts`)
```javascript
const { DataAPIClient } = require('@datastax/astra-db-ts');

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT);
```

**Purpose:**
- Vector database for storing embeddings
- Fast similarity search using dot product
- Scalable and serverless

### 4. **Node.js Built-ins**
- `fs` - File system operations
- `path` - Path handling

---

## Storage Pipeline

### Step-by-Step Process

```
┌────────────────────────────────────────────────────────────────┐
│ STEP 1: Read Source File                                       │
├────────────────────────────────────────────────────────────────┤
│ File: pbmp-backend/hbmpKB.txt                                  │
│ Format: Plain text with numbered sections                      │
│                                                                 │
│ 1. Purpose and Scope                                           │
│    This document consolidates...                               │
│                                                                 │
│ 2. Non-Negotiable Rules and Conventions                        │
│    Management = Goals → Strategy...                            │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ STEP 2: Split into Sections                                    │
├────────────────────────────────────────────────────────────────┤
│ Method: Regex split on numbered headings                       │
│ Pattern: /(?=^\d+\.\s)/gm                                     │
│                                                                 │
│ Result: 11 major sections                                      │
│   - Purpose and Scope                                          │
│   - HBMP Doctrine                                              │
│   - Scope Model                                                │
│   - GOST Framework                                             │
│   - External Environment Analysis                              │
│   - etc.                                                       │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ STEP 3: Chunk Each Section                                     │
├────────────────────────────────────────────────────────────────┤
│ Tool: RecursiveCharacterTextSplitter                           │
│ Settings:                                                       │
│   - chunkSize: 512 characters                                  │
│   - chunkOverlap: 100 characters                               │
│                                                                 │
│ Example:                                                        │
│ Section: "Non-Negotiable Rules..." (2,500 chars)               │
│   → Chunk 0: chars 0-512                                       │
│   → Chunk 1: chars 412-924   (100 char overlap)                │
│   → Chunk 2: chars 824-1336  (100 char overlap)                │
│   → Chunk 3: chars 1236-1748                                   │
│   → Chunk 4: chars 1648-2160                                   │
│                                                                 │
│ Result: 26 total chunks across all sections                    │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ STEP 4: Generate Embeddings                                    │
├────────────────────────────────────────────────────────────────┤
│ For each chunk:                                                 │
│                                                                 │
│ Text Input:                                                     │
│ "Management = Goals → Strategy → Plan → Execute..."            │
│                                                                 │
│         ↓ Gemini Embeddings API                                │
│                                                                 │
│ Vector Output (768 dimensions):                                │
│ [0.0234567, -0.1234567, 0.5678901, ..., 0.9876543]            │
│                                                                 │
│ This vector represents the semantic meaning of the text        │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ STEP 5: Store in AstraDB                                       │
├────────────────────────────────────────────────────────────────┤
│ Collection: pbmp_chat                                          │
│                                                                 │
│ Document Structure:                                             │
│ {                                                               │
│   "text": "Management = Goals → Strategy...",                  │
│   "source": "HBMP Doctrine",                                   │
│   "$vector": [0.023, -0.123, ...],  // 768 numbers            │
│   "metadata": {                                                 │
│     "title": "Non-Negotiable Rules...",                        │
│     "chunkIndex": 0,                                           │
│     "totalChunks": 5,                                          │
│     "createdAt": "2026-01-14T10:15:30.000Z"                   │
│   }                                                             │
│ }                                                               │
│                                                                 │
│ Total Documents Inserted: 26                                   │
└────────────────────────────────────────────────────────────────┘
```

---

## AstraDB Document Format

### Complete Document Structure

```json
{
  "_id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Management = Goals → Strategy → Plan → Execute (Projects) → Operate, with Change Management pervasive. Avoid naming like \"Planning & Management\" (planning is a subset of management).",
  "source": "Non-Negotiable Rules and Conventions (HBMP Doctrine)",
  "$vector": [
    0.0234567,
    -0.1234567,
    0.5678901,
    0.2345678,
    -0.8765432,
    0.6789012,
    ... // 768 numbers total
  ],
  "metadata": {
    "title": "Non-Negotiable Rules and Conventions (HBMP Doctrine)",
    "chunkIndex": 0,
    "totalChunks": 5,
    "createdAt": "2026-01-14T10:15:30.000Z"
  }
}
```

### Field Descriptions

| Field | Type | Size | Purpose | Example |
|-------|------|------|---------|---------|
| `_id` | UUID | 36 chars | Auto-generated unique identifier | `"550e8400-e29b-..."` |
| `text` | String | 0-512 chars | Actual text content for display | `"Management = Goals..."` |
| `source` | String | Variable | Section title for reference | `"HBMP Doctrine"` |
| `$vector` | Float Array | 768 floats | Embedding for similarity search | `[0.023, -0.156, ...]` |
| `metadata.title` | String | Variable | Full document title | `"Non-Negotiable Rules..."` |
| `metadata.chunkIndex` | Integer | 1 byte | Position in original doc (0-based) | `0`, `1`, `2`, etc. |
| `metadata.totalChunks` | Integer | 1 byte | How many chunks for this doc | `5` |
| `metadata.createdAt` | ISO String | ~24 chars | Timestamp of insertion | `"2026-01-14T10:15:30Z"` |

### Storage Size Calculation

**Per Document:**
- Text: ~400 bytes (average)
- Vector: 768 floats × 4 bytes = 3,072 bytes
- Metadata: ~200 bytes
- **Total: ~3,700 bytes (~3.7 KB per document)**

**For Your KB (26 documents):**
- **Total Storage: ~96 KB**
- Plus indexes and overhead: **~150-200 KB**

---

## Retrieval Process

### When User Asks a Question

```
┌────────────────────────────────────────────────────────────────┐
│ USER INPUT                                                      │
├────────────────────────────────────────────────────────────────┤
│ "What is the GOST framework?"                                  │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ STEP 1: Generate Query Embedding                               │
├────────────────────────────────────────────────────────────────┤
│ Text: "What is the GOST framework?"                            │
│         ↓ Gemini Embeddings API                                │
│ Vector: [0.123, -0.456, 0.789, ..., 0.234]  (768 dims)        │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ STEP 2: Vector Similarity Search in AstraDB                    │
├────────────────────────────────────────────────────────────────┤
│ Query:                                                          │
│   collection.find(null, {                                      │
│     sort: { $vector: queryEmbedding },                         │
│     limit: 10                                                  │
│   })                                                            │
│                                                                 │
│ Method: Dot Product Similarity                                 │
│   similarity = Σ(query[i] × doc[i])  for i = 0 to 767         │
│                                                                 │
│ Result: Top 10 most similar documents                          │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ STEP 3: Retrieve Matching Documents                            │
├────────────────────────────────────────────────────────────────┤
│ Document 1 (similarity: 0.89):                                 │
│   "Goal (G): SMART (metric + baseline + target + time..."     │
│   Source: "Unified Measurement and Cascade Model"              │
│                                                                 │
│ Document 2 (similarity: 0.87):                                 │
│   "Cascade rule: G/O/S/T are relative to hierarchy level..."  │
│   Source: "GOST Framework"                                     │
│                                                                 │
│ Document 3 (similarity: 0.84):                                 │
│   "Strategy (S): coherent choices (where-to-play..."           │
│   Source: "GOST Definitions"                                   │
│                                                                 │
│ ... (up to 10 documents)                                       │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ STEP 4: Build Context                                          │
├────────────────────────────────────────────────────────────────┤
│ Combine retrieved documents into context:                      │
│                                                                 │
│ Context from HBMP documentation:                               │
│ --------------                                                  │
│ Goal (G): SMART (metric + baseline + target + time + scope).  │
│ Objective (O): measurable sub-outcome that causally drives... │
│ Strategy (S): coherent choices (where-to-play/how-to-win...)  │
│ Tactics (T): concrete initiatives/actions/projects.           │
│                                                                 │
│ Cascade rule: G/O/S/T are relative to hierarchy level...      │
│ --------------                                                  │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│ STEP 5: Generate AI Response                                   │
├────────────────────────────────────────────────────────────────┤
│ System Prompt + Context + User Question                        │
│         ↓ Gemini 2.0 Flash API                                 │
│                                                                 │
│ AI Response (Streaming):                                       │
│ "The GOST framework is HBMP's unified measurement model        │
│ that stands for Goals, Objectives, Strategy, and Tactics.     │
│                                                                 │
│ Here's what each component means:                              │
│                                                                 │
│ - **Goal (G)**: A SMART target (Specific, Measurable,         │
│   Achievable, Relevant, Time-bound) with metric, baseline,    │
│   target, time, and scope.                                     │
│                                                                 │
│ - **Objective (O)**: A measurable sub-outcome that            │
│   causally drives the goal...                                  │
│                                                                 │
│ ..."                                                            │
└────────────────────────────────────────────────────────────────┘
                            ↓
                     USER SEES RESPONSE
```

### Code Implementation

**Backend retrieval (server.js):**
```javascript
// 1. Generate embedding for user's question
const embedding = await embeddings.embedQuery(messageText);

// 2. Query AstraDB for similar documents
const collection = await db.collection('pbmp_chat');
const cursor = collection.find(null, {
  sort: { $vector: embedding },
  limit: 10,
});
const documents = await cursor.toArray();

// 3. Extract text context
const docContext = documents
  .map(doc => doc.text || doc.content || '')
  .filter(text => text.trim().length > 0)
  .join('\n\n')
  .trim();

// 4. Build prompt with context
const systemPrompt = `You are PBMP...

Context from HBMP documentation:
--------------
${docContext || 'No context available.'}
--------------`;

// 5. Generate response with Gemini
const result = await chat.sendMessageStream(messageText);
```

---

## Statistics

### Current Knowledge Base

| Metric | Value |
|--------|-------|
| **Source File Size** | 174 lines, ~15 KB |
| **Major Sections** | 11 sections |
| **Total Chunks** | 26 chunks |
| **Embeddings Generated** | 26 vectors × 768 dimensions |
| **Storage per Document** | ~3.7 KB (text + vector + metadata) |
| **Total AstraDB Storage** | ~96 KB (documents only) |
| **Total with Indexes** | ~150-200 KB |
| **Query Latency** | ~100-300ms (embedding + search + retrieval) |

### Chunk Distribution

| Section | Chunks |
|---------|--------|
| HBMP Knowledge Base Header | 1 |
| Purpose and Scope | 1 |
| HBMP Doctrine | 5 |
| Scope Model | 1 |
| GOST Framework | 4 |
| External Environment Analysis | 1 |
| KB Schema | 3 |
| Anti-hallucination Rules | 3 |
| Measurement Framework | 2 |
| Areas of Coverage | 3 |
| Key Capabilities | 2 |
| **Total** | **26** |

---

## Why This Approach?

### 1. **Chunking Strategy (512 chars + 100 overlap)**

**Advantages:**
- ✅ **Focused Retrieval:** Small chunks return precise, relevant content
- ✅ **Context Preservation:** 100-char overlap prevents information loss at boundaries
- ✅ **Better Matching:** Smaller units increase chance of semantic match
- ✅ **Token Efficiency:** Fits well within AI context windows

**Example:**
```
Original: "...end of sentence A. Start of sentence B..."
                                   ↑ boundary

Without Overlap:
Chunk 1: "...end of sentence A."
Chunk 2: "Start of sentence B..."
❌ Context lost!

With 100-char Overlap:
Chunk 1: "...end of sentence A. Start of sentence B..."
Chunk 2: "...end of sentence A. Start of sentence B..."
✅ Context preserved!
```

### 2. **Vector Embeddings (768 dimensions)**

**Why Vectors?**
- ✅ **Semantic Search:** Finds meaning, not just keywords
- ✅ **Synonym Matching:** "GOST" matches "Goals Objectives Strategy Tactics"
- ✅ **Multilingual:** Works across languages (future-proof)
- ✅ **Fuzzy Matching:** Handles typos and variations

**Example:**
```
Query: "What is the goal setting process?"

Keyword Search Would Match:
- Documents containing exact words "goal", "setting", "process"

Vector Search Matches:
- "Goal (G): SMART (metric + baseline...)" ✅
- "GOST Framework: Goals → Objectives..." ✅
- "Cascade rule: G/O/S/T..." ✅
- "Management lifecycle: Goals → Strategy..." ✅
All semantically related!
```

### 3. **Dot Product Similarity**

**Why Dot Product over Cosine?**
- ⚡ **~50% Faster:** One less normalization step
- ✅ **Sufficient for Gemini Embeddings:** Already normalized
- 📊 **Same Ranking:** Produces identical result order

**Formula:**
```
similarity = Σ(query[i] × doc[i])  for i = 0 to 767
```

### 4. **Metadata Storage**

**Why Store Metadata?**
- 📍 **Provenance:** Know where information came from
- 🔍 **Debugging:** Track chunk relationships
- 📅 **Versioning:** Timestamp for KB updates
- 🔄 **Updates:** Can replace specific chunks

---

## Loading the Knowledge Base

### Command
```bash
cd hbmpchat/pbmp-backend
npm run load-docs
```

### What Happens
```
🚀 Starting PBMP document loading...

📖 Reading HBMP Knowledge Base from hbmpKB.txt...
✅ Loaded 11 sections from knowledge base

📚 Connecting to collection: pbmp_chat

📄 Processing: Purpose and Scope
   ✂️  Split into 1 chunks
   ✅ Chunk 1/1 inserted

📄 Processing: Non-Negotiable Rules and Conventions
   ✂️  Split into 5 chunks
   ✅ Chunk 1/5 inserted
   ✅ Chunk 2/5 inserted
   ✅ Chunk 3/5 inserted
   ✅ Chunk 4/5 inserted
   ✅ Chunk 5/5 inserted

... (continues for all sections)

============================================================
✅ Document loading complete!
📊 Total chunks processed: 26
✅ Successfully inserted: 26
❌ Failed: 0
============================================================
```

---

## Updating the Knowledge Base

### To Add New Content

1. **Edit the source file:**
```bash
# Edit: hbmpchat/pbmp-backend/hbmpKB.txt
# Add new sections in numbered format
```

2. **Reload into AstraDB:**
```bash
cd hbmpchat/pbmp-backend
npm run load-docs
```

3. **Restart backend (if needed):**
```bash
npm run dev
```

### To Replace Entirely

1. **Clear AstraDB collection** (via AstraDB UI or API)
2. **Update hbmpKB.txt** with new content
3. **Run loader:** `npm run load-docs`

---

## Best Practices

### ✅ DO

- **Keep chunks focused:** 512 chars is optimal for most content
- **Use semantic sections:** Split by topic, not arbitrarily
- **Include metadata:** Helps with debugging and provenance
- **Test queries:** Verify retrieval quality after loading
- **Version control KB:** Track changes to hbmpKB.txt

### ❌ DON'T

- **Don't chunk too small:** < 200 chars loses context
- **Don't chunk too large:** > 1000 chars dilutes relevance
- **Don't skip overlap:** Boundaries can break meaning
- **Don't forget timestamps:** Helps track KB versions
- **Don't duplicate:** Same content creates redundant results

---

## Troubleshooting

### Issue: Poor Retrieval Quality

**Symptoms:** AI returns "I don't have that information"

**Solutions:**
1. Check if knowledge base is loaded: Query AstraDB collection
2. Verify embeddings are generated: Check for `$vector` field
3. Increase retrieval limit: Change `limit: 10` to `limit: 15`
4. Improve chunking: Adjust chunkSize or overlap
5. Add more content: Expand hbmpKB.txt with relevant info

### Issue: Slow Queries

**Symptoms:** Responses take > 3 seconds

**Solutions:**
1. Check AstraDB region: Use closest datacenter
2. Reduce retrieval limit: `limit: 5` instead of `limit: 10`
3. Optimize embeddings: Cache frequently used queries
4. Monitor API quotas: Gemini rate limits

### Issue: Inconsistent Responses

**Symptoms:** Same question, different answers

**Solutions:**
1. Check AI temperature: Lower for consistency
2. Improve system prompt: Be more specific about using context
3. Add more context: Retrieve more documents
4. Filter results: Use metadata to constrain search

---

**Last Updated:** January 14, 2026  
**Maintained By:** Development Team  
**Related Files:**
- `pbmp-backend/loadDocs.js` - Loading script
- `pbmp-backend/server.js` - Retrieval logic
- `pbmp-backend/hbmpKB.txt` - Knowledge base content
