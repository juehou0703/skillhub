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
                  <th>Skill</th>
                  <th>Status</th>
                  <th>Input Tokens</th>
                  <th>Output Tokens</th>
                  <th>Cost</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((record) => (
                  <tr key={record.id}>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
