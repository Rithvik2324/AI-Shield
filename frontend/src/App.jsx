import React, { useState } from 'react';
import RedactionResult from './components/RedactionResult';
import AudioUploader from './components/AudioUploader';
import LogViewer from './components/LogViewer';
import aiShieldSdk from './sdk/aiShieldSdk';

export default function App() {
  const [activeTab, setActiveTab] = useState('input');
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [llmResponse, setLlmResponse] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [audioFile, setAudioFile] = useState(null);

  const handleProcessText = async () => {
    if (!text.trim()) {
      setError('Please enter some text to process');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setLlmResponse(null);

    try {
      const res = await aiShieldSdk.processText(text);
      setResult(res);
    } catch (err) {
      setError('Failed to process text. Make sure the backend is running on http://localhost:5000');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessAudio = async () => {
    if (!audioFile) {
      setError('Please upload an audio file');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setLlmResponse(null);
    setTranscription('');

    try {
      const res = await aiShieldSdk.processAudio(audioFile);
      
      // Set transcription if available
      if (res.transcription) {
        setTranscription(res.transcription);
        setText(res.transcription);
      }
      
      setResult(res);
    } catch (err) {
      setError('Failed to process audio. Make sure the backend is running and supports audio processing.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
    } else {
      setError('Please select a valid audio file');
    }
  };

  const handleSubmit = () => {
    if (audioFile) {
      handleProcessAudio();
    } else if (text.trim()) {
      handleProcessText();
    }
  };

  const handleAskLLM = async () => {
    if (!result || !result.redacted_text) {
      setError('Please process text first before asking LLM');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await aiShieldSdk.askLLM(result.redacted_text);
      setLlmResponse(response);
    } catch (err) {
      setError('Failed to get LLM response. Make sure the backend LLM integration is configured.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setText('');
    setResult(null);
    setLlmResponse(null);
    setError(null);
    setTranscription('');
    setAudioFile(null);
  };

  const tabs = [
    { id: 'input', label: '💬 Chat', icon: '💬' },
    { id: 'logs', label: '📜 Logs', icon: '📜' }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="py-6 px-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🛡️</span>
              <h1 className="text-2xl font-bold text-white">
                AI Shield
              </h1>
            </div>
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-6">
          {activeTab === 'logs' ? (
            <div className="bg-gray-800 rounded-xl p-6">
              <LogViewer />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-red-400 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="text-red-300 font-medium">Error</p>
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* ChatGPT Style Input Box */}
              <div className="relative">
                <div className="bg-gray-800 rounded-3xl border border-gray-700 shadow-2xl overflow-hidden">
                  <textarea
                    className="w-full bg-transparent text-white p-4 pr-24 resize-none focus:outline-none text-base min-h-[120px] max-h-[400px]"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter text with PII or upload audio..."
                    disabled={isProcessing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  
                  {/* Audio File Input (Hidden) */}
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="audio-upload"
                    disabled={isProcessing}
                  />
                  
                  {/* Bottom Bar with Icons */}
                  <div className="flex items-center justify-between px-4 pb-3">
                    <div className="flex items-center gap-2">
                      {/* Add File Button */}
                      <button
                        onClick={() => document.getElementById('audio-upload').click()}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Upload audio file"
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      
                      {audioFile && (
                        <div className="flex items-center gap-2 bg-gray-700 px-3 py-1 rounded-full">
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                          <span className="text-xs text-gray-300">{audioFile.name}</span>
                          <button
                            onClick={() => setAudioFile(null)}
                            className="text-gray-400 hover:text-white"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Mic Button */}
                      <label
                        htmlFor="audio-upload"
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                        title="Upload audio file"
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </label>
                      
                      {/* Submit Button */}
                      <button
                        onClick={handleSubmit}
                        disabled={isProcessing || (!text.trim() && !audioFile)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
                      >
                        {isProcessing ? (
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transcription Display */}
              {transcription && (
                <div className="p-4 bg-gray-800 border border-gray-700 rounded-xl">
                  <h3 className="font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Transcription
                  </h3>
                  <p className="text-gray-400 whitespace-pre-wrap text-sm">{transcription}</p>
                </div>
              )}

              {/* Action Buttons */}
              {result && (
                <div className="flex gap-3">
                  <button
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors font-medium"
                    onClick={handleAskLLM}
                    disabled={isProcessing}
                  >
                    🤖 Ask LLM
                  </button>
                  <button
                    className="px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors font-medium"
                    onClick={clearAll}
                  >
                    🗑️ Clear All
                  </button>
                </div>
              )}

              {/* Results */}
              {result && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  <RedactionResult result={result} />
                </div>
              )}

              {/* LLM Response */}
              {llmResponse && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                  <div className="bg-green-900/30 px-4 py-3 border-b border-gray-700">
                    <h3 className="font-semibold text-green-300 text-lg">
                      🤖 LLM Response
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="prose max-w-none">
                      {typeof llmResponse === 'string' ? (
                        <p className="whitespace-pre-wrap text-gray-300">{llmResponse}</p>
                      ) : (
                        <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto text-gray-300">
                          {JSON.stringify(llmResponse, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-500 pb-6">
          <p>
            Built with ❤️ by TechnoSleuths | Protecting your privacy with AI
          </p>
        </footer>
      </div>
    </div>
  );
}