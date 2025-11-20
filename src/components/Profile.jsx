import React, { useState, useEffect } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useFollow } from '../contexts/FollowContext'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationsContext'

function Profile() {
  const { theme, setTheme } = useTheme()
  // Set theme attribute on document root for CSS variables
    useEffect(() => {
      document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);
  const { user, profile, fetchProfile } = useAuth()
  const { followers } = useFollow()
  const [showFollowers, setShowFollowers] = useState(false)
  const [followerProfiles, setFollowerProfiles] = useState([])

  // Profile editing state
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || ''
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Update formData when profile changes
    setFormData({
      display_name: profile?.display_name || '',
      bio: profile?.bio || '',
      avatar_url: profile?.avatar_url || ''
    })
  }, [profile])

  // Handlers for editing profile
  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = async e => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const { supabase } = await import('../lib/supabase')
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}_${Date.now()}.${fileExt}`
      const { data, error } = await supabase.storage.from('avatars').upload(fileName, file)
      if (error) throw error
      const { publicURL } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setFormData(prev => ({ ...prev, avatar_url: publicURL }))
      setMessage('✅ Avatar uploaded!')
    } catch (err) {
      setMessage('❌ Failed to upload avatar')
    }
    setUploading(false)
  }

  const handleSaveProfile = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const { supabase } = await import('../lib/supabase')
      const updates = {
        id: user.id,
        display_name: formData.display_name,
        bio: formData.bio,
        avatar_url: formData.avatar_url
      }
      const { error } = await supabase.from('profiles').upsert(updates)
      if (error) throw error
      setMessage('✅ Profile updated!')
      fetchProfile()
      setIsEditing(false)
    } catch (err) {
      setMessage('❌ Failed to update profile')
    }
    setLoading(false)
  }
  useEffect(() => {
    async function fetchFollowerProfiles() {
      if (showFollowers && followers.length > 0) {
        const { supabase } = await import('../lib/supabase')
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, email, avatar_url')
          .in('id', followers)
        setFollowerProfiles(data || [])
      }
    }
    fetchFollowerProfiles()
  }, [showFollowers, followers])

  // Theme icons for preview
  const BookmarkIcon = () => {
    if (theme === 'dark') return <span role="img" aria-label="moon">🌙</span>;
    return <span role="img" aria-label="star">⭐</span>;
  };

  return (
    <div
      className="profile-container"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <div className="profile-header">
        <div className="profile-avatar-section">
          {formData.avatar_url ? (
            <img 
              src={formData.avatar_url} 
              alt="Profile" 
              className="profile-avatar"
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <div className="profile-avatar-placeholder" style={{ display: formData.avatar_url ? 'none' : 'flex' }}>
            {(formData.display_name || user.email)?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
        <div className="profile-info">
          <h1>{profile?.display_name || user.email.split('@')[0]}</h1>
          <p className="profile-email">{user.email}</p>
          {profile?.role === 'admin' && <span className="admin-badge">👑 Admin</span>}
        </div>
      </div>
      {/* THEME SWITCHER & SETTINGS SECTION */}
      <div className="profile-settings">
        <h3 style={{marginBottom: 8, color: 'var(--primary)'}}>Theme & Settings</h3>
        <div className="theme-switcher" style={{marginBottom: 12}}>
          <label htmlFor="theme-select" style={{marginRight: 8}}>Choose Theme:</label>
          <select
            id="theme-select"
            value={theme}
            onChange={e => setTheme(e.target.value)}
            style={{padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0'}}
          >
            <option value="default">Default</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="theme-preview" style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <span>Bookmark Icon Preview:</span>
          <BookmarkIcon />
        </div>
      </div>
      {message && (
        <div className={`profile-message ${message.includes('❌') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}
      {!isEditing ? (
        <div className="profile-details">
          <div className="profile-detail-section">
            <h3>📝 Bio</h3>
            <p className="profile-bio">
              {profile?.bio || 'No bio added yet. Click "Edit Profile" to add one!'}
            </p>
          </div>
          <div className="profile-detail-section">
            <h3>📊 Account Info</h3>
            <div className="profile-stats">
              <div className="profile-stat">
                <span className="stat-label">Member Since:</span>
                <span className="stat-value">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}</span>
              </div>
              <div className="profile-stat">
                <span className="stat-label">Account Type:</span>
                <span className="stat-value">{profile?.role === 'admin' ? 'Admin' : 'User'}</span>
              </div>
              <div className="profile-stat">
                <span className="stat-label">Followers:</span>
                <span className="stat-value profile-followers-link" style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }} onClick={() => setShowFollowers(true)}>
                  {typeof profile?.followers_count === 'number' ? profile.followers_count : 0}
                </span>
              </div>
            </div>
          </div>
          {/* Show edit button when viewing your own profile */}
          {user?.id === profile?.id && !isEditing && (
            <div className="profile-actions" style={{ marginTop: 12 }}>
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
            </div>
          )}
          {showFollowers && (
            <div className="followers-modal">
              <div className="followers-modal-content">
                <h2>Followers</h2>
                <button className="close-btn" onClick={() => setShowFollowers(false)}>Close</button>
                {followerProfiles.length === 0 ? (
                  <div>No followers yet.</div>
                ) : (
                  <ul className="followers-list">
                    {followerProfiles.map(fp => (
                      <li key={fp.id} className="follower-item">
                        <img src={fp.avatar_url} alt={fp.display_name} className="follower-avatar" />
                        <span className="follower-name">{fp.display_name || fp.email}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <form className="profile-edit-form" onSubmit={handleSaveProfile}>
          <label htmlFor="display_name">Display Name</label>
          <input
            type="text"
            id="display_name"
            name="display_name"
            value={formData.display_name}
            onChange={handleChange}
            required
          />
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            required
          />
          <label htmlFor="avatar_url">Avatar</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
          />
          <button className="save-btn" type="submit" disabled={loading || uploading}>
            Save Profile
          </button>
          <button className="cancel-btn" type="button" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}

export default Profile
