// src/components/Announcements.jsx
import { useAnnouncements } from '../contexts/AnnouncementsContext'
import { useAuth } from '../contexts/AuthContext'
import { useState, useRef, useEffect } from 'react'

export default function Announcements() {
  const { announcements, loading, addAnnouncement, removeAnnouncement, pinAnnouncement } = useAnnouncements()
  const { isAdmin, profile } = useAuth()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [pinned, setPinned] = useState(false)
  const [toast, setToast] = useState({ visible: false, text: '', id: null })
  const titleRef = useRef(null)
  const TITLE_MAX = 100
  const MESSAGE_MAX = 1000
  let toastTimer = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return
    if (title.length > TITLE_MAX || message.length > MESSAGE_MAX) return
    // addAnnouncement should return the created announcement (or at least its id)
    const created = await addAnnouncement(title.trim(), message.trim(), pinned)
    // show toast with undo
    if (created && created.id) {
      setToast({ visible: true, text: 'Announcement posted', id: created.id })
      // auto-dismiss after 7s
      clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setToast({ visible: false, text: '', id: null }), 7000)
    }
    setTitle('')
    setMessage('')
    setPinned(false)
  }

  const handleUndo = async () => {
    if (!toast.id) return
    await removeAnnouncement(toast.id)
    clearTimeout(toastTimer.current)
    setToast({ visible: false, text: '', id: null })
  }

  useEffect(() => {
    const onKey = (e) => {
      // Shift + A focuses the announcement title input
      if (e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        titleRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="announcements-view">
      <h2>📢 Announcements</h2>
      {isAdmin && (
        <form className="announcement-form" onSubmit={handleSubmit} aria-label="Announcement form">
          <input
            ref={titleRef}
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            aria-label="Announcement title"
          />
          <div className="char-count" aria-hidden>
            <small className={title.length > TITLE_MAX ? 'over' : ''}>{title.length}/{TITLE_MAX}</small>
          </div>

          <textarea
            placeholder="Message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={MESSAGE_MAX}
            aria-label="Announcement message"
          />
          <div className="char-count" aria-hidden>
            <small className={message.length > MESSAGE_MAX ? 'over' : ''}>{message.length}/{MESSAGE_MAX}</small>
          </div>

          <label>
            <input
              type="checkbox"
              checked={pinned}
              onChange={e => setPinned(e.target.checked)}
              aria-label="Pin announcement"
            />
            Pin announcement
          </label>

          <div className="announcement-form-actions">
            <button
              type="submit"
              className="post-announcement-btn"
              disabled={!title.trim() || !message.trim() || title.length > TITLE_MAX || message.length > MESSAGE_MAX}
              aria-disabled={!title.trim() || !message.trim() || title.length > TITLE_MAX || message.length > MESSAGE_MAX}
            >
              📢 Post
            </button>
            <button type="button" className="preview-toggle" onClick={() => { /* noop - preview always visible */ }} aria-hidden>
              Preview
            </button>
          </div>

          <div className="announcement-preview" aria-live="polite">
            <h3>{title || 'Preview title'}</h3>
            <p>{message || 'Preview message...'}</p>
            {pinned && <div className="preview-pin">📌 Pinned</div>}
          </div>
        </form>
      )}
      {loading ? (
        <div>Loading...</div>
      ) : announcements.length === 0 ? (
        <div>No announcements yet.</div>
      ) : (
        <div className="announcements-list">
          {announcements.map(a => (
            <div key={a.id} className={`announcement-card${a.pinned ? ' pinned' : ''}`}> 
              <div className="announcement-header">
                <span className="announcement-title">{a.title}</span>
                {a.pinned && <span className="announcement-pin">📌</span>}
              </div>
              <div className="announcement-message">{a.message}</div>
              <div className="announcement-footer">
                <span className="announcement-date">{new Date(a.created_at).toLocaleString()}</span>
                <span className="announcement-author">
                  {a.author_display_name
                    ? `by ${a.author_display_name}`
                    : a.author_id
                      ? `by ${a.author_id.slice(0, 8)}...`
                      : 'by Unknown'}
                </span>
                {isAdmin && (
                  <>
                    <button onClick={() => pinAnnouncement(a.id, !a.pinned)}>{a.pinned ? 'Unpin' : 'Pin'}</button>
                    <button onClick={() => removeAnnouncement(a.id)}>Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
