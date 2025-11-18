import { useState, useEffect } from 'react'
import './styles/App.css'
import data from './data/questions.json'
import memoryData from './data/memoryVerses.json'
import SearchBar from './components/SearchBar'
import CategoryFilter from './components/CategoryFilter'
import QuestionCard from './components/QuestionCard'
import FeedbackModal from './components/FeedbackModal'
import QuizView from './components/QuizView'
import MemoryGame from './components/MemoryGame'
import DissectionView from './components/DissectionView'
import CommunityView from './components/Community.jsx'
import Profile from './components/Profile'
import AdminDashboard from './components/AdminDashboard'
import Announcements from './components/Announcements'
import Bookmarks from './components/Bookmarks'
import Login from './components/Login'
import InstallPrompt from './components/InstallPrompt'
import { useAuth } from './contexts/AuthContext'
import { useTheme } from './contexts/ThemeContext'

function App() {
  // STATE: What data changes in your app?
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const { user, isAdmin, signOut } = useAuth()
  const { theme, toggleTheme, isDark } = useTheme()

  const [mode, setMode] = useState('questions')

  // VERSE OF THE DAY
  const [verseOfDay, setVerseOfDay] = useState(null)
  useEffect(() => {
    // Pick a verse based on the date for consistency
    const verses = memoryData.memoryVerses
    if (verses && verses.length > 0) {
      const today = new Date()
      const idx = today.getFullYear() + today.getMonth() + today.getDate()
      setVerseOfDay(verses[idx % verses.length])
    }
  }, [])

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
      {/* PWA INSTALL PROMPT */}
      <InstallPrompt />

      {/* VERSE OF THE DAY */}
      {verseOfDay && (
        <div className="verse-of-day">
          <h2>📜 Verse of the Day</h2>
          <div className="verse-ref">{verseOfDay.reference}</div>
          <div className="verse-text">"{verseOfDay.text}"</div>
        </div>
      )}

      {/* HEADER */}
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>📖 Scripture Learning</h1>
            <p>Strengthen your faith with God's Word</p>
          </div>
          <div className="auth-section">
            <button 
              onClick={toggleTheme} 
              className="theme-toggle-btn"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            {user ? (
              <>
                <span className="user-email">{user.email}</span>
                <button onClick={signOut} className="logout-btn">Logout</button>
              </>
            ) : (
              <button onClick={() => setIsLoginOpen(true)} className="login-btn">
                🔐 Login
              </button>
            )}
          </div>
        </div>
      </header>

      <nav className="mode-nav">
        <button
          className={mode === 'questions' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setMode('questions')}
        >
        📖 Questions
        </button>
        <button
          className={mode === 'dissect' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setMode('dissect')}
        >
          🔍 Study
        </button>
        <button
          className={mode === 'memory' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setMode('memory')}
        >
          🧠 Memory
        </button>
        <button
          className={mode === 'quiz' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setMode('quiz')}
        >
          ❓ Quiz
        </button>
        <button
          className={mode === 'community' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setMode('community')}
        >
          👥 Community
        </button>
        <button
          className={mode === 'bookmarks' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setMode('bookmarks')}
        >
          ⭐ Bookmarks
        </button>
        <button
          className={mode === 'profile' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setMode('profile')}
        >
          👤 Profile
        </button>
        <button
          className={mode === 'announcements' ? 'mode-btn active' : 'mode-btn'}
          onClick={() => setMode('announcements')}
        >
          📢 Announcements
        </button>
        {isAdmin && (
          <button
            className={mode === 'admin' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => setMode('admin')}
          >
            👑 Admin
          </button>
        )}
      </nav>

    {mode === 'questions' && (
      <>
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
          filteredQuestions.map((question, index) => (
            <QuestionCard 
              key={question.id} 
              question={question}
              questionIndex={index}
            />
          ))
        )}
      </main>
      </>
    )}

    {mode === 'dissect' && (
        <DissectionView />
    )}

    {mode === 'memory' && (
        <MemoryGame />
    )}

        {mode === 'quiz' && (
        <QuizView />
    )}

      {mode === 'community' && (
        <CommunityView />
      )}

      {mode === 'bookmarks' && (
        <Bookmarks />
      )}

      {mode === 'profile' && (
        <Profile />
      )}

      {mode === 'announcements' && (
        <Announcements />
      )}

      {mode === 'admin' && (
        <AdminDashboard />
      )}
     

      <button
        className="floating-feedback-btn"
        onClick={() => setIsFeedbackOpen(true)}
      >
        <img src="/AppImages/favicon.png" alt="Feedback" />
      </button>

      {/* FEEDBACK MODAL */}
      <FeedbackModal 
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />

      {/* LOGIN MODAL */}
      {isLoginOpen && (
        <Login onClose={() => setIsLoginOpen(false)} />
      )}
    </div>
  )
}

export default App
