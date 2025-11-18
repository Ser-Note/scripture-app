// src/components/Bookmarks.jsx
import { useState } from 'react'
import { useBookmarks } from '../contexts/BookmarksContext'
import { useAuth } from '../contexts/AuthContext'

function Bookmarks() {
  const { user } = useAuth()
  const { bookmarks, loading, removeBookmark } = useBookmarks()
  const [filter, setFilter] = useState('all') // 'all', 'question', 'verse'

  if (!user) {
    return (
      <div className="bookmarks-view">
        <div className="bookmarks-empty">
          <h2>🔐 Login Required</h2>
          <p>Please login to view your bookmarks</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bookmarks-view">
        <div className="bookmarks-loading">Loading bookmarks...</div>
      </div>
    )
  }

  const filteredBookmarks = filter === 'all' 
    ? bookmarks 
    : bookmarks.filter(b => b.item_type === filter)

  const handleRemove = async (itemType, itemId) => {
    if (confirm('Remove this bookmark?')) {
      await removeBookmark(itemType, itemId)
    }
  }

  return (
    <div className="bookmarks-view">
      <div className="bookmarks-container">
        <div className="bookmarks-header">
          <h1>⭐ My Bookmarks</h1>
          <p>Questions and verses you've saved</p>
        </div>

        {/* Filter Buttons */}
        <div className="bookmarks-filters">
          <button
            className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('all')}
          >
            All ({bookmarks.length})
          </button>
          <button
            className={filter === 'question' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('question')}
          >
            📖 Questions ({bookmarks.filter(b => b.item_type === 'question').length})
          </button>
          <button
            className={filter === 'verse' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('verse')}
          >
            📜 Verses ({bookmarks.filter(b => b.item_type === 'verse').length})
          </button>
        </div>

        {/* Bookmarks List */}
        {filteredBookmarks.length === 0 ? (
          <div className="bookmarks-empty">
            <h2>No bookmarks yet</h2>
            <p>Start bookmarking questions and verses to see them here!</p>
          </div>
        ) : (
          <div className="bookmarks-list">
            {filteredBookmarks.map(bookmark => (
              <div key={bookmark.id} className="bookmark-card">
                <div className="bookmark-type-badge">
                  {bookmark.item_type === 'question' ? '📖 Question' : '📜 Verse'}
                </div>
                
                {bookmark.item_type === 'question' ? (
                  <div className="bookmark-content">
                    <h3>{bookmark.item_data.question}</h3>
                    <div className="bookmark-answer">
                      <strong>Answer:</strong>
                      <p>{bookmark.item_data.answer}</p>
                    </div>
                    {bookmark.item_data.scriptures && bookmark.item_data.scriptures.length > 0 && (
                      <div className="bookmark-scriptures">
                        <strong>Scriptures:</strong>
                        {bookmark.item_data.scriptures.map((scripture, idx) => (
                          <div key={idx} className="scripture-ref">
                            {scripture.reference}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bookmark-content">
                    <h3>{bookmark.item_data.reference}</h3>
                    <p className="verse-text">"{bookmark.item_data.text}"</p>
                  </div>
                )}

                <div className="bookmark-footer">
                  <span className="bookmark-date">
                    Saved {new Date(bookmark.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleRemove(bookmark.item_type, bookmark.item_id)}
                    className="remove-bookmark-btn"
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Bookmarks
