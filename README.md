# 🛡️ AI Shield

AI Shield is a comprehensive PII (Personally Identifiable Information) detection and redaction system that protects sensitive data in text and audio before sending it to AI/LLM systems.

## Features

- 🔍 **PII Detection**: Detects various types of PII including names, emails, phone numbers, SSNs, credit cards, and more
- 🎤 **Audio Transcription**: Processes audio files and transcribes them using AssemblyAI
- 🤖 **LLM Integration**: Safely sends sanitized prompts to LLMs via Groq API
- 📊 **Audit Logging**: Tracks all processing activities for compliance
- 🌐 **Modern Web UI**: Clean, ChatGPT-style interface built with React

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
- **Transformers**: HuggingFace models for NLP
- **Sentence-Transformers**: Semantic analysis
- **Groq**: LLM API integration
- **AssemblyAI**: Audio transcription

### Frontend
- **React**: UI framework
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **Custom SDK**: API wrapper

## Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

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

## Security Features

- ✅ PII detection and redaction before LLM processing
- ✅ Comprehensive audit logging
- ✅ Semantic analysis for sensitive content
- ✅ Multiple redaction patterns (emails, SSNs, credit cards, etc.)
- ✅ CORS protection
- ✅ Environment-based configuration

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
