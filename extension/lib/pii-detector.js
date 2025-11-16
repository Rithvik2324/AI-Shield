// AI Shield SDK - Simplified PII Detection Library
// Can be used standalone without backend

export const PII_PATTERNS = {
  email: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    label: 'Email Address',
    color: '#ef4444'
  },
  phone: {
    pattern: /\b(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
    label: 'Phone Number',
    color: '#3b82f6'
  },
  ssn: {
    pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    label: 'Social Security Number',
    color: '#8b5cf6'
  },
  credit_card: {
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    label: 'Credit Card',
    color: '#f59e0b'
  },
  aadhaar: {
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    label: 'Aadhaar Number',
    color: '#f97316'
  },
  pan: {
    pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
    label: 'PAN Card',
    color: '#ec4899'
  }
};

/**
 * Detect PII in text using regex patterns
 * @param {string} text - Input text to analyze
 * @returns {Object} Detection results
 */
export function detectPII(text) {
  const entities = [];
  
  for (const [type, config] of Object.entries(PII_PATTERNS)) {
    const matches = [...text.matchAll(config.pattern)];
    matches.forEach(match => {
      entities.push({
        type,
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        label: config.label,
        color: config.color
      });
    });
  }
  
  // Remove overlapping entities (keep first match)
  const filtered = [];
  entities.sort((a, b) => a.start - b.start);
  
  for (const entity of entities) {
    const overlaps = filtered.some(existing => 
      !(entity.end <= existing.start || entity.start >= existing.end)
    );
    if (!overlaps) {
      filtered.push(entity);
    }
  }
  
  return {
    entities: filtered,
    count: filtered.length,
    hasPII: filtered.length > 0
  };
}

/**
 * Redact PII from text
 * @param {string} text - Input text
 * @param {Array} entities - Detected PII entities
 * @param {string} replacement - Replacement string (default: [REDACTED])
 * @returns {string} Redacted text
 */
export function redactPII(text, entities, replacement = '[REDACTED]') {
  let redacted = text;
  
  // Sort by position (reverse) to maintain indices
  const sorted = [...entities].sort((a, b) => b.start - a.start);
  
  sorted.forEach(entity => {
    redacted = redacted.substring(0, entity.start) + 
               replacement + 
               redacted.substring(entity.end);
  });
  
  return redacted;
}

/**
 * Analyze text and return comprehensive results
 * @param {string} text - Input text
 * @returns {Object} Analysis results
 */
export function analyzePII(text) {
  const detection = detectPII(text);
  const redacted = redactPII(text, detection.entities);
  
  return {
    original: text,
    original_text: text,
    redacted: redacted,
    redacted_text: redacted,
    entities: detection.entities,
    masks: detection.entities, // Backward compatibility
    count: detection.count,
    hasPII: detection.hasPII,
    semantic_flags: [],
    context_flags: []
  };
}

/**
 * Hash text using SHA-256 (requires Web Crypto API)
 * @param {string} text - Text to hash
 * @returns {Promise<string>} Hex hash
 */
export async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate if text contains specific PII type
 * @param {string} text - Input text
 * @param {string} type - PII type to check
 * @returns {boolean}
 */
export function hasPIIType(text, type) {
  if (!PII_PATTERNS[type]) return false;
  return PII_PATTERNS[type].pattern.test(text);
}

/**
 * Get statistics about detected PII
 * @param {Array} entities - Detected entities
 * @returns {Object} Statistics
 */
export function getPIIStats(entities) {
  const stats = {};
  
  entities.forEach(entity => {
    stats[entity.type] = (stats[entity.type] || 0) + 1;
  });
  
  return {
    total: entities.length,
    byType: stats,
    types: Object.keys(stats)
  };
}

// Export default object
export default {
  PII_PATTERNS,
  detectPII,
  redactPII,
  analyzePII,
  hashText,
  hasPIIType,
  getPIIStats
};
