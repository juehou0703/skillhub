import { useState } from 'react';
import { createSkill, getSkillAnalytics, type Analytics } from '../lib/api';

const defaultInputSchema = JSON.stringify(
  {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'The input prompt' },
    },
    required: ['input'],
  },
  null,
  2
);

const defaultSkillMd = `# My Skill

You are a helpful assistant. Respond to the user's request clearly and concisely.

## Instructions
- Be direct and specific
- Use examples when helpful
`;

export default function CreatorPage() {
  const [apiKey, setApiKey] = useState(() =>
    localStorage.getItem('skillhub_api_key') || 'sk_test_skillhub_user_001'
  );

  // Form state
  const [slug, setSlug] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('developer-tools');
  const [inputSchema, setInputSchema] = useState(defaultInputSchema);
  const [model, setModel] = useState('sonnet');
  const [priceCents, setPriceCents] = useState('0');
  const [skillMd, setSkillMd] = useState(defaultSkillMd);

  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState('');
  const [createError, setCreateError] = useState('');

  // Analytics state
  const [analyticsId, setAnalyticsId] = useState('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState('');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError('');
    setCreateResult('');
    localStorage.setItem('skillhub_api_key', apiKey);
    try {
      let parsedSchema: Record<string, unknown>;
      try {
        parsedSchema = JSON.parse(inputSchema);
      } catch {
        throw new Error('Invalid JSON in input schema');
      }

      const result = await createSkill(
        {
          slug,
          display_name: displayName,
          description,
          category,
          input_schema: parsedSchema,
          model,
          price_per_use: parseInt(priceCents) || 0,
          skill_content: skillMd,
        },
        apiKey
      );
      setCreateResult(`Skill created! ID: ${result.id}, slug: ${result.slug}`);
      // Reset form
      setSlug('');
      setDisplayName('');
      setDescription('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create skill');
    } finally {
      setCreating(false);
    }
  };

  const handleFetchAnalytics = async () => {
    if (!analyticsId.trim()) return;
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const data = await getSkillAnalytics(analyticsId);
      setAnalytics(data);
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Creator Studio</h1>
        <p className="subtitle">Create new skills and view analytics</p>
      </div>

      <div className="form-group">
        <label>API Key</label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk_..."
        />
      </div>

      <div className="section">
        <h2>Upload New Skill</h2>
        <div className="creator-form">
          <div className="form-row">
            <div className="form-group">
              <label>Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-awesome-skill"
              />
            </div>
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="My Awesome Skill"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of what this skill does..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="developer-tools">Developer Tools</option>
                <option value="writing">Writing</option>
                <option value="coding">Coding</option>
                <option value="analysis">Analysis</option>
                <option value="creative">Creative</option>
                <option value="business">Business</option>
                <option value="education">Education</option>
                <option value="data">Data</option>
              </select>
            </div>
            <div className="form-group">
              <label>Model</label>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="sonnet">Claude Sonnet</option>
                <option value="haiku">Claude Haiku</option>
                <option value="opus">Claude Opus</option>
              </select>
            </div>
            <div className="form-group">
              <label>Price (cents per call)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={priceCents}
                onChange={(e) => setPriceCents(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Input Schema (JSON)</label>
            <textarea
              rows={8}
              value={inputSchema}
              onChange={(e) => setInputSchema(e.target.value)}
              className="code-editor"
            />
          </div>

          <div className="form-group">
            <label>SKILL.md Content</label>
            <textarea
              rows={12}
              value={skillMd}
              onChange={(e) => setSkillMd(e.target.value)}
              className="code-editor"
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={creating || !slug || !displayName || !description}
          >
            {creating ? 'Creating...' : 'Create Skill'}
          </button>

          {createError && <div className="error-box">{createError}</div>}
          {createResult && <div className="success-box">{createResult}</div>}
        </div>
      </div>

      <div className="section">
        <h2>Skill Analytics</h2>
        <div className="form-group form-inline">
          <label>Skill ID</label>
          <input
            type="text"
            value={analyticsId}
            onChange={(e) => setAnalyticsId(e.target.value)}
            placeholder="Enter skill ID..."
          />
          <button
            className="btn btn-primary"
            onClick={handleFetchAnalytics}
            disabled={analyticsLoading}
          >
            {analyticsLoading ? 'Loading...' : 'Fetch Analytics'}
          </button>
        </div>

        {analyticsError && <div className="error-box">{analyticsError}</div>}

        {analytics && (
          <div className="analytics-cards">
            <div className="stat-card">
              <div className="stat-label">Total Invocations</div>
              <div className="stat-value">{analytics.total_invocations}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Successful</div>
              <div className="stat-value">{analytics.successful}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Failed</div>
              <div className="stat-value">{analytics.failed}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value">${(analytics.total_revenue_cents / 100).toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Tokens</div>
              <div className="stat-value">{(analytics.total_input_tokens + analytics.total_output_tokens).toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
