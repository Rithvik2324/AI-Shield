# AI Shield Frontend

Beautiful React + Vite + Tailwind CSS frontend for the AI Shield PII Detection & Redaction System.

## 🚀 Features

- **Text Input Processing** - Paste or type text for PII detection
- **Audio Upload & Transcription** - Upload audio files for automatic transcription and PII scanning
- **Real-time Redaction Highlights** - Color-coded highlighting of detected PII types
- **Strictness Levels** - Choose from Low, Medium, High, or Paranoid detection modes
- **LLM Integration** - Send sanitized prompts to LLM safely
- **Audit Logs** - View immutable records of all processing operations
- **Responsive Design** - Works on desktop and mobile devices

## 📦 Installation

```bash
cd frontend
npm install
```

## 🔧 Configuration

Create a `.env.local` file in the frontend directory:

```env
VITE_API_URL=http://localhost:5000
```

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Production Build

```bash
npm run build
npm run preview
```

## 🎨 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── RedactionResult.jsx    # Display redaction results with highlights
│   │   ├── AudioUploader.jsx      # Audio file upload interface
│   │   └── LogViewer.jsx          # Audit logs viewer
│   ├── sdk/
│   │   └── aiShieldSdk.js         # Backend API integration
│   ├── App.jsx                     # Main application component
│   ├── main.jsx                    # Application entry point
│   └── index.css                   # Global styles & Tailwind
├── index.html                      # HTML template
├── vite.config.js                  # Vite configuration
├── tailwind.config.cjs             # Tailwind CSS configuration
├── postcss.config.cjs              # PostCSS configuration
└── package.json                    # Dependencies
```

## 🔌 API Integration

The frontend communicates with the backend through the `aiShieldSdk`:

### Available Methods

```javascript
// Process text for PII detection
await aiShieldSdk.processText(text, strictnessLevel);

// Process audio file (transcription + PII detection)
await aiShieldSdk.processAudio(audioFile, strictnessLevel);

// Send sanitized prompt to LLM
await aiShieldSdk.askLLM(sanitizedText);

// Retrieve audit logs
await aiShieldSdk.getLogs();
```

## 🎯 Usage

### Text Processing

1. Select the **Text Input** tab
2. Choose a strictness level (Low, Medium, High, Paranoid)
3. Paste or type text containing PII
4. Click **Process Text**
5. View the highlighted redactions
6. Optionally click **Ask LLM** to send the sanitized version to an LLM

### Audio Processing

1. Select the **Audio Upload** tab
2. Choose a strictness level
3. Drag & drop an audio file or click to browse
4. Click **Transcribe & Process**
5. View the transcription and PII detection results

### Viewing Logs

1. Select the **Audit Logs** tab
2. Filter by policy decision (all, masked, blocked, warning, allowed)
3. Click on any log entry to expand details

## 🎨 PII Type Color Coding

- 🔴 **Red** - Email addresses
- 🔵 **Blue** - Phone numbers
- 🟣 **Purple** - SSN
- 🟡 **Yellow** - Credit cards
- 🟢 **Green** - Names
- 🟠 **Orange** - Addresses
- 🩷 **Pink** - Medical information
- 🟦 **Indigo** - Financial information

## 🛠️ Technologies

- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS transformations
- **Fetch API** - HTTP client for backend communication

## 🔒 Security

- All PII is processed server-side
- Only sanitized text is sent to LLMs
- Audit logs are immutable
- No sensitive data stored in localStorage

## 🤝 Backend Integration

Make sure the backend is running on `http://localhost:5000` with the following endpoints:

- `POST /process_text` - Text PII detection
- `POST /process_audio` - Audio transcription & PII detection
- `POST /ask_llm` - LLM prompt processing
- `GET /logs` - Retrieve audit logs

## 📝 Development

### Adding New Components

1. Create component in `src/components/`
2. Import in `App.jsx`
3. Use Tailwind classes for styling

### Modifying the SDK

Edit `src/sdk/aiShieldSdk.js` to add or modify API endpoints.

## 🐛 Troubleshooting

**Backend connection failed:**
- Ensure backend is running on port 5000
- Check CORS settings in backend
- Verify `VITE_API_URL` in `.env.local`

**Audio upload not working:**
- Check backend has audio processing dependencies
- Verify supported audio formats
- Check file size limits

## 📄 License

Part of the AI Shield project by TechnoSleuths.
