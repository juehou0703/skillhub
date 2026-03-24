import type { Skill } from '../lib/api';

interface Props {
  skill: Skill;
  onInvoke: (skill: Skill) => void;
}

const categoryColors: Record<string, string> = {
  writing: '#3b82f6',
  coding: '#10b981',
  analysis: '#f59e0b',
  creative: '#8b5cf6',
  business: '#ef4444',
  education: '#06b6d4',
  data: '#f97316',
};

export default function SkillCard({ skill, onInvoke }: Props) {
  const color = categoryColors[skill.category?.toLowerCase()] ?? '#6b7280';

  return (
    <div className="skill-card">
      <div className="skill-card-header">
        <span className="skill-category" style={{ backgroundColor: color }}>
          {skill.category}
        </span>
        <span className="skill-price">
          {skill.price_per_use > 0 ? `$${(skill.price_per_use / 100).toFixed(2)}/call` : 'Free'}
        </span>
      </div>
      <h3 className="skill-name">{skill.display_name}</h3>
      <p className="skill-description">{skill.description}</p>
      <div className="skill-card-footer">
        <span className="skill-model">{skill.model}</span>
        <button className="btn btn-primary btn-sm" onClick={() => onInvoke(skill)}>
          Invoke
        </button>
      </div>
    </div>
  );
}
