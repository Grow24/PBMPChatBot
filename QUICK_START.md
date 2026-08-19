# Quick Start: Integrate PBMP Chatbot into grow24.ai

## Step 1: Build the Widget

```bash
npm install
npm run build:widget
```

This creates the widget files in `dist-widget/` folder.

## Step 2: Upload Files to Your Server

Upload these files to your grow24.ai server (via cPanel File Manager or FTP):

**Required Files:**
- `dist-widget/pbmp-chat-widget.js` → Upload to `/public_html/pbmp-chatbot/pbmp-chat-widget.js`
- `public/pbmp-logo.svg` → Upload to `/public_html/pbmp-chatbot/pbmp-logo.svg`
- `public/PersonalSide.png` → Upload to `/public_html/pbmp-chatbot/PersonalSide.png`
- `public/ProfessionalSide.png` → Upload to `/public_html/pbmp-chatbot/ProfessionalSide.png`

**Optional:**
- `dist-widget/pbmp-chat-widget.css` (if it exists) → Upload to `/public_html/pbmp-chatbot/pbmp-chat-widget.css`

## Step 3: Add to Your HTML

Add this code **before** the closing `</body>` tag in your `index.html`:

```html
<!-- PBMP Chatbot Widget -->
<link rel="stylesheet" href="/pbmp-chatbot/pbmp-chat-widget.css">
<script 
  src="/pbmp-chatbot/pbmp-chat-widget.js"
  data-pbmp-chat
  data-api-endpoint="YOUR_BACKEND_URL/api/chat"
  data-position="bottom-right">
</script>
```

**Replace `YOUR_BACKEND_URL`** with your actual backend URL, for example:
- `https://pbmp-backend.vercel.app`
- `https://api.grow24.ai`
- `https://your-domain.com`

## Step 4: Ensure Backend is Configured

Make sure your backend (`pbmp-backend/server.js`) has CORS configured to allow `grow24.ai`:

```javascript
const allowedOrigins = [
  'https://grow24.ai',
  'https://www.grow24.ai',
  // ... other origins
];
```

## Step 5: Test

1. Open your website: `https://grow24.ai`
2. Look for the chat button in the bottom-right corner
3. Click it and test sending a message

## Troubleshooting

**Widget not appearing?**
- Check browser console (F12) for errors
- Verify file paths are correct
- Ensure files are uploaded to the right location

**CORS errors?**
- Check backend CORS configuration
- Verify backend URL is correct
- Ensure backend is accessible

**Assets not loading?**
- Verify logo and image files are uploaded
- Check file permissions (should be 644)
- Ensure paths match your server structure

## File Structure on Server

```
public_html/
├── index.html (your main file)
└── pbmp-chatbot/
    ├── pbmp-chat-widget.js
    ├── pbmp-chat-widget.css (optional)
    ├── pbmp-logo.svg
    ├── PersonalSide.png
    └── ProfessionalSide.png
```

## Need Help?

See `INTEGRATION_GUIDE.md` for detailed instructions and advanced options.
