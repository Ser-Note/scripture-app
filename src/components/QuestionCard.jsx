import { useState } from 'react'
import '../styles/QuestionCard.css'
import { useBookmarks } from '../contexts/BookmarksContext'
import LikeButton from './LikeButton'

// QUESTION CARD COMPONENT
// Displays a question and toggles to show the answer and scriptures
function QuestionCard({ question, questionIndex }) {
  // Hooks must be top-level
  const { isBookmarked, toggleBookmark } = useBookmarks()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggleBookmark = async (e) => {
    e.stopPropagation()
    const itemId = `question-${questionIndex}`
    await toggleBookmark('question', itemId, {
      question: question.question,
      answer: question.answer,
      category: question.category,
      scriptures: question.scriptures,
      index: questionIndex
    })
  }

  const bookmarked = isBookmarked('question', `question-${questionIndex}`)

  return (
    <div className="question-card">
      {/* QUESTION HEADER - Always visible */}
      <div 
        className="question-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <h3 style={{ flex: 1 }}>{question.question}</h3>
        <div className="header-icons" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LikeButton itemType="question" itemId={`question-${question.id || questionIndex}`} />
          <button
            className="favorite-btn"
            onClick={handleToggleBookmark}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
          >
            {bookmarked ? '★' : '☆'}
          </button>
          <span className="toggle-icon">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* ANSWER & SCRIPTURES - Only visible when expanded */}
      {isExpanded && (
        <div className="question-content">
          <div className="answer">
            <h4>Answer:</h4>
            <p>{question.answer}</p>
          </div>

          <div className="scriptures">
            <h4>Supporting Scripture:</h4>
            {question.scriptures.map((scripture, index) => {
              const verseId = `question-scripture-${question.id || questionIndex}-${scripture.reference}`
              const verseBookmarked = isBookmarked('verse', verseId)
              const handleVerseBookmark = async (e) => {
                e.stopPropagation()
                await toggleBookmark('verse', verseId, {
                  reference: scripture.reference,
                  text: scripture.text,
                  questionId: question.id || questionIndex
                })
              }
              return (
                <div key={index} className="scripture-verse" style={{ display: 'flex', alignItems: 'center' }}>
                  <strong>{scripture.reference}</strong>
                  <p style={{ margin: '0 8px' }}>&quot;{scripture.text}&quot;</p>
                  <button
                    className="favorite-btn"
                    onClick={handleVerseBookmark}
                    title={verseBookmarked ? 'Remove bookmark' : 'Bookmark this verse'}
                    style={{ fontSize: '1em', marginLeft: '4px' }}
                  >
                    {verseBookmarked ? '★' : '☆'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default QuestionCard
