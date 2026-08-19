# PBMP Chatbot Integration Guide for grow24.ai

This guide will help you integrate the PBMP Chatbot widget into your grow24.ai website.

## Prerequisites

1. **Backend API**: The chatbot backend must be deployed and accessible
2. **Widget Files**: Built widget files (CSS and JS)
3. **Access to grow24.ai**: cPanel access or ability to edit HTML files

## Step 1: Build the Widget

First, build the widget files:

```bash
cd /path/to/PBMPChatBot
npm install
npm run build:widget
```

This will create:
- `dist-widget/pbmp-chat-widget.js` - The widget JavaScript bundle
- `dist-widget/pbmp-chat-widget.css` - The widget styles (if extracted)

## Step 2: Upload Widget Files to Your Server

### Option A: Upload to grow24.ai Server (Recommended)

1. **Via cPanel File Manager:**
   - Log into your GoDaddy cPanel
   - Navigate to File Manager
   - Go to your website's root directory (usually `public_html` or `www`)
   - Create a folder called `pbmp-chatbot` (or any name you prefer)
   - Upload the following files:
     - `dist-widget/pbmp-chat-widget.js`
     - `dist-widget/pbmp-chat-widget.css` (if it exists)
     - `public/pbmp-logo.svg` (for the logo)
     - `public/PersonalSide.png` (for diagrams)
     - `public/ProfessionalSide.png` (for diagrams)

2. **Via FTP:**
   - Connect to your server via FTP
   - Upload files to `/public_html/pbmp-chatbot/` (or your preferred location)

### Option B: Use CDN/External Hosting

If you prefer, you can host the widget files on:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Any static file hosting service

## Step 3: Update Backend CORS (If Not Done)

Ensure your backend server (`pbmp-backend/server.js`) allows requests from grow24.ai. The CORS configuration should include:

```javascript
const allowedOrigins = [
  'https://grow24.ai',
  'https://www.grow24.ai',
  'http://grow24.ai',
  'http://www.grow24.ai'
];
```

## Step 4: Add Widget to Your HTML

Add the following code to your `index.html` file (or the main HTML file of your website), preferably just before the closing `</body>` tag:

### Basic Integration

```html
<!-- PBMP Chatbot Widget -->
<link rel="stylesheet" href="/pbmp-chatbot/pbmp-chat-widget.css">
<script src="/pbmp-chatbot/pbmp-chat-widget.js"></script>
<script>
  // Initialize the widget
  window.initPBMPChatWidget({
    apiEndpoint: 'https://your-backend-url.com/api/chat', // Replace with your backend URL
    position: 'bottom-right' // or 'bottom-left'
  });
</script>
```

### Using Data Attributes (Auto-initialization)

```html
<!-- PBMP Chatbot Widget -->
<link rel="stylesheet" href="/pbmp-chatbot/pbmp-chat-widget.css">
<script 
  src="/pbmp-chatbot/pbmp-chat-widget.js"
  data-pbmp-chat
  data-api-endpoint="https://your-backend-url.com/api/chat"
  data-position="bottom-right">
</script>
```

### Example: Complete Integration

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Grow24.ai - Personal & Business Management Platform</title>
    <!-- Your existing styles -->
</head>
<body>
    <!-- Your website content -->
    
    <!-- PBMP Chatbot Widget - Add before closing </body> tag -->
    <link rel="stylesheet" href="/pbmp-chatbot/pbmp-chat-widget.css">
    <script 
      src="/pbmp-chatbot/pbmp-chat-widget.js"
      data-pbmp-chat
      data-api-endpoint="https://your-backend-url.com/api/chat"
      data-position="bottom-right">
    </script>
</body>
</html>
```

## Step 5: Configure Backend URL

Replace `https://your-backend-url.com/api/chat` with your actual backend API URL. Examples:

- **If backend is on Vercel**: `https://your-app.vercel.app/api/chat`
- **If backend is on a subdomain**: `https://api.grow24.ai/api/chat`
- **If backend is on same domain**: `https://grow24.ai/api/chat`

## Step 6: Test the Integration

1. Open your website in a browser
2. You should see a chat button in the bottom-right (or bottom-left) corner
3. Click the button to open the chat widget
4. Try sending a message to test the connection

## Troubleshooting

### Widget Not Appearing

1. **Check Browser Console**: Open Developer Tools (F12) and check for JavaScript errors
2. **Verify File Paths**: Ensure the paths to `pbmp-chat-widget.js` and `pbmp-chat-widget.css` are correct
3. **Check File Permissions**: Ensure files are readable (644 permissions)

### CORS Errors

If you see CORS errors in the console:
1. Verify your backend CORS configuration includes grow24.ai domains
2. Check that your backend is accessible from the browser
3. Ensure the API endpoint URL is correct

### Widget Not Loading

1. **Check Network Tab**: Verify that `pbmp-chat-widget.js` is loading successfully
2. **Verify Script Tag**: Ensure the script tag is placed before the closing `</body>` tag
3. **Check File Size**: Large files might timeout - consider using a CDN

### API Connection Issues

1. **Test Backend Directly**: Try accessing `https://your-backend-url.com/api/chat` directly
2. **Check Backend Logs**: Look for incoming requests
3. **Verify API Endpoint**: Ensure the endpoint matches your backend route

## Customization

### Change Widget Position

Change `data-position` attribute:
- `bottom-right` (default)
- `bottom-left`

### Custom API Endpoint

Update the `data-api-endpoint` attribute with your backend URL.

### Styling

The widget uses inline styles for positioning. To customize further, you can:

1. Override CSS classes (if CSS is extracted)
2. Modify the widget component source code
3. Use CSS custom properties (if supported)

## Advanced: Manual Initialization

If you need more control, you can manually initialize the widget:

```html
<script src="/pbmp-chatbot/pbmp-chat-widget.js"></script>
<script>
  // Wait for page to load
  window.addEventListener('DOMContentLoaded', function() {
    const widget = window.initPBMPChatWidget({
      apiEndpoint: 'https://your-backend-url.com/api/chat',
      position: 'bottom-right',
      containerId: 'my-custom-container-id'
    });
    
    // You can destroy the widget programmatically if needed
    // widget.destroy();
  });
</script>
```

## File Structure on Server

After uploading, your server structure should look like:

```
public_html/
├── index.html (your main HTML file)
├── pbmp-chatbot/
│   ├── pbmp-chat-widget.js
│   ├── pbmp-chat-widget.css (if extracted)
│   ├── pbmp-logo.svg
│   ├── PersonalSide.png
│   └── ProfessionalSide.png
└── ... (other website files)
```

## Security Considerations

1. **HTTPS**: Always use HTTPS for your backend API endpoint
2. **API Keys**: Never expose API keys in the frontend code
3. **CORS**: Keep CORS configuration restrictive (only allow your domain)
4. **Rate Limiting**: Consider implementing rate limiting on your backend

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all file paths are correct
3. Test the backend API independently
4. Review the backend logs for connection attempts

## Next Steps

After successful integration:
1. Test all widget features (chat, booking, diagrams)
2. Monitor backend logs for any issues
3. Consider adding analytics to track widget usage
4. Update widget styling to match your brand (if needed)

---

**Note**: Make sure your backend server is running and accessible before testing the widget integration.
