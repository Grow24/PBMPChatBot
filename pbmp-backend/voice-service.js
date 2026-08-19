const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

const INBOX_DIR = process.env.VOICE_INBOX_DIR
  ? path.resolve(process.env.VOICE_INBOX_DIR)
  : path.join(__dirname, 'voice-inbox');
const MAX_AUDIO_BYTES = Number(process.env.VOICE_MAX_AUDIO_BYTES || 8 * 1024 * 1024);
const MAX_KEEP = Number(process.env.VOICE_INBOX_KEEP || 20);
const ALLOWED_MIME = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/3gpp',
  'audio/amr',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
]);

/** @type {Array<Record<string, unknown>>} */
const recentReceipts = [];

function ensureInbox() {
  if (!fs.existsSync(INBOX_DIR)) {
    fs.mkdirSync(INBOX_DIR, { recursive: true });
  }
}

function pruneInbox() {
  try {
    const files = fs.readdirSync(INBOX_DIR)
      .map((name) => {
        const full = path.join(INBOX_DIR, name);
        const stat = fs.statSync(full);
        return { name, full, mtime: stat.mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    for (const extra of files.slice(MAX_KEEP)) {
      fs.unlinkSync(extra.full);
    }
  } catch (err) {
    console.warn('⚠️  voice inbox prune failed:', err.message);
  }
}

function remember(receipt) {
  recentReceipts.unshift(receipt);
  if (recentReceipts.length > MAX_KEEP) {
    recentReceipts.length = MAX_KEEP;
  }
}

function extensionForMime(mimeType) {
  const base = String(mimeType || '').split(';')[0].trim().toLowerCase();
  if (base.includes('webm')) return 'webm';
  if (base.includes('ogg')) return 'ogg';
  if (base.includes('mp4')) return 'm4a';
  if (base.includes('mpeg')) return 'mp3';
  if (base.includes('wav') || base.includes('wave')) return 'wav';
  return 'bin';
}

function stripDataUrl(value) {
  const raw = String(value || '').trim();
  const comma = raw.indexOf(',');
  if (raw.startsWith('data:') && comma !== -1) {
    return raw.slice(comma + 1);
  }
  return raw;
}

function statusPayload() {
  return {
    ok: true,
    phase: 'hello-world',
    purpose: 'Receive wake-word command audio. No STT / LLM / WhatsApp in this POC.',
    inboxDir: INBOX_DIR,
    recentCount: recentReceipts.length,
    recent: recentReceipts.slice(0, 10),
    note: 'PWA must stay in the foreground. This is not Siri-style always-on listening.',
  };
}

function listInboxFiles() {
  ensureInbox();
  return fs.readdirSync(INBOX_DIR)
    .map((name) => {
      const full = path.join(INBOX_DIR, name);
      const stat = fs.statSync(full);
      return {
        filename: name,
        bytes: stat.size,
        modifiedAt: new Date(stat.mtimeMs).toISOString(),
      };
    })
    .sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1));
}

function isSafeVoiceFilename(value) {
  return /^vw_[0-9]+_[a-f0-9]+\.(webm|ogg|m4a|mp3|wav|aac|3gp|amr)$/i.test(String(value || ''));
}

router.get('/status', (_req, res) => {
  res.json(statusPayload());
});

router.get('/hello-world', (_req, res) => {
  res.json(statusPayload());
});

router.get('/files', (_req, res) => {
  try {
    const files = listInboxFiles();
    res.json({
      ok: true,
      inboxDir: INBOX_DIR,
      count: files.length,
      files,
      downloadHint: '/api/voice/download/<filename>',
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'Failed to list voice files',
      details: err.message,
    });
  }
});

router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  if (!isSafeVoiceFilename(filename)) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid filename',
    });
  }

  const absolute = path.join(INBOX_DIR, filename);
  if (!fs.existsSync(absolute)) {
    return res.status(404).json({
      ok: false,
      error: 'File not found',
      filename,
    });
  }

  return res.download(absolute, filename);
});

router.post('/hello-world', (req, res) => {
  try {
    const {
      audioBase64,
      mimeType,
      durationMs,
      wakeTranscript,
      clientTs,
    } = req.body || {};

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({
        ok: false,
        received: false,
        error: 'audioBase64 is required',
      });
    }

    const cleanMime = String(mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
    const mimeOk = [...ALLOWED_MIME].some((allowed) => allowed.split(';')[0] === cleanMime);
    if (!mimeOk) {
      return res.status(400).json({
        ok: false,
        received: false,
        error: `Unsupported mimeType: ${cleanMime}`,
      });
    }

    let buffer;
    try {
      buffer = Buffer.from(stripDataUrl(audioBase64), 'base64');
    } catch (err) {
      return res.status(400).json({
        ok: false,
        received: false,
        error: 'audioBase64 is not valid base64',
        details: err.message,
      });
    }

    if (!buffer.length) {
      return res.status(400).json({
        ok: false,
        received: false,
        error: 'audio payload is empty',
      });
    }

    if (buffer.length > MAX_AUDIO_BYTES) {
      return res.status(413).json({
        ok: false,
        received: false,
        error: `Audio too large (${buffer.length} bytes). Max ${MAX_AUDIO_BYTES}.`,
      });
    }

    ensureInbox();
    const id = `vw_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const filename = `${id}.${extensionForMime(cleanMime)}`;
    const savedPath = path.join(INBOX_DIR, filename);
    fs.writeFileSync(savedPath, buffer);
    pruneInbox();

    const receipt = {
      id,
      bytes: buffer.length,
      mimeType: cleanMime,
      filename,
      durationMs: Number(durationMs) || null,
      wakeTranscript: String(wakeTranscript || '').slice(0, 200),
      clientSource: String((req.body || {}).clientSource || '').slice(0, 40) || null,
      clientTs: clientTs || null,
      receivedAt: new Date().toISOString(),
    };
    remember(receipt);

    console.log(`🎤 Voice hello-world received: ${id} (${buffer.length} bytes, ${cleanMime})`);

    return res.json({
      ok: true,
      received: true,
      phase: 'hello-world',
      speakText: 'Got it. PBMP received your command.',
      next: 'STT, LLM, TTS conversation, WhatsApp, and reports are not in this POC.',
      ...receipt,
    });
  } catch (err) {
    console.error('❌ Voice hello-world error:', err);
    return res.status(500).json({
      ok: false,
      received: false,
      error: 'Failed to store voice command',
      details: err.message,
    });
  }
});

module.exports = router;
