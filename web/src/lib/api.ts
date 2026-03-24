const BASE = '/api';

export interface Skill {
  id: string;
  slug: string;
  display_name: string;
  description: string;
  category: string;
  model: string;
  price_per_use: number;
  input_schema: Record<string, unknown>;
}

export interface UsageRecord {
  id: string;
  skill_id: string;
  skill_slug: string;
  skill_name: string;
  status: string;
  input_tokens: number;
  output_tokens: number;
  skill_cost: number;
  created_at: string;
}

export interface InvokeResult {
  result: string;
  usage_event_id: number;
  input_tokens: number;
  output_tokens: number;
  skill_cost: number;
}

export interface Analytics {
  total_invocations: number;
  successful: number;
  failed: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_revenue_cents: number;
}

export async function browseSkills(): Promise<Skill[]> {
  const res = await fetch(`${BASE}/skills/browse`);
  if (!res.ok) throw new Error(`Failed to browse skills: ${res.statusText}`);
  const data = await res.json();
  return data.skills ?? data;
}

export async function invokeSkill(slug: string, input: Record<string, unknown>, apiKey: string): Promise<InvokeResult> {
  const res = await fetch(`${BASE}/skills/${slug}/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function getUsage(apiKey: string): Promise<{ usage: UsageRecord[]; balance_cents: number }> {
  const res = await fetch(`${BASE}/usage`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch usage: ${res.statusText}`);
  return res.json();
}

export async function createSkill(skill: {
  slug: string;
  display_name: string;
  description: string;
  category: string;
  input_schema: Record<string, unknown>;
  model: string;
  price_per_use: number;
  skill_content: string;
}, apiKey: string): Promise<{ id: string; slug: string; status: string }> {
  const res = await fetch(`${BASE}/skills`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(skill),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function getSkillAnalytics(skillId: string): Promise<Analytics> {
  const res = await fetch(`${BASE}/skills/${skillId}/analytics`);
  if (!res.ok) throw new Error(`Failed to fetch analytics: ${res.statusText}`);
  return res.json();
}
