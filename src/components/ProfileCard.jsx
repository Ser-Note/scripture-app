import React from 'react'
import '../styles/ProfileCard.css'

export default function ProfileCard({ profile, isFollowing, onFollowToggle, onView, onPreview }) {
  const name = profile.display_name || (profile.email || '').split('@')[0]
  const followers = profile.followers_count ?? 0

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') onView()
  }

  return (
    <div
      className="profile-card"
      role="button"
      tabIndex={0}
      onKeyDown={handleKey}
      onClick={() => onView()}
    >
      <div className="profile-card-avatar-wrap">
        <div className="profile-card-avatar">
          {profile.avatar_url ? (
            <img loading="lazy" src={profile.avatar_url} alt={name} />
          ) : (
            <div className="profile-card-avatar-fallback">{name?.[0]?.toUpperCase() || '?'}</div>
          )}
        </div>
        {/* Small caption under avatar for grid cards to help identify users */}
        <div className="profile-card-avatar-name" aria-hidden="true">{name}</div>
      </div>

      <div className="profile-card-content">
        <div className="profile-card-title">
          <div className="profile-card-name">{name}</div>
          <div className="profile-card-followers" title={`${followers} followers`}>👥 {followers}</div>
        </div>

        <div className="profile-card-bio">{profile.bio ? (profile.bio.length > 96 ? profile.bio.slice(0, 96) + '…' : profile.bio) : ''}</div>

        <div className="profile-card-actions">
          <button
            className="action-btn"
            onClick={(e) => { e.stopPropagation(); onView() }}
            aria-label={`View ${name}`}
          >
            View
          </button>

          <button
            className={`follow-btn small ${isFollowing ? 'following' : ''}`}
            onClick={(e) => { e.stopPropagation(); onFollowToggle(profile.id, !isFollowing) }}
            aria-pressed={isFollowing}
            aria-label={isFollowing ? `Unfollow ${name}` : `Follow ${name}`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>

          <button
            className="preview-btn"
            onClick={(e) => { e.stopPropagation(); onPreview(profile) }}
            aria-label={`Quick preview ${name}`}
            title="Quick preview"
          >
            ℹ️
          </button>
        </div>
      </div>
    </div>
  )
}
