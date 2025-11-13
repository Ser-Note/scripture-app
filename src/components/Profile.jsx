import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

function Profile() {
  const { user, profile, fetchProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    avatar_url: ''
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || ''
      })
    }
  }, [profile])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('❌ Please upload an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage('❌ Image must be less than 2MB')
      return
    }

    setUploading(true)
    setMessage('')

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath)

      // Update form data with new URL
      setFormData({
        ...formData,
        avatar_url: publicUrl
      })

      setMessage('✅ Image uploaded successfully!')
    } catch (err) {
      console.error('Error uploading image:', err)
      setMessage('❌ Failed to upload image: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name.trim(),
          bio: formData.bio.trim(),
          avatar_url: formData.avatar_url.trim()
        })
        .eq('id', user.id)

      if (error) throw error

      setMessage('✅ Profile updated successfully!')
      setIsEditing(false)
      
      // Refresh profile data in context
      if (fetchProfile) {
        await fetchProfile(user.id)
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      setMessage('❌ Failed to update profile: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setMessage('')
    // Reset form to current profile data
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || ''
      })
    }
  }

  if (!user) {
    return (
      <div className="profile-view">
        <div className="profile-empty">
          <h2>🔐 Please Login</h2>
          <p>You need to be logged in to view your profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-view">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar-section">
            {formData.avatar_url ? (
              <img 
                src={formData.avatar_url} 
                alt="Profile" 
                className="profile-avatar"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
            ) : null}
            <div 
              className="profile-avatar-placeholder"
              style={{ display: formData.avatar_url ? 'none' : 'flex' }}
            >
              {(formData.display_name || user.email)?.[0]?.toUpperCase() || '?'}
            </div>
          </div>
          
          <div className="profile-info">
            <h1>{profile?.display_name || user.email.split('@')[0]}</h1>
            <p className="profile-email">{user.email}</p>
            {profile?.role === 'admin' && (
              <span className="admin-badge">👑 Admin</span>
            )}
          </div>
        </div>

        {message && (
          <div className={`profile-message ${message.includes('❌') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        {!isEditing ? (
          // VIEW MODE
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
                  <span className="stat-value">
                    {new Date(profile?.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="profile-stat">
                  <span className="stat-label">Account Type:</span>
                  <span className="stat-value">
                    {profile?.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsEditing(true)} 
              className="edit-profile-btn"
            >
              ✏️ Edit Profile
            </button>
          </div>
        ) : (
          // EDIT MODE
          <form onSubmit={handleSubmit} className="profile-edit-form">
            <div className="form-group">
              <label htmlFor="display_name">Display Name</label>
              <input
                type="text"
                id="display_name"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
                placeholder="Your name"
                maxLength={50}
                required
              />
              <small>{formData.display_name.length}/50 characters</small>
            </div>

            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself..."
                rows={4}
                maxLength={500}
              />
              <small>{formData.bio.length}/500 characters</small>
            </div>

            <div className="form-group">
              <label htmlFor="avatar_url">Profile Picture</label>
              
              <div className="avatar-upload-section">
                <input
                  type="file"
                  id="avatar_upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <label htmlFor="avatar_upload" className="upload-btn">
                  {uploading ? '⏳ Uploading...' : '📤 Upload Image'}
                </label>
                <span className="upload-hint">JPG, PNG, or GIF (max 2MB)</span>
              </div>

              <div className="divider">
                <span>OR</span>
              </div>

              <input
                type="url"
                id="avatar_url"
                name="avatar_url"
                value={formData.avatar_url}
                onChange={handleChange}
                placeholder="https://example.com/avatar.jpg"
                disabled={uploading}
              />
              <small>Enter a URL to an image for your profile picture</small>
            </div>

            <div className="profile-edit-actions">
              <button 
                type="button" 
                onClick={handleCancel} 
                className="cancel-btn"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="save-btn"
                disabled={loading}
              >
                {loading ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default Profile
