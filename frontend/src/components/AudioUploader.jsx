import React, { useState } from 'react';

export default function AudioUploader({ onProcess, isProcessing }) {
  const [audioFile, setAudioFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
    } else {
      alert('Please select a valid audio file');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
    } else {
      alert('Please drop a valid audio file');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleProcess = () => {
    if (audioFile) {
      onProcess(audioFile);
    }
  };

  const clearFile = () => {
    setAudioFile(null);
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="hidden"
          id="audio-upload"
          disabled={isProcessing}
        />

        {!audioFile ? (
          <label
            htmlFor="audio-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <svg
              className="w-16 h-16 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            <span className="text-lg font-medium text-gray-700">
              Drop audio file here or click to browse
            </span>
            <span className="text-sm text-gray-500 mt-2">
              Supports MP3, WAV, M4A, and other audio formats
            </span>
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-left">
                <p className="font-medium text-gray-800">{audioFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  '🎤 Transcribe & Process'
                )}
              </button>
              <button
                onClick={clearFile}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {audioFile && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Note:</span> Audio will be transcribed to text, 
            then scanned for PII.
          </p>
        </div>
      )}
    </div>
  );
}
