const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { DataAPIClient } = require('@datastax/astra-db-ts');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const nodemailer = require('nodemailer');
const whatsappService = require('./whatsapp-service');
const voiceService = require('./voice-service');
const mediaService = require('./media-service');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('🌐 CORS: Request with no origin - allowing');
      return callback(null, true);
    }

    const allowedOrigins = [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'https://pbmpchatbot.vercel.app',
      'https://grow24.ai',
      'https://www.grow24.ai',
      'http://grow24.ai',
      'http://www.grow24.ai'
    ];

    console.log(`🌐 CORS: Checking origin: ${origin}`);

    // Allow all Vercel preview deployments
    if (origin.endsWith('.vercel.app')) {
      console.log('✅ CORS: Vercel deployment allowed');
      return callback(null, true);
    }

    // Allow all Zeabur deployments
    if (origin.includes('zeabur.app')) {
      console.log('✅ CORS: Zeabur deployment allowed');
      return callback(null, true);
    }

    // Allow grow24.ai subdomains
    if (origin.includes('grow24.ai')) {
      console.log('✅ CORS: grow24.ai domain allowed');
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`✅ CORS: Origin ${origin} allowed`);
      callback(null, true);
    } else {
      console.log(`❌ CORS: Origin ${origin} NOT allowed`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-PBMP-Automate-Key'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Apply CORS middleware (handles OPTIONS preflight automatically)
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Environment variables
const {
  GEMINI_API_KEY,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_NAMESPACE,
  PBMP_ASTRA_DB_COLLECTION
} = process.env;

// Validate required environment variables
if (!GEMINI_API_KEY) {
  console.error('❌ ERROR: GEMINI_API_KEY is required but not set!');
  console.error('Please set GEMINI_API_KEY in your environment variables.');
  process.exit(1);
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Override via Zeabur Variable: GEMINI_MODEL=gemini-2.5-flash
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const model = genAI.getGenerativeModel({
  model: GEMINI_MODEL,
  generationConfig: {
    temperature: 0.6,        // Controls randomness (0.0-1.0, lower = more focused)
    topP: 0.90,              // Nucleus sampling (0.0-1.0)
    topK: 35,                // Top-K sampling (1-40)
    maxOutputTokens: 1024,   // Maximum response length
    candidateCount: 1        // Number of response candidates
  }
});

// Initialize embeddings
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: GEMINI_API_KEY,
  modelName: "gemini-embedding-001",
  outputDimensionality: 768,
});

// Initialize AstraDB (will be used when we have credentials)
let db = null;
if (ASTRA_DB_API_ENDPOINT && ASTRA_DB_APPLICATION_TOKEN) {
  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  db = client.db(ASTRA_DB_API_ENDPOINT);
  console.log('✅ AstraDB connected');
} else {
  console.log('⚠️  AstraDB not configured - running without database');
}

// Initialize email transporter with SendGrid
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: 'apikey', // This is literally the string 'apikey'
    pass: process.env.SENDGRID_API_KEY, // Your SendGrid API key
  },
});

// Verify email configuration
if (process.env.SENDGRID_API_KEY) {
  transporter.verify(function (error, success) {
    if (error) {
      console.log('⚠️  SendGrid configuration error:', error.message);
    } else {
      console.log('✅ SendGrid email server is ready to send messages');
    }
  });
} else {
  console.log('⚠️  Email not configured - SENDGRID_API_KEY not set');
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'PBMP Backend is running',
    endpoints: ['/api/chat', '/api/leads', '/api/send-email', '/api/voice/hello-world', '/api/voice/status']
  });
});

// Send email endpoint (for Contact Us email template builder)
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, cc, bcc, subject, html, text, attachments: rawAttachments } = req.body || {};

    const toList = Array.isArray(to)
      ? to.map((v) => String(v).trim()).filter(Boolean)
      : (typeof to === 'string' ? to.split(',').map((v) => v.trim()).filter(Boolean) : []);

    if (!toList.length) {
      return res.status(400).json({
        success: false,
        message: 'At least one "to" recipient is required',
      });
    }

    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required',
      });
    }

    if ((!html || typeof html !== 'string' || !html.trim()) && (!text || typeof text !== 'string' || !text.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Either "html" or "text" content is required',
      });
    }

    if (!process.env.SENDGRID_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'SENDGRID_API_KEY is not configured on the backend',
      });
    }

    const toEmailList = (value) => (
      Array.isArray(value)
        ? value.map((v) => String(v).trim()).filter(Boolean)
        : (typeof value === 'string' ? value.split(',').map((v) => v.trim()).filter(Boolean) : [])
    );

    const attachments = Array.isArray(rawAttachments)
      ? rawAttachments
        .filter((a) => a && typeof a.filename === 'string' && typeof a.content === 'string')
        .map((a) => ({
          filename: a.filename,
          content: a.content,
          encoding: 'base64',
          contentType: typeof a.contentType === 'string' ? a.contentType : undefined,
        }))
      : [];

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@grow24.ai',
      to: toList,
      subject: subject.trim(),
      html: typeof html === 'string' ? html : undefined,
      text: typeof text === 'string' ? text : undefined,
      attachments: attachments.length ? attachments : undefined,
    };

    const ccList = toEmailList(cc);
    if (ccList.length) {
      mailOptions.cc = ccList;
    }

    const bccList = toEmailList(bcc);
    if (bccList.length) {
      mailOptions.bcc = bccList;
    }

    mailOptions.headers = {
      'X-SMTPAPI': JSON.stringify({
        filters: {
          clicktrack: {
            settings: {
              enable: 0,
            },
          },
        },
      }),
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('❌ Send email error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send email',
    });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    console.log('📨 Chat request received');
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    // Get latest message
    const latestMessage = messages[messages.length - 1];
    let messageText = '';

    if (latestMessage.parts && Array.isArray(latestMessage.parts)) {
      const textPart = latestMessage.parts.find(p => p.type === 'text' && p.text);
      messageText = textPart?.text || '';
    } else {
      messageText = latestMessage.content || latestMessage.text || '';
    }

    if (!messageText) {
      return res.status(400).json({ error: 'No message content found' });
    }

    console.log('💬 Message:', messageText);

    // Detect if question is about personal/professional cycles
    function detectCycleQuestion(text) {
      const personalKeywords = [
        'personal cycle', 'personal management cycle', 'personal development cycle',
        'personal management', 'personal side', 'individual personal',
        'personal goals', 'personal assessment', 'personal strategy',
        'personal planning', 'personal execution', 'personal life',
        'manage personal', 'personal development', 'personal growth'
      ];

      const professionalKeywords = [
        'professional cycle', 'business cycle', 'professional management cycle',
        'professional management', 'professional side', 'individual professional',
        'business goals', 'corporate strategy', 'business assessment',
        'corporate cycle', 'business planning', 'business execution',
        'organizational cycle', 'business management', 'corporate management'
      ];

      const lowerText = text.toLowerCase();

      // Check for cycle-related words combined with personal/professional
      const hasCycle = lowerText.includes('cycle') || lowerText.includes('process') ||
        lowerText.includes('flow') || lowerText.includes('framework');

      const isPersonal = personalKeywords.some(kw => lowerText.includes(kw)) ||
        (hasCycle && (lowerText.includes('personal') || lowerText.includes('individual')));
      const isProfessional = professionalKeywords.some(kw => lowerText.includes(kw)) ||
        (hasCycle && (lowerText.includes('professional') || lowerText.includes('business') || lowerText.includes('corporate')));

      if (isPersonal && !isProfessional) return 'personal';
      if (isProfessional && !isPersonal) return 'professional';
      // If both or ambiguous, default to personal
      if (isPersonal) return 'personal';
      return null;
    }

    const cycleType = detectCycleQuestion(messageText);
    console.log(`🔍 Cycle detection: "${messageText}" → ${cycleType || 'none'}`);

    // Generate embedding
    const embedding = await embeddings.embedQuery(messageText);

    // Query AstraDB for context
    let docContext = '';
    let documents = []; // Initialize to avoid undefined reference
    if (db) {
      try {
        const collection = await db.collection(PBMP_ASTRA_DB_COLLECTION || 'pbmp_chat');
        const cursor = collection.find(null, {
          sort: { $vector: embedding },
          limit: 5,
        });
        documents = await cursor.toArray();

        // Filter by similarity if available, otherwise use all documents
        const relevantDocs = documents.filter(doc => {
          // If similarity score is available, filter by threshold
          // If not available, include all documents
          return doc.$similarity === undefined || doc.$similarity > 0.7;
        });

        docContext = relevantDocs
          .slice(0, 5)  // Take top 5 most relevant
          .map(doc => doc.text || doc.content || '')
          .filter(text => text.trim().length > 0)
          .join('\n\n---\n\n')  // Better separator
          .trim();

        console.log(`📚 Retrieved ${documents.length} documents, ${relevantDocs.length} relevant`);
      } catch (dbError) {
        console.warn('⚠️  Database query failed:', dbError.message);
        docContext = '';
        documents = [];
      }
    } else {
      console.log('ℹ️  No database - using AI without context');
    }

    // Create system prompt
    const systemPrompt = `You are PBMP ChatBot, an AI assistant representing Grow24.ai's flagship product: PBMP (Personal & Business Management Platform).

YOUR IDENTITY:
- Name: PBMP ChatBot
- Company: Grow24.ai
- Product: PBMP (Personal & Business Management Platform)
- Role: Friendly team member helping users understand PBMP, Grow24.ai, and Data Science Technologies

TOPIC RESTRICTIONS (STRICT):
You can ONLY discuss:
1. **PBMP (Personal & Business Management Platform)** - Features, capabilities, methodology, frameworks
   - Personal Management: Task management, goal setting, personal finance tracking, productivity, personal planning, time management
   - Business Management: Strategic planning, operations, finance, HR, marketing, sales, supply chain, project management
   - Both areas leverage Data Science Technologies for insights and optimization
2. **Grow24.ai** - Company information, mission, services
3. **Data Science Technologies** - Technologies relevant to PBMP and business management
4. **Normal greetings** - Hello, Hi, How are you, etc. (respond naturally)

FOR ANY OTHER TOPICS:
- Politely redirect: "I'm here to help you learn about PBMP (Personal & Business Management Platform), Grow24.ai, and Data Science Technologies. Is there something specific about these topics I can help you with?"
- Do NOT answer questions about food, weather, general conversation, or unrelated topics
- Do NOT make up features or capabilities outside of PBMP/Grow24.ai/Data Science scope

PERSONALITY & APPROACH:
- Be warm, friendly, and conversational for greetings
- Be helpful and enthusiastic about PBMP, Grow24.ai, and Data Science Technologies
- Use a professional but approachable tone
- Stay focused on your designated topics

RESPONSE QUALITY GUIDELINES:
- **Use Context When Available**: Prioritize information from the provided context below for detailed answers
- **General Knowledge**: For general PBMP questions, provide helpful answers based on PBMP being Grow24.ai's Personal & Business Management Platform
- **Structure**: Use clear headings, bullet points, and markdown formatting
- **Length**: Keep responses concise (2-4 paragraphs) unless the question requires detailed explanation
- **Citations**: When referencing specific information from context, mention it naturally (e.g., "According to PBMP documentation...")
- **Actionable**: End with a clear next step or offer to schedule a demo when relevant
- **Diagrams**: When discussing personal or professional management cycles, explain them clearly. The system automatically provides visual diagrams - NEVER say you cannot create, show, or display diagrams. If asked about diagrams, simply explain that a visual diagram will be available after your response.

KNOWLEDGE BASE USAGE:
- **When context is available**: Use it to provide detailed, accurate answers with specific information
- **When context is limited**: Still answer general questions about PBMP capabilities, areas of coverage, and how it helps with personal and business management
- **For very specific questions**: Only say "I don't have that specific information" for questions requiring exact technical details, pricing, or very specific feature names not in your knowledge
- **For greetings**: Respond naturally without requiring context
- **Cross-reference**: Use multiple context sections when they relate to the question

Context from PBMP knowledge base:
--------------
${docContext || 'No specific context retrieved - use general PBMP knowledge to answer.'}
--------------

IMPORTANT: 
- Always provide helpful, informative answers about PBMP's general capabilities, areas of coverage, and how it helps with personal and business management
- Use the context when available for specific details
- Only say "I don't have that specific information" for very detailed technical questions that require exact specifications not available
- Be enthusiastic and helpful about PBMP's value proposition
- DO NOT say you cannot create or show diagrams - if asked about cycles, explain them and a diagram will be offered automatically
- DO NOT mention that you cannot create visual diagrams - the system handles diagram display automatically`;

    // Build conversation history with smart window management
    const MAX_HISTORY_MESSAGES = 10;  // Limit conversation history
    const MAX_HISTORY_CHARS = 2000;   // Limit total characters

    let conversationHistory = messages.slice(0, -1).map(msg => {
      const role = msg.role === 'user' ? 'user' : 'model';
      let content = '';
      if (msg.parts && Array.isArray(msg.parts)) {
        const textPart = msg.parts.find(p => p.type === 'text' && p.text);
        content = textPart?.text || '';
      } else {
        content = msg.content || msg.text || '';
      }
      return { role, parts: [{ text: content }] };
    });

    // Trim history if too long
    if (conversationHistory.length > MAX_HISTORY_MESSAGES) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY_MESSAGES);
    }

    // Further trim by character count (keep most recent messages)
    let totalChars = 0;
    const trimmedHistory = [];
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const msg = conversationHistory[i];
      const msgChars = msg.parts[0].text.length;
      if (totalChars + msgChars > MAX_HISTORY_CHARS) break;
      totalChars += msgChars;
      trimmedHistory.unshift(msg);
    }
    conversationHistory = trimmedHistory;

    // Generate response
    console.log('🤖 Generating response...');
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Hello! I\'m PBMP ChatBot from Grow24.ai, and I\'m excited to help you learn about PBMP (Personal & Business Management Platform). I\'m here to answer your questions, share information, and help you discover how PBMP can transform your business and personal management. How can I assist you today?' }] },
        ...conversationHistory
      ],
    });

    const result = await chat.sendMessageStream(messageText);

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream the response
    let fullResponse = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullResponse += text;
      // Send in format expected by frontend - properly escape JSON
      const escapedText = JSON.stringify(text);
      res.write(`0:${escapedText}\n`);
    }

    // Post-process response (validation after streaming)
    fullResponse = fullResponse.trim();

    // Ensure response isn't too short (if too short, send a follow-up message)
    if (fullResponse.length < 20) {
      const fallbackMessage = "I apologize, but I'm having trouble formulating a response. Could you please rephrase your question?";
      const escapedFallback = JSON.stringify(fallbackMessage);
      res.write(`0:${escapedFallback}\n`);
      fullResponse = fallbackMessage;
    }
    // Note: maxOutputTokens in generationConfig handles length limits, so truncation is rarely needed

    // Add diagram prompt marker if cycle question detected
    if (cycleType) {
      const diagramMarker = `\n\n[DIAGRAM_PROMPT:${cycleType}]`;
      const escapedMarker = JSON.stringify(diagramMarker);
      res.write(`0:${escapedMarker}\n`);
      console.log(`📊 Diagram prompt added for ${cycleType} cycle`);
    }

    // Log response metrics for fine-tuning
    console.log('✅ Response sent:', fullResponse.substring(0, 100) + '...');
    console.log('📊 Response Metrics:', {
      contextDocs: documents.length,
      contextLength: docContext.length,
      responseLength: fullResponse.length,
      historyLength: conversationHistory.length,
      temperature: model.generationConfig?.temperature || 'default',
      diagramPrompt: cycleType || 'none'
    });

    res.end();

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Public media files for WhatsApp commands (image1.jpg, video1.mp4, ...)
const path = require('path');
const fs = require('fs');
const MEDIA_STATIC_DIR = path.join(__dirname, 'media');
if (!fs.existsSync(MEDIA_STATIC_DIR)) {
  fs.mkdirSync(MEDIA_STATIC_DIR, { recursive: true });
}
app.use('/media', express.static(MEDIA_STATIC_DIR, {
  maxAge: '1h',
  fallthrough: true
}));

// Public HTML forms for WhatsApp menu option 3
const FORMS_STATIC_DIR = path.join(__dirname, 'forms');
app.use('/forms', express.static(FORMS_STATIC_DIR, {
  maxAge: '5m',
  fallthrough: true
}));

// WhatsApp integration
app.use('/whatsapp', whatsappService);

// Phase 1 voice PWA — receive recorded command audio (no STT / LLM yet)
app.use('/api/voice', voiceService);

// Phase 1 media PWA — receive image/video captures
app.use('/api/media', mediaService);

// Leads endpoint (for email subscriptions and meeting bookings)
app.post('/api/leads', async (req, res) => {
  try {
    console.log('📝 Lead submission:', req.body);
    const { email, name, source, timestamp, date, time, timezone, phone, ...otherData } = req.body;

    const normalizedPhone = phone ? String(phone).replace(/\D/g, '') : '';
    const isWhatsAppSource = String(source || '').toLowerCase().includes('whatsapp');
    const hasEmail = Boolean(email && String(email).includes('@'));

    // Email required unless WhatsApp phone-only CRM touch
    if (!hasEmail && !(isWhatsAppSource && normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address (or phone for WhatsApp source)'
      });
    }

    const normalizedEmail = hasEmail
      ? String(email).toLowerCase().trim()
      : `wa_${normalizedPhone}@whatsapp.pbmp.local`;

    // Always use current server date and time (ignore any provided date/time from frontend)
    const now = new Date();
    const leadDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const leadTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }); // HH:MM am/pm format
    // Use provided timezone if available, otherwise use server's timezone
    const leadTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Save to AstraDB if available
    let leadDocument = null;
    if (db) {
      try {
        const leadsCollection = await db.collection('leads');

        // Match by email, or by phone for WhatsApp contacts
        let existingLead = await leadsCollection.findOne({ email: normalizedEmail });
        if (!existingLead && normalizedPhone) {
          existingLead = await leadsCollection.findOne({ phone: normalizedPhone });
        }

        if (existingLead) {
          // Update existing lead
          leadDocument = {
            ...existingLead,
            name: name || existingLead.name,
            email: hasEmail ? normalizedEmail : (existingLead.email || normalizedEmail),
            phone: normalizedPhone || existingLead.phone || '',
            source: source || existingLead.source,
            date: leadDate,
            time: leadTime,
            timezone: leadTimezone,
            lastUpdated: new Date().toISOString(),
            ...otherData
          };
          const filter = existingLead._id
            ? { _id: existingLead._id }
            : (hasEmail ? { email: normalizedEmail } : { phone: normalizedPhone });
          await leadsCollection.updateOne(filter, { $set: leadDocument });
          console.log('✅ Lead updated in AstraDB:', leadDocument);
        } else {
          // Create new lead
          leadDocument = {
            email: normalizedEmail,
            name: name || '',
            phone: normalizedPhone || '',
            source: source || 'unknown',
            status: otherData.status || 'new',
            date: leadDate,
            time: leadTime,
            timezone: leadTimezone,
            createdAt: timestamp || new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            ...otherData
          };
          await leadsCollection.insertOne(leadDocument);
          console.log('✅ New lead saved to AstraDB:', leadDocument);
        }
      } catch (dbError) {
        console.error('❌ Database save error:', dbError);
        // Continue to send email even if DB fails
        leadDocument = {
          email: normalizedEmail,
          name: name || '',
          phone: normalizedPhone || '',
          source: source || 'unknown',
          date: leadDate,
          time: leadTime,
          timezone: leadTimezone,
          createdAt: timestamp || new Date().toISOString(),
          ...otherData
        };
      }
    } else {
      console.log('⚠️  No database - lead logged only');
      leadDocument = {
        email: normalizedEmail,
        name: name || '',
        phone: normalizedPhone || '',
        source: source || 'unknown',
        date: leadDate,
        time: leadTime,
        timezone: leadTimezone,
        createdAt: timestamp || new Date().toISOString(),
        ...otherData
      };
    }

    // Skip welcome email for synthetic WhatsApp phone-only contacts
    if (!hasEmail) {
      return res.json({
        success: true,
        message: 'WhatsApp contact upserted',
        data: leadDocument
      });
    }

    // Send welcome email to subscriber
    if (process.env.SENDGRID_API_KEY) {
      try {
        // Determine email subject and content based on source
        let emailSubject = 'Welcome to Grow24.ai - Thank You for Your Interest!';
        let emailHeading = 'Welcome to Grow24.ai!';
        let emailMainContent = '';
        let emailCTA = {
          text: 'Explore Grow24.ai',
          url: 'https://grow24.ai'
        };

        // Build submission details for email
        const submissionDetails = [];
        if (name) submissionDetails.push(`<strong>Name:</strong> ${name}`);
        if (email) submissionDetails.push(`<strong>Email:</strong> ${email}`);
        if (otherData.designation) submissionDetails.push(`<strong>Designation:</strong> ${otherData.designation}`);
        if (normalizedPhone || otherData.phone) {
          submissionDetails.push(`<strong>Phone:</strong> ${normalizedPhone || otherData.phone}`);
        }
        if (otherData.title) submissionDetails.push(`<strong>Title:</strong> ${otherData.title}`);
        if (leadDate) submissionDetails.push(`<strong>Date:</strong> ${leadDate}`);
        if (leadTime) submissionDetails.push(`<strong>Time:</strong> ${leadTime}`);
        if (leadTimezone) submissionDetails.push(`<strong>Timezone:</strong> ${leadTimezone}`);
        
        // Add any other fields from the form
        Object.keys(otherData).forEach(key => {
          if (!['title', 'designation', 'phone', 'metadata', 'emailFormat'].includes(key) && otherData[key]) {
            const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
            submissionDetails.push(`<strong>${formattedKey}:</strong> ${otherData[key]}`);
          }
        });

        const submissionDetailsHtml = submissionDetails.length > 0 
          ? `<div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
               <h3 style="margin-top: 0; color: #10b981; font-size: 18px;">Your Submission Details:</h3>
               ${submissionDetails.map(detail => `<p style="margin: 8px 0; font-size: 15px;">${detail}</p>`).join('')}
             </div>`
          : '';

        // Customize based on source - supporting various source formats from website
        if (source === 'demo' || source === 'get-demo' || source === 'getDemo' || 
            source === 'request-demo' || source === 'cta-request-demo') {
          emailSubject = 'Welcome to Grow24.ai - Get a Demo Mail';
          emailHeading = 'Thank You for Requesting a Demo!';
          emailMainContent = `
            <p style="font-size: 16px; margin-bottom: 15px;">
              Thank you for your interest in scheduling a demo of Grow24.ai! We're excited to show you how our Personal & Business Management Platform can transform your growth journey.
            </p>
            ${submissionDetailsHtml}
            <p style="font-size: 16px; margin-bottom: 15px;">
              Our team will reach out to you shortly to confirm your demo appointment. In the meantime, feel free to explore our platform and learn more about how PBMP can help you:
            </p>
            <ul style="font-size: 16px; margin-bottom: 15px; padding-left: 20px;">
              <li>Streamline personal and business management</li>
              <li>Leverage data science for better insights</li>
              <li>Track goals and measure progress effectively</li>
              <li>Optimize operations and decision-making</li>
            </ul>`;
          emailCTA.text = 'Learn More About PBMP';
          
        } else if (source === 'trial' || source === 'free-trial' || source === 'freeTrial' || 
                   source === 'signup' || source === 'start-free-trial') {
          emailSubject = 'Welcome to Grow24.ai - Sign up for our Free Trial';
          emailHeading = 'Welcome to Your Free Trial!';
          emailMainContent = `
            <p style="font-size: 16px; margin-bottom: 15px;">
              Congratulations! You've taken the first step towards transforming your personal and business management with Grow24.ai.
            </p>
            ${submissionDetailsHtml}
            <p style="font-size: 16px; margin-bottom: 15px;">
              Your free trial gives you full access to explore all PBMP features:
            </p>
            <ul style="font-size: 16px; margin-bottom: 15px; padding-left: 20px;">
              <li>Personal Management: Task management, goal tracking, personal finance</li>
              <li>Business Management: Strategic planning, operations, finance, HR</li>
              <li>Data Science Technologies for insights and optimization</li>
              <li>Comprehensive analytics and reporting</li>
            </ul>
            <p style="font-size: 16px; margin-bottom: 15px;">
              Get started now and discover how Grow24.ai can help you achieve extraordinary growth!
            </p>`;
          emailCTA.text = 'Start Your Free Trial';
          
        } else if (source === 'subscribe' || source === 'newsletter' || source === 'subscription' || 
                   source === 'cta-bar' || source === 'cta-section') {
          emailSubject = 'Welcome to Grow24.ai - Subscribe';
          emailHeading = 'Thank You for Subscribing!';
          emailMainContent = `
            <p style="font-size: 16px; margin-bottom: 15px;">
              Thank you for subscribing to Grow24.ai! We're thrilled to have you join our community of professionals who are committed to personal and business growth.
            </p>
            ${submissionDetailsHtml}
            <p style="font-size: 16px; margin-bottom: 15px;">
              As a subscriber, you'll receive:
            </p>
            <ul style="font-size: 16px; margin-bottom: 15px; padding-left: 20px;">
              <li>Latest product updates and feature announcements</li>
              <li>Exclusive insights and best practices</li>
              <li>Early access to new tools and resources</li>
              <li>Tips for personal and business management excellence</li>
              <li>Industry trends and data science innovations</li>
            </ul>
            <p style="font-size: 16px; margin-bottom: 15px;">
              Stay tuned for valuable content that will help you grow!
            </p>`;
          emailCTA.text = 'Visit Grow24.ai';
          
        } else {
          // Default email for any other source
          emailMainContent = `
            <p style="font-size: 16px; margin-bottom: 15px;">
              Thank you for your interest in Grow24.ai! We're excited to have you join our community of professionals transforming their growth journey.
            </p>
            ${submissionDetailsHtml}
            <p style="font-size: 16px; margin-bottom: 15px;">
              We'll keep you informed about:
            </p>
            <ul style="font-size: 16px; margin-bottom: 15px; padding-left: 20px;">
              <li>Latest product updates and features</li>
              <li>Exclusive insights and best practices</li>
              <li>Early access to new tools and resources</li>
              <li>Tips for personal and business growth</li>
            </ul>
            <p style="font-size: 16px; margin-bottom: 15px;">
              In the meantime, feel free to explore our platform and discover how Grow24.ai can help you achieve your goals.
            </p>`;
        }

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailHeading}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; color: white;">
      <img src="${process.env.EMAIL_LOGO_URL || 'https://grow24.ai/grow24.png'}" alt="Grow24.ai Logo" style="max-width: 200px; height: auto; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto; border-radius: 4px;" />
      <h1 style="margin: 0; font-size: 28px; font-weight: 600;">${emailHeading}</h1>
    </div>
    <div style="padding: 30px;">
      <p style="font-size: 16px; margin-bottom: 15px;">
        Hi${name ? ` ${name}` : ''},
      </p>
      ${emailMainContent}
      <div style="text-align: center; margin: 30px 0;">
        <a href="${emailCTA.url}" style="display: inline-block; background: #10b981; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);">
          ${emailCTA.text}
        </a>
      </div>
      <div style="font-size: 14px; color: #6b7280; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
        Best regards,<br>The Grow24.ai Team
      </div>
    </div>
  </div>
</body>
</html>`;

        // Create plain text version
        const emailText = `${emailHeading}\n\nHi${name ? ` ${name}` : ''},\n\n${emailMainContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')}\n\nBest regards,\nThe Grow24.ai Team\n\nVisit us at: ${emailCTA.url}`;

        const mailOptions = {
          from: process.env.EMAIL_FROM || 'noreply@grow24.ai', // Use verified sender email
          to: normalizedEmail,
          subject: emailSubject,
          html: emailHtml,
          text: emailText,
          // Disable SendGrid click tracking to prevent insecure redirects
          headers: {
            'X-SMTPAPI': JSON.stringify({
              'filters': {
                'clicktrack': {
                  'settings': {
                    'enable': 0
                  }
                }
              }
            })
          }
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ ${emailSubject} sent via SendGrid to:`, normalizedEmail);

        res.json({
          success: true,
          message: "Thank you! We've sent you a confirmation email. Check your inbox!",
          data: leadDocument
        });
      } catch (emailError) {
        console.error('⚠️  Email sending error:', emailError);
        // Still return success - lead is saved
        res.json({
          success: true,
          message: 'Thank you for your interest! Our team will be in touch soon.',
          data: leadDocument
        });
      }
    } else {
      // No email configured
      res.json({
        success: true,
        message: 'Thank you for your interest! Our team will be in touch soon.',
        data: leadDocument
      });
    }

  } catch (error) {
    console.error('❌ Lead submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing your request. Please try again later.',
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 PBMP Backend running on http://0.0.0.0:${PORT}`);
  console.log(`📡 API Endpoints:`);
  console.log(`   POST http://0.0.0.0:${PORT}/api/chat`);
  console.log(`   POST http://0.0.0.0:${PORT}/api/leads`);
  console.log(`   POST http://0.0.0.0:${PORT}/api/send-email`);
  console.log(`📱 WhatsApp Integration:`);
  console.log(`   POST http://0.0.0.0:${PORT}/whatsapp/webhook`);
  console.log(`   GET  http://0.0.0.0:${PORT}/whatsapp/status`);
  console.log(`   GET  http://0.0.0.0:${PORT}/media/<file>  (image1.jpg, video1.mp4, …)`);
  console.log(`   GET  http://0.0.0.0:${PORT}/forms/booking.html`);
  console.log(`   GET  http://0.0.0.0:${PORT}/forms/support.html`);
  console.log(`   GET  http://0.0.0.0:${PORT}/whatsapp/status/:messageId`);
  console.log(`   GET  http://0.0.0.0:${PORT}/whatsapp/consent/:phone`);
  console.log(`   POST http://0.0.0.0:${PORT}/whatsapp/test`);
  console.log(`   POST http://0.0.0.0:${PORT}/whatsapp/test-media`);
  console.log(`   POST http://0.0.0.0:${PORT}/whatsapp/test-template`);
  console.log(`   POST http://0.0.0.0:${PORT}/whatsapp/test-menu`);
  console.log(`   POST http://0.0.0.0:${PORT}/whatsapp/test-buttons`);
  console.log(`   POST http://0.0.0.0:${PORT}/whatsapp/test-list`);
  console.log(`🎤 Voice PWA Hello World:`);
  console.log(`   POST http://0.0.0.0:${PORT}/api/voice/hello-world`);
  console.log(`   GET  http://0.0.0.0:${PORT}/api/voice/status`);
  console.log(`   GET  http://0.0.0.0:${PORT}/api/voice/files`);
  console.log(`   GET  http://0.0.0.0:${PORT}/api/voice/download/:filename`);
  console.log(`📸 Media PWA:`);
  console.log(`   POST http://0.0.0.0:${PORT}/api/media/upload`);
  console.log(`   GET  http://0.0.0.0:${PORT}/api/media/status`);
  console.log(`   GET  http://0.0.0.0:${PORT}/api/media/files`);
  console.log(`   GET  http://0.0.0.0:${PORT}/api/media/download/:filename`);
  console.log(`\n✅ Ready to accept requests!\n`);
});
