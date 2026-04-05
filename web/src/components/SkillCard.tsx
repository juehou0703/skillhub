import { useState } from 'react';
import { addBookmark, removeBookmark, type Skill } from '../lib/api';

interface Props {
  skill: Skill;
  onInvoke: (skill: Skill) => void;
  isBookmarked?: boolean;
  onBookmarkChange?: (skillId: string, bookmarked: boolean) => void;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  'developer-tools': { bg: '#eef0f5', text: '#4a5a8a' },
  writing: { bg: '#fdf0eb', text: '#ae5630' },
  coding: { bg: '#eef5f0', text: '#4a7a5a' },
  analysis: { bg: '#fdf6e8', text: '#8a6d2a' },
  creative: { bg: '#f3f0f7', text: '#6e5a8a' },
  business: { bg: '#fdf0ed', text: '#a84a3a' },
  education: { bg: '#edf5f3', text: '#3a7a6a' },
  data: { bg: '#fdf5ee', text: '#8a5a30' },
};

export default function SkillCard({ skill, onInvoke, isBookmarked = false, onBookmarkChange }: Props) {
  const colors = categoryColors[skill.category?.toLowerCase()] ?? { bg: '#f0eeeb', text: '#6b6861' };
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const apiKey = localStorage.getItem('skillhub_api_key') || 'sk_test_skillhub_user_001';

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkLoading(true);
    try {
      if (bookmarked) {
        await removeBookmark(skill.id, apiKey);
        setBookmarked(false);
        onBookmarkChange?.(skill.id, false);
      } else {
        await addBookmark(skill.id, apiKey);
        setBookmarked(true);
        onBookmarkChange?.(skill.id, true);
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setBookmarkLoading(false);
    }
  };

  return (
    <div className="skill-card">
      <div className="skill-card-header">
        <span className="skill-category" style={{ backgroundColor: colors.bg, color: colors.text }}>
          {skill.category}
        </span>
        <div className="skill-card-header-right">
          <span className={`skill-price ${skill.price_per_use > 0 ? 'skill-price-paid' : 'skill-price-free'}`}>
            {skill.price_per_use > 0 ? `$${(skill.price_per_use / 100).toFixed(2)}/call` : 'Free'}
          </span>
          <button
            className={`bookmark-btn ${bookmarked ? 'bookmark-active' : ''}`}
            onClick={toggleBookmark}
            disabled={bookmarkLoading}
            title={bookmarked ? 'Remove from bookshelf' : 'Add to bookshelf'}
            aria-label={bookmarked ? 'Remove from bookshelf' : 'Add to bookshelf'}
          >
            {bookmarkLoading ? '…' : bookmarked ? '★' : '☆'}
          </button>
        </div>
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
