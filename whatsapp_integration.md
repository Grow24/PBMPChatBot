# PBMP WhatsApp Integration

**Provider:** WAPI.in.net (WhatsApp Business Service Provider)  
**Status:** ✅ Fully Functional  
**Integration Method:** API + Webhooks  
**Created:** January 15, 2026

---

## Overview

PBMP ChatBot integrates with WhatsApp using **WAPI** (a third-party WhatsApp Business API provider). Users can send messages to the chatbot via WhatsApp, and receive AI-powered responses.

---

## How It Works

### 1. **WAPI Setup**

- Registered business WhatsApp number with WAPI.in.net
- Obtained API credentials (API Token, Instance ID)
- Configured webhook URL pointing to backend server

### 2. **Integration Architecture**

```
WhatsApp User → WAPI Cloud → Webhook → PBMP Backend → Gemini AI → PBMP Backend → WAPI Cloud → WhatsApp User
```

### 3. **Message Flow**

**Incoming Message:**

1. User sends WhatsApp message to business number
2. WAPI receives message and forwards to webhook (`/whatsapp/webhook`)
3. Backend extracts message text and sender phone number
4. Message is processed through Gemini AI (with AstraDB context)
5. Response generated

**Outgoing Reply:**

1. Backend calls WAPI Send Message API
2. WAPI delivers message to user's WhatsApp
3. User receives response

---

## Technical Implementation

### Webhook Endpoint

```javascript
POST / whatsapp / webhook;
```

**Handler:** `whatsapp-service.js`

**Receives:**

- Message text
- Sender phone number
- Message ID
- Timestamp

**Processes:**

- Routes to chat handler
- Generates AI response
- Sends reply via WAPI API

### WAPI API Integration

**Send Message:**

```javascript
POST https://wapi.in.net/api/send
Headers:
  - Authorization: Bearer {API_TOKEN}
Body:
  - phone: recipient number
  - message: text to send
  - instance_id: WAPI instance
```

**Webhook Events:**

- `message` - New message received
- `status` - Message status updates
- `ack` - Delivery acknowledgments

---

## Configuration

### Environment Variables

```bash
WAPI_API_TOKEN=your_api_token
WAPI_INSTANCE_ID=your_instance_id
WAPI_WEBHOOK_URL=https://pbmpchatbotbackend.zeabur.app/whatsapp/webhook
```

### WAPI Dashboard Settings

1. Login to WAPI.in.net
2. Navigate to Webhooks
3. Set webhook URL
4. Enable message events
5. Save configuration

---

## Key Features

- ✅ **Real-time messaging** - Instant message delivery
- ✅ **AI-powered responses** - Google Gemini integration
- ✅ **Context-aware** - AstraDB knowledge base integration
- ✅ **Session management** - Maintains conversation context
- ✅ **Status tracking** - Delivery and read receipts
- ✅ **Error handling** - Graceful failure management

---

## Testing

### Test Incoming Message

1. Send WhatsApp message to business number
2. Check backend logs for webhook receipt
3. Verify AI response generation
4. Check WhatsApp for reply

### Check Status

```bash
GET https://pbmpchatbotbackend.zeabur.app/whatsapp/status
```

Returns webhook health and connection status.

---

## Files

- `pbmp-backend/whatsapp-service.js` - Webhook handler and WAPI integration
- `pbmp-backend/server.js` - Routes WhatsApp messages to chat handler

---

## Benefits

- **Multi-channel support** - Chat available on website + WhatsApp
- **Wider reach** - Users don't need to visit website
- **Convenient** - Chat in familiar WhatsApp interface
- **Same AI** - Consistent responses across channels
