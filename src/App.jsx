import { useState, useEffect } from 'react'
import './styles/App.css'
import data from './data/questions.json'
import SearchBar from './components/SearchBar'
import CategoryFilter from './components/CategoryFilter'
import QuestionCard from './components/QuestionCard'
import FeedbackModal from './components/FeedbackModal'

function App() {
  // STATE: What data changes in your app?
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)

  const toggleFavorite = (questionId) => 
  {
    if (favorites.includes(questionId)) 
    {
      const newFavorites = favorites.filter(id => id !== questionId)
      setFavorites(newFavorites)
      console.log("Removed! New favorites:", newFavorites)
    } else
    {
        const newFavorites = [...favorites, questionId]
        setFavorites(newFavorites)
        console.log("Added! New favorites:", newFavorites)
    }
  }

  useEffect(() => 
  {
    const savedFavorites = localStorage.getItem('scriptureAppFavorites')
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }
  }, [])

  useEffect(() => {
    if(isLoaded) 
    {
      localStorage.setItem('scriptureAppFavorites', JSON.stringify(favorites))
    } else {
      setIsLoaded(true)
    }
  }, [favorites])

  // FILTER LOGIC: Show questions based on search and category
  const filteredQuestions = data.questions.filter(question => {
    // Check if question matches search term
    const matchesSearch = question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.answer.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Check if question matches selected category
    const matchesCategory = selectedCategory === 'all' || 
                           question.categoryId === parseInt(selectedCategory)
    
    return matchesSearch && matchesCategory
  })

  return (
    <div className="app">
      {/* HEADER */}
      <header className="app-header">
        <h1>📖 Scripture Learning</h1>
        <p>Strengthen your faith with God's Word</p>
      </header>

      {/* SEARCH & FILTER SECTION */}
      <div className="controls">
        <SearchBar 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm} 
        />
        <CategoryFilter 
          categories={data.categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </div>

      {/* RESULTS SECTION */}
      <main className="questions-container">
        {filteredQuestions.length === 0 ? (
          <p className="no-results">No questions found. Try a different search or category.</p>
        ) : (
          filteredQuestions.map(question => (
            <QuestionCard 
              key={question.id} 
              question={question} 
              isFavorited={favorites.includes(question.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))
        )}
      </main>

      {/* FOOTER WITH FEEDBACK */}
      <footer className="app-footer">
        <p>Have a question not answered here? <button className="feedback-link" onClick={() => setIsFeedbackOpen(true)}>Send feedback</button></p>
      </footer>

      {/* FEEDBACK MODAL */}
      <FeedbackModal 
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </div>
  )
}

export default App
