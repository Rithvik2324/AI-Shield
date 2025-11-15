import React from 'react';

const PII_TYPE_COLORS = {
  email: 'bg-red-100 text-red-800 border-red-300',
  phone: 'bg-blue-100 text-blue-800 border-blue-300',
  ssn: 'bg-purple-100 text-purple-800 border-purple-300',
  credit_card: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  name: 'bg-green-100 text-green-800 border-green-300',
  address: 'bg-orange-100 text-orange-800 border-orange-300',
  medical: 'bg-pink-100 text-pink-800 border-pink-300',
  financial: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  default: 'bg-gray-100 text-gray-800 border-gray-300'
};

const POLICY_ICONS = {
  masked: '🔒',
  blocked: '🚫',
  warning: '⚠️',
  allowed: '✅'
};

export default function RedactionResult({ result }) {
  if (!result) return null;

  const {
    original_text,
    redacted_text,
    entities = [],
    policy_decision,
    context_flags = [],
    audit_hash,
    timestamp
  } = result;

  const highlightText = (text, entities) => {
    if (!entities || entities.length === 0) return text;

    let lastIndex = 0;
    const parts = [];

    // Sort entities by start position
    const sortedEntities = [...entities].sort((a, b) => a.start - b.start);

    sortedEntities.forEach((entity, idx) => {
      // Add text before entity
      if (entity.start > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>{text.slice(lastIndex, entity.start)}</span>
        );
      }

      // Add highlighted entity
      const entityText = text.slice(entity.start, entity.end);
      const colorClass = PII_TYPE_COLORS[entity.type] || PII_TYPE_COLORS.default;

      parts.push(
        <span
          key={`entity-${idx}`}
          className={`px-1 py-0.5 rounded border ${colorClass} font-medium cursor-help`}
          title={`Type: ${entity.type}\nConfidence: ${entity.confidence || 'N/A'}\nAction: ${entity.action || 'redacted'}`}
        >
          {entityText}
        </span>
      );

      lastIndex = entity.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">{text.slice(lastIndex)}</span>
      );
    }

    return parts;
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Header with Policy Decision */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Redaction Results</h2>
          <p className="text-sm text-gray-600">
            {entities.length} sensitive {entities.length === 1 ? 'entity' : 'entities'} detected
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl mb-1">{POLICY_ICONS[policy_decision] || '🔍'}</div>
          <span className="text-sm font-semibold text-gray-700 capitalize">
            {policy_decision || 'Processed'}
          </span>
        </div>
      </div>

      {/* Context Flags */}
      {context_flags && context_flags.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Context Alerts</h3>
          <div className="flex flex-wrap gap-2">
            {context_flags.map((flag, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full border border-yellow-300"
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Original Text with Highlights */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-red-50 px-4 py-2 border-b border-red-200">
          <h3 className="font-semibold text-red-800">🔍 Original Text (Highlighted)</h3>
        </div>
        <div className="p-4 bg-white">
          <div className="whitespace-pre-wrap leading-relaxed">
            {highlightText(original_text, entities)}
          </div>
        </div>
      </div>

      {/* Sanitized Text */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-green-50 px-4 py-2 border-b border-green-200">
          <h3 className="font-semibold text-green-800">✅ Sanitized Text (Safe for LLM)</h3>
        </div>
        <div className="p-4 bg-white">
          <div className="whitespace-pre-wrap leading-relaxed text-gray-700">
            {redacted_text}
          </div>
        </div>
      </div>

      {/* Entity Details */}
      {entities && entities.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
            <h3 className="font-semibold text-blue-800">📋 Detected Entities</h3>
          </div>
          <div className="p-4 bg-white">
            <div className="space-y-2">
              {entities.map((entity, idx) => {
                const colorClass = PII_TYPE_COLORS[entity.type] || PII_TYPE_COLORS.default;
                return (
                  <div key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
                      {entity.type}
                    </span>
                    <span className="flex-1 font-mono text-sm text-gray-700">
                      {entity.text || `Position ${entity.start}-${entity.end}`}
                    </span>
                    {entity.confidence && (
                      <span className="text-xs text-gray-500">
                        {(entity.confidence * 100).toFixed(0)}% confident
                      </span>
                    )}
                    <span className="text-xs text-gray-500 capitalize">
                      {entity.action || 'redacted'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Audit Information */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
        <div className="flex justify-between items-center">
          <div>
            <span className="font-semibold">Audit Hash:</span>{' '}
            <code className="bg-white px-2 py-0.5 rounded">{audit_hash || 'N/A'}</code>
          </div>
          {timestamp && (
            <div>
              <span className="font-semibold">Timestamp:</span>{' '}
              {new Date(timestamp).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Legend</h4>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(PII_TYPE_COLORS).map(([type, colorClass]) => (
            type !== 'default' && (
              <span key={type} className={`px-2 py-1 rounded ${colorClass}`}>
                {type}
              </span>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
