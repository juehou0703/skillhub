import { useState, useEffect } from 'react';
import { browseSkills, getBookshelf, type Skill, type BookmarkItem } from '../lib/api';
import SkillCard from '../components/SkillCard';
import InvokeModal from '../components/InvokeModal';

export default function BrowsePage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  const apiKey = localStorage.getItem('skillhub_api_key') || 'sk_test_skillhub_user_001';

  useEffect(() => {
    Promise.all([
      browseSkills(),
      getBookshelf(apiKey).catch(() => []),
    ])
      .then(([skillsData, bookmarks]) => {
        setSkills(skillsData);
        setBookmarkedIds(new Set(bookmarks.map((b) => b.id)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleBookmarkChange = (skillId: string, bookmarked: boolean) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (bookmarked) next.add(skillId);
      else next.delete(skillId);
      return next;
    });
  };

  const categories = [...new Set(skills.map((s) => s.category).filter(Boolean))];

  const filtered = skills.filter((s) => {
    const matchesText =
      !filter ||
      s.display_name.toLowerCase().includes(filter.toLowerCase()) ||
      s.description.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory = !categoryFilter || s.category === categoryFilter;
    return matchesText && matchesCategory;
  });

  if (loading) return <div className="loading">Loading skills...</div>;
  if (error) return <div className="error-box">Error: {error}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Browse Skills</h1>
        <p className="subtitle">{skills.length} skills available</p>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search skills..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="category-select"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="skills-grid">
        {filtered.map((skill) => (
          <SkillCard
            key={skill.id || skill.slug}
            skill={skill}
            onInvoke={setSelectedSkill}
            isBookmarked={bookmarkedIds.has(skill.id)}
            onBookmarkChange={handleBookmarkChange}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">No skills match your search.</div>
      )}

      {selectedSkill && (
        <InvokeModal skill={selectedSkill} onClose={() => setSelectedSkill(null)} />
      )}
    </div>
  );
}
