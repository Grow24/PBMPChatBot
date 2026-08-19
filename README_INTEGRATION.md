# PBMP Chatbot - Website Integration Summary

## What Has Been Created

✅ **Widget Component** (`src/widget/ChatWidget.tsx`)
- Floating chat widget that can be embedded in any website
- Toggle button to open/close chat
- Full chat functionality (messages, booking, diagrams)

✅ **Widget Entry Point** (`src/widget/widget.tsx`)
- Auto-initialization from script tag attributes
- Manual initialization support
- Global function for programmatic control

✅ **Build Configuration** (`vite.widget.config.ts`)
- Standalone widget build
- Single-file output (IIFE format)
- Ready for embedding

✅ **Backend CORS Updated** (`pbmp-backend/server.js`)
- Added grow24.ai domains to allowed origins
- Supports www and non-www variants

✅ **Integration Documentation**
- `QUICK_START.md` - Fast integration guide
- `INTEGRATION_GUIDE.md` - Detailed instructions
- `integration-example.html` - Example HTML file

## Next Steps for Integration

### 1. Build the Widget
```bash
cd /Users/abhinavrai/DST/PBMPChatBot
npm run build:widget
```

### 2. Upload Files to grow24.ai Server

**Via cPanel File Manager:**
1. Log into GoDaddy cPanel
2. Navigate to File Manager → `public_html`
3. Create folder: `pbmp-chatbot`
4. Upload these files:
   - `dist-widget/pbmp-chat-widget.js`
   - `public/pbmp-logo.svg`
   - `public/PersonalSide.png`
   - `public/ProfessionalSide.png`

### 3. Add Widget Script to Your HTML

Add this before `</body>` in your `index.html`:

```html
<script 
  src="/pbmp-chatbot/pbmp-chat-widget.js"
  data-pbmp-chat
  data-api-endpoint="YOUR_BACKEND_URL/api/chat"
  data-position="bottom-right">
</script>
```

**Replace `YOUR_BACKEND_URL`** with your backend URL.

### 4. Ensure Backend is Running

Make sure your backend server is:
- ✅ Deployed and accessible
- ✅ CORS configured for grow24.ai
- ✅ Environment variables set (GEMINI_API_KEY, etc.)

## File Structure After Upload

```
public_html/
├── index.html (your website)
└── pbmp-chatbot/
    ├── pbmp-chat-widget.js
    ├── pbmp-logo.svg
    ├── PersonalSide.png
    └── ProfessionalSide.png
```

## Testing Checklist

- [ ] Widget button appears on page
- [ ] Widget opens when clicked
- [ ] Can send messages
- [ ] Receives responses from backend
- [ ] Logo displays correctly
- [ ] Diagrams work (if tested)
- [ ] Booking flow works (if tested)
- [ ] No console errors

## Common Issues

**Widget not appearing:**
- Check browser console for errors
- Verify file paths are correct
- Ensure script tag is before `</body>`

**CORS errors:**
- Verify backend CORS includes grow24.ai
- Check backend is accessible
- Verify API endpoint URL is correct

**Assets not loading:**
- Check file permissions (644)
- Verify files are uploaded correctly
- Check paths match server structure

## Support Files

- `QUICK_START.md` - Quick integration steps
- `INTEGRATION_GUIDE.md` - Detailed guide with troubleshooting
- `integration-example.html` - Example HTML file

## Notes

- The widget is self-contained and won't conflict with your existing website
- Assets (logo, images) need to be accessible from the same domain
- Backend must be publicly accessible (not localhost)
- Widget works on both HTTP and HTTPS

---

**Ready to integrate?** Follow `QUICK_START.md` for step-by-step instructions!
