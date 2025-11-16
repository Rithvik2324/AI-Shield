// Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  await checkBackendStatus();
  setupEventListeners();
});

async function checkBackendStatus() {
  const statusIndicator = document.getElementById('backendStatus');
  const statusLabel = document.getElementById('backendLabel');
  
  try {
    const settings = await chrome.storage.sync.get(['apiUrl']);
    const apiUrl = settings.apiUrl || 'http://localhost:5000';
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${apiUrl}/logs`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      statusIndicator.className = 'backend-indicator';
      statusLabel.textContent = 'Backend Connected';
      statusLabel.style.color = '#10b981';
    } else {
      throw new Error('API error');
    }
  } catch (error) {
    statusIndicator.className = 'backend-indicator offline';
    statusLabel.textContent = 'Backend Offline';
    statusLabel.style.color = '#ef4444';
  }
}

function setupEventListeners() {
  // Process button
  document.getElementById('processBtn').addEventListener('click', handleProcess);
  
  // File upload
  document.getElementById('fileInput').addEventListener('change', handleFileUpload);
  
  // Open main page
  document.getElementById('openMainPageBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173' });
  });
}

async function handleProcess() {
  const text = document.getElementById('inputText').value.trim();
  
  if (!text) {
    showNotification('Please enter some text to scan', 'error');
    return;
  }
  
  const processBtn = document.getElementById('processBtn');
  processBtn.disabled = true;
  processBtn.innerHTML = '<span>⏳</span> Processing...';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'processText',
      text: text
    });
    
    if (response && response.success) {
      displayResults(response.data);
    } else {
      showNotification('Processing failed: ' + (response?.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    showNotification('Error: ' + error.message, 'error');
  } finally {
    processBtn.disabled = false;
    processBtn.innerHTML = '<span>🛡️</span> Process & Scan';
  }
}

function displayResults(data) {
  const resultsSection = document.getElementById('resultsSection');
  const resultContent = document.getElementById('resultContent');
  
  const entities = data.entities || [];
  const hasPII = entities.length > 0;
  
  let html = `
    <div class="result-summary ${hasPII ? 'has-pii' : 'no-pii'}">
      <span class="result-icon">${hasPII ? '⚠️' : '✅'}</span>
      <span class="result-text">
        ${hasPII 
          ? `<strong>${entities.length}</strong> PII item(s) detected` 
          : 'No PII detected - text is safe'}
      </span>
    </div>
  `;
  
  if (hasPII) {
    html += `
      <div style="margin-top: 12px; padding: 12px; background: white; border-radius: 6px;">
        <strong style="font-size: 12px; color: #6b7280;">Sanitized Text:</strong>
        <div id="sanitizedText" style="margin-top: 8px; font-size: 12px; color: #374151; line-height: 1.5;">
          ${escapeHtml(data.redacted_text)}
        </div>
        <button id="copySanitizedBtn" style="margin-top: 12px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; width: 100%;">
          📋 Copy Sanitized Text
        </button>
      </div>
    `;
  }
  
  resultContent.innerHTML = html;
  resultsSection.style.display = 'block';
  
  // Add copy button event listener
  if (hasPII) {
    document.getElementById('copySanitizedBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(data.redacted_text).then(() => {
        const btn = document.getElementById('copySanitizedBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Copied!';
        btn.style.background = '#10b981';
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.background = '#667eea';
        }, 2000);
      }).catch(() => {
        showNotification('Failed to copy text', 'error');
      });
    });
  }
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    document.getElementById('inputText').value = event.target.result;
    showNotification('File loaded successfully', 'success');
  };
  reader.onerror = () => {
    showNotification('Failed to read file', 'error');
  };
  reader.readAsText(file);
}

function showNotification(message, type = 'info') {
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  alert(`${icon} ${message}`);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
