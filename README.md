# ApplyNinja 🥷

AI-powered Chrome extension that optimizes your resume for specific job descriptions using your unique communication style.

## 🚀 Quick Setup

### 1. Load Extension in Chrome
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `ApplyNinja` folder

### 2. Deploy Backend to Vercel
1. Install Vercel CLI: `npm install -g vercel`
2. In this directory: `vercel login`
3. Set environment variable: `vercel env add HUGGINGFACE_TOKEN`
   - When prompted, paste your HF token (starts with `hf_...`)
   - Select "Production" environment
4. Deploy: `vercel --prod`
5. Copy the deployment URL

### 3. Update API Endpoint
1. Open `popup.js`
2. Update line 15: `const API_ENDPOINT = 'YOUR_VERCEL_URL/api/optimize-resume'`

### 4. Configure Your Profile
1. Click ApplyNinja extension icon
2. Click "⚙️ Configure Settings"
3. Paste your master resume and communication style
4. Click "Save Profile"

## 🎯 Usage

1. Navigate to any job posting (LinkedIn, Indeed, etc.)
2. Click the ApplyNinja extension icon
3. Click "Scan & Optimize Now"
4. Copy the optimized bullet points to your resume

## 🔧 Supported Job Sites

- ✅ LinkedIn Jobs
- ✅ Indeed
- ✅ Glassdoor
- ✅ AngelList/Wellfound
- ✅ Stack Overflow Jobs
- ✅ Most company career pages

## 🆓 Free AI Model

Uses Hugging Face's free Llama 3.1 model - no API costs!

## 🐛 Troubleshooting

### Extension not working?
- Refresh the job page
- Check if you've saved your profile
- Make sure you're on a job posting page (not search results)

### Job description not extracting?
- Add `?debug=applyninja` to the URL
- Check browser console for debug info
- Try refreshing the page

### API errors?
- Check your Vercel deployment logs
- Verify the API endpoint URL in `popup.js`
- HF model might be loading (wait 30 seconds)

## 📁 Project Structure

```
ApplyNinja/
├── manifest.json          # Extension configuration
├── popup.html            # Main popup interface
├── popup.js              # Popup logic & API calls
├── options.html          # Settings page
├── options.js            # Settings functionality
├── content.js            # Job description extraction
├── api/
│   └── optimize-resume.js # Serverless API function
├── vercel.json           # Vercel configuration
└── package.json          # Node.js dependencies
```

## 🎨 Features

- **Smart Extraction**: Works across major job sites
- **Style Preservation**: Maintains your unique voice
- **Real-time Status**: Shows what's ready/missing
- **Error Handling**: Clear feedback when things go wrong
- **Free to Use**: No API costs or subscriptions

## 🔮 Future Enhancements

- [ ] Export optimized resume as PDF
- [ ] A/B testing different optimization strategies
- [ ] Integration with applicant tracking systems
- [ ] Chrome sync for cross-device profiles
- [ ] Analytics on application success rates