// Options page script
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadSettings();
  loadLogs();
  setupEventListeners();
});

// Tab navigation
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update active content
      contents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${targetTab}-tab`) {
          content.classList.add('active');
        }
      });
      
      // Load logs when switching to logs tab
      if (targetTab === 'logs') {
        loadLogs();
      }
    });
  });
}

// Load settings from storage
async function loadSettings() {
  const settings = await chrome.storage.sync.get([
    'enabled',
    'autoRedact',
    'showWarnings',
    'apiUrl',
    'piiCount',
    'scanCount'
  ]);
  
  document.getElementById('settingEnabled').checked = settings.enabled !== false;
  document.getElementById('settingAutoRedact').checked = settings.autoRedact !== false;
  document.getElementById('settingShowWarnings').checked = settings.showWarnings !== false;
  document.getElementById('apiUrl').value = settings.apiUrl || 'http://localhost:5000';
  document.getElementById('totalPII').textContent = settings.piiCount || 0;
  document.getElementById('totalScans').textContent = settings.scanCount || 0;
}

// Setup event listeners
function setupEventListeners() {
  // Save settings button
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  
  // Test connection button
  document.getElementById('testConnectionBtn').addEventListener('click', testConnection);
  
  // Reset stats button
  document.getElementById('resetStatsBtn').addEventListener('click', resetStats);
  
  // Refresh logs button
  document.getElementById('refreshLogsBtn').addEventListener('click', loadLogs);
  
  // Export logs button
  document.getElementById('exportLogsBtn').addEventListener('click', exportLogs);
  
  // Clear logs button
  document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
}

// Save settings
async function saveSettings() {
  const settings = {
    enabled: document.getElementById('settingEnabled').checked,
    autoRedact: document.getElementById('settingAutoRedact').checked,
    showWarnings: document.getElementById('settingShowWarnings').checked,
    apiUrl: document.getElementById('apiUrl').value.trim() || 'http://localhost:5000'
  };
  
  try {
    await chrome.storage.sync.set(settings);
    showSaveStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showSaveStatus('Failed to save settings', 'error');
    console.error(error);
  }
}

// Show save status message
function showSaveStatus(message, type) {
  const statusEl = document.getElementById('saveStatus');
  statusEl.textContent = message;
  statusEl.className = `save-status ${type}`;
  
  setTimeout(() => {
    statusEl.textContent = '';
    statusEl.className = 'save-status';
  }, 3000);
}

// Test backend connection
async function testConnection() {
  const apiUrl = document.getElementById('apiUrl').value.trim() || 'http://localhost:5000';
  const statusEl = document.getElementById('connectionStatus');
  const btn = document.getElementById('testConnectionBtn');
  
  btn.disabled = true;
  btn.textContent = '🔍 Testing...';
  statusEl.className = 'connection-status hidden';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${apiUrl}/logs`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      statusEl.textContent = '✓ Connection successful! Backend is online.';
      statusEl.className = 'connection-status success';
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    statusEl.textContent = `✗ Connection failed: ${error.message || 'Backend is offline'}`;
    statusEl.className = 'connection-status error';
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 Test Connection';
  }
}

// Reset statistics
async function resetStats() {
  if (!confirm('Are you sure you want to reset all statistics?')) {
    return;
  }
  
  await chrome.storage.sync.set({ piiCount: 0, scanCount: 0 });
  document.getElementById('totalPII').textContent = '0';
  document.getElementById('totalScans').textContent = '0';
  showSaveStatus('Statistics reset successfully!', 'success');
}

// Load logs from backend
async function loadLogs() {
  const container = document.getElementById('logsContainer');
  container.innerHTML = '<div class="loading">Loading logs...</div>';
  
  try {
    const settings = await chrome.storage.sync.get(['apiUrl']);
    const apiUrl = settings.apiUrl || 'http://localhost:5000';
    
    const response = await fetch(`${apiUrl}/logs`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const logs = data.logs || [];
    
    if (logs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📜</div>
          <p>No logs found</p>
          <p style="font-size: 12px; margin-top: 8px;">Process some text or audio to see audit logs here</p>
        </div>
      `;
      return;
    }
    
    // Display logs (most recent first)
    container.innerHTML = logs.reverse().map(log => {
      const date = log.ts ? new Date(log.ts * 1000).toLocaleString() : 'Unknown time';
      return `
        <div class="log-entry">
          <div class="log-header">
            <span class="log-type">${formatLogType(log.type)}</span>
            <span class="log-time">${date}</span>
          </div>
          <div class="log-body">
            ${formatLogBody(log)}
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p>Failed to load logs</p>
        <p style="font-size: 12px; margin-top: 8px; color: #ef4444;">${error.message}</p>
        <button class="btn btn-primary" onclick="loadLogs()" style="margin-top: 16px;">
          🔄 Retry
        </button>
      </div>
    `;
  }
}

// Format log type
function formatLogType(type) {
  const icons = {
    'process_text': '📝 Text Processing',
    'process_audio': '🎤 Audio Processing',
    'ask_llm': '🤖 LLM Query'
  };
  return icons[type] || type;
}

// Format log body
function formatLogBody(log) {
  if (log.type === 'process_text') {
    return `
      <div><strong>Text Preview:</strong> ${escapeHtml(log.original_hash || 'N/A')}</div>
      <div><strong>Entities Detected:</strong> ${log.entities?.length || 0}</div>
      ${log.entities && log.entities.length > 0 ? `
        <div style="margin-top: 8px;">
          ${log.entities.map(e => `<span class="pii-badge ${e.type}">${e.type}</span>`).join(' ')}
        </div>
      ` : ''}
    `;
  }
  
  if (log.type === 'process_audio') {
    return `
      <div><strong>Transcript Preview:</strong> ${escapeHtml(log.transcript_preview || 'N/A')}</div>
      <div><strong>Entities Detected:</strong> ${log.entities?.length || 0}</div>
    `;
  }
  
  if (log.type === 'ask_llm') {
    return `
      <div><strong>Sanitized Prompt:</strong> ${escapeHtml(log.sanitized || 'N/A')}</div>
      <div><strong>Response Preview:</strong> ${escapeHtml(log.response_preview || 'N/A')}</div>
    `;
  }
  
  return JSON.stringify(log, null, 2);
}

// Export logs as JSON
async function exportLogs() {
  try {
    const settings = await chrome.storage.sync.get(['apiUrl']);
    const apiUrl = settings.apiUrl || 'http://localhost:5000';
    
    const response = await fetch(`${apiUrl}/logs`);
    const data = await response.json();
    const logs = data.logs || [];
    
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-shield-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showSaveStatus('Logs exported successfully!', 'success');
  } catch (error) {
    showSaveStatus('Failed to export logs', 'error');
    console.error(error);
  }
}

// Clear all logs
async function clearLogs() {
  if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
    return;
  }
  
  // Note: This would require a backend endpoint to clear logs
  // For now, just show a message
  alert('Log clearing requires backend support. Please manually delete logs.json on the server.');
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
