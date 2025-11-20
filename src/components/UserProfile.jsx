import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useFollow } from '../contexts/FollowContext'
import '../styles/UserProfile.css'

function UserProfile({ userId, onClose }) {
  const { user: currentUser } = useAuth()
  const { following, followUser, unfollowUser, loading: followLoading } = useFollow()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState([])
  const [comments, setComments] = useState([])

  useEffect(() => {
    fetchUserProfile()
    fetchUserActivity()
  }, [userId])

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserActivity = async () => {
    try {
      // Fetch user's posts
      const { data: postsData } = await supabase
        .from('community')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      // Fetch user's comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, community(content)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      setPosts(postsData || [])
      setComments(commentsData || [])
    } catch (err) {
      console.error('Error fetching activity:', err)
    }
  }

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="user-profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="loading-state">Loading profile...</div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="user-profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="error-state">User not found</div>
        </div>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === userId
  const isFollowing = following.includes(userId)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="user-profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>
        <div className="user-profile-header">
          <div className="user-profile-avatar-large">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} />
            ) : (
              <div className="avatar-placeholder-large">
                {(profile.display_name || profile.email)?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <h2>{profile.display_name || 'Anonymous User'}</h2>
          {profile.role === 'admin' && (
            <span className="role-badge admin">👑 Admin</span>
          )}
          <div className="profile-social-links" style={{ marginTop: 12 }}>
            {profile.twitter && (
              <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer" className="social-badge twitter">🐦 Twitter</a>
            )}
            {profile.github && (
              <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer" className="social-badge github">💻 GitHub</a>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="social-badge website">🌐 Website</a>
            )}
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value" title="Posts">📝 {posts.length}</span>
              <span className="stat-label">Posts</span>
            </div>
            <div className="stat-item">
              <span className="stat-value" title="Comments">💬 {comments.length}</span>
              <span className="stat-label">Comments</span>
            </div>
            <div className="stat-item">
              <span className="stat-value" title="Followers">👥 {profile.followers_count ?? 0}</span>
              <span className="stat-label">Followers</span>
            </div>
          </div>
          {isOwnProfile && <p className="own-profile-note">This is you!</p>}
          {/* Follow/Unfollow button */}
          {!isOwnProfile && (
            <button
              className="follow-btn"
              disabled={followLoading}
              onClick={() => isFollowing ? unfollowUser(userId) : followUser(userId)}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
        </div>

        <div className="user-profile-content">
          <div className="user-profile-section">
            <h3>📝 Bio</h3>
            <p>{profile.bio || 'No bio added yet.'}</p>
          </div>

          <div className="user-profile-section">
            <h3>📊 Joined</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">
                  {new Date(profile.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </span>
                <span className="stat-label">Joined</span>
              </div>
            </div>
          </div>

          {posts.length > 0 && (
            <div className="user-profile-section">
              <h3>📄 Recent Posts</h3>
              <div className="activity-list">
                {posts.map(post => (
                  <div key={post.id} className="activity-item">
                    <span className="activity-category">{post.category}</span>
                    <p className="activity-content">{post.content.substring(0, 100)}...</p>
                    <span className="activity-date">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {comments.length > 0 && (
            <div className="user-profile-section">
              <h3>💬 Recent Comments</h3>
              <div className="activity-list">
                {comments.map(comment => (
                  <div key={comment.id} className="activity-item">
                    <p className="activity-content">{comment.content.substring(0, 100)}...</p>
                    <span className="activity-date">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserProfile
