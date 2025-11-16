# 🛡️ AI Shield

AI Shield is a comprehensive PII (Personally Identifiable Information) detection and redaction system that protects sensitive data in text and audio before sending it to AI/LLM systems. Available as both a web application and Chrome extension.

## Features

- 🔍 **PII Detection**: Detects various types of PII including emails, phone numbers, SSNs, credit cards, Aadhaar numbers, and PAN cards
- 🎤 **Audio Transcription**: Processes audio files and transcribes them using AssemblyAI
- 🤖 **LLM Integration**: Safely sends sanitized prompts to LLMs via Groq API
- 📊 **Audit Logging**: Tracks all processing activities for compliance
- 🌐 **Modern Web UI**: Clean, ChatGPT-style interface built with React
- 🧩 **Chrome Extension**: Real-time PII protection on ChatGPT and other AI platforms
- 📋 **One-Click Copy**: Copy sanitized text with a single click
- ⚡ **Real-time Monitoring**: Automatic detection before sending prompts to AI systems

## Architecture

```
AI-Shield/
├── backend/           # Flask API server
│   ├── app.py        # Main API endpoints
│   ├── pii_detector.py  # PII detection logic
│   ├── groq_api.py   # LLM integration
│   └── assembly_api.py  # Audio transcription
├── frontend/         # React web application
│   └── src/
│       ├── App.jsx
│       ├── components/
│       └── sdk/      # API wrapper SDK
├── extension/        # Chrome Extension
│   ├── manifest.json # Extension configuration
│   ├── background.js # Service worker
│   ├── content.js    # Content script for AI platforms
│   ├── popup/        # Extension popup UI
│   ├── options/      # Settings page
│   ├── lib/          # Shared utilities
│   └── styles/       # Extension styles
└── logs.json         # Audit trail
```

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- Groq API Key (for LLM features)
- AssemblyAI API Key (for audio transcription)

### Option 1: Using Batch Scripts (Windows)

1. **Setup Backend**:
   - Copy `backend/.env.example` to `backend/.env`
   - Add your API keys to `.env`
   - Run `START_BACKEND.bat`

2. **Setup Frontend**:
   - In a new terminal, run `START_FRONTEND.bat`

3. **Access the application** at `http://localhost:5173`

### Option 2: Manual Setup

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your API keys

# Run the server
python app.py
```

The backend will run on `http://localhost:5000`

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment (optional)
# Frontend uses http://localhost:5000 by default
# To change, copy .env.example to .env and modify VITE_API_URL

# Run development server
npm run dev
```

The frontend will run on `http://localhost:5173`

#### Chrome Extension Setup

```bash
# 1. Ensure backend is running (see Backend Setup above)

# 2. Open Chrome and navigate to chrome://extensions/

# 3. Enable "Developer mode" (toggle in top right)

# 4. Click "Load unpacked"

# 5. Select the 'extension' folder from this repository

# 6. The AI Shield extension will now be active
```

**Extension Features:**
- 🎯 Real-time PII detection on ChatGPT and other AI platforms
- ⚠️ Warning banners before sending sensitive data
- 🛡️ Modal with sanitized text and copy button
- 📄 Text input and file upload support
- ⚙️ Configurable backend URL in options

**Supported Platforms:**
- ChatGPT (chatgpt.com)
- Claude (claude.ai)
- Gemini (gemini.google.com)
- Perplexity (perplexity.ai)
- And more AI chat platforms

## API Endpoints

### POST `/process_text`
Process text for PII detection and redaction.

**Request:**
```json
{
  "text": "My name is John Doe and my email is john@example.com"
}
```

**Response:**
```json
{
  "original": "My name is John Doe...",
  "redacted_text": "My name is [REDACTED_NAME] and my email is [REDACTED_EMAIL]",
  "masks": [
    {"type": "PERSON", "text": "John Doe", "start": 11, "end": 19}
  ],
  "semantic_flags": []
}
```

### POST `/process_audio`
Transcribe audio and detect PII.

**Request:**
Form-data with `audio` or `file` field containing audio file.

**Response:**
```json
{
  "transcription": "Hello, my name is...",
  "redacted_text": "Hello, my name is [REDACTED_NAME]...",
  "masks": [...],
  "semantic_flags": []
}
```

### POST `/ask_llm`
Send sanitized prompt to LLM.

**Request:**
```json
{
  "sanitized": "[REDACTED_NAME] wants to know about weather"
}
```

**Response:**
```json
{
  "choices": [
    {
      "message": {
        "content": "I'd be happy to help with weather information..."
      }
    }
  ]
}
```

### GET `/logs`
Retrieve audit logs.

**Response:**
```json
{
  "logs": [
    {
      "type": "process_text",
      "ts": 1234567890,
      "masks": [...]
    }
  ]
}
```

## Frontend SDK Usage

```javascript
import aiShieldSdk from './sdk/aiShieldSdk';

// Process text
const result = await aiShieldSdk.processText("Text with PII");

// Process audio
const audioFile = /* File object */;
const result = await aiShieldSdk.processAudio(audioFile);

// Ask LLM with sanitized text
const response = await aiShieldSdk.askLLM(result.redacted_text);

// Get logs
const logs = await aiShieldSdk.getLogs();
```

## Environment Variables

### Backend (.env)
```env
GROQ_API_KEY=your_groq_api_key_here
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
PORT=5000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
```

## Technology Stack

### Backend
- **Flask**: Web framework
- **Flask-CORS**: Cross-origin resource sharing
- **Regex Patterns**: Pattern-based PII detection
- **Groq**: LLM API integration (Llama 3.1 8B Instant)
- **AssemblyAI**: Audio transcription

### Frontend
- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **Custom SDK**: API wrapper

### Chrome Extension
- **Manifest V3**: Latest extension platform
- **Content Scripts**: DOM monitoring and injection
- **Service Worker**: Background processing
- **Chrome APIs**: Storage, runtime messaging, tabs

## Usage

### Web Application

1. Enter or paste text in the input field
2. Upload a file (.txt, .pdf, .doc, .docx)
3. Click "Process & Scan" to detect PII
4. View detected items and sanitized output
5. Copy sanitized text or send to LLM

### Chrome Extension

1. Click the AI Shield icon in Chrome toolbar
2. Enter text or upload a file in the popup
3. Click "Process & Scan" to check for PII
4. Browse to ChatGPT or other supported AI platforms
5. Type a message containing PII
6. Extension automatically detects and warns you
7. Click "View Sanitized Text" to see the cleaned version
8. Copy sanitized text with one click

## Development

### Running Tests
```bash
# Backend tests
cd backend
python test_pii.py

# Frontend tests
cd frontend
npm test
```

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```

Output will be in `frontend/dist/`

**Extension:**
The extension files are already in production-ready format. To package:
```bash
# Create a zip file of the extension folder
# Upload to Chrome Web Store Developer Dashboard
```

## Security Features

- ✅ PII detection and redaction before LLM processing
- ✅ Comprehensive audit logging
- ✅ Multiple detection patterns:
  - Email addresses
  - Phone numbers (US & International)
  - Social Security Numbers (SSN)
  - Credit card numbers
  - Aadhaar numbers (India)
  - PAN card numbers (India)
- ✅ Real-time monitoring via Chrome extension
- ✅ User consent before sending data to AI platforms
- ✅ CORS protection
- ✅ Environment-based configuration
- ✅ Client-side validation and sanitization

## PII Detection Patterns

The system detects the following types of PII:

| Type | Pattern | Example |
|------|---------|---------|
| Email | Standard email format | user@example.com |
| Phone | US & International formats | +1-234-567-8900, (123) 456-7890 |
| SSN | US Social Security Number | 123-45-6789 |
| Credit Card | Major card providers | 4532-1234-5678-9010 |
| Aadhaar | 12-digit Indian ID | 1234 5678 9012 |
| PAN | Indian tax ID | ABCDE1234F |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.

## Team

Built with ❤️ by TechnoSleuths
