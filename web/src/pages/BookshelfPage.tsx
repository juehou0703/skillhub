import { useState, useEffect } from 'react';
import { getBookshelf, removeBookmark, type BookmarkItem, type Skill } from '../lib/api';
import InvokeModal from '../components/InvokeModal';

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

export default function BookshelfPage() {
    const [apiKey] = useState(() =>
        localStorage.getItem('skillhub_api_key') || 'sk_test_skillhub_user_001'
    );
    const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
    const [categoryFilter, setCategoryFilter] = useState('');

    const fetchBookshelf = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getBookshelf(apiKey);
            setBookmarks(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load bookshelf');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookshelf();
    }, []);

    const handleRemove = async (skillId: string) => {
        setRemovingId(skillId);
        try {
            await removeBookmark(skillId, apiKey);
            setBookmarks((prev) => prev.filter((b) => b.id !== skillId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove bookmark');
        } finally {
            setRemovingId(null);
        }
    };

    const categories = [...new Set(bookmarks.map((b) => b.category).filter(Boolean))];

    const filtered = bookmarks.filter((b) =>
        !categoryFilter || b.category === categoryFilter
    );

    // Group by category for shelf display
    const grouped = filtered.reduce<Record<string, BookmarkItem[]>>((acc, b) => {
        const cat = b.category || 'uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(b);
        return acc;
    }, {});

    if (loading) return <div className="loading">Loading your bookshelf...</div>;

    return (
        <div className="page">
            {/* Hero section */}
            <div className="bookshelf-hero">
                <div className="bookshelf-hero-icon">📚</div>
                <div>
                    <h1>My Bookshelf</h1>
                    <p className="subtitle">
                        {bookmarks.length === 0
                            ? 'Your personal skill collection is empty'
                            : `${bookmarks.length} skill${bookmarks.length !== 1 ? 's' : ''} saved`}
                    </p>
                </div>
            </div>

            {error && <div className="error-box">{error}</div>}

            {bookmarks.length === 0 && !loading && (
                <div className="bookshelf-empty">
                    <div className="bookshelf-empty-icon">🏷️</div>
                    <h3>No skills saved yet</h3>
                    <p>Browse the marketplace and bookmark skills you want quick access to.</p>
                    <a href="/" className="btn btn-primary">Browse Skills</a>
                </div>
            )}

            {bookmarks.length > 0 && (
                <>
                    {categories.length > 1 && (
                        <div className="bookshelf-filters">
                            <button
                                className={`bookshelf-filter-chip ${!categoryFilter ? 'active' : ''}`}
                                onClick={() => setCategoryFilter('')}
                            >
                                All ({bookmarks.length})
                            </button>
                            {categories.map((cat) => {
                                const count = bookmarks.filter((b) => b.category === cat).length;
                                const colors = categoryColors[cat?.toLowerCase()] ?? { bg: '#f0eeeb', text: '#6b6861' };
                                return (
                                    <button
                                        key={cat}
                                        className={`bookshelf-filter-chip ${categoryFilter === cat ? 'active' : ''}`}
                                        onClick={() => setCategoryFilter(categoryFilter === cat ? '' : cat)}
                                        style={categoryFilter === cat ? undefined : { backgroundColor: colors.bg, color: colors.text }}
                                    >
                                        {cat} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="bookshelf-shelves">
                        {Object.entries(grouped).map(([category, items]) => {
                            const colors = categoryColors[category?.toLowerCase()] ?? { bg: '#f0eeeb', text: '#6b6861' };
                            return (
                                <div key={category} className="bookshelf-shelf">
                                    <div className="shelf-label">
                                        <span
                                            className="shelf-category-dot"
                                            style={{ backgroundColor: colors.text }}
                                        />
                                        <span>{category}</span>
                                        <span className="shelf-count">{items.length}</span>
                                    </div>
                                    <div className="shelf-books">
                                        {items.map((bookmark) => {
                                            const catColors = categoryColors[bookmark.category?.toLowerCase()] ?? { bg: '#f0eeeb', text: '#6b6861' };
                                            return (
                                                <div
                                                    key={bookmark.id}
                                                    className={`book-card ${removingId === bookmark.id ? 'book-removing' : ''}`}
                                                >
                                                    <div className="book-spine" style={{ backgroundColor: catColors.text }} />
                                                    <div className="book-content">
                                                        <div className="book-header">
                                                            <span
                                                                className="skill-category"
                                                                style={{ backgroundColor: catColors.bg, color: catColors.text }}
                                                            >
                                                                {bookmark.category}
                                                            </span>
                                                            <span className={`skill-price ${bookmark.price_per_use > 0 ? 'skill-price-paid' : 'skill-price-free'}`}>
                                                                {bookmark.price_per_use > 0
                                                                    ? `$${(bookmark.price_per_use / 100).toFixed(2)}`
                                                                    : 'Free'}
                                                            </span>
                                                        </div>
                                                        <h3 className="book-title">{bookmark.display_name}</h3>
                                                        <p className="book-description">{bookmark.description}</p>
                                                        {bookmark.note && (
                                                            <div className="book-note">
                                                                <span className="book-note-icon">📝</span>
                                                                {bookmark.note}
                                                            </div>
                                                        )}
                                                        <div className="book-meta">
                                                            <span className="skill-model">{bookmark.model}</span>
                                                            <span className="book-date">
                                                                Saved {new Date(bookmark.bookmarked_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="book-actions">
                                                            <button
                                                                className="btn btn-primary btn-sm"
                                                                onClick={() => setSelectedSkill(bookmark)}
                                                            >
                                                                Invoke
                                                            </button>
                                                            <button
                                                                className="btn btn-ghost btn-sm"
                                                                onClick={() => handleRemove(bookmark.id)}
                                                                disabled={removingId === bookmark.id}
                                                                title="Remove from bookshelf"
                                                            >
                                                                {removingId === bookmark.id ? '...' : '✕ Remove'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="shelf-base" />
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {selectedSkill && (
                <InvokeModal skill={selectedSkill} onClose={() => setSelectedSkill(null)} />
            )}
        </div>
    );
}
