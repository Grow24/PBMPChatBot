const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config();

const router = express.Router();

// Log all requests to whatsapp routes
router.use((req, res, next) => {
    console.log(`🌐 WhatsApp route hit: ${req.method} ${req.path}`);
    console.log(`🌐 Headers:`, req.headers);
    console.log(`🌐 Body:`, req.body);
    next();
});

// Configuration
const WAPI_URL = process.env.WAPI_URL;
const WAPI_VENDOR_UID = process.env.WAPI_VENDOR_UID;
const WAPI_TOKEN = process.env.WAPI_TOKEN;
const PBMP_API_URL = process.env.PBMP_API_URL || `http://localhost:${process.env.PORT || 3000}/api/chat`;
const WAPI_SEND_MESSAGE_PATH = process.env.WAPI_SEND_MESSAGE_PATH || 'contact/send-message';
// Official WAPI docs paths (verified 2026-08-03)
const WAPI_SEND_MEDIA_PATH = process.env.WAPI_SEND_MEDIA_PATH || 'contact/send-media-message';
const WAPI_SEND_TEMPLATE_PATH = process.env.WAPI_SEND_TEMPLATE_PATH || 'contact/send-template-message';
const WAPI_SEND_INTERACTIVE_PATH = process.env.WAPI_SEND_INTERACTIVE_PATH || 'contact/send-interactive-message';
// Legacy aliases (kept for env compatibility; media now uses WAPI_SEND_MEDIA_PATH)
const WAPI_SEND_IMAGE_PATH = process.env.WAPI_SEND_IMAGE_PATH || WAPI_SEND_MEDIA_PATH;
const WAPI_SEND_DOCUMENT_PATH = process.env.WAPI_SEND_DOCUMENT_PATH || WAPI_SEND_MEDIA_PATH;
const WAPI_SEND_AUDIO_PATH = process.env.WAPI_SEND_AUDIO_PATH || WAPI_SEND_MEDIA_PATH;
const WAPI_SEND_VIDEO_PATH = process.env.WAPI_SEND_VIDEO_PATH || WAPI_SEND_MEDIA_PATH;
const WAPI_SEND_BUTTONS_PATH = process.env.WAPI_SEND_BUTTONS_PATH || WAPI_SEND_INTERACTIVE_PATH;
const WAPI_SEND_LIST_PATH = process.env.WAPI_SEND_LIST_PATH || WAPI_SEND_INTERACTIVE_PATH;
const WAPI_MEDIA_VIA_SEND_MESSAGE = String(process.env.WAPI_MEDIA_VIA_SEND_MESSAGE || 'false').toLowerCase() === 'true';
const WAPI_INTERACTIVE_FALLBACK_TEXT = String(process.env.WAPI_INTERACTIVE_FALLBACK_TEXT || 'true').toLowerCase() !== 'false';
const WAPI_PREFER_NATIVE_MENU = String(process.env.WAPI_PREFER_NATIVE_MENU || 'true').toLowerCase() !== 'false';
const WAPI_DEFAULT_TEMPLATE_NAME = process.env.WAPI_DEFAULT_TEMPLATE_NAME || '';
const WAPI_TEMPLATE_DEFAULT_LANGUAGE = process.env.WAPI_TEMPLATE_DEFAULT_LANGUAGE || 'en';
const MEDIA_MAX_DOWNLOAD_MB = Number(process.env.MEDIA_MAX_DOWNLOAD_MB || 15);
const IDEMPOTENCY_TTL_MS = Number(process.env.WHATSAPP_IDEMPOTENCY_TTL_MS || 24 * 60 * 60 * 1000);
const INBOUND_DEBOUNCE_MS = Number(process.env.WHATSAPP_INBOUND_DEBOUNCE_MS || 20000);
const STATUS_HISTORY_LIMIT = Number(process.env.WHATSAPP_STATUS_HISTORY_LIMIT || 100);
const CUSTOMER_CARE_WINDOW_MS = Number(process.env.WHATSAPP_CUSTOMER_CARE_WINDOW_MS || 24 * 60 * 60 * 1000);
const ENFORCE_CUSTOMER_CARE_WINDOW = String(process.env.WHATSAPP_ENFORCE_WINDOW || 'true').toLowerCase() !== 'false';
const WHATSAPP_WEBSITE_URL = process.env.WHATSAPP_WEBSITE_URL || 'https://grow24.ai';
const WHATSAPP_BOOKING_FORM_URL = process.env.WHATSAPP_BOOKING_FORM_URL
  || 'https://pbmpchatbotbackend.zeabur.app/forms/booking.html';
const WHATSAPP_SUPPORT_FORM_URL = process.env.WHATSAPP_SUPPORT_FORM_URL
  || process.env.WHATSAPP_BOOKING_FORM_URL
  || 'https://pbmpchatbotbackend.zeabur.app/forms/support.html';
const WHATSAPP_HANDOFF_WEBHOOK = process.env.WHATSAPP_HANDOFF_WEBHOOK || '';
const WHATSAPP_HANDOFF_NOTIFY_EMAIL = process.env.WHATSAPP_HANDOFF_NOTIFY_EMAIL || '';
// Voice call = click-to-call + callback request (WAPI has no WhatsApp Calling API)
const WHATSAPP_VOICE_CALL_NUMBER = String(process.env.WHATSAPP_VOICE_CALL_NUMBER || '').trim();
const WHATSAPP_VOICE_CALL_HOURS = String(
    process.env.WHATSAPP_VOICE_CALL_HOURS || 'Mon–Sat, 10:00–19:00 IST'
).trim();
const WHATSAPP_VOICE_CALL_LABEL = String(
    process.env.WHATSAPP_VOICE_CALL_LABEL || 'Grow24 / PBMP'
).trim();
// WhatsApp Flows — in-chat forms (Meta Flow Builder + flow_id)
const WHATSAPP_BOOKING_FLOW_ID = String(process.env.WHATSAPP_BOOKING_FLOW_ID || '').trim();
const WHATSAPP_SUPPORT_FLOW_ID = String(process.env.WHATSAPP_SUPPORT_FLOW_ID || '').trim();
const WHATSAPP_LEAD_FLOW_ID = String(process.env.WHATSAPP_LEAD_FLOW_ID || '').trim();
const WHATSAPP_BOOKING_FLOW_SCREEN = String(process.env.WHATSAPP_BOOKING_FLOW_SCREEN || 'BOOKING_FORM').trim();
const WHATSAPP_SUPPORT_FLOW_SCREEN = String(process.env.WHATSAPP_SUPPORT_FLOW_SCREEN || 'SUPPORT_FORM').trim();
const WHATSAPP_LEAD_FLOW_SCREEN = String(process.env.WHATSAPP_LEAD_FLOW_SCREEN || 'LEAD_ENQUIRY').trim();
const WHATSAPP_FLOW_CTA = String(process.env.WHATSAPP_FLOW_CTA || 'Open Form').trim().slice(0, 20);
const WHATSAPP_FLOW_MODE = String(process.env.WHATSAPP_FLOW_MODE || 'draft').trim().toLowerCase() === 'published'
    ? 'published'
    : 'draft';
// Android Automate POC — shared secret for POST /whatsapp/automate
const AUTOMATE_API_KEY = String(process.env.AUTOMATE_API_KEY || '').trim();
const AUTOMATE_DEFAULT_PHONE = String(process.env.AUTOMATE_DEFAULT_PHONE || '').replace(/\D/g, '');
// Meta Developer App experiments (Calling / catalogue) — not WAPI messaging
const META_GRAPH_API_VERSION = String(process.env.META_GRAPH_API_VERSION || 'v21.0').trim();
const META_ACCESS_TOKEN = String(process.env.META_ACCESS_TOKEN || '').trim();
const META_PHONE_NUMBER_ID = String(process.env.META_PHONE_NUMBER_ID || '').trim();
const META_WABA_ID = String(process.env.META_WABA_ID || '').trim();
const META_APP_ID = String(process.env.META_APP_ID || '').trim();
const WHATSAPP_CALLING_ENABLED = String(process.env.WHATSAPP_CALLING_ENABLED || 'false').toLowerCase() === 'true';
const WHATSAPP_CALLING_INBOUND_ACTION = String(process.env.WHATSAPP_CALLING_INBOUND_ACTION || 'reject')
    .trim()
    .toLowerCase();
const META_GRAPH_INTERACTIVE_FALLBACK = String(process.env.META_GRAPH_INTERACTIVE_FALLBACK || 'false')
    .toLowerCase() === 'true';
const WHATSAPP_CATALOGUE_ID = String(process.env.WHATSAPP_CATALOGUE_ID || '').trim();
const WHATSAPP_CATALOGUE_FALLBACK_TEXT = String(process.env.WHATSAPP_CATALOGUE_FALLBACK_TEXT || '').trim();
const WHATSAPP_CATALOGUE_PRODUCT_IDS = String(process.env.WHATSAPP_CATALOGUE_PRODUCT_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
const WAPI_SEND_CATALOGUE_PATH = process.env.WAPI_SEND_CATALOGUE_PATH || WAPI_SEND_INTERACTIVE_PATH;
const SESSION_STORE_PATH = process.env.WHATSAPP_SESSION_STORE
    ? path.resolve(process.env.WHATSAPP_SESSION_STORE)
    : null;
const CONSENT_STORE_PATH = process.env.WHATSAPP_CONSENT_STORE
    ? path.resolve(process.env.WHATSAPP_CONSENT_STORE)
    : path.join(__dirname, '.whatsapp-consent.json');
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const OPT_OUT_KEYWORDS = (process.env.WHATSAPP_OPT_OUT_KEYWORDS || 'stop,unsubscribe,end,quit,optout,opt-out')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
const OPT_IN_KEYWORDS = (process.env.WHATSAPP_OPT_IN_KEYWORDS || 'start,unstop,subscribe,optin,opt-in')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
const HANDOFF_KEYWORDS = (process.env.WHATSAPP_HANDOFF_KEYWORDS
    || 'agent,human,talk to agent,talk to human,speak to human,customer care,support agent,real person')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
const RESUME_BOT_KEYWORDS = (process.env.WHATSAPP_RESUME_BOT_KEYWORDS
    || 'bot,resume,back to bot,ai,autobot')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
const VOICE_CALL_KEYWORDS = (process.env.WHATSAPP_VOICE_CALL_KEYWORDS
    || 'voice call,voice,phone call,call me,callback,call back,ring me')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
const CALLBACK_REQUEST_KEYWORDS = (process.env.WHATSAPP_CALLBACK_KEYWORDS
    || 'callback,call back,please call,call me back,ring me')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const MAIN_MENU_OPTIONS = [
    { id: 'ask', title: 'Ask a question', keywords: ['1', 'ask', 'question', 'chat'] },
    { id: 'book', title: 'Book a meeting', keywords: ['2', 'book', 'meeting', 'appointment', 'schedule'] },
    { id: 'form', title: 'Fill form (in chat)', keywords: ['3', 'form', 'website', 'link', 'links'] },
    { id: 'agent', title: 'Talk to a human', keywords: ['4', 'agent', 'human', 'support'] },
    { id: 'voice', title: 'Voice call', keywords: ['5', 'voice', 'voice call', 'phone call', 'call me', 'callback', 'call'] },
    { id: 'catalogue', title: 'Product catalogue', keywords: ['7', 'catalog', 'catalogue', 'products', 'shop', 'store'] },
    { id: 'help', title: 'Help / commands', keywords: ['6', 'help', 'menu', 'commands'] }
];

const ASK_SECTION_OPTIONS = [
    { id: 'pbmp', title: 'PBMP / Grow24', keywords: ['1', 'a', 'pbmp', 'grow24', 'grow'] },
    { id: 'other', title: 'Other (math & tools)', keywords: ['2', 'b', 'other', 'math', 'tools', 'zeabur'] }
];

const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const PYTHON_MATH_SCRIPT = path.join(__dirname, 'python', 'math_tools.py');
const MEDIA_COMMANDS_PATH = path.join(__dirname, 'media-commands.json');
const MEDIA_DIR = path.join(__dirname, 'media');
const PUBLIC_BASE_URL = String(
    process.env.PUBLIC_BASE_URL
    || process.env.PBMP_PUBLIC_URL
    || 'https://pbmpchatbotbackend.zeabur.app'
).replace(/\/$/, '');

function loadMediaCommandDefs() {
    try {
        if (fs.existsSync(MEDIA_COMMANDS_PATH)) {
            return JSON.parse(fs.readFileSync(MEDIA_COMMANDS_PATH, 'utf8')) || {};
        }
    } catch (error) {
        console.error('⚠️ Failed to load media-commands.json:', error.message);
    }
    return {};
}

const MEDIA_COMMAND_DEFS = loadMediaCommandDefs();

function envUrlForMediaCommand(canonicalKey) {
    // MEDIA_CMD_IMAGE1_URL, MEDIA_CMD_3D_IMAGE1_URL, MEDIA_CMD_ANIMATED_IMAGE1_URL, MEDIA_CMD_GIF1_URL
    const envKey = `MEDIA_CMD_${String(canonicalKey).toUpperCase()}_URL`;
    const url = process.env[envKey];
    return url && String(url).trim() ? String(url).trim() : null;
}

function findMediaFileOnDisk(canonicalKey, extensions) {
    if (!fs.existsSync(MEDIA_DIR)) return null;
    const exts = Array.isArray(extensions) && extensions.length
        ? extensions
        : ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.webm', '.glb', '.pdf'];
    for (const ext of exts) {
        const fileName = `${canonicalKey}${ext}`;
        const full = path.join(MEDIA_DIR, fileName);
        if (fs.existsSync(full) && fs.statSync(full).isFile()) {
            return fileName;
        }
    }
    // Also accept exact filename without relying on extensions list
    try {
        const files = fs.readdirSync(MEDIA_DIR);
        const match = files.find((f) => {
            const base = f.toLowerCase().replace(/\.[^.]+$/, '');
            return base === canonicalKey.toLowerCase();
        });
        if (match) return match;
    } catch (_) { /* ignore */ }
    return null;
}
console.log('📱 WhatsApp Service Configuration:');
console.log('   WAPI_URL:', WAPI_URL || '❌ NOT SET');
console.log('   WAPI_VENDOR_UID:', WAPI_VENDOR_UID ? '✅ Set' : '❌ NOT SET');
console.log('   WAPI_TOKEN:', WAPI_TOKEN ? '✅ Set' : '❌ NOT SET');
console.log('   PBMP_API_URL:', PBMP_API_URL);
console.log('   WAPI_SEND_MESSAGE_PATH:', WAPI_SEND_MESSAGE_PATH);
console.log('   WAPI_SEND_MEDIA_PATH:', WAPI_SEND_MEDIA_PATH);
console.log('   WAPI_SEND_TEMPLATE_PATH:', WAPI_SEND_TEMPLATE_PATH);
console.log('   WAPI_SEND_INTERACTIVE_PATH:', WAPI_SEND_INTERACTIVE_PATH);
console.log('   WAPI_INTERACTIVE_FALLBACK_TEXT:', WAPI_INTERACTIVE_FALLBACK_TEXT);
console.log('   WAPI_PREFER_NATIVE_MENU:', WAPI_PREFER_NATIVE_MENU);
console.log('   WAPI_DEFAULT_TEMPLATE_NAME:', WAPI_DEFAULT_TEMPLATE_NAME || '(not set)');
console.log('   WHATSAPP_BOOKING_FORM_URL:', WHATSAPP_BOOKING_FORM_URL);
console.log('   WHATSAPP_HANDOFF_WEBHOOK:', WHATSAPP_HANDOFF_WEBHOOK ? '✅ Set' : '(not set)');
console.log('   WHATSAPP_HANDOFF_NOTIFY_EMAIL:', WHATSAPP_HANDOFF_NOTIFY_EMAIL || '(not set)');
console.log('   WHATSAPP_VOICE_CALL_NUMBER:', WHATSAPP_VOICE_CALL_NUMBER || '(not set — set for click-to-call)');
console.log('   WHATSAPP_BOOKING_FLOW_ID:', WHATSAPP_BOOKING_FLOW_ID || '(not set — menu 3 uses HTML links fallback)');
console.log('   AUTOMATE_API_KEY:', AUTOMATE_API_KEY ? '✅ Set' : '(not set — /whatsapp/automate disabled)');
console.log('   AUTOMATE_DEFAULT_PHONE:', AUTOMATE_DEFAULT_PHONE || '(not set)');
console.log('   META_PHONE_NUMBER_ID:', META_PHONE_NUMBER_ID || '(not set — Calling/catalogue Graph path)');
console.log('   WHATSAPP_CALLING_ENABLED:', WHATSAPP_CALLING_ENABLED);
console.log('   WHATSAPP_CALLING_INBOUND_ACTION:', WHATSAPP_CALLING_INBOUND_ACTION);
console.log('   WHATSAPP_FLOW_MODE:', WHATSAPP_FLOW_MODE);
console.log('   WHATSAPP_CATALOGUE_ID:', WHATSAPP_CATALOGUE_ID || '(not set — text catalogue fallback)');
console.log('   CUSTOMER_CARE_WINDOW_MS:', CUSTOMER_CARE_WINDOW_MS);
console.log('   ENFORCE_CUSTOMER_CARE_WINDOW:', ENFORCE_CUSTOMER_CARE_WINDOW);
console.log('   SESSION_STORE_PATH:', SESSION_STORE_PATH || '(memory only)');
console.log('   CONSENT_STORE_PATH:', CONSENT_STORE_PATH);
console.log('   PYTHON_BIN:', PYTHON_BIN);
console.log('   PYTHON_MATH_SCRIPT:', fs.existsSync(PYTHON_MATH_SCRIPT) ? '✅ found' : '❌ missing');
console.log('   PUBLIC_BASE_URL:', PUBLIC_BASE_URL);
console.log('   MEDIA_DIR:', MEDIA_DIR);
console.log('   MEDIA_COMMANDS:', Object.keys(MEDIA_COMMAND_DEFS).join(', ') || '(none)');

// ---------------------------------------------------------------------------
// Session store
// ---------------------------------------------------------------------------
const sessions = new Map();

function createSession(phoneNumber) {
    return {
        phoneNumber,
        conversationHistory: [],
        bookingState: null,
        bookingData: {},
        awaitingMenuChoice: false,
        awaitingVoiceCallback: false,
        lastVoiceCallbackAt: null,
        // null | 'awaiting_section' | 'pbmp' | 'other'
        askMode: null,
        humanHandoff: false,
        handoffReason: null,
        handoffAt: null,
        handoffPendingMessages: [],
        crmTouchedAt: null,
        lastActivity: Date.now(),
        lastInboundAt: null,
        messageCount: 0
    };
}

function loadSessionsFromDisk() {
    if (!SESSION_STORE_PATH) return;
    try {
        if (!fs.existsSync(SESSION_STORE_PATH)) return;
        const raw = fs.readFileSync(SESSION_STORE_PATH, 'utf8');
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object') return;
        for (const [phone, session] of Object.entries(data)) {
            sessions.set(phone, { ...createSession(phone), ...session, phoneNumber: phone });
        }
        console.log(`💾 Loaded ${sessions.size} WhatsApp sessions from disk`);
    } catch (error) {
        console.error('⚠️ Failed to load session store:', error.message);
    }
}

function persistSessionsToDisk() {
    if (!SESSION_STORE_PATH) return;
    try {
        const dir = path.dirname(SESSION_STORE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const obj = Object.fromEntries(sessions.entries());
        fs.writeFileSync(SESSION_STORE_PATH, JSON.stringify(obj), 'utf8');
    } catch (error) {
        console.error('⚠️ Failed to persist session store:', error.message);
    }
}

function cleanOldSessions() {
    const now = Date.now();
    let removed = 0;
    for (const [phone, session] of sessions.entries()) {
        // Keep active human handoffs so agents don't lose the queue
        if (session.humanHandoff) continue;
        if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
            sessions.delete(phone);
            removed += 1;
            console.log(`🧹 Cleaned up session for ${phone}`);
        }
    }
    if (removed > 0) persistSessionsToDisk();
}

loadSessionsFromDisk();
setInterval(cleanOldSessions, 5 * 60 * 1000);
setInterval(persistSessionsToDisk, 60 * 1000);

function getSession(phoneNumber) {
    if (!sessions.has(phoneNumber)) {
        sessions.set(phoneNumber, createSession(phoneNumber));
        console.log(`✨ Created new session for ${phoneNumber}`);
        persistSessionsToDisk();
    }
    const session = sessions.get(phoneNumber);
    session.lastActivity = Date.now();
    return session;
}

// ---------------------------------------------------------------------------
// Consent (opt-in / STOP) + 24h customer-care window
// ---------------------------------------------------------------------------
const consentByPhone = new Map();

function loadConsentFromDisk() {
    try {
        if (!fs.existsSync(CONSENT_STORE_PATH)) return;
        const raw = fs.readFileSync(CONSENT_STORE_PATH, 'utf8');
        const data = JSON.parse(raw);
        if (!data || typeof data !== 'object') return;
        for (const [phone, record] of Object.entries(data)) {
            consentByPhone.set(phone, record);
        }
        console.log(`💾 Loaded ${consentByPhone.size} WhatsApp consent records`);
    } catch (error) {
        console.error('⚠️ Failed to load consent store:', error.message);
    }
}

function persistConsentToDisk() {
    try {
        const dir = path.dirname(CONSENT_STORE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CONSENT_STORE_PATH, JSON.stringify(Object.fromEntries(consentByPhone.entries()), null, 2), 'utf8');
    } catch (error) {
        console.error('⚠️ Failed to persist consent store:', error.message);
    }
}

loadConsentFromDisk();

function getConsent(phoneNumber) {
    return consentByPhone.get(phoneNumber) || {
        phoneNumber,
        optedOut: false,
        optedInAt: null,
        optedOutAt: null,
        source: null,
        history: []
    };
}

function pushConsentHistory(record, event, source) {
    if (!Array.isArray(record.history)) record.history = [];
    record.history.push({ event, source: source || null, at: new Date().toISOString() });
    if (record.history.length > 50) record.history = record.history.slice(-50);
}

function setOptedOut(phoneNumber, source = 'keyword') {
    const record = getConsent(phoneNumber);
    record.phoneNumber = phoneNumber;
    record.optedOut = true;
    record.optedOutAt = new Date().toISOString();
    record.source = source;
    pushConsentHistory(record, 'opt_out', source);
    consentByPhone.set(phoneNumber, record);
    persistConsentToDisk();
    return record;
}

function setOptedIn(phoneNumber, source = 'keyword') {
    const record = getConsent(phoneNumber);
    record.phoneNumber = phoneNumber;
    record.optedOut = false;
    record.optedInAt = new Date().toISOString();
    record.optedOutAt = null;
    record.source = source;
    pushConsentHistory(record, 'opt_in', source);
    consentByPhone.set(phoneNumber, record);
    persistConsentToDisk();
    return record;
}

function logImpliedOptIn(phoneNumber, source = 'inbound_message') {
    const existing = consentByPhone.get(phoneNumber);
    if (existing?.optedInAt || existing?.optedOut) return existing;
    const record = getConsent(phoneNumber);
    record.phoneNumber = phoneNumber;
    record.optedOut = false;
    record.optedInAt = new Date().toISOString();
    record.source = source;
    pushConsentHistory(record, 'opt_in_implied', source);
    consentByPhone.set(phoneNumber, record);
    persistConsentToDisk();
    console.log(`📝 Implied opt-in logged for ${phoneNumber} via ${source}`);
    return record;
}

function isOptedOut(phoneNumber) {
    return Boolean(consentByPhone.get(phoneNumber)?.optedOut);
}

function normalizeCommandText(text) {
    return String(text || '')
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, ' ');
}

function matchKeyword(text, keywords) {
    const normalized = normalizeCommandText(text);
    if (!normalized) return false;
    // Exact match or whole-message keyword (e.g. "please stop")
    if (keywords.includes(normalized)) return true;
    const tokens = normalized.split(' ');
    return tokens.length <= 3 && keywords.some((kw) => tokens.includes(kw));
}

function isOptOutMessage(text) {
    return matchKeyword(text, OPT_OUT_KEYWORDS);
}

function isOptInMessage(text) {
    return matchKeyword(text, OPT_IN_KEYWORDS);
}

function matchesKeywordList(text, keywords) {
    const normalized = normalizeCommandText(text);
    if (!normalized) return false;
    return keywords.some((kw) => {
        const k = normalizeCommandText(kw);
        if (!k) return false;
        if (normalized === k) return true;
        if (k.includes(' ')) return normalized.includes(k);
        return new RegExp(`(?:^|\\s)${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s)`, 'i').test(normalized);
    });
}

function isHandoffRequest(text) {
    return matchesKeywordList(text, HANDOFF_KEYWORDS);
}

function isResumeBotRequest(text) {
    const normalized = normalizeCommandText(text);
    if (['/bot', 'resume bot'].includes(normalized)) return true;
    return matchesKeywordList(text, RESUME_BOT_KEYWORDS);
}

function isVoiceCallRequest(text) {
    return matchesKeywordList(text, VOICE_CALL_KEYWORDS);
}

function isCallbackRequest(text) {
    return matchesKeywordList(text, CALLBACK_REQUEST_KEYWORDS);
}

function getHandoffSnapshot(session) {
    if (!session) return null;
    return {
        active: Boolean(session.humanHandoff),
        reason: session.handoffReason || null,
        startedAt: session.handoffAt || null,
        pendingMessages: Array.isArray(session.handoffPendingMessages)
            ? session.handoffPendingMessages.length
            : 0
    };
}

function listActiveHandoffs() {
    const items = [];
    for (const [phone, session] of sessions.entries()) {
        if (session.humanHandoff) {
            items.push({
                phone,
                reason: session.handoffReason || null,
                startedAt: session.handoffAt || null,
                lastInboundAt: session.lastInboundAt || null,
                pendingMessages: Array.isArray(session.handoffPendingMessages)
                    ? session.handoffPendingMessages.length
                    : 0,
                recentPending: (session.handoffPendingMessages || []).slice(-5)
            });
        }
    }
    return items.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
}

async function notifyHandoffEvent(eventType, phoneNumber, payload = {}) {
    const body = {
        event: eventType,
        phone: phoneNumber,
        at: new Date().toISOString(),
        ...payload
    };
    console.log(`🙋 Handoff event [${eventType}] ${phoneNumber}:`, body);

    if (WHATSAPP_HANDOFF_WEBHOOK) {
        try {
            await axios.post(WHATSAPP_HANDOFF_WEBHOOK, body, {
                timeout: 8000,
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('⚠️ Handoff webhook notify failed:', error.message);
        }
    }

    if (WHATSAPP_HANDOFF_NOTIFY_EMAIL && process.env.SENDGRID_API_KEY) {
        try {
            const emailUrl = (process.env.PBMP_EMAIL_URL
                || PBMP_API_URL.replace(/\/api\/chat\/?$/, '/api/send-email'));
            await axios.post(emailUrl, {
                to: WHATSAPP_HANDOFF_NOTIFY_EMAIL,
                subject: `[PBMP WhatsApp] ${eventType} — ${phoneNumber}`,
                text: JSON.stringify(body, null, 2)
            }, { timeout: 8000 });
        } catch (error) {
            console.error('⚠️ Handoff email notify failed:', error.message);
        }
    }
}

async function startHumanHandoff(session, reason, options = {}) {
    const phoneNumber = session.phoneNumber;
    const already = Boolean(session.humanHandoff);
    session.humanHandoff = true;
    session.handoffReason = reason || session.handoffReason || 'user_request';
    session.handoffAt = session.handoffAt || Date.now();
    session.bookingState = null;
    session.awaitingMenuChoice = false;
    session.awaitingVoiceCallback = false;
    if (!Array.isArray(session.handoffPendingMessages)) {
        session.handoffPendingMessages = [];
    }
    persistSessionsToDisk();

    if (!already || options.forceNotify) {
        await notifyHandoffEvent('handoff_started', phoneNumber, {
            reason: session.handoffReason,
            lastMessage: options.lastMessage || null
        });
    }

    return getHandoffSnapshot(session);
}

async function endHumanHandoff(session, reason = 'resumed') {
    const phoneNumber = session.phoneNumber;
    const wasActive = Boolean(session.humanHandoff);
    session.humanHandoff = false;
    session.handoffReason = null;
    session.handoffAt = null;
    session.handoffPendingMessages = [];
    persistSessionsToDisk();
    if (wasActive) {
        await notifyHandoffEvent('handoff_ended', phoneNumber, { reason });
    }
    return getHandoffSnapshot(session);
}

function queueHandoffInbound(session, text, meta = {}) {
    if (!Array.isArray(session.handoffPendingMessages)) {
        session.handoffPendingMessages = [];
    }
    session.handoffPendingMessages.push({
        text: text || '',
        at: Date.now(),
        ...meta
    });
    if (session.handoffPendingMessages.length > 50) {
        session.handoffPendingMessages = session.handoffPendingMessages.slice(-50);
    }
    persistSessionsToDisk();
}

async function upsertWhatsAppContact(phoneNumber, extra = {}) {
    try {
        const leadsUrl = (process.env.PBMP_LEADS_URL
            || PBMP_API_URL.replace(/\/api\/chat\/?$/, '/api/leads'));
        const payload = {
            phone: phoneNumber,
            source: 'whatsapp',
            channel: 'whatsapp',
            status: extra.status || 'engaged',
            lastWhatsAppAt: new Date().toISOString(),
            ...extra
        };
        const response = await axios.post(leadsUrl, payload, { timeout: 8000 });
        console.log(`📇 WhatsApp CRM touch for ${phoneNumber}`);
        return response.data;
    } catch (error) {
        console.error('⚠️ WhatsApp CRM touch failed:', error.message);
        return null;
    }
}

function getCustomerCareWindow(phoneNumber) {
    const session = sessions.get(phoneNumber);
    const lastInboundAt = session?.lastInboundAt || null;
    if (!lastInboundAt) {
        return {
            open: false,
            lastInboundAt: null,
            expiresAt: null,
            remainingMs: 0
        };
    }
    const expiresAt = lastInboundAt + CUSTOMER_CARE_WINDOW_MS;
    const remainingMs = Math.max(0, expiresAt - Date.now());
    return {
        open: remainingMs > 0,
        lastInboundAt: new Date(lastInboundAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
        remainingMs
    };
}

function assertCanSendFreeform(phoneNumber, options = {}) {
    if (options.bypassConsent) return;
    if (isOptedOut(phoneNumber)) {
        const err = new Error(`Cannot send: ${phoneNumber} has opted out (STOP).`);
        err.code = 'OPTED_OUT';
        err.statusCode = 403;
        throw err;
    }
    if (options.bypassWindow || options.isReply || !ENFORCE_CUSTOMER_CARE_WINDOW) return;
    const window = getCustomerCareWindow(phoneNumber);
    if (!window.open) {
        const err = new Error(
            `Cannot send free-form message outside 24h customer-care window for ${phoneNumber}. Use an approved template instead.`
        );
        err.code = 'OUTSIDE_CUSTOMER_CARE_WINDOW';
        err.statusCode = 403;
        err.window = window;
        throw err;
    }
}

// ---------------------------------------------------------------------------
// Idempotency + delivery status
// ---------------------------------------------------------------------------
const processedMessageIds = new Map(); // id -> timestamp
const recentInboundByPhone = new Map(); // phone -> { key, at }
const messageStatuses = new Map(); // wamid/id -> latest status record
const statusHistory = []; // ring buffer of recent status events

function pruneProcessedIds(now = Date.now()) {
    for (const [id, ts] of processedMessageIds.entries()) {
        if (now - ts > IDEMPOTENCY_TTL_MS) processedMessageIds.delete(id);
    }
    for (const [phone, entry] of recentInboundByPhone.entries()) {
        if (!entry?.at || now - entry.at > INBOUND_DEBOUNCE_MS * 3) {
            recentInboundByPhone.delete(phone);
        }
    }
}

function extractInboundMessageId(message, body) {
    if (!message && !body) return null;
    const candidates = [
        message?.whatsapp_message_id,
        message?.id,
        message?.message_id,
        message?.wamid,
        message?.messageId,
        message?.uid,
        body?.whatsapp_message_id,
        body?.message_id,
        body?.wamid,
        body?.id,
        body?.message?.whatsapp_message_id
    ];
    for (const c of candidates) {
        if (typeof c === 'string' && c.trim()) return c.trim();
        if (typeof c === 'number') return String(c);
    }
    return null;
}

function claimInboundMessageId(messageId) {
    if (!messageId) return { duplicate: false, skipped: true };
    pruneProcessedIds();
    if (processedMessageIds.has(messageId)) {
        return { duplicate: true, skipped: false };
    }
    processedMessageIds.set(messageId, Date.now());
    return { duplicate: false, skipped: false };
}

/** Same phone + same command text within debounce window (START/menu/STOP spam). */
function shouldDebounceInboundText(text) {
    const key = normalizeCommandText(text);
    if (!key) return false;
    if (/^[1-5]$/.test(key)) return true;
    if (['menu', 'help', '/start', '/reset', 'start', 'stop', 'agent', 'human', 'bot', 'resume'].includes(key)) return true;
    if (isOptOutMessage(text) || isOptInMessage(text)) return true;
    if (resolveMenuChoice(text, null) && key.split(' ').length <= 3) return true;
    return false;
}

function isInboundDebounced(phoneNumber, text) {
    if (!phoneNumber || !text || !shouldDebounceInboundText(text)) {
        return { duplicate: false };
    }
    const key = normalizeCommandText(text);
    if (!key) return { duplicate: false };
    pruneProcessedIds();
    const now = Date.now();
    const prev = recentInboundByPhone.get(phoneNumber);
    if (prev && prev.key === key && now - prev.at < INBOUND_DEBOUNCE_MS) {
        return { duplicate: true, previousAt: prev.at, windowMs: INBOUND_DEBOUNCE_MS };
    }
    return { duplicate: false, key };
}

function recordInboundDebounce(phoneNumber, text) {
    if (!phoneNumber || !text || !shouldDebounceInboundText(text)) return;
    const key = normalizeCommandText(text);
    if (!key) return;
    recentInboundByPhone.set(phoneNumber, { key, at: Date.now() });
}

function claimInboundDebounce(phoneNumber, text) {
    // Back-compat helper: check only (record after successful send)
    return isInboundDebounced(phoneNumber, text);
}

function recordMessageStatus(entry) {
    if (!entry || !entry.id) return;
    const record = {
        id: entry.id,
        status: entry.status || 'unknown',
        phoneNumber: entry.phoneNumber || null,
        timestamp: entry.timestamp || new Date().toISOString(),
        errors: entry.errors || null,
        rawType: entry.rawType || null,
        updatedAt: new Date().toISOString()
    };
    messageStatuses.set(record.id, record);
    statusHistory.push(record);
    while (statusHistory.length > STATUS_HISTORY_LIMIT) statusHistory.shift();
    console.log(`📬 Status ${record.status} for ${record.id}${record.phoneNumber ? ` (${record.phoneNumber})` : ''}`);
}

function extractStatusEvents(body) {
    const events = [];
    if (!body || typeof body !== 'object') return events;

    // Meta Cloud API webhook shape
    if (Array.isArray(body.entry)) {
        for (const entry of body.entry) {
            const changes = entry?.changes || [];
            for (const change of changes) {
                const statuses = change?.value?.statuses || [];
                for (const s of statuses) {
                    events.push({
                        id: s.id || s.message_id || s.wamid,
                        status: s.status,
                        phoneNumber: s.recipient_id || s.recipientId || null,
                        timestamp: s.timestamp
                            ? new Date(Number(s.timestamp) * 1000).toISOString()
                            : new Date().toISOString(),
                        errors: s.errors || null,
                        rawType: 'meta.statuses'
                    });
                }
            }
        }
    }

    // Flat / WAPI-style single status
    const flatStatus = body.status || body.message_status || body.ack;
    const flatId = body.wamid || body.message_id || body.id || body.message?.id;
    if (flatStatus && flatId && !Array.isArray(body.entry)) {
        // Avoid treating normal message payloads that happen to include status:accepted on send receipts
        const looksLikeInboundMessage = body.message?.is_new_message || body.contact?.phone_number;
        if (!looksLikeInboundMessage || body.type === 'status' || body.event === 'status' || body.message_status) {
            events.push({
                id: flatId,
                status: flatStatus,
                phoneNumber: body.phone_number || body.recipient_id || body.contact?.phone_number || null,
                timestamp: body.timestamp || new Date().toISOString(),
                errors: body.errors || null,
                rawType: 'flat.status'
            });
        }
    }

    // Array of statuses
    if (Array.isArray(body.statuses)) {
        for (const s of body.statuses) {
            events.push({
                id: s.id || s.wamid || s.message_id,
                status: s.status,
                phoneNumber: s.recipient_id || s.phone_number || null,
                timestamp: s.timestamp || new Date().toISOString(),
                errors: s.errors || null,
                rawType: 'statuses[]'
            });
        }
    }

    return events.filter((e) => e.id && e.status);
}

// ---------------------------------------------------------------------------
// Outbound WAPI
// ---------------------------------------------------------------------------
function assertWapiSuccess(data, context = 'WAPI request') {
    if (data?.result && String(data.result).toLowerCase() === 'failed') {
        const err = new Error(data.message || `${context} failed`);
        err.statusCode = 502;
        err.code = 'WAPI_SEND_FAILED';
        err.wapiResponse = data;
        throw err;
    }
    return data;
}

async function sendWhatsAppMessage(phoneNumber, message, options = {}) {
    try {
        if (!WAPI_URL || !WAPI_VENDOR_UID || !WAPI_TOKEN) {
            throw new Error('WAPI credentials not configured. Check .env file.');
        }

        assertCanSendFreeform(phoneNumber, options);

        const payload = {
            phone_number: phoneNumber,
            message_body: message
        };

        const endpoint = `${WAPI_URL}/${WAPI_VENDOR_UID}/${WAPI_SEND_MESSAGE_PATH}`;

        console.log(`📤 Sending message to ${phoneNumber} via ${endpoint}`);
        console.log(`📤 Payload:`, JSON.stringify(payload, null, 2));

        const response = await axios.post(endpoint, payload, {
            headers: {
                Authorization: `Bearer ${WAPI_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`✅ Sent message to ${phoneNumber}`);
        console.log(`✅ Response:`, JSON.stringify(response.data, null, 2));

        assertWapiSuccess(response.data, 'text send');

        const wamid = response.data?.data?.wamid || response.data?.wamid;
        if (wamid) {
            recordMessageStatus({
                id: wamid,
                status: response.data?.data?.status || 'accepted',
                phoneNumber,
                rawType: 'outbound.send'
            });
        }

        return response.data;
    } catch (error) {
        console.error('❌ Error sending WhatsApp message:', error.message);
        if (error.response) {
            console.error('❌ Response data:', JSON.stringify(error.response.data, null, 2));
            console.error('❌ Response status:', error.response.status);
        }
        throw error;
    }
}

async function sendWhatsAppTemplate(phoneNumber, templateName, options = {}) {
    if (!WAPI_URL || !WAPI_VENDOR_UID || !WAPI_TOKEN) {
        throw new Error('WAPI credentials not configured. Check .env file.');
    }
    if (!templateName) {
        throw new Error('templateName is required');
    }
    if (isOptedOut(phoneNumber) && !options.bypassConsent) {
        const err = new Error(`Cannot send template: ${phoneNumber} has opted out (STOP).`);
        err.code = 'OPTED_OUT';
        err.statusCode = 403;
        throw err;
    }

    const language = options.language || WAPI_TEMPLATE_DEFAULT_LANGUAGE;
    const endpoint = `${WAPI_URL}/${WAPI_VENDOR_UID}/${WAPI_SEND_TEMPLATE_PATH}`;
    const payload = {
        phone_number: phoneNumber,
        template_name: templateName,
        template_language: language,
        // Optional Meta/WAPI template variable fields
        header_image: options.headerImage || undefined,
        header_video: options.headerVideo || undefined,
        header_document: options.headerDocument || undefined,
        header_document_name: options.headerDocumentName || undefined,
        header_field_1: options.headerField1 || undefined,
        header_field_2: options.headerField2 || undefined,
        body_field_1: options.bodyField1 || undefined,
        body_field_2: options.bodyField2 || undefined,
        body_field_3: options.bodyField3 || undefined,
        components: options.components || undefined,
        parameters: options.parameters || undefined,
        from_phone_number_id: options.fromPhoneNumberId || undefined
    };

    try {
        console.log(`📤 Sending template "${templateName}" (${language}) to ${phoneNumber} via ${endpoint}`);
        const response = await axios.post(endpoint, payload, {
            headers: {
                Authorization: `Bearer ${WAPI_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        assertWapiSuccess(response.data, 'template send');

        const wamid = response.data?.data?.wamid || response.data?.wamid;
        if (wamid) {
            recordMessageStatus({
                id: wamid,
                status: response.data?.data?.status || 'accepted',
                phoneNumber,
                rawType: 'outbound.template'
            });
        }

        return response.data;
    } catch (error) {
        const status = error.response?.status;
        const apiMsg = error.response?.data?.message || error.message;
        console.error('❌ Template send failed:', apiMsg, status || '');
        if (error.response?.data) {
            console.error('❌ Response data:', JSON.stringify(error.response.data, null, 2));
        }
        const hint =
            'Template API path is contact/send-template-message. ' +
            'If you see "Template ... not found", create/approve the template in Meta Business Manager, ' +
            'then sync templates in WAPI dashboard, and use the exact template_name + template_language.';
        const err = new Error(
            status === 404
                ? `Template endpoint missing. Set WAPI_SEND_TEMPLATE_PATH. ${hint}`
                : `${apiMsg}. ${hint}`
        );
        err.cause = error;
        err.statusCode = error.statusCode || status || 502;
        err.code = error.code || (status === 404 ? 'TEMPLATE_PATH_UNKNOWN' : 'TEMPLATE_SEND_FAILED');
        err.wapiResponse = error.wapiResponse || error.response?.data;
        throw err;
    }
}

function formatTextMenu(bodyText, options) {
    const lines = [bodyText.trim(), ''];
    options.forEach((opt, idx) => {
        lines.push(`${idx + 1}) ${opt.title}`);
    });
    lines.push('', '_Reply with the number or option text._');
    return lines.join('\n');
}

function extractInteractiveReply(message) {
    if (!message || typeof message !== 'object') return null;

    const interactive = message.interactive || message.button || message.list_reply || null;
    const buttonReply = message.button_reply
        || interactive?.button_reply
        || message.button
        || null;
    const listReply = message.list_reply
        || interactive?.list_reply
        || null;

    const id = buttonReply?.id
        || listReply?.id
        || message.button_id
        || message.selected_id
        || interactive?.id
        || null;
    const title = buttonReply?.title
        || listReply?.title
        || listReply?.description
        || message.button_text
        || message.selected_title
        || interactive?.title
        || null;

    if (!id && !title) return null;
    return {
        id: id != null ? String(id) : null,
        title: title != null ? String(title).trim() : null,
        rawType: buttonReply ? 'button_reply' : (listReply ? 'list_reply' : 'interactive')
    };
}

function extractFlowReply(message) {
    if (!message || typeof message !== 'object') return null;

    const interactive = message.interactive || null;
    const nfm = message.nfm_reply
        || interactive?.nfm_reply
        || (interactive?.type === 'nfm_reply' ? interactive : null)
        || null;

    const responseJsonRaw = nfm?.response_json
        || message.response_json
        || message.flow_response
        || null;

    if (!responseJsonRaw) return null;

    let data = null;
    try {
        data = typeof responseJsonRaw === 'string'
            ? JSON.parse(responseJsonRaw)
            : responseJsonRaw;
    } catch (error) {
        console.error('⚠️ Failed to parse flow response_json:', error.message);
        return { rawJson: String(responseJsonRaw), data: null, parseError: true };
    }

    if (!data || typeof data !== 'object') return null;

    return {
        rawType: 'nfm_reply',
        data,
        flowKey: data.flow_key || data.flowKey || null,
        flowToken: data.flow_token || data.flowToken || null
    };
}

const FLOW_FIELD_LABELS = {
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    title: 'Title / role',
    notes: 'Notes',
    subject: 'Subject',
    message: 'Message',
    company: 'Company',
    requirement: 'Requirement',
    date: 'Preferred date',
    time: 'Preferred time'
};

function formatFlowSubmissionSummary(flowData, options = {}) {
    const formTitle = options.formTitle || 'Form details';
    const lines = [`📋 *${formTitle}*`, '', 'Aapne yeh details bhari hain:', ''];

    const skipKeys = new Set(['flow_key', 'flowKey', 'flow_token', 'flowToken']);
    for (const [key, value] of Object.entries(flowData || {})) {
        if (skipKeys.has(key)) continue;
        if (value == null || String(value).trim() === '') continue;
        const label = FLOW_FIELD_LABELS[key] || key.replace(/_/g, ' ');
        lines.push(`• *${label}:* ${String(value).trim()}`);
    }

    return lines.join('\n');
}

function buildFlowSuccessMessage() {
    return (
        '✅ *Form successfully submitted!*\n\n' +
        'Thank you — our team has received your details and will get back to you soon.\n\n' +
        'Reply *menu* for more options.'
    );
}

async function saveFlowLead(phoneNumber, flowData, options = {}) {
    const flowKey = options.flowKey || flowData?.flow_key || flowData?.flowKey || 'flow';
    const leadsUrl = (process.env.PBMP_LEADS_URL
        || PBMP_API_URL.replace(/\/api\/chat\/?$/, '/api/leads'));

    const payload = {
        name: flowData.name || flowData.full_name || 'WhatsApp Flow',
        email: flowData.email || '',
        phone: flowData.phone || phoneNumber,
        title: flowData.title || flowData.subject || '',
        notes: flowData.notes || flowData.message || JSON.stringify(flowData),
        source: `whatsapp_flow_${flowKey}`,
        channel: 'whatsapp_flow',
        contactPerson: 'PBMP ChatBot',
        flowKey,
        flowData
    };

    try {
        const response = await axios.post(leadsUrl, payload, { timeout: 12000 });
        console.log(`✅ Flow lead saved (${flowKey}) for ${phoneNumber}`);
        return response.data;
    } catch (error) {
        console.error('❌ Error saving flow lead:', error.message);
        throw error;
    }
}

async function handleFlowFormSubmission(phoneNumber, flowReply, replyOpts = {}) {
    const flowData = flowReply?.data || {};
    const flowKey = flowReply?.flowKey || flowData.flow_key || 'form';
    const formTitle = flowKey === 'support'
        ? 'Support form'
        : (flowKey === 'lead' ? 'Lead enquiry' : 'Booking form');

    await saveFlowLead(phoneNumber, flowData, { flowKey }).catch((err) => {
        console.error('⚠️ Flow lead save failed (continuing with user messages):', err.message);
    });

    upsertWhatsAppContact(phoneNumber, {
        status: 'flow_submitted',
        event: 'whatsapp_flow_submit',
        notes: `${formTitle}: ${flowData.name || phoneNumber}`
    }).catch(() => {});

    const summary = flowReply?.parseError
        ? '📋 *Form submitted*\n\nWe received your response.'
        : formatFlowSubmissionSummary(flowData, { formTitle });

    // Message 1: filled details
    await sendWhatsAppMessage(phoneNumber, summary, replyOpts);
    // Message 2: separate success confirmation
    await sendWhatsAppMessage(phoneNumber, buildFlowSuccessMessage(), replyOpts);

    return { summary, success: true };
}

function resolveFlowConfig(kind = 'booking') {
    if (kind === 'support') {
        return {
            flowId: WHATSAPP_SUPPORT_FLOW_ID,
            screen: WHATSAPP_SUPPORT_FLOW_SCREEN,
            header: 'Support form',
            body: 'Tap the button below to open the support form inside WhatsApp.',
            footer: 'Grow24 · PBMP'
        };
    }
    if (kind === 'lead') {
        return {
            flowId: WHATSAPP_LEAD_FLOW_ID,
            screen: WHATSAPP_LEAD_FLOW_SCREEN,
            header: 'Lead enquiry',
            body: 'Tap the button below to fill a short enquiry form inside WhatsApp.',
            footer: 'Grow24 · PBMP'
        };
    }
    return {
        flowId: WHATSAPP_BOOKING_FLOW_ID,
        screen: WHATSAPP_BOOKING_FLOW_SCREEN,
        header: 'Book a meeting',
        body: 'Tap the button below to fill the booking form inside WhatsApp — no browser needed.',
        footer: 'Grow24 · PBMP'
    };
}

function hasInChatFormsEnabled() {
    return Boolean(WHATSAPP_BOOKING_FLOW_ID || WHATSAPP_SUPPORT_FLOW_ID || WHATSAPP_LEAD_FLOW_ID);
}

function buildFormLinksMessage() {
    if (hasInChatFormsEnabled()) {
        const lines = [
            '📋 *Forms inside WhatsApp*',
            '',
            'Reply *3* or *form* to get an in-chat form button (opens inside WhatsApp, not browser).'
        ];
        if (WHATSAPP_LEAD_FLOW_ID) {
            lines.push('', '• Lead enquiry form — menu *3*');
        }
        if (WHATSAPP_BOOKING_FLOW_ID) {
            lines.push('', '• Booking form — menu *3*');
        }
        if (WHATSAPP_SUPPORT_FLOW_ID) {
            lines.push('', '• Support form — reply *support form*');
        }
        lines.push('', `Website: ${WHATSAPP_WEBSITE_URL}`, '', 'Reply *menu* for all options.');
        return lines.join('\n');
    }

    const lines = [
        '🔗 *Website & form links*',
        '',
        `1. Website: ${WHATSAPP_WEBSITE_URL}`,
        `2. Booking / form: ${WHATSAPP_BOOKING_FORM_URL}`
    ];
    if (WHATSAPP_SUPPORT_FORM_URL && WHATSAPP_SUPPORT_FORM_URL !== WHATSAPP_BOOKING_FORM_URL) {
        lines.push(`3. Support form: ${WHATSAPP_SUPPORT_FORM_URL}`);
    }
    lines.push(
        '',
        'Tap a link to open it in your browser.',
        'Or reply *2* to book a meeting here on WhatsApp.',
        'Reply *menu* to see all options again.'
    );
    return lines.join('\n');
}

async function sendBookingFormToUser(phoneNumber, options = {}) {
    // Priority: booking flow, then lead-enquiry flow, then browser-link fallback
    const bookingCfg = resolveFlowConfig('booking');
    if (bookingCfg.flowId) {
        return sendWhatsAppFlow(phoneNumber, bookingCfg, options);
    }

    const leadCfg = resolveFlowConfig('lead');
    if (leadCfg.flowId) {
        return sendWhatsAppFlow(phoneNumber, leadCfg, options);
    }

    await sendWhatsAppMessage(phoneNumber, buildFormLinksMessage(), options);
    return { mode: 'links_fallback' };
}

async function sendSupportFormToUser(phoneNumber, options = {}) {
    const cfg = resolveFlowConfig('support');
    if (!cfg.flowId) {
        await sendWhatsAppMessage(
            phoneNumber,
            `Support form link: ${WHATSAPP_SUPPORT_FORM_URL}\n\nReply *menu* for options.`,
            options
        );
        return { mode: 'links_fallback' };
    }
    return sendWhatsAppFlow(phoneNumber, cfg, options);
}

function resolveMenuChoice(text, interactiveReply) {
    const candidates = [];
    if (interactiveReply?.id) candidates.push(String(interactiveReply.id).toLowerCase());
    if (interactiveReply?.title) candidates.push(String(interactiveReply.title).toLowerCase());
    if (text) candidates.push(normalizeCommandText(text));

    // Prefer exact id / exact keyword, then longest keyword substring (avoids "call" stealing "callback")
    let best = null;
    let bestScore = -1;
    for (const candidate of candidates) {
        if (!candidate) continue;
        for (const opt of MAIN_MENU_OPTIONS) {
            if (opt.id === candidate) {
                return opt.id;
            }
            for (const kw of opt.keywords) {
                if (candidate === kw) {
                    const score = 1000 + kw.length;
                    if (score > bestScore) {
                        bestScore = score;
                        best = opt.id;
                    }
                } else if (candidate.includes(kw) && kw.length >= 4) {
                    const score = kw.length;
                    if (score > bestScore) {
                        bestScore = score;
                        best = opt.id;
                    }
                }
            }
        }
    }
    return best;
}

function formatVoiceCallDisplayNumber(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 12 && digits.startsWith('91')) {
        return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    if (digits.length === 10) {
        return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return `+${digits}`;
}

function buildTelLink(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    if (!digits) return null;
    return `tel:+${digits}`;
}

function buildVoiceCallMessage() {
    const lines = [
        '📞 *Voice call*',
        '',
        `Talk to *${WHATSAPP_VOICE_CALL_LABEL}* by phone.`
    ];

    if (WHATSAPP_VOICE_CALL_NUMBER) {
        const display = formatVoiceCallDisplayNumber(WHATSAPP_VOICE_CALL_NUMBER);
        const tel = buildTelLink(WHATSAPP_VOICE_CALL_NUMBER);
        lines.push('', `*Call us:* ${display}`);
        if (tel) {
            lines.push(`Tap to dial: ${tel}`);
        }
    } else {
        lines.push(
            '',
            '_Direct dial number is not configured yet._',
            'You can still request a callback below.'
        );
    }

    if (WHATSAPP_VOICE_CALL_HOURS) {
        lines.push('', `*Hours:* ${WHATSAPP_VOICE_CALL_HOURS}`);
    }

    lines.push(
        '',
        'Want us to call you back on this WhatsApp number?',
        'Reply *callback* (or *call me*).',
        '',
        'Prefer chat instead? Reply *4* for a human agent, or *menu*.'
    );
    return lines.join('\n');
}

async function requestVoiceCallback(session, options = {}) {
    const phoneNumber = session.phoneNumber;
    const note = options.note || options.lastMessage || '';
    session.awaitingVoiceCallback = false;
    session.lastVoiceCallbackAt = Date.now();
    persistSessionsToDisk();

    await notifyHandoffEvent('voice_callback_request', phoneNumber, {
        channel: 'whatsapp',
        callNumberConfigured: Boolean(WHATSAPP_VOICE_CALL_NUMBER),
        businessNumber: WHATSAPP_VOICE_CALL_NUMBER || null,
        note: note || null
    });

    upsertWhatsAppContact(phoneNumber, {
        status: 'voice_callback',
        event: 'voice_callback_request',
        notes: note ? `Voice callback: ${note}` : 'Requested voice callback via WhatsApp'
    }).catch(() => {});

    return {
        message:
            '✅ *Callback requested.*\n\n' +
            'Our team will call you back on this WhatsApp number soon.\n\n' +
            (WHATSAPP_VOICE_CALL_NUMBER
                ? `You can also call us now: ${formatVoiceCallDisplayNumber(WHATSAPP_VOICE_CALL_NUMBER)}\n\n`
                : '') +
            'Meanwhile you can chat here — reply *4* for an agent, or *menu*.'
    };
}

function buildHelpMessage() {
    return (
        'ℹ️ *Commands*\n\n' +
        '• *menu* — main options\n' +
        '• *1* — ask a question (PBMP or Other)\n' +
        '• *2* — book a meeting\n' +
        '• *3* — in-chat form (or website links)\n' +
        '• *4* — talk to a human agent\n' +
        '• *5* — voice call / callback\n' +
        '• *6* — this help\n' +
        '• *7* — product catalogue\n' +
        '• *callback* — request a phone callback\n' +
        '• *bot* — resume AI after human handoff\n' +
        '• *STOP* / *START*\n\n' +
        'In *Other*: math + media (`image1`, `video1`, `gif1`, …)\n'
    );
}

function buildAskSectionMenu() {
    return (
        '💬 *Ask a question — choose a section:*\n\n' +
        '1. *PBMP / Grow24* — product & platform questions\n' +
        '2. *Other* — Python math + your media files\n\n' +
        '_Reply with *1* or *2*._'
    );
}

function buildOtherMathHelp() {
    return (
        '🧰 *Other — tools*\n\n' +
        '*Math (Python)*\n' +
        '• `Zeabur-python-add (3,4)` → 3+4=7\n' +
        '• Or: `3+4` · `10-2*3` · `2^10`\n\n' +
        '*Media (your uploaded files)*\n' +
        '• `image1` `image2` `image3`\n' +
        '• `video1` `video2` `video3`\n' +
        '• `audio1` `audio2`\n' +
        '• `3d_image1` `3d_image2`\n' +
        '• `animated_image1` `animated_image2`\n' +
        '• `gif1` `gif2`\n\n' +
        'Type the command — WhatsApp pe wahi file aayegi jo aapne upload ki hai.\n' +
        'Reply *menu* for main options, or *1* for PBMP / Grow24.'
    );
}

/**
 * Canonical keys: image1, video2, 3d_image1, animated_image1, gif1
 */
function normalizeMediaCommandKey(text) {
    let s = String(text || '')
        .trim()
        .toLowerCase()
        .replace(/^[\s./,;:!?]+/, '')
        .replace(/[\s./,;:!?]+$/, '');

    s = s.replace(/-/g, '_').replace(/\s+/g, '_');

    let m = s.match(/^animated_?image_?(\d+)$/) || s.match(/^animatedimage(\d+)$/);
    if (m) return `animated_image${m[1]}`;

    m = s.match(/^3d_?image_?(\d+)$/) || s.match(/^3dimage(\d+)$/);
    if (m) return `3d_image${m[1]}`;

    m = s.match(/^(image|video|gif|audio)_?(\d+)$/);
    if (m) return `${m[1]}${m[2]}`;

    return s;
}

function resolveMediaCommand(text) {
    const key = normalizeMediaCommandKey(text);
    if (!key || !MEDIA_COMMAND_DEFS[key]) return null;

    const def = MEDIA_COMMAND_DEFS[key];
    const mediaType = String(def.mediaType || 'document').toLowerCase();
    const envUrl = envUrlForMediaCommand(key);
    const fileName = findMediaFileOnDisk(key, def.extensions);

    if (envUrl) {
        return {
            key,
            mediaType,
            mediaUrl: envUrl,
            caption: key,
            fileName: fileName || undefined,
            source: 'env'
        };
    }

    if (fileName) {
        return {
            key,
            mediaType,
            mediaUrl: `${PUBLIC_BASE_URL}/media/${encodeURIComponent(fileName)}`,
            caption: key,
            fileName,
            source: 'local'
        };
    }

    return {
        key,
        mediaType,
        mediaUrl: null,
        missing: true,
        hint:
            `No file/URL found for *${key}*.\n\n` +
            `1) Put your file in server folder:\n` +
            `\`media/${key}.jpg\` (or .mp4 / .gif / .glb)\n` +
            `then redeploy\n\n` +
            `OR set Zeabur env:\n` +
            `\`MEDIA_CMD_${key.toUpperCase()}_URL=https://...\`\n\n` +
            `Also set \`PUBLIC_BASE_URL=${PUBLIC_BASE_URL}\`.`
    };
}

function listMediaCommandKeys() {
    return Object.keys(MEDIA_COMMAND_DEFS).sort();
}

function resolveAskSection(text, interactiveReply) {
    const candidates = [];
    if (interactiveReply?.id) candidates.push(String(interactiveReply.id).toLowerCase());
    if (interactiveReply?.title) candidates.push(String(interactiveReply.title).toLowerCase());
    if (text) candidates.push(normalizeCommandText(text));

    for (const candidate of candidates) {
        if (!candidate) continue;
        for (const opt of ASK_SECTION_OPTIONS) {
            if (opt.id === candidate) return opt.id;
            if (opt.keywords.some((kw) => candidate === kw || candidate === `ask_${opt.id}`)) return opt.id;
        }
    }
    return null;
}

function looksLikeOtherMathInput(userText) {
    const raw = String(userText || '').trim();
    if (!raw) return false;
    if (/^zeabur[-\s]?python\b/i.test(raw)) return true;
    if (/[+\-*/×÷^()]/.test(raw) && /[\d)]/.test(raw)) return true;
    return false;
}

/**
 * Runs math in Python (pbmp-backend/python/math_tools.py).
 * - Zeabur-python-add (3,4) → 3+4=7
 * - plain expressions: 3+4, 10*2, 2^8
 */
function evaluateOtherMath(userText) {
    const raw = String(userText || '').trim();
    if (!raw) return Promise.resolve(null);
    if (!looksLikeOtherMathInput(raw)) return Promise.resolve(null);

    if (!fs.existsSync(PYTHON_MATH_SCRIPT)) {
        return Promise.resolve({
            ok: false,
            message: '❌ Python math script is missing on the server (`python/math_tools.py`).'
        });
    }

    return new Promise((resolve) => {
        const child = spawn(PYTHON_BIN, [PYTHON_MATH_SCRIPT, '--text', raw], {
            cwd: __dirname,
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
            try { child.kill('SIGKILL'); } catch (_) { /* ignore */ }
        }, 8000);

        child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
        child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

        child.on('error', (error) => {
            clearTimeout(timer);
            console.error('❌ Python math spawn error:', error.message);
            resolve({
                ok: false,
                message:
                    '❌ Python runtime not available on the server.\n' +
                    `Tried \`${PYTHON_BIN}\`. Set PYTHON_BIN or install python3.`
            });
        });

        child.on('close', (code) => {
            clearTimeout(timer);
            const line = stdout.trim().split('\n').filter(Boolean).pop() || '';
            if (!line) {
                console.error('❌ Python math empty output. stderr:', stderr || '(none)', 'code:', code);
                resolve({
                    ok: false,
                    message: '❌ Python math tool returned no result. Please try again.'
                });
                return;
            }
            try {
                const parsed = JSON.parse(line);
                if (parsed && typeof parsed.message === 'string') {
                    resolve(parsed);
                    return;
                }
            } catch (error) {
                console.error('❌ Python math JSON parse failed:', error.message, line);
            }
            resolve({
                ok: false,
                message: '❌ Could not parse Python math response.'
            });
        });
    });
}

let interactiveUnavailableUntil = 0;
const INTERACTIVE_UNAVAILABLE_TTL_MS = Number(process.env.WAPI_INTERACTIVE_COOLDOWN_MS || 30 * 60 * 1000);

function isInteractiveLikelyDown() {
    return Date.now() < interactiveUnavailableUntil;
}

function markInteractiveUnavailable() {
    interactiveUnavailableUntil = Date.now() + INTERACTIVE_UNAVAILABLE_TTL_MS;
    console.warn(`⚠️ WAPI interactive marked unavailable until ${new Date(interactiveUnavailableUntil).toISOString()}`);
}

function canSendViaGraph() {
    return Boolean(META_ACCESS_TOKEN && META_PHONE_NUMBER_ID);
}

async function sendGraphMessages(phoneNumber, payload) {
    if (!canSendViaGraph()) {
        const err = new Error('Meta Graph send requires META_ACCESS_TOKEN and META_PHONE_NUMBER_ID');
        err.statusCode = 400;
        err.code = 'GRAPH_NOT_CONFIGURED';
        throw err;
    }
    const to = String(phoneNumber).replace(/\D/g, '');
    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_PHONE_NUMBER_ID}/messages`;
    const response = await axios.post(
        url,
        {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            ...payload
        },
        {
            headers: {
                Authorization: `Bearer ${META_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000,
            validateStatus: () => true
        }
    );
    if (response.status >= 400) {
        const err = new Error(
            response.data?.error?.message || `Graph send failed (${response.status})`
        );
        err.statusCode = response.status;
        err.code = 'GRAPH_SEND_FAILED';
        err.graphResponse = response.data;
        throw err;
    }
    return response.data;
}

function buildTextCatalogueMessage() {
    if (WHATSAPP_CATALOGUE_FALLBACK_TEXT) return WHATSAPP_CATALOGUE_FALLBACK_TEXT;
    return (
        '🛍️ *Grow24 / PBMP catalogue*\n\n' +
        '1. *PBMP* — Personal & Business Management Platform\n' +
        '2. *Grow24.ai* — ' + WHATSAPP_WEBSITE_URL + '\n' +
        '3. *Book a meeting* — reply *2*\n' +
        '4. *Lead / enquiry form* — reply *3*\n' +
        '5. *Talk to a human* — reply *4*\n\n' +
        '_Meta Commerce product cards will replace this list once the catalogue is linked._\n' +
        'Reply *menu* for all options.'
    );
}

async function sendWhatsAppButtons(phoneNumber, bodyText, buttons, options = {}) {
    assertCanSendFreeform(phoneNumber, options);
    if (!Array.isArray(buttons) || buttons.length === 0) {
        throw new Error('buttons array is required');
    }
    const allButtons = buttons.map((b, idx) => ({
        id: String(b.id || `btn_${idx + 1}`),
        title: String(b.title || `Option ${idx + 1}`).slice(0, 20)
    }));
    // WhatsApp reply buttons allow max 3
    const normalized = allButtons.slice(0, 3);

    const endpoint = `${WAPI_URL}/${WAPI_VENDOR_UID}/${WAPI_SEND_BUTTONS_PATH}`;
    const payload = {
        phone_number: phoneNumber,
        message_body: bodyText,
        type: 'button',
        interactive_type: 'button',
        interactive: {
            type: 'button',
            body: { text: bodyText },
            action: {
                buttons: normalized.map((b) => ({
                    type: 'reply',
                    reply: { id: b.id, title: b.title }
                }))
            }
        },
        buttons: normalized
    };

    if (!isInteractiveLikelyDown()) {
        try {
            console.log(`📤 Sending buttons to ${phoneNumber} via ${endpoint}`);
            const response = await axios.post(endpoint, payload, {
                headers: {
                    Authorization: `Bearer ${WAPI_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            assertWapiSuccess(response.data, 'interactive buttons');
            return { mode: 'interactive', response: response.data, buttons: normalized };
        } catch (error) {
            const status = error.response?.status;
            if (status === 404) markInteractiveUnavailable();
            console.error('❌ Buttons send failed:', error.message, status || '');
            if (META_GRAPH_INTERACTIVE_FALLBACK && canSendViaGraph()) {
                try {
                    const graphResponse = await sendGraphMessages(phoneNumber, {
                        type: 'interactive',
                        interactive: payload.interactive
                    });
                    return { mode: 'graph', response: graphResponse, buttons: normalized };
                } catch (graphErr) {
                    console.warn('⚠️ Graph buttons fallback failed:', graphErr.message);
                }
            }
            if (!WAPI_INTERACTIVE_FALLBACK_TEXT || (status && status !== 404 && error.code !== 'WAPI_SEND_FAILED')) {
                const err = new Error(
                    status === 404
                        ? 'Interactive endpoint not available yet on this WAPI account (contact/send-interactive-message). Text menu fallback can be enabled.'
                        : (error.message || 'Buttons send failed')
                );
                err.statusCode = error.statusCode || status || 502;
                err.code = error.code || 'BUTTONS_SEND_FAILED';
                throw err;
            }
        }
    } else {
        console.log('⏭️ Skipping WAPI buttons — interactive path recently 404');
    }

    const textOptions = options.textMenuOptions && options.textMenuOptions.length
        ? options.textMenuOptions
        : allButtons;
    const fallback = formatTextMenu(bodyText, textOptions);
    const response = await sendWhatsAppMessage(phoneNumber, fallback, options);
    return { mode: 'text_fallback', response, buttons: textOptions };
}

async function sendWhatsAppList(phoneNumber, bodyText, sections, options = {}) {
    assertCanSendFreeform(phoneNumber, options);
    const sectionList = Array.isArray(sections) ? sections : [];
    const rows = sectionList.flatMap((s) => s.rows || []);
    if (rows.length === 0) throw new Error('list sections/rows required');

    const endpoint = `${WAPI_URL}/${WAPI_VENDOR_UID}/${WAPI_SEND_LIST_PATH}`;
    const buttonText = options.buttonText || 'View options';
    const payload = {
        phone_number: phoneNumber,
        message_body: bodyText,
        type: 'list',
        interactive_type: 'list',
        interactive: {
            type: 'list',
            body: { text: bodyText },
            action: {
                button: buttonText,
                sections: sectionList
            }
        },
        sections: sectionList,
        button_text: buttonText
    };

    if (!isInteractiveLikelyDown()) {
        try {
            console.log(`📤 Sending list to ${phoneNumber} via ${endpoint}`);
            const response = await axios.post(endpoint, payload, {
                headers: {
                    Authorization: `Bearer ${WAPI_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            assertWapiSuccess(response.data, 'interactive list');
            return { mode: 'interactive', response: response.data };
        } catch (error) {
            const status = error.response?.status;
            if (status === 404) markInteractiveUnavailable();
            console.error('❌ List send failed:', error.message, status || '');
            if (META_GRAPH_INTERACTIVE_FALLBACK && canSendViaGraph()) {
                try {
                    const graphResponse = await sendGraphMessages(phoneNumber, {
                        type: 'interactive',
                        interactive: payload.interactive
                    });
                    return { mode: 'graph', response: graphResponse };
                } catch (graphErr) {
                    console.warn('⚠️ Graph list fallback failed:', graphErr.message);
                }
            }
            if (!WAPI_INTERACTIVE_FALLBACK_TEXT || (status && status !== 404 && error.code !== 'WAPI_SEND_FAILED')) {
                const err = new Error(
                    status === 404
                        ? 'Interactive list endpoint not available yet on this WAPI account. Text menu fallback can be enabled.'
                        : (error.message || 'List send failed')
                );
                err.statusCode = error.statusCode || status || 502;
                err.code = error.code || 'LIST_SEND_FAILED';
                throw err;
            }
        }
    } else {
        console.log('⏭️ Skipping WAPI list — interactive path recently 404');
    }

    const fallbackOptions = rows.map((r) => ({ id: r.id, title: r.title || r.id }));
    const fallback = formatTextMenu(bodyText, fallbackOptions);
    const response = await sendWhatsAppMessage(phoneNumber, fallback, options);
    return { mode: 'text_fallback', response, rows: fallbackOptions };
}

async function sendWhatsAppFlow(phoneNumber, flowConfig, options = {}) {
    assertCanSendFreeform(phoneNumber, options);
    const flowId = flowConfig?.flowId;
    if (!flowId) {
        throw new Error('flowId is required to send WhatsApp Flow');
    }

    const headerText = flowConfig.header || 'Form';
    const bodyText = flowConfig.body || 'Tap the button below to open the form inside WhatsApp.';
    const footerText = flowConfig.footer || '';
    const screen = flowConfig.screen || 'FIRST_ENTRY_SCREEN';
    const flowToken = options.flowToken
        || `${flowId}_${phoneNumber}_${Date.now()}`;

    const endpoint = `${WAPI_URL}/${WAPI_VENDOR_UID}/${WAPI_SEND_INTERACTIVE_PATH}`;
    const parameters = {
        flow_message_version: '3',
        flow_token: flowToken,
        flow_id: flowId,
        flow_cta: WHATSAPP_FLOW_CTA,
        flow_action: 'navigate',
        mode: options.flowMode || WHATSAPP_FLOW_MODE,
        flow_action_payload: {
            screen
        }
    };

    const payload = {
        phone_number: phoneNumber,
        message_body: bodyText,
        type: 'flow',
        interactive_type: 'flow',
        interactive: {
            type: 'flow',
            header: { type: 'text', text: headerText },
            body: { text: bodyText },
            footer: footerText ? { text: footerText } : undefined,
            action: {
                name: 'flow',
                parameters
            }
        },
        flow: parameters
    };

    try {
        console.log(`📤 Sending WhatsApp Flow (${flowId}) to ${phoneNumber} via ${endpoint}`);
        const response = await axios.post(endpoint, payload, {
            headers: {
                Authorization: `Bearer ${WAPI_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        assertWapiSuccess(response.data, 'interactive flow');
        return { mode: 'flow', response: response.data, flowId, flowToken };
    } catch (error) {
        const status = error.response?.status;
        if (status === 404) markInteractiveUnavailable();
        console.error('❌ Flow send failed:', error.message, status || '');
        if (canSendViaGraph()) {
            try {
                const graphResponse = await sendGraphMessages(phoneNumber, {
                    type: 'interactive',
                    interactive: payload.interactive
                });
                return { mode: 'graph_flow', response: graphResponse, flowId, flowToken };
            } catch (graphErr) {
                console.warn('⚠️ Graph Flow fallback failed:', graphErr.message);
            }
        }
        if (options.allowFallback === false) {
            throw error;
        }
        // Fallback to browser form links when Flow API unavailable
        await sendWhatsAppMessage(
            phoneNumber,
            buildFormLinksMessage() + '\n\n_(In-chat form is not available on this account yet — using browser links.)_',
            options
        );
        return { mode: 'links_fallback', error: error.message, status };
    }
}

async function sendMainMenu(phoneNumber, options = {}) {
    const body =
        options.bodyText
        || '👋 *PBMP ChatBot*\n\nHow can I help you today?';
    const menuOptions = MAIN_MENU_OPTIONS.map((o) => ({ id: o.id, title: o.title }));

    if (WAPI_PREFER_NATIVE_MENU) {
        try {
            // Native reply buttons support max 3 — use first three, keep help via text fallback menu
            const nativeButtons = menuOptions.slice(0, 3);
            const result = await sendWhatsAppButtons(phoneNumber, body, nativeButtons, {
                ...options,
                textMenuOptions: menuOptions
            });
            return result;
        } catch (error) {
            console.error('⚠️ Native menu failed, using full text menu:', error.message);
        }
    }

    const text = formatTextMenu(body, menuOptions);
    const response = await sendWhatsAppMessage(phoneNumber, text, options);
    return { mode: 'text_menu', response, options: menuOptions };
}

function buildMediaPayload(phoneNumber, mediaType, mediaUrl, options = {}) {
    const type = (mediaType || 'document').toLowerCase();
    const normalizedType = type === 'voice' ? 'audio' : type;
    return {
        phone_number: phoneNumber,
        media_type: normalizedType,
        media_url: mediaUrl,
        caption: options.caption || undefined,
        message_body: options.caption || undefined,
        file_name: options.fileName || undefined,
        filename: options.fileName || undefined
    };
}

async function sendWhatsAppMedia(phoneNumber, mediaType, mediaUrl, options = {}) {
    if (!WAPI_URL || !WAPI_VENDOR_UID || !WAPI_TOKEN) {
        throw new Error('WAPI credentials not configured. Check .env file.');
    }
    if (!mediaUrl || typeof mediaUrl !== 'string') {
        throw new Error('mediaUrl is required for sending media');
    }

    assertCanSendFreeform(phoneNumber, options);

    const payload = buildMediaPayload(phoneNumber, mediaType, mediaUrl, options);
    const attempts = [
        {
            label: WAPI_SEND_MEDIA_PATH,
            endpoint: `${WAPI_URL}/${WAPI_VENDOR_UID}/${WAPI_SEND_MEDIA_PATH}`
        }
    ];

    if (WAPI_MEDIA_VIA_SEND_MESSAGE) {
        attempts.push({
            label: 'send-message+media-fields',
            endpoint: `${WAPI_URL}/${WAPI_VENDOR_UID}/${WAPI_SEND_MESSAGE_PATH}`
        });
    }

    let lastError = null;
    for (const attempt of attempts) {
        try {
            console.log(`📤 Sending ${mediaType} to ${phoneNumber} via ${attempt.endpoint} (${attempt.label})`);
            const response = await axios.post(attempt.endpoint, payload, {
                headers: {
                    Authorization: `Bearer ${WAPI_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            assertWapiSuccess(response.data, 'media send');

            const wamid = response.data?.data?.wamid || response.data?.wamid;
            if (wamid) {
                recordMessageStatus({
                    id: wamid,
                    status: response.data?.data?.status || 'accepted',
                    phoneNumber,
                    rawType: 'outbound.media'
                });
            }

            return {
                ...response.data,
                _attempt: attempt.label
            };
        } catch (error) {
            lastError = error;
            const status = error.response?.status;
            console.error(`❌ Media attempt failed (${attempt.label}):`, error.message, status || '');
            if (error.response?.data) {
                console.error('❌ Response data:', JSON.stringify(error.response.data, null, 2));
            }
            if (status !== 404 && error.code !== 'WAPI_SEND_FAILED') break;
            if (status !== 404) break;
        }
    }

    const hint =
        'Use contact/send-media-message with media_type + media_url. ' +
        'See WAPI_ENDPOINT_AUDIT.md.';
    const err = new Error(
        `${lastError?.message || 'Media send failed'}. ${hint}`
    );
    err.cause = lastError;
    err.statusCode = lastError?.statusCode || lastError?.response?.status || 502;
    err.code = lastError?.code || 'MEDIA_SEND_FAILED';
    throw err;
}

function normalizeIncomingMedia(message) {
    if (!message || typeof message !== 'object') return null;

    const candidates = ['image', 'audio', 'video', 'document', 'sticker', 'voice'];
    const messageType = typeof message.type === 'string' ? message.type.toLowerCase() : '';
    const candidateType = candidates.find((t) => messageType.includes(t)) || candidates.find((t) => message[t]);

    if (!candidateType) {
        // Flat media fields without typed nest
        if (message.media_url || message.url) {
            return {
                type: 'document',
                url: message.media_url || message.url,
                mimeType: message.mime_type || message.mimetype || '',
                fileName: message.file_name || message.filename || null,
                caption: (message.caption || message.body || '').toString().trim(),
                mediaId: message.media_id || message.id || null
            };
        }
        return null;
    }

    const mediaObj = message[candidateType] || message.media || {};
    const url = mediaObj.url || mediaObj.link || mediaObj.download_url || message.media_url || message.url;
    const mimeType = mediaObj.mime_type || mediaObj.mimetype || message.mime_type || '';
    const fileName = mediaObj.filename || mediaObj.file_name || message.file_name || message.filename || null;
    const caption = mediaObj.caption || message.caption || '';
    const mediaId = mediaObj.id || mediaObj.media_id || message.media_id || null;

    return {
        type: candidateType === 'voice' ? 'audio' : candidateType,
        url: typeof url === 'string' ? url : null,
        mimeType: typeof mimeType === 'string' ? mimeType : '',
        fileName: typeof fileName === 'string' ? fileName : null,
        caption: typeof caption === 'string' ? caption.trim() : '',
        mediaId: typeof mediaId === 'string' ? mediaId : (mediaId != null ? String(mediaId) : null)
    };
}

async function downloadIncomingMedia(media) {
    if (!media || !media.url) return null;

    try {
        const response = await axios.get(media.url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: MEDIA_MAX_DOWNLOAD_MB * 1024 * 1024,
            headers: {
                Authorization: `Bearer ${WAPI_TOKEN}`
            }
        });

        const byteLength = response.data ? response.data.length : 0;
        return {
            mimeType: response.headers['content-type'] || media.mimeType || 'application/octet-stream',
            byteLength
        };
    } catch (error) {
        console.error('⚠️ Could not download media file:', error.message);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Formatting / booking / AI
// ---------------------------------------------------------------------------
function formatForWhatsApp(text) {
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '*$1*')
        .replace(/__(.*?)__/g, '_$1_')
        .replace(/~~(.*?)~~/g, '~$1~')
        .replace(/```(.*?)```/gs, '```$1```');

    if (formatted.length > 4096) {
        formatted = formatted.substring(0, 4090) + '...\n\n_Message truncated_';
    }

    return formatted;
}

function handleBookingFlow(session, userMessage) {
    const { bookingState, bookingData } = session;

    switch (bookingState) {
        case 'name':
            bookingData.name = userMessage;
            session.bookingState = 'email';
            return {
                message: '📧 *Great!* What\'s your email address?',
                continueFlow: true
            };

        case 'email':
            if (!isValidEmail(userMessage)) {
                return {
                    message: '❌ Please provide a valid email address.\n\nExample: john@example.com',
                    continueFlow: true
                };
            }
            bookingData.email = userMessage;
            session.bookingState = 'phone';
            return {
                message: '📱 What\'s your phone number?',
                continueFlow: true
            };

        case 'phone':
            bookingData.phone = userMessage;
            session.bookingState = 'date';
            return {
                message: '📅 What date works for you?\n\n_Format: MM/DD/YYYY_\nExample: 01/25/2026',
                continueFlow: true
            };

        case 'date':
            if (!isValidDate(userMessage)) {
                return {
                    message: '❌ Please provide a valid date in MM/DD/YYYY format.\n\nExample: 01/25/2026',
                    continueFlow: true
                };
            }
            bookingData.date = userMessage;
            session.bookingState = 'time';
            return {
                message: '⏰ What time works best for you?\n\n_Format: HH:MM AM/PM_\nExample: 10:00 AM',
                continueFlow: true
            };

        case 'time':
            if (!isValidTime(userMessage)) {
                return {
                    message: '❌ Please provide a valid time in HH:MM AM/PM format.\n\nExample: 10:00 AM or 02:30 PM',
                    continueFlow: true
                };
            }
            bookingData.time = userMessage;
            session.bookingState = 'confirm';

            return {
                message: `📋 *Please confirm your booking:*\n\n` +
                    `👤 *Name:* ${bookingData.name}\n` +
                    `📧 *Email:* ${bookingData.email}\n` +
                    `📱 *Phone:* ${bookingData.phone}\n` +
                    `📅 *Date:* ${bookingData.date}\n` +
                    `⏰ *Time:* ${bookingData.time}\n\n` +
                    `Reply with *"Confirm"* to book or *"Cancel"* to cancel.`,
                continueFlow: true
            };

        case 'confirm': {
            const lowerMsg = userMessage.toLowerCase();
            if (lowerMsg.includes('confirm') || lowerMsg.includes('yes')) {
                return {
                    message: null,
                    continueFlow: false,
                    saveBooking: true
                };
            } else if (lowerMsg.includes('cancel') || lowerMsg.includes('no')) {
                session.bookingState = null;
                session.bookingData = {};
                return {
                    message: '❌ Booking cancelled.\n\nHow else can I help you?',
                    continueFlow: false
                };
            } else {
                return {
                    message: 'Please reply with *"Confirm"* to proceed or *"Cancel"* to cancel.',
                    continueFlow: true
                };
            }
        }

        default:
            return null;
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(date) {
    return /^\d{2}\/\d{2}\/\d{4}$/.test(date);
}

function isValidTime(time) {
    return /^\d{1,2}:\d{2}\s?(AM|PM|am|pm)$/i.test(time);
}

async function saveBooking(bookingData) {
    try {
        const leadsUrl = (process.env.PBMP_LEADS_URL
            || PBMP_API_URL.replace(/\/api\/chat\/?$/, '/api/leads'));
        const response = await axios.post(leadsUrl, {
            name: bookingData.name,
            email: bookingData.email,
            phone: bookingData.phone,
            date: bookingData.date,
            time: bookingData.time,
            source: 'whatsapp_booking',
            channel: 'whatsapp',
            contactPerson: 'PBMP ChatBot',
            notes: 'Booked via WhatsApp'
        });
        console.log(`✅ Booking saved for ${bookingData.name}`);
        return response.data;
    } catch (error) {
        console.error('❌ Error saving booking:', error.message);
        throw error;
    }
}

async function queryPBMP(message, conversationHistory) {
    try {
        const messages = [];

        if (conversationHistory && conversationHistory.length > 0) {
            conversationHistory.forEach((msg) => {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ type: 'text', text: msg.content }]
                });
            });
        }

        messages.push({
            role: 'user',
            parts: [{ type: 'text', text: message }]
        });

        const response = await axios.post(
            PBMP_API_URL,
            { messages },
            {
                headers: { 'Content-Type': 'application/json' },
                responseType: 'text',
                timeout: 30000
            }
        );

        let fullResponse = '';
        const lines = response.data.split('\n');

        for (const line of lines) {
            if (line.trim().startsWith('0:')) {
                try {
                    const jsonStr = line.substring(2);
                    const parsed = JSON.parse(jsonStr);
                    fullResponse += parsed;
                } catch (e) {
                    // Skip parsing errors
                }
            }
        }

        return fullResponse || 'I apologize, but I encountered an error. Please try again.';
    } catch (error) {
        console.error('❌ Error querying PBMP:', error.message);
        return 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.';
    }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
router.post('/webhook', async (req, res) => {
    try {
        console.log('🔔 WEBHOOK CALLED - Method:', req.method);
        console.log('🔔 WEBHOOK CALLED - Body:', JSON.stringify(req.body, null, 2));

        // 1) Delivery / read / fail status events
        const statusEvents = extractStatusEvents(req.body);
        if (statusEvents.length > 0) {
            for (const event of statusEvents) {
                recordMessageStatus(event);
            }
            // If this payload is status-only, ack and stop
            const hasInboundMessage = Boolean(
                req.body?.message?.is_new_message ||
                (req.body?.contact?.phone_number && (req.body?.message?.body || normalizeIncomingMedia(req.body?.message)))
            );
            if (!hasInboundMessage) {
                return res.status(200).json({ success: true, handled: 'status', count: statusEvents.length });
            }
        }

        const { contact, message } = req.body || {};
        const phoneNumber = contact?.phone_number;
        const inboundId = extractInboundMessageId(message, req.body);
        const claim = claimInboundMessageId(inboundId);
        if (claim.duplicate) {
            console.log(`⏭️  Skipping duplicate inbound message id=${inboundId}`);
            return res.status(200).json({ success: true, duplicate: true, messageId: inboundId });
        }
        if (claim.skipped) {
            console.log('⚠️  Inbound message has no stable id — relying on text debounce for duplicates');
        }

        const incomingMedia = normalizeIncomingMedia(message);
        const flowReply = extractFlowReply(message);
        const interactiveReply = flowReply ? null : extractInteractiveReply(message);
        const userMessage = (
            message?.body?.trim()
            || interactiveReply?.title
            || interactiveReply?.id
            || incomingMedia?.caption
            || (flowReply ? 'flow_submitted' : '')
        ).trim();

        if (!message?.is_new_message || !phoneNumber || (!userMessage && !incomingMedia && !interactiveReply && !flowReply)) {
            console.log('⏭️  Skipping - no actionable message payload');
            return res.status(200).json({ success: true });
        }

        const debounceText = flowReply
            ? `flow:${flowReply.flowToken || JSON.stringify(flowReply.data || {})}`
            : (interactiveReply?.id || interactiveReply?.title || userMessage);
        const debounce = isInboundDebounced(phoneNumber, debounceText);
        if (debounce.duplicate) {
            console.log(
                `⏭️  Skipping debounced inbound from ${phoneNumber} text="${normalizeCommandText(debounceText)}" ` +
                `within ${debounce.windowMs}ms`
            );
            return res.status(200).json({
                success: true,
                duplicate: true,
                debounced: true,
                messageId: inboundId || undefined
            });
        }

        const markDebounced = () => recordInboundDebounce(phoneNumber, debounceText);

        const session = getSession(phoneNumber);
        session.lastInboundAt = Date.now();

        let enrichedUserMessage = userMessage;
        if (interactiveReply) {
            console.log(`🔘 Interactive reply from ${phoneNumber}:`, interactiveReply);
            if (!enrichedUserMessage) {
                enrichedUserMessage = interactiveReply.title || interactiveReply.id;
            }
        }
        if (incomingMedia) {
            const mediaMeta = await downloadIncomingMedia(incomingMedia);
            console.log(`📎 Media received from ${phoneNumber}:`, {
                type: incomingMedia.type,
                mimeType: incomingMedia.mimeType || mediaMeta?.mimeType || 'unknown',
                fileName: incomingMedia.fileName || 'unknown',
                byteLength: mediaMeta?.byteLength || 0,
                mediaId: incomingMedia.mediaId || null
            });

            if (!enrichedUserMessage) {
                enrichedUserMessage = `User shared a ${incomingMedia.type}${incomingMedia.fileName ? ` file named ${incomingMedia.fileName}` : ''}.`;
            } else {
                enrichedUserMessage = `${enrichedUserMessage}\n\n[Attached ${incomingMedia.type}${incomingMedia.fileName ? `: ${incomingMedia.fileName}` : ''}]`;
            }
        }

        console.log(`📱 WhatsApp message from ${phoneNumber}: ${enrichedUserMessage}`);
        session.messageCount++;
        if (!session.crmTouchedAt || Date.now() - session.crmTouchedAt > 6 * 60 * 60 * 1000) {
            session.crmTouchedAt = Date.now();
            upsertWhatsAppContact(phoneNumber, {
                status: 'engaged',
                event: 'inbound',
                messageCount: session.messageCount
            }).catch(() => {});
        }
        persistSessionsToDisk();

        const replyOpts = { isReply: true, bypassWindow: true };
        const commandText = interactiveReply?.id || interactiveReply?.title || userMessage;

        // WhatsApp Flow form submitted (nfm_reply)
        if (flowReply) {
            console.log(`📋 Flow form submitted by ${phoneNumber}:`, flowReply.data || flowReply.rawJson);
            session.awaitingMenuChoice = false;
            session.bookingState = null;
            persistSessionsToDisk();
            try {
                await handleFlowFormSubmission(phoneNumber, flowReply, replyOpts);
                markDebounced();
                return res.status(200).json({ success: true, handled: 'flow_submitted', flowKey: flowReply.flowKey });
            } catch (error) {
                console.error('❌ Flow submission handling failed:', error.message);
                await sendWhatsAppMessage(
                    phoneNumber,
                    '❌ Form submit ho gaya lekin server pe process karte waqt error aaya. Team ko manually contact karein.\n\nReply *menu* for options.',
                    replyOpts
                );
                markDebounced();
                return res.status(200).json({ success: false, handled: 'flow_submit_error' });
            }
        }

        // STOP / opt-out
        if (isOptOutMessage(commandText)) {
            setOptedOut(phoneNumber, 'keyword:' + normalizeCommandText(commandText));
            session.bookingState = null;
            session.bookingData = {};
            session.awaitingMenuChoice = false;
            session.askMode = null;
            persistSessionsToDisk();
            try {
                await sendWhatsAppMessage(
                    phoneNumber,
                    '✅ You have been unsubscribed from PBMP WhatsApp messages.\n\nReply *START* anytime to opt back in.',
                    { ...replyOpts, bypassConsent: true }
                );
            } catch (sendError) {
                console.error('❌ Failed to send opt-out confirmation:', sendError.message);
            }
            return res.status(200).json({ success: true, handled: 'opt_out' });
        }

        // Explicit opt-in
        if (isOptInMessage(commandText) || String(commandText).toLowerCase() === '/start') {
            setOptedIn(phoneNumber, 'keyword:' + normalizeCommandText(commandText || 'start'));
        } else {
            logImpliedOptIn(phoneNumber, 'inbound_message');
        }

        // Still opted out → acknowledge only
        if (isOptedOut(phoneNumber)) {
            try {
                await sendWhatsAppMessage(
                    phoneNumber,
                    'You are currently unsubscribed. Reply *START* to opt in and chat with PBMP again.',
                    { ...replyOpts, bypassConsent: true }
                );
            } catch (sendError) {
                console.error('❌ Failed to send opted-out notice:', sendError.message);
            }
            return res.status(200).json({ success: true, handled: 'opted_out_blocked' });
        }

        const wantsRestart = ['/reset', '/start', 'menu'].includes(String(commandText).toLowerCase())
            || isOptInMessage(commandText);

        if (wantsRestart) {
            session.conversationHistory = [];
            session.bookingState = null;
            session.bookingData = {};
            session.awaitingMenuChoice = true;
            session.askMode = null;
            if (session.humanHandoff) {
                await endHumanHandoff(session, 'menu_restart');
            }
            persistSessionsToDisk();

            // Touch CRM on first meaningful inbound (throttled per session)
            if (!session.crmTouchedAt || Date.now() - session.crmTouchedAt > 6 * 60 * 60 * 1000) {
                session.crmTouchedAt = Date.now();
                persistSessionsToDisk();
                upsertWhatsAppContact(phoneNumber, { status: 'engaged', event: 'menu_open' }).catch(() => {});
            }

            try {
                await sendMainMenu(phoneNumber, {
                    ...replyOpts,
                    bodyText:
                        '👋 *Welcome to PBMP ChatBot!*\n\n' +
                        'Your Personal & Business Management Platform assistant from Grow24.ai.\n\n' +
                        'Reply *STOP* anytime to unsubscribe.'
                });
                markDebounced();
            } catch (sendError) {
                console.error('❌ Failed to send welcome menu:', sendError.message);
            }

            return res.status(200).json({ success: true, handled: 'menu' });
        }

        // Resume AI bot after human handoff
        if (isResumeBotRequest(commandText) || normalizeCommandText(commandText) === 'bot') {
            if (session.humanHandoff) {
                await endHumanHandoff(session, 'user_resume');
            }
            session.awaitingMenuChoice = true;
            persistSessionsToDisk();
            try {
                await sendMainMenu(phoneNumber, {
                    ...replyOpts,
                    bodyText: '🤖 AI assistant is back. How can I help?'
                });
                markDebounced();
            } catch (sendError) {
                console.error('❌ Failed to send resume menu:', sendError.message);
            }
            return res.status(200).json({ success: true, handled: 'handoff_resumed' });
        }

        // While human handoff is active: queue inbound, do not run AI
        if (session.humanHandoff) {
            queueHandoffInbound(session, enrichedUserMessage, {
                messageId: inboundId || null,
                mediaType: incomingMedia?.type || null
            });
            await notifyHandoffEvent('handoff_inbound', phoneNumber, {
                text: enrichedUserMessage,
                messageId: inboundId || null
            });
            try {
                await sendWhatsAppMessage(
                    phoneNumber,
                    '🙋 Your message was sent to our team. A human agent will reply here shortly.\n\n' +
                    'Reply *bot* anytime to return to the AI assistant.',
                    replyOpts
                );
            } catch (sendError) {
                console.error('❌ Failed to send handoff ack:', sendError.message);
            }
            return res.status(200).json({ success: true, handled: 'handoff_queued' });
        }

        // Explicit handoff keywords
        if (isHandoffRequest(commandText)) {
            await startHumanHandoff(session, 'keyword:' + normalizeCommandText(commandText), {
                lastMessage: enrichedUserMessage
            });
            upsertWhatsAppContact(phoneNumber, {
                status: 'handoff',
                event: 'handoff_request',
                notes: 'Requested human agent via WhatsApp'
            }).catch(() => {});
            try {
                await sendWhatsAppMessage(
                    phoneNumber,
                    '🙋 *Connecting you to a human agent.*\n\n' +
                    'Our team has been notified. Please share your question — they will reply here.\n\n' +
                    'Reply *bot* anytime to return to the AI assistant.',
                    replyOpts
                );
                markDebounced();
            } catch (sendError) {
                console.error('❌ Failed to send handoff confirmation:', sendError.message);
            }
            return res.status(200).json({ success: true, handled: 'handoff_started' });
        }

        // Ask-a-question subsection must run BEFORE main menu
        // (otherwise "2" would start booking instead of Other)
        const normalizedCmd = normalizeCommandText(commandText);

        if (session.askMode === 'awaiting_section') {
            const section = resolveAskSection(commandText, interactiveReply);
            if (section === 'pbmp') {
                session.askMode = 'pbmp';
                persistSessionsToDisk();
                await sendWhatsAppMessage(
                    phoneNumber,
                    '💬 Sure — ask me anything about *PBMP / Grow24*.\n\nReply *menu* anytime for main options.',
                    replyOpts
                );
                markDebounced();
                return res.status(200).json({ success: true, handled: 'ask_section_pbmp' });
            }
            if (section === 'other') {
                session.askMode = 'other';
                persistSessionsToDisk();
                await sendWhatsAppMessage(phoneNumber, buildOtherMathHelp(), replyOpts);
                markDebounced();
                return res.status(200).json({ success: true, handled: 'ask_section_other' });
            }
            await sendWhatsAppMessage(
                phoneNumber,
                'Please choose a section:\n\n' + buildAskSectionMenu(),
                replyOpts
            );
            return res.status(200).json({ success: true, handled: 'ask_section_prompt' });
        }

        if (session.askMode === 'other') {
            const switchToPbmp = resolveAskSection(commandText, interactiveReply) === 'pbmp'
                || ['pbmp', 'grow24'].includes(normalizedCmd);
            if (switchToPbmp) {
                session.askMode = 'pbmp';
                persistSessionsToDisk();
                await sendWhatsAppMessage(
                    phoneNumber,
                    '💬 Switched to *PBMP / Grow24*. Ask me anything about the product.',
                    replyOpts
                );
                return res.status(200).json({ success: true, handled: 'ask_switch_pbmp' });
            }

            // Media commands: image1, video1, gif1, 3d_image1, ...
            const mediaCmd = resolveMediaCommand(enrichedUserMessage);
            if (mediaCmd) {
                if (mediaCmd.missing || !mediaCmd.mediaUrl) {
                    await sendWhatsAppMessage(
                        phoneNumber,
                        `❌ ${mediaCmd.hint || `Media not found for ${mediaCmd.key}`}`,
                        replyOpts
                    );
                    return res.status(200).json({
                        success: false,
                        handled: 'ask_other_media_missing',
                        command: mediaCmd.key
                    });
                }
                try {
                    const response = await sendWhatsAppMedia(
                        phoneNumber,
                        mediaCmd.mediaType,
                        mediaCmd.mediaUrl,
                        {
                            ...replyOpts,
                            caption: mediaCmd.caption,
                            fileName: mediaCmd.fileName
                        }
                    );
                    return res.status(200).json({
                        success: true,
                        handled: 'ask_other_media',
                        command: mediaCmd.key,
                        mediaType: mediaCmd.mediaType,
                        source: mediaCmd.source,
                        mediaUrl: mediaCmd.mediaUrl,
                        response
                    });
                } catch (error) {
                    console.error('❌ Media command failed:', mediaCmd.key, error.message);
                    await sendWhatsAppMessage(
                        phoneNumber,
                        `❌ Could not send *${mediaCmd.key}*.\n${error.message}\n\n` +
                        'File must be reachable on a public HTTPS URL (check PUBLIC_BASE_URL / MEDIA_CMD_*_URL).',
                        replyOpts
                    );
                    return res.status(200).json({
                        success: false,
                        handled: 'ask_other_media_failed',
                        command: mediaCmd.key,
                        error: error.message
                    });
                }
            }

            const mathResult = await evaluateOtherMath(enrichedUserMessage);
            if (mathResult) {
                await sendWhatsAppMessage(phoneNumber, mathResult.message, replyOpts);
                return res.status(200).json({
                    success: true,
                    handled: 'ask_other_math',
                    ok: mathResult.ok !== false,
                    engine: mathResult.engine || 'python'
                });
            }

            await sendWhatsAppMessage(
                phoneNumber,
                'I did not recognize that command.\n\n' + buildOtherMathHelp(),
                replyOpts
            );
            return res.status(200).json({ success: true, handled: 'ask_other_help' });
        }

        // In PBMP ask mode: Zeabur-python commands or "other" switch without Gemini
        if (session.askMode === 'pbmp') {
            const trimmed = String(enrichedUserMessage || '').trim();
            if (/^zeabur/i.test(trimmed)) {
                session.askMode = 'other';
                persistSessionsToDisk();
                const mathResult = await evaluateOtherMath(trimmed);
                await sendWhatsAppMessage(
                    phoneNumber,
                    mathResult ? mathResult.message : buildOtherMathHelp(),
                    replyOpts
                );
                return res.status(200).json({
                    success: true,
                    handled: 'ask_pbmp_to_other_math',
                    engine: mathResult?.engine || 'python'
                });
            }
            if (normalizedCmd === 'other') {
                session.askMode = 'other';
                persistSessionsToDisk();
                await sendWhatsAppMessage(phoneNumber, buildOtherMathHelp(), replyOpts);
                return res.status(200).json({ success: true, handled: 'ask_switch_other' });
            }
        }

        // Menu choice (interactive id/title or numbered text)
        const menuChoice = resolveMenuChoice(commandText, interactiveReply);
        const isExplicitMenuCommand = /^[1-6]$/.test(normalizedCmd)
            || ['ask', 'book', 'form', 'help', 'agent', 'human', 'website', 'link', 'links',
                'voice', 'voice call', 'phone call', 'callback', 'call me'].includes(normalizedCmd);
        if (menuChoice && (session.awaitingMenuChoice || interactiveReply || isExplicitMenuCommand)) {
            session.awaitingMenuChoice = false;
            if (menuChoice !== 'ask') {
                session.askMode = null;
            }
            persistSessionsToDisk();

            if (menuChoice === 'ask') {
                session.askMode = 'awaiting_section';
                persistSessionsToDisk();
                await sendWhatsAppMessage(
                    phoneNumber,
                    buildAskSectionMenu(),
                    replyOpts
                );
                markDebounced();
                return res.status(200).json({ success: true, handled: 'menu_ask' });
            }
            if (menuChoice === 'book') {
                session.bookingState = 'name';
                session.bookingData = {};
                persistSessionsToDisk();
                await sendWhatsAppMessage(
                    phoneNumber,
                    '📅 *Great! Let\'s book a meeting.*\n\n' +
                    `Prefer the website form? ${WHATSAPP_BOOKING_FORM_URL}\n\n` +
                    'Or continue here — first, what\'s your name?',
                    replyOpts
                );
                markDebounced();
                return res.status(200).json({ success: true, handled: 'menu_book' });
            }
            if (menuChoice === 'form') {
                try {
                    const flowResult = await sendBookingFormToUser(phoneNumber, replyOpts);
                    markDebounced();
                    return res.status(200).json({
                        success: true,
                        handled: flowResult.mode === 'flow' ? 'menu_form_flow' : 'menu_form_links'
                    });
                } catch (error) {
                    console.error('❌ menu form send failed:', error.message);
                    await sendWhatsAppMessage(phoneNumber, buildFormLinksMessage(), replyOpts);
                    markDebounced();
                    return res.status(200).json({ success: true, handled: 'menu_form_links_fallback' });
                }
            }
            if (menuChoice === 'agent') {
                await startHumanHandoff(session, 'menu:agent', {
                    lastMessage: enrichedUserMessage
                });
                upsertWhatsAppContact(phoneNumber, {
                    status: 'handoff',
                    event: 'handoff_menu',
                    notes: 'Requested human agent via menu'
                }).catch(() => {});
                await sendWhatsAppMessage(
                    phoneNumber,
                    '🙋 *Connecting you to a human agent.*\n\n' +
                    'Our team has been notified. Please share your question — they will reply here.\n\n' +
                    'Reply *bot* anytime to return to the AI assistant.',
                    replyOpts
                );
                markDebounced();
                return res.status(200).json({ success: true, handled: 'menu_agent' });
            }
            if (menuChoice === 'voice') {
                // "callback" / "call me" → request callback; "5" / "voice" → dial card
                if (isCallbackRequest(commandText)) {
                    const result = await requestVoiceCallback(session, {
                        lastMessage: enrichedUserMessage
                    });
                    await sendWhatsAppMessage(phoneNumber, result.message, replyOpts);
                    markDebounced();
                    return res.status(200).json({ success: true, handled: 'voice_callback' });
                }
                session.awaitingVoiceCallback = true;
                persistSessionsToDisk();
                await sendWhatsAppMessage(phoneNumber, buildVoiceCallMessage(), replyOpts);
                markDebounced();
                return res.status(200).json({ success: true, handled: 'menu_voice' });
            }
            if (menuChoice === 'catalogue') {
                try {
                    const catResult = await sendCatalogueMessage(phoneNumber, {
                        bodyText: 'Browse Grow24 / PBMP products',
                        productRetailerIds: WHATSAPP_CATALOGUE_PRODUCT_IDS,
                        bypassWindow: true,
                        bypassConsent: true
                    });
                    if (catResult.via === 'none' || catResult.via === 'text') {
                        await sendWhatsAppMessage(
                            phoneNumber,
                            catResult.message || buildTextCatalogueMessage(),
                            replyOpts
                        );
                    }
                } catch (catErr) {
                    console.error('❌ menu catalogue failed:', catErr.message);
                    await sendWhatsAppMessage(phoneNumber, buildTextCatalogueMessage(), replyOpts);
                }
                markDebounced();
                return res.status(200).json({ success: true, handled: 'menu_catalogue' });
            }
            if (menuChoice === 'help') {
                await sendWhatsAppMessage(phoneNumber, buildHelpMessage(), replyOpts);
                markDebounced();
                return res.status(200).json({ success: true, handled: 'menu_help' });
            }
        }

        // After voice-call card: user replies callback / call me
        if (session.awaitingVoiceCallback && isCallbackRequest(commandText)) {
            const result = await requestVoiceCallback(session, {
                lastMessage: enrichedUserMessage
            });
            await sendWhatsAppMessage(phoneNumber, result.message, replyOpts);
            markDebounced();
            return res.status(200).json({ success: true, handled: 'voice_callback' });
        }
        if (session.awaitingVoiceCallback && /^(yes|ok|okay|sure|haan|ha)$/i.test(normalizedCmd)) {
            const result = await requestVoiceCallback(session, {
                lastMessage: enrichedUserMessage
            });
            await sendWhatsAppMessage(phoneNumber, result.message, replyOpts);
            markDebounced();
            return res.status(200).json({ success: true, handled: 'voice_callback_yes' });
        }

        // Standalone voice / callback keywords (outside menu)
        if (isCallbackRequest(commandText) || normalizedCmd === 'callback') {
            const result = await requestVoiceCallback(session, {
                lastMessage: enrichedUserMessage
            });
            await sendWhatsAppMessage(phoneNumber, result.message, replyOpts);
            markDebounced();
            return res.status(200).json({ success: true, handled: 'voice_callback' });
        }
        if (isVoiceCallRequest(commandText)) {
            session.awaitingVoiceCallback = true;
            persistSessionsToDisk();
            await sendWhatsAppMessage(phoneNumber, buildVoiceCallMessage(), replyOpts);
            markDebounced();
            return res.status(200).json({ success: true, handled: 'voice_call_info' });
        }

        if (session.bookingState) {
            const flowResult = handleBookingFlow(session, enrichedUserMessage);

            if (flowResult.saveBooking) {
                try {
                    await saveBooking(session.bookingData);
                    await sendWhatsAppMessage(
                        phoneNumber,
                        '✅ *Meeting booked successfully!*\n\n' +
                        `📅 ${session.bookingData.date} at ${session.bookingData.time}\n\n` +
                        'We\'ll send you a confirmation email shortly.\n\n' +
                        `Website: ${WHATSAPP_WEBSITE_URL}\n\n` +
                        'Reply *menu* for more options.',
                        replyOpts
                    );
                    session.bookingState = null;
                    session.bookingData = {};
                    persistSessionsToDisk();
                } catch (error) {
                    await sendWhatsAppMessage(
                        phoneNumber,
                        '❌ Sorry, there was an error booking your meeting. Please try again or use the form:\n' +
                        WHATSAPP_BOOKING_FORM_URL,
                        replyOpts
                    );
                }
            } else {
                await sendWhatsAppMessage(phoneNumber, flowResult.message, replyOpts);
                persistSessionsToDisk();
            }

            return res.status(200).json({ success: true });
        }

        const bookingKeywords = ['book', 'meeting', 'appointment', 'schedule', 'consultation'];
        if (bookingKeywords.some((kw) => enrichedUserMessage.toLowerCase().includes(kw))) {
            session.bookingState = 'name';
            session.bookingData = {};
            persistSessionsToDisk();

            await sendWhatsAppMessage(
                phoneNumber,
                '📅 *Great! Let\'s book a meeting.*\n\n' +
                `Prefer the website form? ${WHATSAPP_BOOKING_FORM_URL}\n\n` +
                'Or continue here — first, what\'s your name?',
                replyOpts
            );

            return res.status(200).json({ success: true });
        }

        // Explicit form/link intent
        if (/\b(support form|support request)\b/i.test(enrichedUserMessage)) {
            try {
                const flowResult = await sendSupportFormToUser(phoneNumber, replyOpts);
                markDebounced();
                return res.status(200).json({
                    success: true,
                    handled: flowResult.mode === 'flow' ? 'support_form_flow' : 'support_form_links'
                });
            } catch (error) {
                console.error('❌ support form send failed:', error.message);
            }
        }
        if (/\b(form|website|link|portal|links)\b/i.test(enrichedUserMessage)) {
            try {
                const flowResult = await sendBookingFormToUser(phoneNumber, replyOpts);
                markDebounced();
                return res.status(200).json({
                    success: true,
                    handled: flowResult.mode === 'flow' ? 'form_flow' : 'form_links'
                });
            } catch (error) {
                console.error('❌ form send failed:', error.message);
                await sendWhatsAppMessage(phoneNumber, buildFormLinksMessage(), replyOpts);
                markDebounced();
                return res.status(200).json({ success: true, handled: 'form_links_fallback' });
            }
        }

        session.conversationHistory.push({
            role: 'user',
            content: enrichedUserMessage
        });

        let aiResponse;
        try {
            aiResponse = await queryPBMP(enrichedUserMessage, session.conversationHistory);
        } catch (queryError) {
            console.error('❌ Error querying PBMP:', queryError.message);
            aiResponse = 'I apologize, but I\'m having trouble processing your request right now. Please try again in a moment.';
        }

        session.conversationHistory.push({
            role: 'assistant',
            content: aiResponse
        });

        if (session.conversationHistory.length > 20) {
            session.conversationHistory = session.conversationHistory.slice(-20);
        }
        persistSessionsToDisk();

        const formattedResponse = formatForWhatsApp(aiResponse);
        try {
            await sendWhatsAppMessage(phoneNumber, formattedResponse, replyOpts);
        } catch (sendError) {
            console.error('❌ Failed to send WhatsApp response:', sendError.message);
        }

        res.status(200).json({ success: true, messageId: inboundId || undefined });
    } catch (error) {
        console.error('❌ Webhook error:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

router.get('/webhook', (req, res) => {
    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || 'your_verify_token';
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('🔐 Webhook verification request');

    if (token === verifyToken) {
        console.log('✅ Webhook verified');
        res.status(200).send(challenge);
    } else {
        console.log('❌ Webhook verification failed');
        res.status(403).send('Forbidden');
    }
});

router.get('/status', (req, res) => {
    pruneProcessedIds();
    const recent = statusHistory.slice(-20);
    const optedOutCount = [...consentByPhone.values()].filter((c) => c.optedOut).length;
    res.json({
        status: 'active',
        activeSessions: sessions.size,
        idempotency: {
            trackedIds: processedMessageIds.size,
            ttlMs: IDEMPOTENCY_TTL_MS,
            debounceMs: INBOUND_DEBOUNCE_MS,
            recentDebounceKeys: recentInboundByPhone.size
        },
        messageStatuses: {
            tracked: messageStatuses.size,
            recent
        },
        consent: {
            tracked: consentByPhone.size,
            optedOut: optedOutCount,
            storePath: CONSENT_STORE_PATH
        },
        customerCareWindow: {
            windowMs: CUSTOMER_CARE_WINDOW_MS,
            enforce: ENFORCE_CUSTOMER_CARE_WINDOW
        },
        media: {
            path: WAPI_SEND_MEDIA_PATH,
            note: 'Verified: contact/send-media-message with media_type + media_url'
        },
        templates: {
            path: WAPI_SEND_TEMPLATE_PATH,
            defaultName: WAPI_DEFAULT_TEMPLATE_NAME || null,
            defaultLanguage: WAPI_TEMPLATE_DEFAULT_LANGUAGE,
            note: 'Path verified. Requires Meta-approved template synced in WAPI dashboard.'
        },
        interactive: {
            path: WAPI_SEND_INTERACTIVE_PATH,
            preferNativeMenu: WAPI_PREFER_NATIVE_MENU,
            textFallback: WAPI_INTERACTIVE_FALLBACK_TEXT,
            note: 'send-interactive-message currently 404 on this account; text menu fallback is used'
        },
        links: {
            website: WHATSAPP_WEBSITE_URL,
            bookingForm: WHATSAPP_BOOKING_FORM_URL,
            supportForm: WHATSAPP_SUPPORT_FORM_URL
        },
        voiceCall: {
            number: WHATSAPP_VOICE_CALL_NUMBER || null,
            hours: WHATSAPP_VOICE_CALL_HOURS || null,
            label: WHATSAPP_VOICE_CALL_LABEL,
            note: 'Click-to-call + callback request. WhatsApp Calling API is not available via WAPI.'
        },
        automate: {
            enabled: Boolean(AUTOMATE_API_KEY),
            defaultPhone: AUTOMATE_DEFAULT_PHONE || null,
            endpoint: 'POST /whatsapp/automate',
            note: 'Android Automate POC. See AUTOMATE_POC.md'
        },
        metaApp: {
            appId: META_APP_ID || null,
            phoneNumberId: META_PHONE_NUMBER_ID || null,
            wabaId: META_WABA_ID || null,
            graphVersion: META_GRAPH_API_VERSION,
            accessTokenSet: Boolean(META_ACCESS_TOKEN),
            callingEnabled: WHATSAPP_CALLING_ENABLED,
            callingInboundAction: WHATSAPP_CALLING_INBOUND_ACTION,
            catalogueId: WHATSAPP_CATALOGUE_ID || null,
            note: 'PBMP-owned Meta App path — keep WAPI messaging separate. See META_CALLING_AND_CATALOGUE.md'
        },
        flows: {
            bookingFlowId: WHATSAPP_BOOKING_FLOW_ID || null,
            supportFlowId: WHATSAPP_SUPPORT_FLOW_ID || null,
            leadFlowId: WHATSAPP_LEAD_FLOW_ID || null,
            bookingScreen: WHATSAPP_BOOKING_FLOW_SCREEN,
            supportScreen: WHATSAPP_SUPPORT_FLOW_SCREEN,
            leadScreen: WHATSAPP_LEAD_FLOW_SCREEN,
            cta: WHATSAPP_FLOW_CTA,
            mode: WHATSAPP_FLOW_MODE,
            inChatEnabled: hasInChatFormsEnabled(),
            note: 'Draft Flow can be sent with WHATSAPP_FLOW_MODE=draft. Publish needs business verification. See WHATSAPP_FLOWS_SETUP.md'
        },
        handoff: {
            activeCount: listActiveHandoffs().length,
            notifyWebhook: Boolean(WHATSAPP_HANDOFF_WEBHOOK),
            notifyEmail: WHATSAPP_HANDOFF_NOTIFY_EMAIL || null,
            keywords: HANDOFF_KEYWORDS.slice(0, 8),
            resumeKeywords: RESUME_BOT_KEYWORDS.slice(0, 8)
        },
        sessionStore: SESSION_STORE_PATH || null,
        timestamp: new Date().toISOString()
    });
});

router.get('/status/:messageId', (req, res) => {
    const record = messageStatuses.get(req.params.messageId);
    if (!record) {
        return res.status(404).json({ success: false, error: 'Message status not found' });
    }
    res.json({ success: true, status: record });
});

router.get('/consent/:phone', (req, res) => {
    const phone = String(req.params.phone || '').replace(/\D/g, '');
    if (!phone) {
        return res.status(400).json({ success: false, error: 'phone required' });
    }
    res.json({
        success: true,
        consent: getConsent(phone),
        window: getCustomerCareWindow(phone),
        handoff: getHandoffSnapshot(getSession(phone))
    });
});

router.get('/handoffs', (req, res) => {
    res.json({
        success: true,
        count: listActiveHandoffs().length,
        handoffs: listActiveHandoffs()
    });
});

router.get('/handoff/:phone', (req, res) => {
    const phone = String(req.params.phone || '').replace(/\D/g, '');
    if (!phone) {
        return res.status(400).json({ success: false, error: 'phone required' });
    }
    const session = getSession(phone);
    res.json({
        success: true,
        phone,
        handoff: getHandoffSnapshot(session),
        pendingMessages: session.handoffPendingMessages || [],
        window: getCustomerCareWindow(phone)
    });
});

router.post('/handoff/:phone', async (req, res) => {
    try {
        const phone = String(req.params.phone || '').replace(/\D/g, '');
        if (!phone) {
            return res.status(400).json({ success: false, error: 'phone required' });
        }
        const { active, reason } = req.body || {};
        const session = getSession(phone);
        let snapshot;
        if (active === false || String(active).toLowerCase() === 'false') {
            snapshot = await endHumanHandoff(session, reason || 'agent_ended');
            if (req.body?.notifyUser !== false) {
                await sendWhatsAppMessage(
                    phone,
                    '🤖 A teammate closed this handoff. AI assistant is available again — reply *menu* for options.',
                    { isReply: true, bypassWindow: true }
                ).catch(() => {});
            }
        } else {
            snapshot = await startHumanHandoff(session, reason || 'agent_api', {
                forceNotify: true,
                lastMessage: req.body?.note || null
            });
            if (req.body?.notifyUser !== false) {
                await sendWhatsAppMessage(
                    phone,
                    '🙋 You are now connected with our team. A human agent will reply here shortly.\n\nReply *bot* to return to AI.',
                    { isReply: true, bypassWindow: true }
                ).catch(() => {});
            }
            upsertWhatsAppContact(phone, {
                status: 'handoff',
                event: 'handoff_api',
                notes: reason || 'Agent opened handoff'
            }).catch(() => {});
        }
        res.json({ success: true, phone, handoff: snapshot });
    } catch (error) {
        console.error('❌ Handoff API error:', error.message);
        res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
});

router.post('/agent-reply', async (req, res) => {
    try {
        const { phone, message, keepHandoff, bypassConsent } = req.body || {};
        const phoneNumber = String(phone || '').replace(/\D/g, '');
        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                error: 'phone and message are required'
            });
        }
        const session = getSession(phoneNumber);
        if (!session.humanHandoff) {
            await startHumanHandoff(session, 'agent_reply', { forceNotify: false });
        }
        const response = await sendWhatsAppMessage(phoneNumber, message, {
            isReply: true,
            bypassWindow: true,
            bypassConsent: Boolean(bypassConsent)
        });
        if (keepHandoff === false) {
            await endHumanHandoff(session, 'agent_resolved');
        }
        res.json({
            success: true,
            response,
            handoff: getHandoffSnapshot(session)
        });
    } catch (error) {
        console.error('❌ Agent reply error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
            code: error.code || undefined
        });
    }
});

router.post('/test', async (req, res) => {
    try {
        console.log('🧪 Test endpoint called');
        const { phone, message, bypassWindow, bypassConsent } = req.body;
        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                error: 'phone and message required',
                received: { phone, message }
            });
        }

        const response = await sendWhatsAppMessage(phone, message, {
            bypassWindow: Boolean(bypassWindow),
            bypassConsent: Boolean(bypassConsent)
        });
        res.json({
            success: true,
            message: 'Message sent',
            response,
            window: getCustomerCareWindow(phone)
        });
    } catch (error) {
        console.error('❌ Test endpoint error:', error);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
            code: error.code || undefined,
            window: error.window || undefined,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

router.post('/test-media', async (req, res) => {
    try {
        const { phone, mediaType, mediaUrl, caption, fileName, bypassWindow, bypassConsent } = req.body;
        if (!phone || !mediaType || !mediaUrl) {
            return res.status(400).json({
                success: false,
                error: 'phone, mediaType, and mediaUrl are required'
            });
        }

        const response = await sendWhatsAppMedia(phone, mediaType, mediaUrl, {
            caption,
            fileName,
            bypassWindow: Boolean(bypassWindow),
            bypassConsent: Boolean(bypassConsent)
        });
        res.json({ success: true, response });
    } catch (error) {
        console.error('❌ Test media endpoint error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
            code: error.code || undefined,
            hint: 'Set WAPI_SEND_*_PATH from WAPI docs, or see WAPI_ENDPOINT_AUDIT.md'
        });
    }
});

router.post('/test-template', async (req, res) => {
    try {
        const { phone, templateName, language, components, parameters, fallbackBody, bypassConsent } = req.body;
        if (!phone || !templateName) {
            return res.status(400).json({
                success: false,
                error: 'phone and templateName are required'
            });
        }

        const response = await sendWhatsAppTemplate(phone, templateName, {
            language,
            components,
            parameters,
            fallbackBody,
            bypassConsent: Boolean(bypassConsent)
        });
        res.json({ success: true, response });
    } catch (error) {
        console.error('❌ Test template endpoint error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
            code: error.code || undefined,
            wapiResponse: error.wapiResponse || undefined,
            hint: '1) Create/approve template in Meta 2) Sync in WAPI 3) Use exact template_name + language (en)'
        });
    }
});

router.post('/test-menu', async (req, res) => {
    try {
        const { phone, bypassWindow, bypassConsent } = req.body;
        if (!phone) {
            return res.status(400).json({ success: false, error: 'phone is required' });
        }
        const response = await sendMainMenu(phone, {
            bypassWindow: Boolean(bypassWindow),
            bypassConsent: Boolean(bypassConsent)
        });
        res.json({ success: true, response });
    } catch (error) {
        console.error('❌ Test menu endpoint error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
            code: error.code || undefined
        });
    }
});

router.post('/test-buttons', async (req, res) => {
    try {
        const { phone, bodyText, buttons, bypassWindow, bypassConsent } = req.body;
        if (!phone || !bodyText || !Array.isArray(buttons)) {
            return res.status(400).json({
                success: false,
                error: 'phone, bodyText, and buttons[] are required'
            });
        }
        const response = await sendWhatsAppButtons(phone, bodyText, buttons, {
            bypassWindow: Boolean(bypassWindow),
            bypassConsent: Boolean(bypassConsent)
        });
        res.json({ success: true, response });
    } catch (error) {
        console.error('❌ Test buttons endpoint error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
            code: error.code || undefined
        });
    }
});

router.post('/test-list', async (req, res) => {
    try {
        const { phone, bodyText, sections, buttonText, bypassWindow, bypassConsent } = req.body;
        if (!phone || !bodyText || !Array.isArray(sections)) {
            return res.status(400).json({
                success: false,
                error: 'phone, bodyText, and sections[] are required'
            });
        }
        const response = await sendWhatsAppList(phone, bodyText, sections, {
            buttonText,
            bypassWindow: Boolean(bypassWindow),
            bypassConsent: Boolean(bypassConsent)
        });
        res.json({ success: true, response });
    } catch (error) {
        console.error('❌ Test list endpoint error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
            code: error.code || undefined
        });
    }
});

router.post('/test-flow', async (req, res) => {
    try {
        const phone = String(req.body?.phone || '').replace(/\D/g, '');
        const flowKind = String(req.body?.flowKind || 'booking').toLowerCase();
        if (!phone) {
            return res.status(400).json({ success: false, error: 'phone is required' });
        }
        const kind = ['support', 'lead', 'booking'].includes(flowKind) ? flowKind : 'booking';
        const cfg = resolveFlowConfig(kind);
        if (!cfg.flowId) {
            const envName = kind === 'support'
                ? 'WHATSAPP_SUPPORT_FLOW_ID'
                : (kind === 'lead' ? 'WHATSAPP_LEAD_FLOW_ID' : 'WHATSAPP_BOOKING_FLOW_ID');
            return res.status(400).json({
                success: false,
                error: `${envName} is not set`
            });
        }
        const response = await sendWhatsAppFlow(phone, cfg, {
            bypassWindow: Boolean(req.body?.bypassWindow),
            bypassConsent: Boolean(req.body?.bypassConsent),
            allowFallback: false
        });
        res.json({ success: true, response });
    } catch (error) {
        console.error('❌ Test flow endpoint error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
            code: error.code || undefined
        });
    }
});

// ---------------------------------------------------------------------------
// Android Automate POC — voice/text → PBMP → WhatsApp
// Auth: X-PBMP-Automate-Key or Authorization: Bearer <AUTOMATE_API_KEY>
// ---------------------------------------------------------------------------
// Automate HTTP body often uses 0/1 instead of true/false.
function isAutomateFlag(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (value === true || value === 1) return true;
    if (value === false || value === 0) return false;
    const s = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(s)) return true;
    if (['0', 'false', 'no', 'off'].includes(s)) return false;
    return defaultValue;
}

function stripAutoVoiceWakePhrase(text) {
    const raw = String(text || '').trim();
    const stripped = raw.replace(/^\s*(hey\s+|ok\s+|okay\s+)?(ask\s+)?(pbmp|grow24)\b[,:\-\s]*/i, '').trim();
    return stripped || raw;
}

function requireAutomateAuth(req, res) {
    if (!AUTOMATE_API_KEY) {
        res.status(503).json({
            success: false,
            error: 'AUTOMATE_API_KEY is not set on the server',
            hint: 'Set AUTOMATE_API_KEY in Zeabur env, then redeploy'
        });
        return false;
    }
    const headerKey = String(req.get('X-PBMP-Automate-Key') || '').trim();
    const bearer = String(req.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const bodyKey = String(req.body?.apiKey || '').trim();
    const key = headerKey || bearer || bodyKey;
    if (!key || key !== AUTOMATE_API_KEY) {
        res.status(401).json({
            success: false,
            error: 'Unauthorized',
            speakText: 'PBMP Automate key is not valid. Check the header in your flow.'
        });
        return false;
    }
    return true;
}

function resolveAutomatePhone(req) {
    const raw = req.body?.phone || AUTOMATE_DEFAULT_PHONE || '';
    return String(raw).replace(/\D/g, '');
}

router.post('/automate', async (req, res) => {
    try {
        if (!requireAutomateAuth(req, res)) return;

        const action = String(req.body?.action || 'ask').toLowerCase().trim();
        const phone = resolveAutomatePhone(req);
        let text = String(req.body?.text || req.body?.message || req.body?.transcript || '').trim();
        if (action === 'autovoice') {
            text = stripAutoVoiceWakePhrase(text);
        }
        const sendWhatsApp = isAutomateFlag(
            req.body?.sendWhatsApp,
            action === 'autovoice' ? false : true
        );
        const bypassWindow = isAutomateFlag(req.body?.bypassWindow, false);
        const bypassConsent = isAutomateFlag(req.body?.bypassConsent, false);

        if (action === 'ping') {
            return res.json({
                success: true,
                action: 'ping',
                speakText: 'PBMP Automate endpoint is ready.',
                automateDefaultPhone: AUTOMATE_DEFAULT_PHONE || null
            });
        }

        if (action === 'ask' || action === 'autovoice') {
            if (!text) {
                return res.status(400).json({
                    success: false,
                    error: 'text (or message / transcript) is required for action=ask',
                    speakText: 'I did not catch that. Please say it again.'
                });
            }
            const session = phone ? getSession(phone) : null;
            const history = session?.conversationHistory || [];
            const answer = await queryPBMP(text, history);
            if (session) {
                session.conversationHistory = session.conversationHistory || [];
                session.conversationHistory.push({ role: 'user', content: text });
                session.conversationHistory.push({ role: 'assistant', content: answer });
                if (session.conversationHistory.length > 40) {
                    session.conversationHistory = session.conversationHistory.slice(-40);
                }
                session.lastActivity = Date.now();
            }
            let waResponse = null;
            let whatsappError = null;
            if (sendWhatsApp && phone) {
                try {
                    waResponse = await sendWhatsAppMessage(phone, answer, {
                        isReply: true,
                        bypassWindow,
                        bypassConsent
                    });
                } catch (waErr) {
                    whatsappError = waErr.message || String(waErr);
                    console.error('⚠️ Automate ask: WhatsApp send failed:', whatsappError);
                }
            }
            const speakText = answer;
            return res.json({
                success: true,
                action,
                phone: phone || null,
                transcript: text,
                answer,
                speakText,
                whatsappSent: Boolean(waResponse),
                whatsappError: whatsappError || null,
                whatsapp: waResponse || null
            });
        }

        if (action === 'send') {
            if (!phone || !text) {
                return res.status(400).json({
                    success: false,
                    error: 'phone and text/message are required for action=send'
                });
            }
            const waResponse = await sendWhatsAppMessage(phone, text, {
                bypassWindow,
                bypassConsent
            });
            return res.json({
                success: true,
                action: 'send',
                phone,
                speakText: 'Message sent on WhatsApp.',
                whatsapp: waResponse
            });
        }

        if (action === 'menu') {
            if (!phone) {
                return res.status(400).json({
                    success: false,
                    error: 'phone is required for action=menu (or set AUTOMATE_DEFAULT_PHONE)'
                });
            }
            const waResponse = await sendMainMenu(phone, { bypassWindow, bypassConsent });
            return res.json({
                success: true,
                action: 'menu',
                phone,
                speakText: 'WhatsApp menu sent.',
                whatsapp: waResponse
            });
        }

        if (action === 'catalogue') {
            if (!phone) {
                return res.status(400).json({
                    success: false,
                    error: 'phone is required for action=catalogue (or set AUTOMATE_DEFAULT_PHONE)'
                });
            }
            const catResult = await sendCatalogueMessage(phone, {
                catalogId: req.body?.catalogId,
                bodyText: req.body?.bodyText || 'Browse our products',
                productRetailerIds: req.body?.productRetailerIds || WHATSAPP_CATALOGUE_PRODUCT_IDS,
                bypassWindow,
                bypassConsent
            });
            if (catResult.via === 'none' || catResult.via === 'text') {
                if (phone) {
                    await sendWhatsAppMessage(phone, catResult.message || buildTextCatalogueMessage(), {
                        bypassWindow,
                        bypassConsent
                    });
                }
                return res.json({
                    success: true,
                    action: 'catalogue',
                    phone,
                    via: 'text',
                    speakText: 'I sent the Grow24 product list on WhatsApp.',
                    hint: 'Set WHATSAPP_CATALOGUE_ID in Zeabur for Meta product cards.'
                });
            }
            return res.json({
                success: true,
                action: 'catalogue',
                phone,
                via: catResult.via,
                speakText: 'Product catalogue sent on WhatsApp.',
                whatsapp: catResult.response
            });
        }

        if (action === 'calling_status') {
            const ready = Boolean(
                WHATSAPP_CALLING_ENABLED && META_ACCESS_TOKEN && META_PHONE_NUMBER_ID
            );
            const recent = callingEventHistory.slice(-3);
            const speakText = ready
                ? 'WhatsApp Calling is enabled on PBMP. Check recent call events in the dashboard.'
                : 'WhatsApp Calling is not fully enabled yet. Complete Meta Calling setup first.';
            return res.json({
                success: true,
                action: 'calling_status',
                enabled: WHATSAPP_CALLING_ENABLED,
                ready,
                recentEvents: recent,
                speakText
            });
        }

        return res.status(400).json({
            success: false,
            error: `Unknown action: ${action}`,
            allowed: ['ping', 'ask', 'autovoice', 'send', 'menu', 'catalogue', 'calling_status']
        });
    } catch (error) {
        console.error('❌ Automate endpoint error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
            code: error.code || undefined,
            speakText: 'Sorry, PBMP could not complete that request.'
        });
    }
});

// ---------------------------------------------------------------------------
// Meta Calling + catalogue scaffolding (PBMP-owned Meta App — not WAPI)
// ---------------------------------------------------------------------------
const callingEventHistory = [];
const CALLING_EVENT_LIMIT = 50;

function pushCallingEvent(event) {
    callingEventHistory.push({ ...event, receivedAt: new Date().toISOString() });
    if (callingEventHistory.length > CALLING_EVENT_LIMIT) {
        callingEventHistory.splice(0, callingEventHistory.length - CALLING_EVENT_LIMIT);
    }
}

function extractCallingConnectEvents(body) {
    const events = [];
    const entry = body?.entry || [];
    for (const e of entry) {
        for (const change of (e?.changes || [])) {
            const value = change?.value || {};
            let calls = value.calls;
            if (!Array.isArray(calls) && (value.id || value.call_id)) {
                calls = [value];
            }
            if (!Array.isArray(calls)) continue;
            for (const call of calls) {
                events.push({
                    field: change?.field || 'calls',
                    callId: call.id || call.call_id || null,
                    from: String(call.from || value.from || '').replace(/\D/g, '') || null,
                    to: call.to || value.to || null,
                    event: String(call.event || call.status || '').toLowerCase(),
                    session: call.session || null,
                    raw: call
                });
            }
        }
    }
    return events;
}

async function metaCallAction(callId, action, extra = {}) {
    if (!callId) {
        const err = new Error('call_id is required');
        err.statusCode = 400;
        throw err;
    }
    if (!canSendViaGraph()) {
        const err = new Error('META_ACCESS_TOKEN and META_PHONE_NUMBER_ID are required for Calling actions');
        err.statusCode = 400;
        err.code = 'GRAPH_NOT_CONFIGURED';
        throw err;
    }
    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_PHONE_NUMBER_ID}/calls`;
    const payload = {
        messaging_product: 'whatsapp',
        call_id: callId,
        action,
        ...extra
    };
    const response = await axios.post(url, payload, {
        headers: {
            Authorization: `Bearer ${META_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        timeout: 15000,
        validateStatus: () => true
    });
    if (response.status >= 400) {
        const err = new Error(
            response.data?.error?.message || `Call ${action} failed (${response.status})`
        );
        err.statusCode = response.status;
        err.code = 'CALL_ACTION_FAILED';
        err.graphResponse = response.data;
        throw err;
    }
    return response.data;
}

function buildMissedWhatsAppCallMessage() {
    return (
        '📞 *We received your WhatsApp call.*\n\n' +
        'Voice pickup inside WhatsApp is not live yet, so the call was not answered.\n\n' +
        '• Reply *callback* — we will phone you back\n' +
        '• Reply *5* — click-to-call card\n' +
        '• Reply *4* — talk to a human here\n\n' +
        'Reply *menu* for all options.'
    );
}

async function handleInboundWhatsAppCall(callEvent) {
    const callId = callEvent.callId;
    const from = callEvent.from;
    const eventName = callEvent.event;
    const result = { callId, from, event: eventName, action: 'log', graph: null, whatsapp: null };

    const isConnect = !eventName || eventName === 'connect' || eventName === 'ringing';
    if (!isConnect || !callId) return result;

    if (!WHATSAPP_CALLING_ENABLED) {
        result.action = 'logged_disabled';
        return result;
    }

    if (WHATSAPP_CALLING_INBOUND_ACTION === 'log') {
        result.action = 'log';
        return result;
    }

    try {
        result.graph = await metaCallAction(callId, 'reject');
        result.action = 'reject';
    } catch (error) {
        result.action = 'reject_failed';
        result.error = error.message;
        console.error('❌ Call reject failed:', error.message);
    }

    notifyHandoffEvent('whatsapp_call_inbound', from, {
        callId,
        event: eventName,
        handled: result.action
    }).catch(() => {});

    if (from) {
        try {
            result.whatsapp = await sendWhatsAppMessage(from, buildMissedWhatsAppCallMessage(), {
                bypassWindow: true,
                bypassConsent: true
            });
        } catch (waErr) {
            console.warn('⚠️ Missed-call WhatsApp follow-up failed:', waErr.message);
            result.whatsappError = waErr.message;
        }
    }
    return result;
}

router.get('/calling/status', (req, res) => {
    res.json({
        success: true,
        enabled: WHATSAPP_CALLING_ENABLED,
        inboundAction: WHATSAPP_CALLING_INBOUND_ACTION,
        ready: Boolean(
            WHATSAPP_CALLING_ENABLED && META_ACCESS_TOKEN && META_PHONE_NUMBER_ID
        ),
        meta: {
            appId: META_APP_ID || null,
            phoneNumberId: META_PHONE_NUMBER_ID || null,
            wabaId: META_WABA_ID || null,
            graphVersion: META_GRAPH_API_VERSION,
            accessTokenSet: Boolean(META_ACCESS_TOKEN)
        },
        recentEvents: callingEventHistory.slice(-10),
        note: 'Inbound connect events are auto-rejected (no WebRTC media server yet) and a WhatsApp follow-up is sent. Full VoIP accept needs SDP/WebRTC. See META_CALLING_AND_CATALOGUE.md',
        nextSteps: [
            'WhatsApp Manager → Phone numbers → Call settings → Allow voice calls',
            'WHATSAPP_CALLING_ENABLED=true (already if ready=true)',
            'Place a test call to the Meta test number',
            'Check recentEvents + missed-call WhatsApp message',
            'Later: WebRTC media server for true accept/pickup'
        ]
    });
});

router.post('/calling/reject', async (req, res) => {
    try {
        const callId = String(req.body?.callId || req.body?.call_id || '').trim();
        const graph = await metaCallAction(callId, 'reject');
        res.json({ success: true, action: 'reject', callId, graph });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
            graphResponse: error.graphResponse
        });
    }
});

router.post('/calling/terminate', async (req, res) => {
    try {
        const callId = String(req.body?.callId || req.body?.call_id || '').trim();
        const graph = await metaCallAction(callId, 'terminate');
        res.json({ success: true, action: 'terminate', callId, graph });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
            graphResponse: error.graphResponse
        });
    }
});

router.post('/calling/webhook', async (req, res) => {
    try {
        console.log('📞 Calling webhook:', JSON.stringify(req.body || {}).slice(0, 2000));
        const entry = req.body?.entry || [];
        let stored = 0;
        for (const e of entry) {
            const changes = e?.changes || [];
            for (const change of changes) {
                pushCallingEvent({
                    field: change?.field || null,
                    value: change?.value || change
                });
                stored += 1;
            }
        }
        if (!stored && req.body && Object.keys(req.body).length) {
            pushCallingEvent({ field: 'raw', value: req.body });
        }

        const callEvents = extractCallingConnectEvents(req.body);
        const handled = [];
        for (const callEvent of callEvents) {
            handled.push(await handleInboundWhatsAppCall(callEvent));
        }

        res.json({
            success: true,
            accepted: true,
            processed: handled.length > 0,
            handled
        });
    } catch (error) {
        console.error('❌ Calling webhook error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/calling/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
});

async function sendCatalogueViaGraph(phoneNumber, options = {}) {
    const catalogId = options.catalogId || WHATSAPP_CATALOGUE_ID;
    const phoneNumberId = META_PHONE_NUMBER_ID;
    const token = META_ACCESS_TOKEN;
    if (!catalogId || !phoneNumberId || !token) {
        const err = new Error('Meta Graph catalogue requires WHATSAPP_CATALOGUE_ID, META_PHONE_NUMBER_ID, META_ACCESS_TOKEN');
        err.statusCode = 400;
        err.code = 'CATALOGUE_GRAPH_NOT_CONFIGURED';
        throw err;
    }
    const to = String(phoneNumber).replace(/\D/g, '');
    const bodyText = options.bodyText || 'Browse our catalogue';
    const productRetailerIds = Array.isArray(options.productRetailerIds)
        ? options.productRetailerIds
        : [];
    const interactive = productRetailerIds.length > 0
        ? {
            type: 'product_list',
            body: { text: bodyText },
            action: {
                catalog_id: catalogId,
                sections: [{
                    title: options.sectionTitle || 'Products',
                    product_items: productRetailerIds.map((id) => ({ product_retailer_id: id }))
                }]
            }
        }
        : {
            type: 'catalog_message',
            body: { text: bodyText },
            action: { name: 'catalog_message' }
        };
    const url = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${phoneNumberId}/messages`;
    const response = await axios.post(
        url,
        {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'interactive',
            interactive
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000,
            validateStatus: () => true
        }
    );
    if (response.status >= 400) {
        const err = new Error(
            response.data?.error?.message || `Graph catalogue send failed (${response.status})`
        );
        err.statusCode = response.status;
        err.code = 'CATALOGUE_GRAPH_FAILED';
        err.graphResponse = response.data;
        throw err;
    }
    return response.data;
}

async function sendCatalogueMessage(phoneNumber, options = {}) {
    if (!WHATSAPP_CATALOGUE_ID && !options.catalogId) {
        return { via: 'text', response: null, message: buildTextCatalogueMessage() };
    }
    try {
        const response = await sendCatalogueViaWapi(phoneNumber, options);
        return { via: 'wapi', response };
    } catch (wapiErr) {
        console.warn('⚠️ WAPI catalogue failed, trying Meta Graph:', wapiErr.message);
        if (META_ACCESS_TOKEN && META_PHONE_NUMBER_ID) {
            try {
                const response = await sendCatalogueViaGraph(phoneNumber, options);
                return { via: 'graph', response };
            } catch (graphErr) {
                console.warn('⚠️ Graph catalogue failed:', graphErr.message);
            }
        }
        return { via: 'text', response: null, message: buildTextCatalogueMessage(), error: wapiErr.message };
    }
}

async function sendCatalogueViaWapi(phoneNumber, options = {}) {
    const catalogId = options.catalogId || WHATSAPP_CATALOGUE_ID;
    if (!catalogId) {
        const err = new Error('WHATSAPP_CATALOGUE_ID is not set');
        err.statusCode = 400;
        err.code = 'CATALOGUE_NOT_CONFIGURED';
        throw err;
    }
    if (!WAPI_URL || !WAPI_VENDOR_UID || !WAPI_TOKEN) {
        const err = new Error('WAPI credentials missing');
        err.statusCode = 500;
        throw err;
    }

    const bodyText = options.bodyText || 'Browse our catalogue';
    const productRetailerIds = Array.isArray(options.productRetailerIds)
        ? options.productRetailerIds
        : [];

    // Common Cloud API–style interactive product / catalog payload (WAPI may remap).
    const interactive = productRetailerIds.length > 0
        ? {
            type: 'product_list',
            header: options.headerText ? { type: 'text', text: options.headerText } : undefined,
            body: { text: bodyText },
            action: {
                catalog_id: catalogId,
                sections: [{
                    title: options.sectionTitle || 'Products',
                    product_items: productRetailerIds.map((id) => ({ product_retailer_id: id }))
                }]
            }
        }
        : {
            type: 'catalog_message',
            body: { text: bodyText },
            action: {
                name: 'catalog_message',
                parameters: { thumbnail_product_retailer_id: options.thumbnailProductId || undefined }
            }
        };

    const url = `${WAPI_URL.replace(/\/$/, '')}/${WAPI_VENDOR_UID}/${WAPI_SEND_CATALOGUE_PATH.replace(/^\//, '')}`;
    const payload = {
        phone_number: String(phoneNumber).replace(/\D/g, ''),
        type: 'interactive',
        interactive,
        // Alternate flat keys some BSPs expect
        catalog_id: catalogId,
        message_body: bodyText
    };

    try {
        const response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${WAPI_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000,
            validateStatus: () => true
        });
        if (response.status >= 400) {
            const err = new Error(
                response.data?.message
                || response.data?.error
                || `Catalogue send failed (${response.status})`
            );
            err.statusCode = response.status;
            err.code = 'CATALOGUE_SEND_FAILED';
            err.wapiResponse = response.data;
            throw err;
        }
        return response.data;
    } catch (error) {
        if (error.code === 'CATALOGUE_SEND_FAILED') throw error;
        const err = new Error(error.message || 'Catalogue send failed');
        err.statusCode = error.statusCode || 502;
        err.code = 'CATALOGUE_SEND_FAILED';
        err.wapiResponse = error.response?.data;
        throw err;
    }
}

router.get('/catalogue/status', (req, res) => {
    res.json({
        success: true,
        catalogueId: WHATSAPP_CATALOGUE_ID || null,
        productRetailerIds: WHATSAPP_CATALOGUE_PRODUCT_IDS,
        wapiPath: WAPI_SEND_CATALOGUE_PATH,
        metaPhoneNumberId: META_PHONE_NUMBER_ID || null,
        ready: true,
        commerceReady: Boolean(WHATSAPP_CATALOGUE_ID),
        fallback: 'text_catalogue',
        note: 'Menu 7 sends a text catalogue until WHATSAPP_CATALOGUE_ID is set. See META_CALLING_AND_CATALOGUE.md'
    });
});

router.post('/catalogue/send', async (req, res) => {
    try {
        const phone = String(req.body?.phone || '').replace(/\D/g, '');
        if (!phone) {
            return res.status(400).json({ success: false, error: 'phone is required' });
        }
        const catResult = await sendCatalogueMessage(phone, {
            catalogId: req.body?.catalogId,
            bodyText: req.body?.bodyText,
            headerText: req.body?.headerText,
            sectionTitle: req.body?.sectionTitle,
            productRetailerIds: req.body?.productRetailerIds,
            thumbnailProductId: req.body?.thumbnailProductId
        });
        if (catResult.via === 'text' || catResult.via === 'none') {
            const text = catResult.message || buildTextCatalogueMessage();
            const response = await sendWhatsAppMessage(phone, text, {
                bypassWindow: Boolean(req.body?.bypassWindow),
                bypassConsent: Boolean(req.body?.bypassConsent)
            });
            return res.json({ success: true, via: 'text', response, message: text });
        }
        res.json({ success: true, via: catResult.via, response: catResult.response });
    } catch (error) {
        console.error('❌ Catalogue send error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message,
            code: error.code || undefined,
            wapiResponse: error.wapiResponse || undefined,
            hint: 'Ask WAPI if catalog_message / product_list interactive is enabled for your account'
        });
    }
});

module.exports = router;
