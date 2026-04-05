import { useState, useEffect } from 'react';
import { getUsage, type UsageRecord } from '../lib/api';

export default function DashboardPage() {
  const [apiKey, setApiKey] = useState(() =>
    localStorage.getItem('skillhub_api_key') || 'sk_test_skillhub_user_001'
  );
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchUsage = async () => {
    if (!apiKey.trim()) return;
    setLoading(true);
    setError('');
    localStorage.setItem('skillhub_api_key', apiKey);
    try {
      const data = await getUsage(apiKey);
      setUsage(data.usage ?? []);
      setBalanceCents(data.balance_cents ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="subtitle">View your usage history and balance</p>
      </div>

      <div className="dashboard-controls">
        <div className="form-group form-inline">
          <label>API Key</label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk_..."
          />
          <button className="btn btn-primary" onClick={fetchUsage} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {balanceCents !== null && (
        <div className="balance-card">
          <div className="balance-label">Account Balance</div>
          <div className="balance-amount">${(balanceCents / 100).toFixed(2)}</div>
        </div>
      )}

      <div className="section">
        <h2>Usage History</h2>
        {usage.length === 0 && !loading && (
          <div className="empty-state">No usage records found.</div>
        )}
        {usage.length > 0 && (
          <div className="table-wrapper">
            <table className="usage-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Skill</th>
                  <th>Status</th>
                  <th>Input Tokens</th>
                  <th>Output Tokens</th>
                  <th>Cost</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((record) => {
                  const hasLogs = record.request_input || record.response_output;
                  const isExpanded = expandedId === record.id;
                  return (
                    <>
                      <tr
                        key={record.id}
                        className={hasLogs ? 'row-expandable' : ''}
                        onClick={() => hasLogs && toggleExpand(record.id)}
                      >
                        <td className="td-chevron">
                          {hasLogs && (
                            <span className={`chevron ${isExpanded ? 'chevron-open' : ''}`}>
                              &#x25B8;
                            </span>
                          )}
                        </td>
                        <td className="td-skill">{record.skill_name}</td>
                        <td>
                          <span className={`status-badge status-${record.status}`}>
                            {record.status}
                          </span>
                        </td>
                        <td>{record.input_tokens ?? '—'}</td>
                        <td>{record.output_tokens ?? '—'}</td>
                        <td>{record.skill_cost != null ? `$${(record.skill_cost / 100).toFixed(4)}` : '—'}</td>
                        <td>{new Date(record.created_at).toLocaleString()}</td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${record.id}-detail`} className="row-detail">
                          <td colSpan={7}>
                            <div className="log-panels">
                              {record.request_input && (
                                <div className="log-panel">
                                  <div className="log-label">Request Input</div>
                                  <pre className="log-content">
                                    {JSON.stringify(record.request_input, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {record.response_output && (
                                <div className="log-panel">
                                  <div className="log-label">
                                    {record.status === 'failed' ? 'Error' : 'Response Output'}
                                  </div>
                                  <pre className="log-content">{record.response_output}</pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
