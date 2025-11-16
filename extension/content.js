// AI Shield Content Script - Monitors AI chat pages
console.log('AI Shield content script loaded');

let isEnabled = true;
let autoRedact = true;
let showWarnings = true;
let detectedPII = [];
let currentInput = null;

// Load settings on startup
loadSettings();

function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, (settings) => {
    if (settings) {
      isEnabled = settings.enabled !== false;
      autoRedact = settings.autoRedact !== false;
      showWarnings = settings.showWarnings !== false;
    }
  });
}

// Detect input elements based on the site
function findInputElement() {
  const url = window.location.href;
  
  // ChatGPT - Multiple selectors for different versions
  if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) {
    // ChatGPT uses a contenteditable div with id="prompt-textarea"
    const promptTextarea = document.querySelector('div#prompt-textarea[contenteditable="true"]');
    if (promptTextarea) {
      console.log('AI Shield: Found ChatGPT prompt-textarea div');
      return promptTextarea;
    }
    
    // Fallback: any contenteditable div with ProseMirror class
    const proseMirror = document.querySelector('div.ProseMirror[contenteditable="true"]');
    if (proseMirror) {
      console.log('AI Shield: Found ChatGPT ProseMirror div');
      return proseMirror;
    }
    
    // Generic contenteditable fallback
    const contentEditableDiv = document.querySelector('div[contenteditable="true"]');
    if (contentEditableDiv) {
      console.log('AI Shield: Found generic contenteditable div');
      return contentEditableDiv;
    }
    
    // Last resort: textarea selectors
    return document.querySelector('textarea[data-id="root"]') ||
           document.querySelector('textarea#prompt-textarea') ||
           document.querySelector('textarea');
  }
  
  // Claude
  if (url.includes('claude.ai')) {
    return document.querySelector('div[contenteditable="true"]') ||
           document.querySelector('textarea');
  }
  
  // Gemini (formerly Bard)
  if (url.includes('gemini.google.com') || url.includes('bard.google.com')) {
    return document.querySelector('div[contenteditable="true"]') ||
           document.querySelector('textarea');
  }
  
  // Bing Chat
  if (url.includes('bing.com/chat') || url.includes('copilot.microsoft.com')) {
    return document.querySelector('textarea[placeholder*="Ask"]') ||
           document.querySelector('textarea');
  }
  
  // Fallback: any textarea or contenteditable
  return document.querySelector('textarea') ||
         document.querySelector('div[contenteditable="true"]');
}

// Initialize monitoring
let retryCount = 0;
const MAX_RETRIES = 10;

function initializeMonitoring() {
  currentInput = findInputElement();
  
  if (!currentInput) {
    // Retry after a delay if element not found yet
    retryCount++;
    if (retryCount < MAX_RETRIES) {
      console.log(`AI Shield: Input element not found yet, retrying (${retryCount}/${MAX_RETRIES})...`);
      setTimeout(initializeMonitoring, 1000);
    } else {
      console.log('AI Shield: Could not find input element after max retries');
    }
    return;
  }
  
  console.log('AI Shield: Input element found, monitoring active');
  console.log('AI Shield: Element type:', currentInput.tagName, currentInput.id, currentInput.className);
  
  // Show activation notification
  showNotification('AI Shield is now protecting your input', 'success');
  
  // Inject scan button
  injectScanButton();
  
  // Monitor input changes - support both textarea and contenteditable
  if (currentInput.tagName === 'TEXTAREA' || currentInput.tagName === 'INPUT') {
    currentInput.addEventListener('input', debounce(handleInputChange, 800));
  } else {
    // For contenteditable divs, use both input and DOMCharacterDataModified
    currentInput.addEventListener('input', debounce(handleInputChange, 800));
    currentInput.addEventListener('DOMSubtreeModified', debounce(handleInputChange, 1000));
  }
  
  // Monitor for new input elements (SPA navigation)
  observePageChanges();
}

// Handle input changes
async function handleInputChange(e) {
  if (!isEnabled) return;
  
  const text = getInputText(e.target);
  if (!text || text.length < 10) {
    hidePIIWarning();
    return;
  }
  
  const result = await analyzePII(text);
  
  if (result && result.entities && result.entities.length > 0) {
    detectedPII = result.entities;
    
    if (showWarnings) {
      showPIIWarning(result.entities.length);
    }
    
    if (autoRedact) {
      setInputText(e.target, result.redacted_text);
    }
  } else {
    hidePIIWarning();
    detectedPII = [];
  }
}

// Get text from input element
function getInputText(element) {
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    return element.value;
  }
  // For contenteditable divs, prefer innerText for better formatting
  return element.innerText || element.textContent || '';
}

// Set text in input element
function setInputText(element, text) {
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
    element.value = text;
    // Trigger input event for React/Vue to detect change
    element.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    // For contenteditable divs
    element.innerText = text;
    // Trigger input event for frameworks to detect change
    element.dispatchEvent(new Event('input', { bubbles: true }));
    // Move cursor to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

// Analyze text for PII
async function analyzePII(text) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'processText', text },
      (response) => {
        if (response && response.success) {
          resolve(response.data);
        } else {
          console.error('AI Shield error:', response?.error);
          resolve({ entities: [], redacted_text: text });
        }
      }
    );
  });
}

// Inject scan button next to input
function injectScanButton() {
  if (document.getElementById('ai-shield-scan-btn')) {
    return; // Already injected
  }
  
  const button = document.createElement('button');
  button.id = 'ai-shield-scan-btn';
  button.className = 'ai-shield-button';
  button.innerHTML = '🛡️ Scan for PII';
  button.title = 'Scan current text for sensitive information';
  
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const text = getInputText(currentInput);
    if (!text) {
      showNotification('Please enter some text first', 'info');
      return;
    }
    
    button.disabled = true;
    button.innerHTML = '🔍 Scanning...';
    
    const result = await analyzePII(text);
    
    button.disabled = false;
    button.innerHTML = '🛡️ Scan for PII';
    
    showResultModal(result);
  });
  
  // Try to position near the input
  if (currentInput && currentInput.parentElement) {
    const container = document.createElement('div');
    container.className = 'ai-shield-button-container';
    container.appendChild(button);
    
    // Insert after input or at the end of parent
    if (currentInput.nextSibling) {
      currentInput.parentElement.insertBefore(container, currentInput.nextSibling);
    } else {
      currentInput.parentElement.appendChild(container);
    }
  }
}

// Show PII warning banner
function showPIIWarning(count) {
  let banner = document.getElementById('ai-shield-warning');
  
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'ai-shield-warning';
    banner.className = 'ai-shield-banner';
    document.body.appendChild(banner);
  }
  
  banner.innerHTML = `
    <div class="ai-shield-banner-content">
      <span class="ai-shield-banner-icon">⚠️</span>
      <span class="ai-shield-banner-text" style="color: #000000 !important;">
        AI Shield detected <strong style="color: #000000 !important;">${count}</strong> PII item(s) in your input
        ${autoRedact ? '<span style="color: #000000 !important;">(Auto-redacted)</span>' : ''}
      </span>
      <button class="ai-shield-banner-close" onclick="this.parentElement.parentElement.remove()">✕</button>
    </div>
  `;
  
  banner.style.display = 'block';
}

function hidePIIWarning() {
  const banner = document.getElementById('ai-shield-warning');
  if (banner) {
    banner.style.display = 'none';
  }
}

// Show result modal
function showResultModal(result) {
  // Remove existing modal
  const existingModal = document.getElementById('ai-shield-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'ai-shield-modal';
  modal.className = 'ai-shield-modal';
  
  const entities = result.entities || [];
  const hasPII = entities.length > 0;
  
  modal.innerHTML = `
    <div class="ai-shield-modal-content">
      <div class="ai-shield-modal-header">
        <h2>🛡️ AI Shield Scan Results</h2>
        <button class="ai-shield-modal-close" id="ai-shield-modal-close">✕</button>
      </div>
      
      <div class="ai-shield-modal-body">
        <div class="ai-shield-result-summary ${hasPII ? 'has-pii' : 'no-pii'}">
          <span class="ai-shield-result-icon">${hasPII ? '⚠️' : '✅'}</span>
          <span class="ai-shield-result-text" style="color: #000000 !important;">
            ${hasPII 
              ? `Detected <strong style="color: #000000 !important;">${entities.length}</strong> PII item(s)` 
              : '<span style="color: #000000 !important;">No PII detected - text is safe</span>'}
          </span>
        </div>
        
        ${hasPII ? `
          <div class="ai-shield-redacted">
            <h3>Sanitized Text:</h3>
            <div class="ai-shield-redacted-text">${escapeHtml(result.redacted_text)}</div>
            <button class="ai-shield-copy-btn" id="ai-shield-copy-btn">📋 Copy Sanitized Text</button>
          </div>
        ` : ''}
      </div>
      
      <div class="ai-shield-modal-footer">
        <button class="ai-shield-btn-primary" id="ai-shield-ok-btn">OK</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listeners
  document.getElementById('ai-shield-modal-close').addEventListener('click', () => modal.remove());
  document.getElementById('ai-shield-ok-btn').addEventListener('click', () => modal.remove());
  
  if (hasPII) {
    document.getElementById('ai-shield-copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(result.redacted_text);
      showNotification('Sanitized text copied to clipboard', 'success');
    });
  }
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Show notification toast
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `ai-shield-notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Observe page changes for SPA navigation
function observePageChanges() {
  const observer = new MutationObserver(() => {
    const newInput = findInputElement();
    if (newInput && newInput !== currentInput) {
      currentInput = newInput;
      initializeMonitoring();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzePII') {
    analyzePII(request.text).then(result => {
      showResultModal(result);
    });
  }
});

// Utility: Debounce function
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMonitoring);
} else {
  initializeMonitoring();
}
