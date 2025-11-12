import { useState, useEffect } from 'react'
import quizData from '../data/quizzes.json'

const shuffleArray = (array) => {
    const shuffled = [...array]  // 1. Create a copy to avoid mutating original
    for (let i = shuffled.length - 1; i > 0; i--) {  // 2. Loop backwards from end
        const j = Math.floor(Math.random() * (i + 1))  // 3. Pick random index from 0 to i
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]  // 4. Swap elements
    }
    return shuffled
}

function QuizView() {
  // STATE: All useState must be INSIDE the function
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [showExplanation, setShowExplanation] = useState(false)  
  const [quizComplete, setQuizComplete] = useState(false)
  const [shuffledOptions, setShuffledOptions] = useState([])

  // Get current question
  const currentQuestion = quizData.quizzes[currentQuestionIndex]

  // Shuffle options when question changes
  useEffect(() => {
    setShuffledOptions(shuffleArray(currentQuestion.options))
    setSelectedAnswer(null)
    setShowExplanation(false)
  }, [currentQuestionIndex])

  const handleAnswerClick = (index, isCorrect) => {
    setSelectedAnswer(index)

    if(isCorrect) {
        setScore(score +1)
    }

    setShowExplanation(true)
  }

const handleNextQuestion = () => {
  if (currentQuestionIndex === quizData.quizzes.length - 1) {
    setQuizComplete(true)
  } else {
    setCurrentQuestionIndex(currentQuestionIndex + 1)
  }
}

const handleRestart = () => {
  setCurrentQuestionIndex(0)
  setScore(0)
  setSelectedAnswer(null)
  setShowExplanation(false)
  setQuizComplete(false)
}


  return (
    <div className="quiz-container">
        {!quizComplete ? (
        <>
            {/* Progress */}
            <div className="quiz-progress">
            <span>Question {currentQuestionIndex + 1} of {quizData.quizzes.length}</span>
            <span>Score: {score}</span>
            </div>

            {/* Question */}
            <div className="quiz-question">
            <span className="quiz-category">{currentQuestion.category}</span>
            <h3>{currentQuestion.question}</h3>
            </div>

            {/* Answer Options */}
           <div className="quiz-options">
            {shuffledOptions.map((option, index) => (
                <button
                key={index}
                className={`quiz-option ${
                    selectedAnswer === index 
                    ? option.correct 
                        ? 'correct' 
                        : 'incorrect'
                    : ''
                }`}
                onClick={() => handleAnswerClick(index, option.correct)}
                disabled={selectedAnswer !== null}
                >
                <div className="option-reference">{option.reference}</div>
                <div className="option-text">{option.simplified}</div>
                </button>
            ))}
            </div>
            {/* Explanation & Next Button */}
            {showExplanation && (
            <div className="quiz-explanation">
                <p className="explanation-text">{currentQuestion.explanation}</p>
                <button 
                className="next-btn"
                onClick={handleNextQuestion}
                >
                {currentQuestionIndex === quizData.quizzes.length - 1 ? 'See Results' : 'Next Question'}
                </button>
            </div>
            )}



        </>
        ) : (
        <div className="quiz-results">
            <div className="results-icon">
              {score >= quizData.quizzes.length * 0.8 ? '🎉' : 
               score >= quizData.quizzes.length * 0.6 ? '👍' : 
               '📚'}
            </div>
            <h2>Quiz Complete!</h2>
            <p className="score-display">
              You scored <span className="score-number">{score}</span> out of {quizData.quizzes.length}
            </p>
            <p className="score-percentage">
              {Math.round((score / quizData.quizzes.length) * 100)}% correct
            </p>
            <button className="restart-btn" onClick={handleRestart}>
              🔄 Try Again
            </button>
        </div>
        )}
    </div>
    )
}

export default QuizView