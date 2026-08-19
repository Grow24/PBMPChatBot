const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

const INBOX_DIR = process.env.MEDIA_INBOX_DIR
  ? path.resolve(process.env.MEDIA_INBOX_DIR)
  : path.join(__dirname, 'media-inbox');
const MAX_IMAGE_BYTES = Number(process.env.MEDIA_MAX_IMAGE_BYTES || 20 * 1024 * 1024);
const MAX_VIDEO_BYTES = Number(process.env.MEDIA_MAX_VIDEO_BYTES || 50 * 1024 * 1024);
const MAX_KEEP = Number(process.env.MEDIA_INBOX_KEEP || 30);

const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

const VIDEO_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/3gpp',
  'video/x-matroska',
]);

const ALL_MIME = new Set([...IMAGE_MIME, ...VIDEO_MIME]);

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
    console.warn('⚠️  media inbox prune failed:', err.message);
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
  if (base === 'image/jpeg') return 'jpg';
  if (base === 'image/png') return 'png';
  if (base === 'image/webp') return 'webp';
  if (base === 'image/gif') return 'gif';
  if (base === 'image/heic' || base === 'image/heif') return 'heic';
  if (base === 'video/mp4') return 'mp4';
  if (base === 'video/webm') return 'webm';
  if (base === 'video/quicktime') return 'mov';
  if (base === 'video/3gpp') return '3gp';
  if (base === 'video/x-matroska') return 'mkv';
  return 'bin';
}

function mediaType(mimeType) {
  const base = String(mimeType || '').split(';')[0].trim().toLowerCase();
  if (IMAGE_MIME.has(base)) return 'image';
  if (VIDEO_MIME.has(base)) return 'video';
  return 'unknown';
}

function stripDataUrl(value) {
  const raw = String(value || '').trim();
  const comma = raw.indexOf(',');
  if (raw.startsWith('data:') && comma !== -1) {
    return raw.slice(comma + 1);
  }
  return raw;
}

function isSafeMediaFilename(value) {
  return /^pm_[0-9]+_[a-f0-9]+\.(jpg|jpeg|png|webp|gif|heic|mp4|webm|mov|3gp|mkv)$/i.test(String(value || ''));
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

router.get('/status', (_req, res) => {
  res.json({
    ok: true,
    phase: 'hello-world',
    purpose: 'Receive image/video from PWA or native app.',
    inboxDir: INBOX_DIR,
    recentCount: recentReceipts.length,
    recent: recentReceipts.slice(0, 10),
    limits: {
      maxImageBytes: MAX_IMAGE_BYTES,
      maxVideoBytes: MAX_VIDEO_BYTES,
      allowedImageMime: [...IMAGE_MIME],
      allowedVideoMime: [...VIDEO_MIME],
    },
  });
});

router.get('/files', (_req, res) => {
  try {
    const files = listInboxFiles();
    res.json({
      ok: true,
      inboxDir: INBOX_DIR,
      count: files.length,
      files,
      downloadHint: '/api/media/download/<filename>',
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: 'Failed to list media files',
      details: err.message,
    });
  }
});

router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;
  if (!isSafeMediaFilename(filename)) {
    return res.status(400).json({ ok: false, error: 'Invalid filename' });
  }
  const absolute = path.join(INBOX_DIR, filename);
  if (!fs.existsSync(absolute)) {
    return res.status(404).json({ ok: false, error: 'File not found', filename });
  }
  return res.download(absolute, filename);
});

router.post('/upload', (req, res) => {
  try {
    const {
      dataBase64,
      mimeType,
      caption,
      clientTs,
      clientSource,
    } = req.body || {};

    if (!dataBase64 || typeof dataBase64 !== 'string') {
      return res.status(400).json({
        ok: false,
        received: false,
        error: 'dataBase64 is required (base64 encoded image or video)',
      });
    }

    const cleanMime = String(mimeType || '').split(';')[0].trim().toLowerCase();
    if (!ALL_MIME.has(cleanMime)) {
      return res.status(400).json({
        ok: false,
        received: false,
        error: `Unsupported mimeType: ${cleanMime}`,
        allowed: [...ALL_MIME],
      });
    }

    let buffer;
    try {
      buffer = Buffer.from(stripDataUrl(dataBase64), 'base64');
    } catch (err) {
      return res.status(400).json({
        ok: false,
        received: false,
        error: 'dataBase64 is not valid base64',
        details: err.message,
      });
    }

    if (!buffer.length) {
      return res.status(400).json({
        ok: false,
        received: false,
        error: 'payload is empty',
      });
    }

    const type = mediaType(cleanMime);
    const maxBytes = type === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (buffer.length > maxBytes) {
      return res.status(413).json({
        ok: false,
        received: false,
        error: `File too large (${buffer.length} bytes). Max for ${type}: ${maxBytes}.`,
      });
    }

    ensureInbox();
    const id = `pm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const filename = `${id}.${extensionForMime(cleanMime)}`;
    const savedPath = path.join(INBOX_DIR, filename);
    fs.writeFileSync(savedPath, buffer);
    pruneInbox();

    const receipt = {
      id,
      type,
      bytes: buffer.length,
      mimeType: cleanMime,
      filename,
      caption: String(caption || '').slice(0, 500) || null,
      clientSource: String(clientSource || '').slice(0, 40) || null,
      clientTs: clientTs || null,
      receivedAt: new Date().toISOString(),
    };
    remember(receipt);

    console.log(`📸 Media received: ${id} (${type}, ${buffer.length} bytes, ${cleanMime})`);

    return res.json({
      ok: true,
      received: true,
      phase: 'hello-world',
      message: `Got it. PBMP received your ${type}.`,
      downloadUrl: `/api/media/download/${filename}`,
      ...receipt,
    });
  } catch (err) {
    console.error('❌ Media upload error:', err);
    return res.status(500).json({
      ok: false,
      received: false,
      error: 'Failed to store media',
      details: err.message,
    });
  }
});

module.exports = router;
