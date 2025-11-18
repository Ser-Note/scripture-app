import { useState } from 'react'
import dissectionData from '../data/dissections.json'
import { useBookmarks } from '../contexts/BookmarksContext'

function DissectionView() {
  const [currentDissectionIndex, setCurrentDissectionIndex] = useState(0)
  const [selectedBreakdown, setSelectedBreakdown] = useState(null)
  const { isBookmarked, toggleBookmark } = useBookmarks()

  const currentDissection = dissectionData.dissections[currentDissectionIndex]

    // Bookmark logic
    const verseId = `dissection-${currentDissection.id}`
    const bookmarked = isBookmarked('verse', verseId)
    const handleToggleBookmark = async () => {
      await toggleBookmark('verse', verseId, {
        reference: currentDissection.reference,
        text: currentDissection.verse,
        id: currentDissection.id
      })
    }

  // Handle clicking on a breakdown item
  const handleBreakdownClick = (index) => {
    if (selectedBreakdown === index) {
      setSelectedBreakdown(null) // Close if already open
    } else {
      setSelectedBreakdown(index) // Open the selected one
    }
  }

  // Navigate to next dissection
  const handleNext = () => {
    if (currentDissectionIndex < dissectionData.dissections.length - 1) {
      setCurrentDissectionIndex(currentDissectionIndex + 1)
      setSelectedBreakdown(null)
    }
  }

  // Navigate to previous dissection
  const handlePrevious = () => {
    if (currentDissectionIndex > 0) {
      setCurrentDissectionIndex(currentDissectionIndex - 1)
      setSelectedBreakdown(null)
    }
  }

  // Get category color
  const getCategoryColor = (category) => {
    const colors = {
      subject: '#667eea',
      action: '#10b981',
      object: '#f59e0b',
      condition: '#ef4444',
      promise: '#8b5cf6',
      metaphor: '#06b6d4',
      result: '#ec4899',
      declaration: '#14b8a6',
      scope: '#f97316',
      source: '#6366f1',
      certainty: '#84cc16',
      purpose: '#d946ef',
      identity: '#0ea5e9',
      invitation: '#22c55e'
    }
    return colors[category] || '#64748b'
  }

  return (
    <div className="dissection-container">
      {/* Header */}
      <div className="dissection-header">
        <h2>🔍 Verse Dissection</h2>
        <p>Explore the deeper meaning of each word and phrase</p>
      </div>

      {/* Progress */}
      <div className="dissection-progress">
        Verse {currentDissectionIndex + 1} of {dissectionData.dissections.length}
      </div>

      {/* Reference */}

        <div className="dissection-reference">
          <span className="reference-badge">{currentDissection.reference}</span>
          <button
            className="favorite-btn"
            onClick={handleToggleBookmark}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark this verse'}
            style={{ marginLeft: '10px', fontSize: '1.2em' }}
          >
            {bookmarked ? '★' : '☆'}
          </button>
        </div>

      {/* Full Verse */}
      <div className="full-verse">
        <p>"{currentDissection.verse}"</p>
      </div>

      {/* Context Section */}
      <div className="context-section">
        <h3>📖 Context</h3>
        <p>{currentDissection.context}</p>
      </div>

      {/* Key Themes */}
      <div className="themes-section">
        <h3>🔑 Key Themes</h3>
        <div className="themes-list">
          {currentDissection.keyThemes.map((theme, index) => (
            <span key={index} className="theme-tag">
              {theme}
            </span>
          ))}
        </div>
      </div>

      {/* Breakdown Section */}
      <div className="breakdown-section">
        <h3>💡 Word-by-Word Breakdown</h3>
        <p className="breakdown-hint">Click on each phrase to see its deeper meaning</p>
        
        <div className="breakdown-items">
          {currentDissection.breakdown.map((item, index) => (
            <div 
              key={index} 
              className={`breakdown-item ${selectedBreakdown === index ? 'active' : ''}`}
              onClick={() => handleBreakdownClick(index)}
            >
              <div 
                className="breakdown-phrase"
                style={{ borderLeftColor: getCategoryColor(item.category) }}
              >
                <span className="phrase-text">"{item.text}"</span>
                <span className="category-label" style={{ color: getCategoryColor(item.category) }}>
                  {item.category}
                </span>
                <span className="expand-icon">
                  {selectedBreakdown === index ? '▼' : '▶'}
                </span>
              </div>
              
              {selectedBreakdown === index && (
                <div className="breakdown-meaning">
                  <p>{item.meaning}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="dissection-navigation">
        <button 
          onClick={handlePrevious} 
          disabled={currentDissectionIndex === 0}
          className="nav-btn-dissection"
        >
          ← Previous Verse
        </button>
        <button 
          onClick={handleNext} 
          disabled={currentDissectionIndex === dissectionData.dissections.length - 1}
          className="nav-btn-dissection"
        >
          Next Verse →
        </button>
      </div>

      {/* Legend */}
      <div className="category-legend">
        <h4>Category Guide:</h4>
        <div className="legend-items">
          {Array.from(new Set(currentDissection.breakdown.map(item => item.category))).map((category, index) => (
            <div key={index} className="legend-item">
              <span 
                className="legend-color" 
                style={{ backgroundColor: getCategoryColor(category) }}
              ></span>
              <span className="legend-label">{category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default DissectionView
