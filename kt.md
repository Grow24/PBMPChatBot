# 📚 PBMP ChatBot - Knowledge Transfer Document

**Project**: PBMP (Personal & Business Management Platform) ChatBot  
**Owner**: Data Science Technologies  
**Created**: January 2026  
**Last Updated**: January 30, 2026

---

## 📖 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Frontend (React)](#frontend-react)
4. [Backend (Node.js/Express)](#backend-nodejs--express)
5. [Database (AstraDB)](#database-astradb)
6. [AI Integration (Google Gemini)](#ai-integration-google-gemini)
7. [Widget Embedding](#widget-embedding)
8. [Deployment](#deployment)
9. [Integration Points](#integration-points)
10. [Key Features](#key-features)
11. [Development Workflow](#development-workflow)
12. [Troubleshooting Guide](#troubleshooting-guide)

---

## 🎯 Project Overview

### What is PBMP ChatBot?

PBMP ChatBot is an intelligent conversational AI system designed to help users understand and engage with the PBMP (Personal & Business Management Platform) from Grow24.ai. It combines:

- **Conversational AI** (Google Gemini 2.0)
- **Vector Search** (for knowledge base retrieval)
- **Meeting Scheduling** (lead capture and booking)
- **Responsive Chat Widget** (embeddable in websites)
- **WhatsApp Integration** (for messaging platform)
- **Email Marketing** (automated welcome emails)

### Business Purpose

The chatbot serves three main functions:

1. **Customer Education**: Answer questions about PBMP features and capabilities
2. **Lead Generation**: Capture user information through booking flows
3. **Lead Nurturing**: Send automated welcome emails to interested prospects
4. **Multi-Channel Support**: Available on website, WhatsApp, and mobile apps

### Project Status

✅ **Core Features**: Fully Implemented
✅ **Deployment**: Production Ready (Vercel + Zeabur)
✅ **Email Integration**: Recently Added (January 2026)
⚠️ **Future**: Advanced analytics, custom workflows

---

## 🏗️ Architecture Overview

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Website (grow24.ai)                        │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  PBMP Chat Widget (React Component)            │  │  │
│  │  │  - Chat UI with Messages                       │  │  │
│  │  │  - Audio Recording                             │  │  │
│  │  │  - Booking Flow                                │  │  │
│  │  │  - Diagram Viewer                              │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Embedded Widget                            │  │
│  │  (Can be embedded in any website)                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Express.js Backend Server                          │  │
│  │   (pbmpchatbotbackend.zeabur.app)                   │  │
│  │                                                      │  │
│  │   ┌──────────────────────────────────────────────┐  │  │
│  │   │ Endpoints:                                   │  │  │
│  │   │ • POST /api/chat          (Main chat API)   │  │  │
│  │   │ • POST /api/leads         (Lead capture)    │  │  │
│  │   │ • POST /whatsapp/webhook  (WhatsApp)        │  │  │
│  │   │ • GET /whatsapp/status    (Health check)    │  │  │
│  │   └──────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                 SERVICE LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Gemini AI   │  │  Embeddings  │  │  Nodemailer  │     │
│  │  (Chat)      │  │  (Search)    │  │  (Email)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              DATABASE & EXTERNAL SERVICES                   │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │    AstraDB       │  │   Gmail SMTP     │               │
│  │  (Vector DB)     │  │   (Email)        │               │
│  │  - pbmp_chat     │  └──────────────────┘               │
│  │  - leads         │                                     │
│  └──────────────────┘                                     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer          | Technology                           | Purpose                  |
| -------------- | ------------------------------------ | ------------------------ |
| **Frontend**   | React 18 + TypeScript                | Chat UI Components       |
| **Build Tool** | Vite                                 | Fast module bundling     |
| **Backend**    | Node.js + Express                    | REST API Server          |
| **AI Model**   | Google Gemini 2.0                    | Chat/Response Generation |
| **Embeddings** | Google Embeddings 001                | Vector Search            |
| **Vector DB**  | AstraDB (DataStax)                   | Knowledge Base Storage   |
| **Email**      | Nodemailer + Gmail                   | Email Delivery           |
| **Deployment** | Vercel (Frontend) + Zeabur (Backend) | Cloud Hosting            |

---

## 🎨 Frontend (React)

### Project Structure

```
src/
├── App.tsx                          # Main application component
├── App.css                          # Styling
├── main.tsx                         # Entry point
├── components/                      # Reusable React components
│   ├── Bubble.tsx                   # Message bubble component
│   ├── AudioRecorder.tsx            # Voice input recorder
│   ├── LoadingBubbles.tsx           # Loading animation
│   ├── PromptSuggestionsRow.tsx     # Suggested questions
│   ├── PromptSuggestionsButton.tsx  # Single suggestion button
│   ├── DiagramPrompt.tsx            # Diagram offer component
│   ├── DiagramViewer.tsx            # Diagram display
│   └── MeetingBooking.tsx           # Booking form
├── services/
│   └── chatService.ts               # API communication service
└── widget/
    ├── ChatWidget.tsx               # Embeddable widget component
    └── widget.tsx                   # Widget entry point & initialization
```

### Key Components

#### 1. **App.tsx** (Main Chat Application)

- Manages chat state and conversation history
- Handles message sending and receiving
- Detects user intents (booking, diagrams)
- Manages UI state (loading, errors)
- Implements auto-scroll to latest messages

**Key State Variables:**

```typescript
messages: Message[]           // Conversation history
input: string                 // Current user input
isLoading: boolean           // API request in progress
error: string | null         // Error messages
isInBookingFlow: boolean     // Currently in booking mode
```

#### 2. **ChatWidget.tsx** (Embeddable Widget)

- Floating chat window for website embedding
- Responsive toggle button
- Same functionality as main App but standalone
- Receives API endpoint as prop
- Position configuration (bottom-right or bottom-left)

#### 3. **chatService.ts** (API Bridge)

```typescript
sendMessage(messages: Message[]): Promise<string>
```

**Features:**

- Converts messages to Gemini API format
- Handles Server-Sent Events (SSE) streaming
- Supports dynamic API endpoint injection
- Error handling and retry logic

**Response Format:**

```
Server sends: 0:{json_text}
Parser reads lines starting with '0:' and JSON parses them
```

#### 4. **Component Breakdown**

| Component                  | Purpose                     | State                                |
| -------------------------- | --------------------------- | ------------------------------------ |
| `Bubble`                   | Display individual messages | Message content, role, special types |
| `Bubble` → `AudioRecorder` | Record voice input          | Recording state, audio blob          |
| `PromptSuggestionsRow`     | Show suggested questions    | List of suggestions                  |
| `DiagramViewer`            | Display PBMP cycles         | Diagram type (personal/professional) |
| `MeetingBooking`           | Lead capture form           | Form data (email, name, etc.)        |
| `LoadingBubbles`           | Typing animation            | None                                 |

### Message Flow

```typescript
User Types Input
    ↓
handleSendMessage() called
    ↓
Detect Intent (Booking? Diagram?)
    ↓
Send to /api/chat (via chatService)
    ↓
Stream Response from Backend
    ↓
Parse SSE format (0:{json})
    ↓
Update Message State
    ↓
Render in Chat Bubble
    ↓
Auto-scroll to Bottom
```

### Styling

- **CSS Modules**: `App.css` (global styles)
- **Component Styles**: Inline styles + className combinations
- **Responsive**: Mobile-first approach
- **Color Scheme**: Green (#10b981) theme for Grow24.ai

---

## 🔧 Backend (Node.js / Express)

### Project Structure

```
pbmp-backend/
├── server.js                 # Main Express server
├── whatsapp-service.js       # WhatsApp webhook handler
├── loadDocs.js              # Knowledge base loader
├── hbmpKB.txt               # Knowledge base text file
├── package.json             # Dependencies
├── .env                     # Environment variables (NOT in git)
└── .env.example             # Example env file
```

### Server Architecture (server.js)

#### 1. **Initialization & Configuration**

```javascript
// Environment Setup
require("dotenv").config();

// Libraries
const express = require("express");
const cors = require("cors");
const { DataAPIClient } = require("@datastax/astra-db-ts");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const nodemailer = require("nodemailer");

// Constants
const PORT = process.env.PORT || 3000;
```

#### 2. **CORS Configuration**

Whitelist of allowed origins:

```javascript
allowedOrigins: [
  "http://localhost:3001",
  "https://pbmpchatbot.vercel.app",
  "https://grow24.ai",
  "https://www.grow24.ai",
];

// Plus wildcards for:
// - All Vercel preview deployments (*.vercel.app)
// - All Zeabur deployments (*.zeabur.app)
// - All grow24.ai subdomains
```

#### 3. **Database Connection (AstraDB)**

```javascript
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT);

// Collections used:
// - pbmp_chat: Knowledge base documents with vectors
// - leads: Captured lead/subscriber data
```

#### 4. **Gemini AI Setup**

```javascript
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.6, // Moderate creativity
    topP: 0.9, // Focus on likely responses
    topK: 35, // Limit token pool
    maxOutputTokens: 1024, // Max response length
  },
});
```

#### 5. **Embeddings Model**

```javascript
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: GEMINI_API_KEY,
  modelName: "embedding-001",
});
```

Used for vector search against knowledge base.

### API Endpoints

#### **POST /api/chat** (Main Chat Endpoint)

**Request Format:**

```json
{
  "messages": [
    {
      "role": "user",
      "parts": [{ "type": "text", "text": "What is PBMP?" }]
    }
  ]
}
```

**Response:**

- Streams text chunks as `0:{json_text}\n`
- Includes diagram markers: `[DIAGRAM_PROMPT:personal]`
- Real-time server-sent events (SSE)

**Flow:**

1. Extract latest message from array
2. Generate embedding for vector search
3. Query AstraDB for relevant knowledge base docs
4. Build system prompt with context
5. Maintain conversation history (max 10 messages)
6. Stream response from Gemini
7. Add diagram prompt if relevant

**System Prompt:** Instructs Gemini to:

- Act as PBMP ChatBot from Grow24.ai
- Only discuss PBMP, Grow24.ai, and Data Science
- Redirect off-topic questions
- Explain diagrams naturally (not say "I can't show diagrams")
- Provide helpful, actionable responses

#### **POST /api/leads** (Lead Capture)

**Request Format:**

```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "source": "website",
  "timestamp": "2026-01-30T10:00:00Z"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Thank you! We've sent you a confirmation email.",
  "data": {
    "email": "user@example.com",
    "name": "John Doe",
    "status": "new",
    "createdAt": "2026-01-30T10:00:00Z"
  }
}
```

**Process:**

1. Validate email format
2. Normalize email (lowercase, trim)
3. Check if lead exists in AstraDB
4. Update if exists, create if new
5. Send welcome email via Nodemailer
6. Return success response

**Email Template:**

- HTML formatted with Grow24.ai branding
- Welcome message with feature highlights
- CTA button to platform
- Professional footer

#### **POST /whatsapp/webhook** (WhatsApp Integration)

Handled by `whatsapp-service.js`

- Receives messages from WhatsApp Cloud API
- Routes to chat handler
- Sends responses back to WhatsApp

#### **GET /** (Health Check)

Returns server status and available endpoints.

### Environment Variables

**Required:**

```
GEMINI_API_KEY=your_gemini_api_key
ASTRA_DB_API_ENDPOINT=https://your-database-id-region.apps.astra.datastax.co
ASTRA_DB_APPLICATION_TOKEN=AstraCS:...
```

**Optional:**

```
ASTRA_DB_NAMESPACE=grow24          # Default namespace
PBMP_ASTRA_DB_COLLECTION=pbmp_chat # Default collection
PORT=3000                          # Server port
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@grow24.ai
```

### Key Functions & Flow

#### Chat Processing Flow

```javascript
app.post('/api/chat', async (req, res) => {
  1. Extract latest message
  2. Validate message exists
  3. Generate embedding
     └─→ embeddings.embedQuery(messageText)

  4. Query Vector Database
     └─→ collection.find(null, { sort: { $vector }, limit: 5 })
     └─→ Filter by similarity > 0.7

  5. Build Conversation Context
     └─→ Extract previous messages
     └─→ Trim to max 10 messages
     └─→ Limit to 2000 characters

  6. Create Chat History
     └─→ System prompt
     └─→ History of messages
     └─→ Current user message

  7. Start Chat Session
     └─→ model.startChat({ history })

  8. Stream Response
     └─→ for await (chunk of result.stream)
     └─→ Send chunk as SSE: 0:{json}

  9. Post-Process
     └─→ Add diagram prompt if relevant
     └─→ Log metrics and response length

  10. Send End Signal
      └─→ res.end()
})
```

#### Lead Processing Flow

```javascript
app.post('/api/leads', async (req, res) => {
  1. Extract & validate email
  2. Normalize email (lowercase, trim)

  3. Check for Duplicates
     └─→ leadsCollection.findOne({ email })
     └─→ If exists: UPDATE
     └─→ If new: CREATE

  4. Save to AstraDB
     └─→ leadsCollection.insertOne/updateOne()

  5. Send Welcome Email
     └─→ Check if EMAIL_USER configured
     └─→ Build HTML email template
     └─→ transporter.sendMail()

  6. Return Response
     └─→ Success (even if email fails)
     └─→ Include lead data
})
```

### WhatsApp Service (whatsapp-service.js)

Separate module handling WhatsApp Cloud API integration:

- Receives webhook requests from Meta
- Routes messages through chat API
- Formats responses back to WhatsApp
- Handles media (images, voice)

---

## 🗄️ Database (AstraDB)

### Overview

AstraDB is a cloud-native vector database from DataStax, perfect for AI applications.

**URL Format:**

```
https://{database-id}-{region}.apps.astra.datastax.co
```

**Example:**

```
https://566a347e-19d2-43fe-99a1-6e6829f1c4e8-us-east-2.apps.astra.datastax.co
```

### Collections

#### 1. **pbmp_chat** (Knowledge Base)

Stores all PBMP-related documentation with vector embeddings.

**Fields:**

```javascript
{
  "_id": "document_id",
  "text": "Full document text",
  "content": "Additional context",
  "$vector": [0.123, 0.456, ...] // 768-dimensional embedding
}
```

**Usage:**

```javascript
// Vector search for similar documents
const cursor = collection.find(null, {
  sort: { $vector: embedding },
  limit: 5, // Top 5 results
});
```

**Documents Loaded From:** `hbmpKB.txt`

#### 2. **leads** (Lead Tracking)

Captures subscriber/lead information for marketing.

**Fields:**

```javascript
{
  "_id": "auto_generated",
  "email": "user@example.com",
  "name": "John Doe",
  "source": "website",
  "status": "new",
  "createdAt": "2026-01-30T10:00:00Z",
  "lastUpdated": "2026-01-30T10:00:00Z"
}
```

### Knowledge Base Loading (loadDocs.js)

**Purpose:** Populate `pbmp_chat` collection with documents

**Steps:**

```javascript
1. Read hbmpKB.txt file
2. Split into chunks
3. For each chunk:
   └─→ Generate embedding
   └─→ Create document with text and vector
   └─→ Insert into pbmp_chat collection
4. Log completion statistics
```

**Run Command:**

```bash
npm run load-docs
```

### Indexing & Search

AstraDB automatically creates indexes for:

- Document ID (`_id`)
- Vector field (`$vector`) - for similarity search
- Metadata fields (email, status)

**Search Mechanics:**

```javascript
// Find documents similar to query embedding
const similar = await collection.find(null, {
  sort: { $vector: queryEmbedding },
  limit: 5,
});

// Returns documents ranked by cosine similarity
// Most similar documents returned first
```

---

## 🤖 AI Integration (Google Gemini)

### Models Used

| Model              | Purpose           | Token Limit |
| ------------------ | ----------------- | ----------- |
| `gemini-2.0-flash` | Chat responses    | Varies      |
| `embedding-001`    | Vector embeddings | N/A         |

### Gemini 2.0 Flash Model

**Configuration:**

```javascript
{
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.6,      // Balanced creativity/consistency
    topP: 0.90,           // Nucleus sampling
    topK: 35,             // Diversity in token selection
    maxOutputTokens: 1024  // Prevent overly long responses
  }
}
```

**Parameters Explained:**

- **Temperature (0.6):**
  - 0 = Deterministic, same answer always
  - 0.6 = Balanced (current setting)
  - 1.0 = Very creative, random

- **topP (0.90):**
  - Cumulative probability threshold
  - Higher = consider more tokens
  - Lower = more focused responses

- **topK (35):**
  - Consider only top K most likely tokens
  - Higher = more diversity
  - Lower = more predictable

### Embedding Model (embedding-001)

**Purpose:** Convert text to 768-dimensional vectors

**Usage:**

```javascript
const embedding = await embeddings.embedQuery("What is PBMP?");
// Returns: [0.123, 0.456, 0.789, ..., 0.012] (768 values)
```

**Vector Search:**
Databases use cosine similarity to find similar documents:

```
similarity = dot_product(vector1, vector2) / (magnitude1 * magnitude2)
```

### Prompt Engineering

**System Prompt Structure:**

```
1. IDENTITY
   - Name: PBMP ChatBot
   - Company: Grow24.ai
   - Product: PBMP

2. TOPIC RESTRICTIONS (STRICT)
   - Only discuss PBMP, Grow24.ai, Data Science
   - Redirect off-topic questions

3. PERSONALITY & APPROACH
   - Friendly and professional
   - Enthusiastic about PBMP

4. RESPONSE QUALITY GUIDELINES
   - Use context when available
   - Structure with headings/bullets
   - Keep responses concise
   - Actionable next steps

5. KNOWLEDGE BASE CONTEXT
   - ${docContext} - retrieved documents
   - Fallback to general knowledge if no context

6. IMPORTANT NOTES
   - Be helpful about PBMP's value proposition
   - Don't say "I can't show diagrams"
   - System handles diagram display automatically
```

### Conversation History Management

**Goal:** Balance context with token limits

```javascript
// Strategy 1: Message Count Limit
MAX_HISTORY_MESSAGES = 10;

// Strategy 2: Character Limit
MAX_HISTORY_CHARS = 2000;

// Implementation:
conversationHistory = messages
  .slice(-MAX_HISTORY_MESSAGES)
  .filter((msg) => totalChars < MAX_HISTORY_CHARS);
```

---

## 🔗 Widget Embedding

### How It Works

The chatbot can be embedded in **any website** as a floating widget.

### Two Approaches

#### 1. **Script Tag Method** (Recommended)

Add this to your HTML before `</body>`:

```html
<script
  src="https://grow24.zeabur.app/pbmp-chat-widget.js"
  data-pbmp-chat
  data-api-endpoint="https://pbmpchatbotbackend.zeabur.app/api/chat"
  data-position="bottom-right"
></script>
```

**Attributes:**

- `data-pbmp-chat`: Identifies this as PBMP widget
- `data-api-endpoint`: Backend API URL
- `data-position`: Widget position (bottom-right or bottom-left)

#### 2. **React Component Method**

```tsx
import ChatWidget from "@pbmp/chat-widget";

<ChatWidget
  apiEndpoint="https://pbmpchatbotbackend.zeabur.app/api/chat"
  position="bottom-right"
/>;
```

### Build Process (vite.widget.config.ts)

**Goal:** Create a single, standalone JavaScript file

**Build Command:**

```bash
npm run build:widget
```

**Output:**

```
dist-widget/
├── pbmp-chat-widget.js    # All-in-one widget
├── pbmp-chat-widget.css   # Styles
└── pbmp-chat-widget.map   # Source map (optional)
```

**Format:** IIFE (Immediately Invoked Function Expression)

```javascript
// Bundles React, components, styles
// No external dependencies needed
// Just include the script tag
```

### Widget Initialization (widget.tsx)

```typescript
// 1. Auto-detect from script attributes
const init = () => {
  const script = document.currentScript as HTMLScriptElement
  const apiEndpoint = script?.dataset.apiEndpoint
  const position = script?.dataset.position

  // Create widget and mount to DOM
  const container = document.createElement('div')
  const root = ReactDOM.createRoot(container)
  root.render(<ChatWidget apiEndpoint={apiEndpoint} position={position} />)
}

// 2. Manual initialization (global function)
window.initPBMPChat = init

// 3. Auto-run if data-pbmp-chat attribute present
if (script?.dataset.pbmpChat) {
  init()
}
```

### Widget Assets

Required files when embedding:

```
dist-widget/
├── pbmp-chat-widget.js      (Required)
├── pbmp-chat-widget.css     (Optional)
public/
├── pbmp-logo.svg            (Referenced in widget)
├── PersonalSide.png         (Diagram image)
└── ProfessionalSide.png     (Diagram image)
```

**Deployment Location:**

```
grow24.ai/pbmp-chatbot/
├── pbmp-chat-widget.js
├── pbmp-logo.svg
├── PersonalSide.png
└── ProfessionalSide.png
```

---

## 🚀 Deployment

### Frontend Deployment (Vercel)

**Project:** pbmpchatbot.vercel.app

**Configuration (vercel.json):**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Build Process:**

1. `npm install` - Install dependencies
2. `npm run build` - TypeScript compilation + Vite bundling
3. Output → `dist/` folder
4. Served as static site

**Environment Variables:**

- `VITE_API_ENDPOINT` - Backend API URL (optional, defaults to localhost:3000)

**Deployment Trigger:**

- Push to git → Vercel auto-builds
- Preview deployments for pull requests
- Production deployment on main branch

### Backend Deployment (Zeabur)

**Project:** pbmpchatbotbackend.zeabur.app

**Configuration:**

- Platform: Zeabur (Chinese cloud platform)
- Runtime: Node.js
- Port: 3000

**Deployment Process:**

1. Connect Git repository
2. Push code changes
3. Zeabur auto-builds and deploys
4. Automatic restart on environment variable changes

**Required Environment Variables:**

```
GEMINI_API_KEY=xxxxx
ASTRA_DB_API_ENDPOINT=xxxxx
ASTRA_DB_APPLICATION_TOKEN=xxxxx
ASTRA_DB_NAMESPACE=grow24
PBMP_ASTRA_DB_COLLECTION=pbmp_chat
EMAIL_USER=grow24.ai.collaboration@gmail.com
EMAIL_PASSWORD=xxxxx
EMAIL_FROM=noreply@grow24.ai
PORT=3000
```

**Health Check:**

```
GET https://pbmpchatbotbackend.zeabur.app/
```

### Widget Hosting (GoDaddy/grow24.ai)

**Method:** Manual file upload via cPanel

**Steps:**

1. Build widget: `npm run build:widget`
2. Login to GoDaddy cPanel
3. Navigate to File Manager → public_html
4. Create folder: `pbmp-chatbot`
5. Upload files:
   - `dist-widget/pbmp-chat-widget.js`
   - `dist-widget/pbmp-chat-widget.css`
   - `public/pbmp-logo.svg`
   - `public/PersonalSide.png`
   - `public/ProfessionalSide.png`

**Access:**

```
https://grow24.ai/pbmp-chatbot/pbmp-chat-widget.js
```

### Environment Parity

| Environment    | Frontend URL                           | Backend URL                           | Purpose             |
| -------------- | -------------------------------------- | ------------------------------------- | ------------------- |
| **Local**      | http://localhost:5173                  | http://localhost:3000                 | Development         |
| **Staging**    | https://pbmpchatbot-staging.vercel.app | TBD                                   | Testing             |
| **Production** | https://pbmpchatbot.vercel.app         | https://pbmpchatbotbackend.zeabur.app | Live Users          |
| **Embedded**   | https://grow24.ai                      | https://pbmpchatbotbackend.zeabur.app | Website Integration |

---

## 🔌 Integration Points

### Where PBMP ChatBot is Used

#### 1. **grow24.ai Website**

**Location:** Bottom-right corner of website

**Integration:**

```html
<!-- In index.html or template -->
<script
  src="/pbmp-chatbot/pbmp-chat-widget.js"
  data-pbmp-chat
  data-api-endpoint="https://pbmpchatbotbackend.zeabur.app/api/chat"
  data-position="bottom-right"
></script>
```

**Users:** Website visitors interested in PBMP

**Functionality:**

- Ask questions about PBMP
- Book demonstrations
- Receive welcome emails
- See personal/professional management diagrams

#### 2. **Standalone Chat Application**

**URL:** https://pbmpchatbot.vercel.app

**Users:** Direct link share or marketing campaigns

**Full Features:**

- Complete chat interface
- Message history
- Booking flows
- Diagram viewers
- Audio recording

#### 3. **Mobile Apps (Future)**

**Planned:** React Native version of ChatWidget

**API:** Same `/api/chat` endpoint

#### 4. **WhatsApp Business Account (In Progress)**

**Endpoint:** `/whatsapp/webhook`

**Flow:**

```
WhatsApp Message
    ↓
→ Zeabur webhook
    ↓
Route to /api/chat
    ↓
← Gemini Response
    ↓
← Send to WhatsApp
```

**Handler:** `whatsapp-service.js`

### Data Flow Between Components

```
User Types in Widget
    ↓
ChatWidget.tsx
    ↓
chatService.sendMessage()
    ↓
HTTP POST to /api/chat
    ↓
Express Backend
    ├─ Generate embedding
    ├─ Query AstraDB for docs
    ├─ Stream Gemini response
    └─ Send SSE chunks
    ↓
Frontend parses 0:{json} format
    ↓
Update messages state
    ↓
Re-render UI
    ↓
User sees response
```

### Lead Capture Integration

```
User clicks "Book a Demo" or types booking intent
    ↓
MeetingBooking.tsx displays form
    ↓
User submits email + name
    ↓
HTTP POST to /api/leads
    ↓
Backend:
├─ Validate email
├─ Check duplicates
├─ Save to AstraDB.leads
├─ Send welcome email
└─ Return success
    ↓
Frontend shows confirmation
    ↓
Email arrives in user's inbox
```

---

## ✨ Key Features

### 1. **Intelligent Chat**

- **AI Model:** Google Gemini 2.0 Flash
- **Context Awareness:** Retrieves relevant docs from knowledge base
- **Conversation History:** Maintains up to 10 previous messages
- **Real-time Streaming:** SSE for live response display
- **Smart Prompt Engineering:** Scoped to PBMP/Grow24.ai topics

### 2. **Lead Generation**

- **Email Validation:** Checks for valid email format
- **Duplicate Detection:** Updates existing leads instead of creating duplicates
- **Automated Emails:** Welcome email sent immediately
- **Database Storage:** Persists in AstraDB for CRM integration
- **Graceful Degradation:** Works even if email service fails

### 3. **Intent Detection**

**Booking Intent:**

- Keywords: book, meeting, schedule, demo, appointment, call
- Triggers: MeetingBooking form
- Purpose: Capture lead information

**Diagram Request:**

- Keywords: diagram, visual, flowchart, show me
- Types: Personal cycle, Professional cycle
- Feature: Auto-detect from context

**Off-Topic Detection:**

- Redirects non-PBMP questions
- Maintains conversation focus
- Suggests alternative topics

### 4. **Vector Search**

- **Embedding Model:** Google Embeddings 001 (768 dimensions)
- **Database:** AstraDB vector store
- **Similarity Threshold:** 0.7 (cosine similarity)
- **Top Results:** 5 most relevant documents
- **Performance:** Sub-100ms queries

### 5. **Responsive Design**

- **Mobile First:** Widget adapts to screen size
- **Flexible Positioning:** Bottom-right or bottom-left
- **Toggle Animation:** Smooth open/close
- **Keyboard Support:** Tab navigation, Enter to send

### 6. **Audio Input**

- **Browser API:** Web Audio API for recording
- **Format:** WAV/WebM
- **Processing:** Optional (can send audio or transcribed text)
- **Component:** AudioRecorder.tsx

### 7. **Multi-Channel Support**

- Website widget
- Standalone app
- WhatsApp Business (in progress)
- Mobile apps (planned)

---

## 🛠️ Development Workflow

### Local Development Setup

#### 1. **Frontend Development**

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# Opens http://localhost:5173

# Build for production
npm run build

# Build widget only
npm run build:widget

# Preview production build
npm run preview

# Type checking & linting
npm run lint
```

**Vite Configuration:**

- Dev server port: 5173
- Build output: `dist/`
- Source maps: Enabled for debugging

#### 2. **Backend Development**

```bash
# Navigate to backend
cd pbmp-backend

# Install dependencies
npm install

# Start server
npm start
# Or with dev mode (same thing)
npm run dev

# Load documents to vector DB
npm run load-docs
```

**Server Features:**

- Auto-restart on file changes (use nodemon if needed)
- Console logging for debugging
- CORS enabled for local origin (localhost:3001, 5173)
- Hot reload: No (restart required)

#### 3. **Environment Setup**

**Frontend (.env):**

```
VITE_API_ENDPOINT=http://localhost:3000/api/chat
```

**Backend (.env):**

```
GEMINI_API_KEY=your_key_here
ASTRA_DB_API_ENDPOINT=https://...
ASTRA_DB_APPLICATION_TOKEN=AstraCS:...
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Testing Workflow

#### Manual Testing

```bash
# Test chat endpoint with curl
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "parts": [{"type": "text", "text": "What is PBMP?"}]
    }]
  }'

# Test leads endpoint
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "source": "test"
  }'
```

#### Browser DevTools

- **Console:** Check for errors, warnings
- **Network:** Monitor API calls, response times
- **Application:** Inspect stored data
- **Performance:** Profile slow interactions

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
# ... edit files ...

# Stage and commit
git add .
git commit -m "Add new feature: description"

# Push to remote
git push origin feature/new-feature

# Create Pull Request on GitHub
# → Code review
# → Merge to main

# Vercel auto-deploys from main branch
```

### Common Development Tasks

#### Add New Chat Feature

1. Create component in `src/components/`
2. Import in `App.tsx` or `ChatWidget.tsx`
3. Add to message types if needed
4. Update intent detection logic
5. Test locally
6. Deploy via git push

#### Update System Prompt

1. Edit prompt in `server.js` (search for "You are PBMP ChatBot")
2. Restart server
3. Test chat responses
4. Commit and push

#### Load New Knowledge Base

1. Update `pbmp-backend/hbmpKB.txt`
2. Run `npm run load-docs` in backend
3. Verify in AstraDB console
4. Test vector search queries

#### Deploy Widget Updates

1. Update components in `src/widget/`
2. Run `npm run build:widget`
3. Upload new files to grow24.ai via cPanel
4. Clear browser cache
5. Test on grow24.ai website

---

## 🆘 Troubleshooting Guide

### Frontend Issues

#### Widget Not Appearing

**Symptoms:** Chat button not visible on website

**Debugging Steps:**

1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab:
   - Is `pbmp-chat-widget.js` loading? (Status 200?)
   - Are CSS files loading?
   - Are image files (logo, diagrams) loading?

**Common Fixes:**

- Verify file URLs are correct
- Check CORS errors (check browser console)
- Clear browser cache (Ctrl+Shift+Delete)
- Verify script tag is before `</body>`

#### Messages Not Sending

**Symptoms:** Chat input works, but no response appears

**Check:**

1. Network tab → POST `/api/chat` response
   - Is it 200 OK?
   - Check response body for errors
2. Console → Any JavaScript errors?
3. Backend logs → Is request being received?

**Common Fixes:**

- Verify `data-api-endpoint` is correct
- Check CORS configuration on backend
- Ensure backend is running
- Verify API endpoint is accessible (test with curl)

#### Styling Issues

**Symptoms:** Widget looks broken or misaligned

**Check:**

1. Is CSS file loading? (Network tab)
2. Any CSS errors in Console?
3. Is there a CSS conflict with website styles?

**Fixes:**

- Ensure CSS has proper namespacing (classes prefixed with `pbmp-`)
- Check z-index of widget (should be high)
- Test in incognito mode (eliminates browser extensions)

### Backend Issues

#### API Returning 500 Error

**Symptoms:** "/api/chat" returns 500 Internal Server Error

**Debugging:**

1. Check server console for error messages
2. Look for stack traces
3. Verify environment variables are set:
   ```bash
   echo $GEMINI_API_KEY
   echo $ASTRA_DB_API_ENDPOINT
   ```

**Common Causes:**

- Missing environment variable
- Invalid API key (expired, quota exceeded)
- AstraDB connection failure
- Gemini API rate limit exceeded

**Fixes:**

1. Verify all env vars are set
2. Check API key expiration
3. Verify AstraDB credentials
4. Wait before retrying (if rate limited)

#### CORS Errors

**Symptoms:** Browser error "No 'Access-Control-Allow-Origin' header"

**Check:**

1. Verify frontend URL is in CORS whitelist
2. Check CORS logs in server console

**Fixes:**

1. Add origin to `allowedOrigins` array in `server.js`
2. If using _.vercel.app or _.zeabur.app, should auto-allow
3. Test with curl (no CORS issues):
   ```bash
   curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{...}'
   ```

#### Email Not Sending

**Symptoms:** Lead captured but no email received

**Check:**

1. Console for "Email sending error"
2. Verify EMAIL_USER and EMAIL_PASSWORD are set
3. Check spam folder in recipient email
4. Verify Gmail app password (not regular password)

**Fixes:**

1. Generate Gmail app password:
   - Google Account → Security → App passwords
   - Create password for "Mail" and "Windows Computer"
2. Update EMAIL_PASSWORD environment variable
3. Enable "Less secure app access" (if not using app password)
4. Test with Nodemailer test:
   ```javascript
   transporter.verify((error, success) => {
     if (error) console.log(error);
     else console.log("Email ready:", success);
   });
   ```

#### Database Connection Failing

**Symptoms:** AstraDB errors in logs

**Check:**

1. Verify ASTRA_DB_API_ENDPOINT format
2. Verify ASTRA_DB_APPLICATION_TOKEN is valid
3. Check AstraDB status page

**Fixes:**

1. Generate new token in AstraDB console
2. Verify endpoint is correct (check AstraDB dashboard)
3. Test connection with DataAPIClient:
   ```javascript
   const client = new DataAPIClient(token);
   const db = client.db(endpoint);
   console.log("Connected:", db);
   ```

### Common Configuration Issues

| Issue                       | Check                      | Fix                                                |
| --------------------------- | -------------------------- | -------------------------------------------------- |
| Widget shows but can't chat | API endpoint URL           | Verify in data-api-endpoint                        |
| Responses are slow          | Network latency, API quota | Check backend location, Gemini quotas              |
| Booking form doesn't work   | /api/leads endpoint        | Verify backend is running                          |
| Diagrams don't show         | Image URLs                 | Check PersonalSide.png, ProfessionalSide.png paths |
| Old version still cached    | Browser cache              | Hard refresh (Ctrl+Shift+R)                        |
| Conversation history lost   | State management           | Browser localStorage (if implemented)              |

### Performance Optimization

#### If Widget is Slow

1. **Reduce streaming latency:**
   - Verify backend is close geographically
   - Check Gemini API response times
   - Check AstraDB query performance

2. **Optimize frontend:**
   - Minimize component re-renders
   - Use React.memo for message bubbles
   - Lazy load images

3. **Database optimization:**
   - Ensure pbmp_chat collection has proper indexes
   - Verify embeddings are pre-generated
   - Check similarity threshold (current: 0.7)

#### If API Rate Limited

**Gemini API Limits:**

- Free tier: 60 requests per minute
- Paid: Higher limits available

**Fixes:**

- Upgrade to paid plan
- Implement request queuing
- Add rate limiting on frontend

---

## 📊 Monitoring & Maintenance

### Health Checks

**Frontend:**

```bash
curl https://pbmpchatbot.vercel.app
# Should load HTML with React app
```

**Backend:**

```bash
curl https://pbmpchatbotbackend.zeabur.app
# Should return:
# {"status": "PBMP Backend is running", "endpoints": [...]}
```

**Widget:**

```bash
curl https://grow24.ai/pbmp-chatbot/pbmp-chat-widget.js
# Should return JavaScript code (not 404)
```

### Logging

**Backend Logs Available at:**

- Zeabur Dashboard → Service → Logs
- Search for error keywords:
  - ❌ (failures)
  - ⚠️ (warnings)
  - ✅ (success)

**Frontend Logs:**

- Browser DevTools → Console
- Check Application tab for stored data

### Regular Maintenance

**Weekly:**

- Check error logs
- Monitor API quotas
- Verify email delivery (check spam folder)

**Monthly:**

- Review conversation topics (improve knowledge base)
- Check lead quality
- Update documentation

**Quarterly:**

- Performance audit
- Security review
- Feature planning

---

## 📞 Support & Escalation

### For Interns

**Questions About:**

- Chat functionality → Check `App.tsx` + `chatService.ts`
- API endpoints → Check `server.js`
- Components → Check `src/components/`
- Deployment → Check deployment section of this doc
- Database → Check AstraDB section

**Resources:**

1. This document (kt.md)
2. Code comments in source files
3. README files in each folder
4. Zeabur/Vercel dashboards for deployment
5. AstraDB console for database

### Common Questions

**Q: How do I add a new feature?**
A: 1) Create component 2) Add to App.tsx 3) Test locally 4) Commit and push

**Q: Why is the widget not showing?**
A: Check if JavaScript file is loading, verify API endpoint, check console errors

**Q: How do I update the knowledge base?**
A: Edit hbmpKB.txt → npm run load-docs → test queries

**Q: Can I modify the system prompt?**
A: Yes, edit in server.js around line 250 → restart server → test

**Q: How are leads stored?**
A: In AstraDB `leads` collection → retrievable via AstraDB console

---

## 🎓 Learning Path for New Interns

### Week 1: Understand the Project

- [ ] Read this entire kt.md document
- [ ] Explore the GitHub repository
- [ ] Run the project locally (frontend + backend)
- [ ] Test the chat functionality
- [ ] Book a demo to see email feature

### Week 2: Deep Dive into Code

- [ ] Read `App.tsx` and understand component hierarchy
- [ ] Read `server.js` and understand API flow
- [ ] Read `chatService.ts` and understand API communication
- [ ] Read `ChatWidget.tsx` and understand embedding

### Week 3: Work on Small Tasks

- [ ] Update system prompt (test locally first)
- [ ] Add a new suggested question
- [ ] Modify styling (CSS)
- [ ] Fix a small bug

### Week 4: Contribute Features

- [ ] Implement a new intent detection
- [ ] Add a new component
- [ ] Deploy to production (with supervision)
- [ ] Present learnings to team

---

## 📈 Future Roadmap

**Planned Features:**

- [ ] Advanced analytics dashboard
- [ ] Custom workflows for different user segments
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] SMS integration
- [ ] Scheduled messages
- [ ] Integration with CRM systems
- [ ] A/B testing framework

---

## 📝 Document Version History

| Version | Date         | Changes                                     |
| ------- | ------------ | ------------------------------------------- |
| 1.0     | Jan 30, 2026 | Initial knowledge transfer document created |
| -       | -            | -                                           |

---

**Last Updated:** January 30, 2026  
**Prepared By:** Development Team  
**For:** New Interns & Team Members

---

### Quick Reference

**Important URLs:**

- Frontend: https://pbmpchatbot.vercel.app
- Backend: https://pbmpchatbotbackend.zeabur.app
- Website: https://grow24.ai
- GitHub: [Your GitHub Repo]
- AstraDB Console: https://astra.datastax.com
- Vercel Dashboard: https://vercel.com
- Zeabur Dashboard: https://zeabur.com

**Key Files:**

- [src/App.tsx](src/App.tsx) - Main chat UI
- [src/widget/ChatWidget.tsx](src/widget/ChatWidget.tsx) - Embedded widget
- [pbmp-backend/server.js](pbmp-backend/server.js) - Backend API
- [src/services/chatService.ts](src/services/chatService.ts) - API client

**Commands:**

```bash
# Frontend
npm run dev              # Start dev server
npm run build           # Production build
npm run build:widget    # Build embeddable widget

# Backend
cd pbmp-backend && npm start  # Start server
npm run load-docs            # Load knowledge base
```

**Environment Variables Checklist:**

- [ ] GEMINI_API_KEY
- [ ] ASTRA_DB_API_ENDPOINT
- [ ] ASTRA_DB_APPLICATION_TOKEN
- [ ] EMAIL_USER
- [ ] EMAIL_PASSWORD
