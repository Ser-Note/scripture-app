import { useState } from 'react'

/* 
  FEEDBACK MODAL COMPONENT
  This teaches you:
  1. Managing multiple form inputs with state
  2. Form validation
  3. Handling form submission
  4. Creating a modal overlay
*/

function FeedbackModal({ isOpen, onClose }) {
  // STATE: Store form data in an object
  // This is a common pattern for forms with multiple fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })

  // STATE: Track errors for validation
  const [errors, setErrors] = useState({})

  // STATE: Track if form was submitted
  const [isSubmitted, setIsSubmitted] = useState(false)

  // STATE: Track if sending message (loading state)
  const [isSending, setIsSending] = useState(false)

  // TELEGRAM CONFIG - You'll add your credentials here later
  // To get these: Message @BotFather on Telegram to create a bot
  const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN  // Replace with your bot token
  const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID     // Replace with your chat ID

  // HANDLER: Update form data when user types
  // This is called a "controlled component" - React controls the input value
  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Update the specific field that changed
    setFormData(prevData => ({
      ...prevData,        // Keep all other fields the same
      [name]: value       // Update only the field that changed
    }))

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  // VALIDATION: Check if form is valid before submitting
  const validateForm = () => {
    const newErrors = {}

    // Check if name is filled
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    // Check if email is filled and valid
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    // Check if message is filled
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required'
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters'
    }

    setErrors(newErrors)
    
    // Return true if no errors
    return Object.keys(newErrors).length === 0
  }

  // HANDLER: Submit form
  const handleSubmit = async (e) => {
    e.preventDefault()  // Prevent page reload
    
    if (validateForm()) {
      setIsSending(true)  // Show loading state
      
      try {
        // Send message to Telegram
        await sendToTelegram(formData)
        
        // Success! Show success message
        setIsSubmitted(true)
        
        // Reset form after 2 seconds and close modal
        setTimeout(() => {
          setFormData({ name: '', email: '', message: '' })
          setIsSubmitted(false)
          onClose()
        }, 2000)
        
      } catch (error) {
        // If sending fails, show error to user
        console.error('Error sending message:', error)
        alert('Failed to send message. Please try again.')
      } finally {
        setIsSending(false)
      }
    }
  }

  // FUNCTION: Send message to Telegram
  // This is an async function - it waits for the API response
  const sendToTelegram = async (data) => {
    // Format the message nicely
    const message = `
🔔 New Feedback from Scripture App!

👤 Name: ${data.name}
📧 Email: ${data.email}

💬 Message:
${data.message}
    `.trim()

    // Telegram API endpoint
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`

    // Send POST request to Telegram
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    })

    // Check if request was successful
    if (!response.ok) {
      throw new Error('Failed to send message to Telegram')
    }

    return response.json()
  }

  // Don't render anything if modal is not open
  if (!isOpen) return null

  return (
    // OVERLAY: Dark background that closes modal when clicked
    <div className="modal-overlay" onClick={onClose}>
      {/* MODAL CONTENT: Stop clicks from closing modal */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="modal-header">
          <h2>Send Feedback</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* SHOW SUCCESS MESSAGE OR FORM */}
        {isSubmitted ? (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h3>Thank you!</h3>
            <p>Your feedback has been received.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            
            {/* NAME INPUT */}
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'error' : ''}
                placeholder="Your name"
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            {/* EMAIL INPUT */}
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder="your.email@example.com"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            {/* MESSAGE INPUT */}
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                className={errors.message ? 'error' : ''}
                placeholder="What question would you like answered? Or share your thoughts..."
                rows="5"
              />
              {errors.message && <span className="error-message">{errors.message}</span>}
            </div>

            {/* SUBMIT BUTTON */}
            <button type="submit" className="submit-btn" disabled={isSending}>
              {isSending ? 'Sending...' : 'Send Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default FeedbackModal
