import React, { useState, useEffect } from 'react';
import aiShieldSdk from '../sdk/aiShieldSdk';

export default function LogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
  try {
    setLoading(true);
    setError(null);
    const data = await aiShieldSdk.getLogs();
    const raw = Array.isArray(data) ? data : data.logs || [];
    const normalized = normalizeLogs(raw);
    setLogs(normalized);
  } catch (err) {
    setError('Failed to load audit logs. Make sure the backend is running.');
    console.error(err);
  } finally {
    setLoading(false);
  }
};
  const normalizeLogs = (rawLogs) => {
  return rawLogs.map((log) => {
    // Normalize timestamp
    const timestamp = log.ts ? new Date(log.ts * 1000).toISOString() : null;

    // Normalize hash/text field
    const input_hash =
      log.original_hash ||
      log.sanitized ||
      log.transcript_preview ||
      log.response_preview ||
      "N/A";

    // Normalize entities
    const entities =
      log.entities ||
      log.masks ||
      [];

    // Normalize policy decision (fallback based on masks/entities)
    let policy_decision = log.policy_decision;
    if (!policy_decision) {
      if (entities.length > 0) policy_decision = "masked";
      else policy_decision = "allowed";
    }

    return {
      ...log,
      timestamp,
      input_hash,
      redactions: entities.map(e => ({
        type: e.type?.toUpperCase() || "PII",
        action: "masked"
      })),
      entities_count: entities.length,
      policy_decision
    };
  });
};


  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.policy_decision === filter;
  });

  const toggleExpand = (index) => {
    setExpandedLog(expandedLog === index ? null : index);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4"
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
          <p className="text-gray-600">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <svg
            className="w-6 h-6 text-red-600"
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
          <h3 className="text-lg font-semibold text-red-800">Error Loading Logs</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📜 Audit Logs</h2>
          <p className="text-sm text-gray-600 mt-1">
            Immutable record of all PII processing operations
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'masked', 'blocked', 'warning', 'allowed'].map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            className={`px-4 py-2 rounded-lg capitalize transition-colors ${
              filter === filterOption
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {filterOption}
            {filterOption === 'all' && ` (${logs.length})`}
          </button>
        ))}
      </div>

      {/* Logs */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-600 text-lg">No logs found</p>
          <p className="text-gray-500 text-sm mt-2">
            Process some text or audio to see audit logs here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log, index) => (
            <div
              key={index}
              className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div
                className="p-4 bg-white cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpand(index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">
                        {log.policy_decision === 'masked' && '🔒'}
                        {log.policy_decision === 'blocked' && '🚫'}
                        {log.policy_decision === 'warning' && '⚠️'}
                        {log.policy_decision === 'allowed' && '✅'}
                        {!log.policy_decision && '🔍'}
                      </span>
                      <div>
                        <p className="font-semibold text-gray-800 capitalize">
                          {log.policy_decision || 'Processed'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {log.timestamp
                            ? new Date(log.timestamp).toLocaleString()
                            : 'No timestamp'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Hash:</span>{' '}
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {log.input_hash || log.audit_hash || 'N/A'}
                        </code>
                      </div>
                      <div>
                        <span className="text-gray-600">Entities:</span>{' '}
                        <span className="font-medium">
                          {log.redactions?.length || log.entities_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedLog === index ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              {expandedLog === index && (
                <div className="p-4 bg-gray-50 border-t">
                  <div className="space-y-3 text-sm">
                    {log.sanitized_prompt && (
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">
                          Sanitized Prompt:
                        </p>
                        <p className="text-gray-600 bg-white p-2 rounded border">
                          {log.sanitized_prompt}
                        </p>
                      </div>
                    )}

                    {log.redactions && log.redactions.length > 0 && (
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">Redactions:</p>
                        <div className="space-y-1">
                          {log.redactions.map((redaction, idx) => (
                            <div
                              key={idx}
                              className="bg-white p-2 rounded border flex justify-between"
                            >
                              <span className="font-medium">{redaction.type}</span>
                              <span className="text-gray-600">{redaction.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {log.llm_response_summary && (
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">
                          LLM Response Summary:
                        </p>
                        <p className="text-gray-600 bg-white p-2 rounded border">
                          {log.llm_response_summary}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
