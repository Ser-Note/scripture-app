import { useState } from "react";
import { useAuth } from '../contexts/AuthContext';

function Login({ onClose }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    
    const { signUp, signIn } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if(isSignUp) {
                const {error} = await signUp(email, password, displayName || email.split('@')[0])
                if(error) throw error
                alert('Account created! You can now login.')
                setIsSignUp(false)
                setEmail('')
                setPassword('')
                setDisplayName('')
            } else {
                const {error} = await signIn(email, password)
                if(error) {
                    // Provide more helpful error messages
                    if (error.message.includes('Invalid login credentials')) {
                        throw new Error('Invalid email or password. Please check your credentials or sign up first.')
                    }
                    throw error
                }
                if(onClose) onClose()
            }
        } catch (err) {
            console.error('Auth error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content login-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        
        <h2>{isSignUp ? '📝 Create Account' : '🔐 Login'}</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="login-form">
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Login'}
          </button>
        </form>
        
        <div className="toggle-auth">
          <button onClick={() => setIsSignUp(!isSignUp)} className="toggle-auth-btn">
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login