// src/components/Announcements.jsx
import { useAnnouncements } from '../contexts/AnnouncementsContext'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

export default function Announcements() {
  const { announcements, loading, addAnnouncement, removeAnnouncement, pinAnnouncement } = useAnnouncements()
  const { isAdmin, profile } = useAuth()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [pinned, setPinned] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title || !message) return
    await addAnnouncement(title, message, pinned)
    setTitle('')
    setMessage('')
    setPinned(false)
  }

  return (
    <div className="announcements-view">
      <h2>📢 Announcements</h2>
      {isAdmin && (
        <form className="announcement-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
          />
          <label>
            <input
              type="checkbox"
              checked={pinned}
              onChange={e => setPinned(e.target.checked)}
            />
            Pin announcement
          </label>
          <button type="submit">Post Announcement</button>
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
