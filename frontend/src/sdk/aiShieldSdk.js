// AI Shield SDK - Frontend API wrapper
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const aiShieldSdk = {
  /**
   * Process text for PII detection and redaction
   * @param {string} text - Input text to process
   * @returns {Promise<Object>} - Redaction results
   */
  async processText(text) {
    try {
      const response = await fetch(`${API_BASE_URL}/process_text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing text:', error);
      throw error;
    }
  },

  /**
   * Process audio file for transcription and PII detection
   * @param {File} audioFile - Audio file to process
   * @returns {Promise<Object>} - Transcription and redaction results
   */
  async processAudio(audioFile) {
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);

      const response = await fetch(`${API_BASE_URL}/process_audio`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error processing audio:', error);
      throw error;
    }
  },

  /**
   * Send sanitized prompt to LLM
   * @param {string} sanitizedText - Pre-sanitized text
   * @returns {Promise<Object>} - LLM response
   */
  async askLLM(sanitizedText) {
    try {
      const response = await fetch(`${API_BASE_URL}/ask_llm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: sanitizedText
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error asking LLM:', error);
      throw error;
    }
  },

  /**
   * Retrieve audit logs
   * @returns {Promise<Array>} - Array of log entries
   */
  async getLogs() {
    try {
      const response = await fetch(`${API_BASE_URL}/logs`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching logs:', error);
      throw error;
    }
  }
};

export default aiShieldSdk;
