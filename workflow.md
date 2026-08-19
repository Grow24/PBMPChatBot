# PBMP Chatbot - Complete Workflow Documentation

**Project:** PBMP (Personal & Business Management Platform) Chatbot  
**For:** HBMP (Holistic Business Management Platform) by Grow24.ai  
**Version:** 1.0  
**Date:** January 14, 2026

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [Running the Application](#running-the-application)
5. [Knowledge Base Management](#knowledge-base-management)
6. [Key Features](#key-features)
7. [Configuration](#configuration)
8. [Development Workflow](#development-workflow)
9. [Troubleshooting](#troubleshooting)

---

## 1. Project Overview

### What is PBMP?
PBMP is an AI-powered chatbot assistant for the Holistic Business Management Platform (HBMP). It helps users:
- Learn about HBMP features and capabilities
- Understand HBMP's management methodology (GOST framework)
- Schedule demos and consultations
- Get answers about business and personal management

### Technology Stack
- **Frontend:** React 18 + Vite + TypeScript
- **Backend:** Node.js + Express
- **AI:** Google Gemini 2.0 Flash
- **Vector Database:** AstraDB (DataStax)
- **Embeddings:** Google Gemini Embeddings (768 dimensions)

---

## 2. Architecture

### Project Structure
```
hbmpchat/
├── src/                          # Frontend React Application
│   ├── App.tsx                   # Main app component
│   ├── App.css                   # Styles
│   ├── components/               # React components
│   │   ├── Bubble.tsx           # Message bubbles
│   │   ├── LoadingBubbles.tsx   # Loading animation
│   │   ├── MeetingBooking.tsx   # Meeting booking flow
│   │   ├── PromptSuggestionsRow.tsx
│   │   └── PromptSuggestionsButton.tsx
│   └── services/
│       └── chatService.ts       # API communication
│
├── pbmp-backend/                 # Backend Server
│   ├── server.js                # Express server + API routes
│   ├── loadDocs.js              # Knowledge base loader
│   ├── hbmpKB.txt               # HBMP knowledge base
│   ├── .env                     # Environment variables
│   └── package.json             # Backend dependencies
│
├── public/                       # Static assets
│   └── hbmp-logo.svg            # HBMP logo
│
├── package.json                  # Frontend dependencies
├── vite.config.ts               # Vite configuration
└── tsconfig.json                # TypeScript configuration
```

### System Flow
```
User → React Frontend (port 3001) 
     ↓
     → Backend API (port 3000) 
        ↓
        → Generate Embedding (Gemini)
        ↓
        → Query AstraDB (Vector Search)
        ↓
        → Generate Response (Gemini AI)
        ↓
        → Stream Response Back
```

---

## 3. Setup & Installation

### Prerequisites
- Node.js v18+ 
- npm v9+
- AstraDB account (for knowledge base)
- Google Gemini API key

### Initial Setup

#### Frontend Setup
```bash
cd hbmpchat
npm install
```

#### Backend Setup
```bash
cd hbmpchat/pbmp-backend
npm install
```

### Environment Configuration

**Frontend:** `hbmpchat/.env`
```env
VITE_API_ENDPOINT=http://localhost:3000/api/chat
GEMINI_API_KEY=your_gemini_api_key_here
```

**Backend:** `hbmpchat/pbmp-backend/.env`
```env
# Server
PORT=3000

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# AstraDB Configuration
ASTRA_DB_API_ENDPOINT=https://your-database.apps.astra.datastax.com
ASTRA_DB_APPLICATION_TOKEN=AstraCS:your-token-here
PBMP_ASTRA_DB_COLLECTION=pbmp_chat
```

---

## 4. Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd hbmpchat/pbmp-backend
npm run dev
```
Backend runs on `http://localhost:3000`

**Terminal 2 - Frontend:**
```bash
cd hbmpchat
npm run dev
```
Frontend runs on `http://localhost:3001`

### Accessing the Application
Open browser: `http://localhost:3001`

---

## 5. Knowledge Base Management

### Current Knowledge Base
The knowledge base is stored in `pbmp-backend/hbmpKB.txt` and contains:
- HBMP Doctrine (management principles, naming conventions)
- GOST + OGSM + OKR/KPI Framework
- Strategy lifecycle and cascade models
- Scope model (Corporate, Functional, Enablers)
- External environment analysis framework
- Anti-hallucination rules
- Key HBMP capabilities

### Loading Knowledge Base into AstraDB

**First Time Setup:**
```bash
cd hbmpchat/pbmp-backend
npm run load-docs
```

This will:
1. Read `hbmpKB.txt`
2. Split into chunks (512 characters with 100 character overlap)
3. Generate embeddings using Gemini
4. Store in AstraDB `pbmp_chat` collection

### Updating Knowledge Base

1. Edit `pbmp-backend/hbmpKB.txt` with new content
2. Run the loader again:
```bash
cd hbmpchat/pbmp-backend
npm run load-docs
```

**Note:** This will add new documents. To replace entirely, clear the AstraDB collection first.

### Knowledge Base Structure

The current KB follows this format:
```
1. Section Title
   Section content...

2. Next Section Title
   Section content...
```

Each numbered section becomes a separate document in the vector database.

---

## 6. Key Features

### 6.1 Conversational AI
- **Friendly Personality:** PBMP represents Grow24.ai and HBMP professionally
- **Context-Aware:** Understands conversation history
- **Streaming Responses:** Real-time response generation
- **Natural Greetings:** Responds warmly to casual conversation

### 6.2 Knowledge-Based Answers
- **RAG (Retrieval-Augmented Generation):** Answers based on knowledge base
- **Vector Search:** Finds relevant context using embeddings
- **Grounded Responses:** Only states facts from the knowledge base
- **Provenance:** Can reference source information

### 6.3 Meeting Booking
- **Multi-step Flow:** Email → Name → Title → Date/Time selection
- **Calendar Integration:** Shows available time slots
- **AstraDB Storage:** Saves leads to `leads` collection
- **Duplicate Prevention:** Prevents multiple submissions
- **Warm Confirmation:** Success message with next steps

### 6.4 UI Features
- **Compact Header:** Shows small logo and status during chat
- **Initial View:** Large logo and welcome screen when starting
- **New Chat:** Easily start fresh conversations
- **Prompt Suggestions:** Quick-start buttons for common questions
- **Responsive Design:** Works on desktop and mobile
- **Loading States:** Visual feedback during processing

### 6.5 System Prompt Features
The AI assistant follows these guidelines:
- Represents Grow24.ai and HBMP brand
- Friendly but professional tone
- Responds naturally to greetings
- Uses knowledge base for factual questions
- Offers demos when appropriate
- Honest about limitations

---

## 7. Configuration

### 7.1 Customizing AI Behavior

**Edit:** `pbmp-backend/server.js` (lines 115-145)

```javascript
const systemPrompt = `You are PBMP (Personal & Business Management Platform)...`;
```

Key sections:
- **Identity:** Who PBMP is
- **Personality:** Tone and approach
- **Knowledge base instructions:** How to use context
- **Response guidelines:** Formatting and style

### 7.2 Customizing UI

**Colors and Styling:** `hbmpchat/src/App.css`
- Header styles: `.header-section`
- Chat bubbles: `.bubble`
- Buttons: `.new-chat-button`, `.prompt-suggestion-btn`
- Background: `body` gradient

**Logo:** Replace `hbmpchat/public/hbmp-logo.svg`

**Prompt Suggestions:** `hbmpchat/src/components/PromptSuggestionsRow.tsx`
```typescript
const prompts = [
  "What is HBMP?",
  "How can PBMP help with business management?",
  "Tell me about personal management features",
  "Schedule a demo"
];
```

### 7.3 Meeting Booking Configuration

**Contact Person:** `hbmpchat/src/components/MeetingBooking.tsx` (line 123)
```typescript
contactPerson = { name: 'PBMP Expert', title: 'Management Consultant' }
```

**Available Time Slots:** `hbmpchat/src/components/MeetingBooking.tsx` (line 146)
```typescript
const timeSlots = [
  '9:00 am', '9:30 am', '10:00 am', ...
];
```

---

## 8. Development Workflow

### 8.1 Making Changes

**Frontend Changes:**
1. Edit files in `hbmpchat/src/`
2. Changes auto-reload (Vite HMR)
3. Check browser console for errors

**Backend Changes:**
1. Edit `pbmp-backend/server.js`
2. Stop server (Ctrl+C)
3. Restart: `npm run dev`

**Knowledge Base Updates:**
1. Edit `pbmp-backend/hbmpKB.txt`
2. Run: `npm run load-docs`
3. Changes immediately available

### 8.2 Testing

**Test Questions:**
- "What is HBMP?"
- "Explain the GOST framework"
- "What areas does HBMP cover?"
- "Tell me about the management lifecycle"
- "Schedule a demo"

**Test Meeting Booking:**
1. Type "Schedule a demo" or click button
2. Complete all steps
3. Check AstraDB `leads` collection for saved data

### 8.3 Building for Production

**Frontend:**
```bash
cd hbmpchat
npm run build
```
Output: `dist/` folder

**Backend:**
Backend runs as-is with Node.js (no build step needed)

---

## 9. Troubleshooting

### Common Issues

#### 9.1 "Failed to fetch" Error
**Cause:** Backend not running or wrong port

**Solution:**
```bash
cd hbmpchat/pbmp-backend
npm run dev
```
Verify running on port 3000

#### 9.2 "No response from assistant"
**Cause:** AstraDB not connected or no knowledge base

**Solution:**
1. Check `.env` has correct AstraDB credentials
2. Run `npm run load-docs` to load knowledge base
3. Check backend console for errors

#### 9.3 Incomplete Responses
**Cause:** Streaming format issues

**Solution:**
- Already fixed in current version
- Backend uses proper JSON.stringify for escaping

#### 9.4 Meeting Booking Not Saving
**Cause:** Wrong API endpoint or AstraDB credentials

**Solution:**
1. Check backend `.env` has `ASTRA_DB_APPLICATION_TOKEN`
2. Verify `leads` collection exists in AstraDB
3. Check backend console for save errors

#### 9.5 Logo Not Showing
**Cause:** File path or format issue

**Solution:**
- Verify `public/hbmp-logo.svg` exists
- Check SVG is valid XML
- Clear browser cache

---

## 10. API Endpoints

### Backend API Routes

**POST** `/api/chat`
- Purpose: Handle chat messages
- Input: `{ messages: [...] }`
- Output: Streaming response
- Features: RAG, embeddings, vector search

**POST** `/api/leads`
- Purpose: Save meeting bookings
- Input: `{ name, email, title, date, time, ... }`
- Output: `{ success: true, message: "...", data: {...} }`
- Storage: AstraDB `leads` collection

**GET** `/`
- Purpose: Health check
- Output: `{ status: "PBMP Backend is running", endpoints: [...] }`

---

## 11. Key Technologies Explained

### 11.1 RAG (Retrieval-Augmented Generation)
1. User asks question
2. Generate embedding of question (768-dim vector)
3. Search AstraDB for similar documents (vector similarity)
4. Retrieve top 10 most relevant chunks
5. Provide chunks as context to Gemini
6. Gemini generates answer using context
7. Stream response to user

### 11.2 Embeddings
- Model: `embedding-001` (Google Gemini)
- Dimensions: 768
- Purpose: Convert text to numerical vectors for similarity search
- Similarity: Dot product (faster than cosine)

### 11.3 Chunking Strategy
- Chunk Size: 512 characters
- Overlap: 100 characters
- Method: RecursiveCharacterTextSplitter
- Purpose: Break documents into searchable pieces

---

## 12. Future Enhancements

### Potential Improvements
1. **User Authentication:** Track user sessions
2. **Conversation History:** Persistent chat history
3. **Multi-language Support:** Internationalization
4. **Voice Input:** Speech-to-text
5. **Analytics:** Track popular questions
6. **Admin Panel:** Manage knowledge base via UI
7. **Export Chat:** Download conversation transcripts
8. **Feedback System:** Thumbs up/down on responses
9. **Integration Hub:** Connect to external systems
10. **Mobile App:** Native iOS/Android versions

---

## 13. Maintenance

### Regular Tasks

**Weekly:**
- Review chat logs for common questions
- Update knowledge base with new content
- Check AstraDB usage and quotas

**Monthly:**
- Review and update prompt suggestions
- Test all features end-to-end
- Update dependencies (`npm update`)

**As Needed:**
- Add new FAQ content
- Adjust system prompt for better responses
- Monitor API usage (Gemini quota)

---

## 14. Support & Resources

### Documentation
- **Gemini API:** https://ai.google.dev/docs
- **AstraDB:** https://docs.datastax.com/
- **React:** https://react.dev/
- **Vite:** https://vitejs.dev/

### Internal Files
- `pbmp-backend/server.js` - Main backend logic
- `src/App.tsx` - Main frontend component
- `pbmp-backend/hbmpKB.txt` - Knowledge base content

---

## 15. Quick Reference

### Start Development
```bash
# Terminal 1 - Backend
cd hbmpchat/pbmp-backend && npm run dev

# Terminal 2 - Frontend  
cd hbmpchat && npm run dev
```

### Load Knowledge Base
```bash
cd hbmpchat/pbmp-backend && npm run load-docs
```

### Access Application
```
Frontend: http://localhost:3001
Backend:  http://localhost:3000
```

### Key Environment Variables
```env
GEMINI_API_KEY=<your-key>
ASTRA_DB_API_ENDPOINT=<your-endpoint>
ASTRA_DB_APPLICATION_TOKEN=<your-token>
PBMP_ASTRA_DB_COLLECTION=pbmp_chat
```

---

**Last Updated:** January 14, 2026  
**Maintained By:** Development Team  
**Project:** PBMP Chatbot for HBMP (Grow24.ai)
