// AI Shield Background Service Worker
let API_URL = 'http://localhost:5000';

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Shield installed');
  
  // Set default settings
  chrome.storage.sync.set({
    enabled: true,
    autoRedact: true,
    apiUrl: 'http://localhost:5000',
    showWarnings: true,
    piiCount: 0,
    scanCount: 0
  });
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'checkPII',
    title: 'Check for PII with AI Shield',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'checkPII' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'analyzePII',
      text: info.selectionText
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'processText') {
    handleProcessText(request.text)
      .then(result => {
        // Update stats
        chrome.storage.sync.get(['piiCount', 'scanCount'], (data) => {
          const piiCount = (data.piiCount || 0) + (result.entities?.length || 0);
          const scanCount = (data.scanCount || 0) + 1;
          chrome.storage.sync.set({ piiCount, scanCount });
        });
        
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        console.error('AI Shield error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(
      ['enabled', 'autoRedact', 'apiUrl', 'showWarnings'],
      (settings) => {
        sendResponse(settings);
      }
    );
    return true;
  }
  
  if (request.action === 'updateSettings') {
    chrome.storage.sync.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'getLogs') {
    handleGetLogs()
      .then(logs => sendResponse({ success: true, data: logs }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Process text through backend API
async function handleProcessText(text) {
  const settings = await chrome.storage.sync.get(['apiUrl']);
  const apiUrl = settings.apiUrl || API_URL;
  
  try {
    const response = await fetch(`${apiUrl}/process_text`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    // Fallback to local detection if backend is offline
    console.warn('Backend offline, using local detection');
    return localPIIDetection(text);
  }
}

// Get logs from backend
async function handleGetLogs() {
  const settings = await chrome.storage.sync.get(['apiUrl']);
  const apiUrl = settings.apiUrl || API_URL;
  
  const response = await fetch(`${apiUrl}/logs`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.status}`);
  }
  
  const data = await response.json();
  return data.logs || [];
}

// Local PII detection fallback (when backend is offline)
function localPIIDetection(text) {
  const patterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    api_key: /\b(?:AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z\-_]{35}|sk-[a-zA-Z0-9]{48}|ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|xox[baprs]-[0-9a-zA-Z\-]+)\b/g,
    ssn: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    pan: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
    aadhaar: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    ipv6: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:\b|\b::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\b/g,
    ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    date_of_birth: /\b(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12][0-9]|3[01])[/-](?:19|20)\d{2}\b|\b(?:0?[1-9]|[12][0-9]|3[01])[/-](?:0?[1-9]|1[0-2])[/-](?:19|20)\d{2}\b|\b(?:19|20)\d{2}[/-](?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12][0-9]|3[01])\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(?:0?[1-9]|[12][0-9]|3[01]),?\s+(?:19|20)\d{2}\b/gi,
    medical_record: /\bMRN[-:\s]?[0-9]{6,10}\b|\b(?:MR|MED|MEDICAL)[-:\s]?[0-9]{6,10}\b/gi,
    address: /\b\d+\s+[A-Za-z0-9\s,\.]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Parkway|Pkwy|Place|Pl|Square|Sq|Trail|Trl|Terrace|Ter)\.?\s*(?:#|Apt|Suite|Unit|Ste)?\s*[A-Za-z0-9]*,?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?\b/gi,
    phone: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b|\b(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b/g,
    credit_card: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    bank_account: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b|\b\d{8,17}\b/g
  };
  
  const entities = [];
  let redacted = text;
  
  for (const [type, pattern] of Object.entries(patterns)) {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      entities.push({
        type,
        text: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    });
  }
  
  // Sort by position (reverse) and redact
  entities.sort((a, b) => b.start - a.start);
  entities.forEach(entity => {
    redacted = redacted.substring(0, entity.start) + 
               '[REDACTED]' + 
               redacted.substring(entity.end);
  });
  
  return {
    original: text,
    original_text: text,
    redacted: redacted,
    redacted_text: redacted,
    entities: entities,
    masks: entities,
    semantic_flags: [],
    context_flags: []
  };
}

// Update extension icon based on status
function updateIcon(tabId, hasPII) {
  const iconPath = hasPII ? 'icons/icon-alert.png' : 'icons/icon16.png';
  chrome.action.setIcon({ path: iconPath, tabId }).catch(() => {
    // Ignore if tab is closed
  });
}
