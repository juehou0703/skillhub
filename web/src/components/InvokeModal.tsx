import { useState } from 'react';
import { invokeSkill, type Skill, type InvokeResult } from '../lib/api';

interface Props {
  skill: Skill;
  onClose: () => void;
}

export default function InvokeModal({ skill, onClose }: Props) {
  const [apiKey, setApiKey] = useState(() =>
    localStorage.getItem('skillhub_api_key') || 'sk_test_skillhub_user_001'
  );
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvokeResult | null>(null);
  const [error, setError] = useState('');

  const handleInvoke = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    localStorage.setItem('skillhub_api_key', apiKey);
    try {
      let input: Record<string, unknown>;
      try {
        input = JSON.parse(inputText);
      } catch {
        // If not valid JSON, wrap in a simple object
        input = { prompt: inputText, input: inputText };
      }
      const res = await invokeSkill(skill.slug, input, apiKey);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invocation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invoke: {skill.display_name}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk_..."
            />
          </div>

          <div className="form-group">
            <label>Input (text or JSON)</label>
            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Enter your input...\n\nExamples:\n- Plain text: "Write me a haiku about coding"\n- JSON: {"prompt": "...", "language": "en"}`}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleInvoke}
            disabled={loading || !inputText.trim()}
          >
            {loading ? 'Invoking...' : 'Invoke Skill'}
          </button>

          {error && (
            <div className="error-box">{error}</div>
          )}

          {result && (
            <div className="result-box">
              <h3>Result</h3>
              <div className="result-meta">
                <span>Tokens: {(result.input_tokens || 0) + (result.output_tokens || 0)}</span>
                <span>Cost: ${((result.skill_cost || 0) / 100).toFixed(4)}</span>
              </div>
              <pre className="result-output">{result.result}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
