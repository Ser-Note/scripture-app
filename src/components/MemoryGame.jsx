import { useState, useEffect } from 'react'
import memoryData from '../data/memoryVerses.json'
import { useBookmarks } from '../contexts/BookmarksContext'

function MemoryGame() {
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  const [selectedWords, setSelectedWords] = useState([])
  const [scrambledWords, setScrambledWords] = useState([])
  const [isComplete, setIsComplete] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const { isBookmarked, toggleBookmark } = useBookmarks()

  // Get current verse
  const currentVerse = memoryData.memoryVerses[currentVerseIndex]

    // Bookmark logic
    const verseId = `memory-${currentVerse.id || currentVerse.reference}`
    const bookmarked = isBookmarked('verse', verseId)
    const handleToggleBookmark = async () => {
      await toggleBookmark('verse', verseId, {
        reference: currentVerse.reference,
        text: currentVerse.text,
        id: currentVerse.id || currentVerse.reference
      })
    }

  // Shuffle words when verse changes
  useEffect(() => {
    const words = currentVerse.text.split(' ')
    const shuffled = shuffleArray(words)
    setScrambledWords(shuffled)
    setSelectedWords([])
    setIsComplete(false)
    setIsCorrect(false)
    setShowHint(false)
  }, [currentVerseIndex])

  // Shuffle function (Fisher-Yates)
  const shuffleArray = (array) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Handle word click
  const handleWordClick = (word, index) => {
    setSelectedWords([...selectedWords, word])
    setScrambledWords(scrambledWords.filter((_, i) => i !== index))
  }

  // Handle undo last word
  const handleUndo = () => {
    if (selectedWords.length === 0) return
    const lastWord = selectedWords[selectedWords.length - 1]
    setSelectedWords(selectedWords.slice(0, -1))
    setScrambledWords([...scrambledWords, lastWord])
  }

  // Check answer
  const handleCheckAnswer = () => {
    const userAnswer = selectedWords.join(' ')
    const correctAnswer = currentVerse.text
    setIsComplete(true)
    setIsCorrect(userAnswer === correctAnswer)
  }

  // Reset current verse
  const handleReset = () => {
    const words = currentVerse.text.split(' ')
    setScrambledWords(shuffleArray(words))
    setSelectedWords([])
    setIsComplete(false)
    setIsCorrect(false)
    setShowHint(false)
  }

  // Next verse
  const handleNextVerse = () => {
    if (currentVerseIndex < memoryData.memoryVerses.length - 1) {
      setCurrentVerseIndex(currentVerseIndex + 1)
    }
  }

  // Previous verse
  const handlePreviousVerse = () => {
    if (currentVerseIndex > 0) {
      setCurrentVerseIndex(currentVerseIndex - 1)
    }
  }

  return (
    <div className="memory-game-container">
      {/* Header */}
      <div className="memory-header">
        <h2>📖 Memory Verse Game</h2>
        <p>Arrange the words in the correct order</p>
      </div>

      {/* Verse Info */}
        <div className="verse-info">
          <span className="verse-reference">{currentVerse.reference}</span>
          <button
            className="favorite-btn"
            onClick={handleToggleBookmark}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark this verse'}
            style={{ marginLeft: '10px', fontSize: '1.2em' }}
          >
            {bookmarked ? '★' : '☆'}
          </button>
          <span className={`difficulty-badge ${currentVerse.difficulty}`}>{currentVerse.difficulty}</span>
          <span className="verse-category">{currentVerse.category}</span>
        </div>

      {/* Progress */}
      <div className="memory-progress">
        Verse {currentVerseIndex + 1} of {memoryData.memoryVerses.length}
      </div>

      {/* Selected Words (User's answer building up) */}
      <div className="selected-words-container">
        <h3>Your Answer:</h3>
        <div className="selected-words">
          {selectedWords.length === 0 ? (
            <span className="placeholder-text">Click words below to build the verse...</span>
          ) : (
            selectedWords.map((word, index) => (
              <span key={index} className="selected-word">
                {word}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Scrambled Words */}
      {!isComplete && (
        <div className="scrambled-words-container">
          <h3>Available Words:</h3>
          <div className="scrambled-words">
            {scrambledWords.map((word, index) => (
              <button
                key={index}
                className="word-btn"
                onClick={() => handleWordClick(word, index)}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="memory-actions">
        {!isComplete ? (
          <>
            <button 
              className="hint-btn" 
              onClick={() => setShowHint(!showHint)}
            >
              💡 {showHint ? 'Hide Hint' : 'Show Hint'}
            </button>
            <button 
              className="undo-btn" 
              onClick={handleUndo}
              disabled={selectedWords.length === 0}
            >
              ↶ Undo
            </button>
            <button 
              className="check-btn" 
              onClick={handleCheckAnswer}
              disabled={scrambledWords.length > 0}
            >
              ✓ Check Answer
            </button>
            <button className="reset-btn" onClick={handleReset}>
              🔄 Reset
            </button>
          </>
        ) : (
          <div className="completion-actions">
            {isCorrect ? (
              <div className="success-message">
                <div className="success-icon">🎉</div>
                <h3>Perfect! You got it right!</h3>
                <p className="correct-verse">"{currentVerse.text}"</p>
              </div>
            ) : (
              <div className="error-message">
                <div className="error-icon">❌</div>
                <h3>Not quite right. Here's the correct verse:</h3>
                <p className="correct-verse">"{currentVerse.text}"</p>
              </div>
            )}
            <div className="navigation-btns">
              <button onClick={handleReset} className="try-again-btn">
                🔄 Try Again
              </button>
              {currentVerseIndex < memoryData.memoryVerses.length - 1 && (
                <button onClick={handleNextVerse} className="next-verse-btn">
                  Next Verse →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hint Display */}
      {showHint && !isComplete && (
        <div className="hint-box">
          <strong>💡 Hint:</strong> {currentVerse.hint}
        </div>
      )}

      {/* Navigation */}
      <div className="verse-navigation">
        <button 
          onClick={handlePreviousVerse} 
          disabled={currentVerseIndex === 0}
          className="nav-btn"
        >
          ← Previous
        </button>
        <button 
          onClick={handleNextVerse} 
          disabled={currentVerseIndex === memoryData.memoryVerses.length - 1}
          className="nav-btn"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

export default MemoryGame
