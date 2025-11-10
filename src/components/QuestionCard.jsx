import { useState } from 'react'

// QUESTION CARD COMPONENT
// Displays a question and toggles to show the answer and scriptures
function QuestionCard({ question, isFavorited, onToggleFavorite }) {
  // LOCAL STATE: Each card tracks if it's expanded or not
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="question-card">
      {/* QUESTION HEADER - Always visible */}
      <div 
        className="question-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3>{question.question}</h3>
        <div className="header-icons">
          <button
            className="favorite-btn"
            onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite(question.id)
              }}
          >
            {isFavorited ? '★' : '☆'}
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
            {question.scriptures.map((scripture, index) => (
              <div key={index} className="scripture-verse">
                <strong>{scripture.reference}</strong>
                <p>"{scripture.text}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default QuestionCard
