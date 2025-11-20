import React from 'react'
import '../styles/QuickPreview.css'

export default function QuickPreview({ profile, onClose, onFollowToggle, isFollowing, onOpen }) {
  if (!profile) return null
  const name = profile.display_name || (profile.email || '').split('@')[0]

  return (
    <div className="quick-preview-backdrop" role="dialog" aria-modal="true">
      <div className="quick-preview">
        <div className="quick-preview-header">
          <div className="quick-preview-title">{name}</div>
          <button className="quick-preview-close" onClick={onClose} aria-label="Close preview">✕</button>
        </div>

        <div className="quick-preview-body">
          <div className="quick-preview-avatar">
            {profile.avatar_url ? (
              <img loading="lazy" src={profile.avatar_url} alt={name} />
            ) : (
              <div style={{ fontWeight: 700, fontSize: 28 }}>{name?.[0]?.toUpperCase()}</div>
            )}
          </div>

          <div className="quick-preview-meta">
            <div className="quick-preview-bio">{profile.bio || 'No bio yet.'}</div>
            <div className="quick-preview-followers">👥 {profile.followers_count ?? 0}</div>

            <div className="quick-preview-actions">
              <button className="follow" onClick={() => onFollowToggle(profile.id, !isFollowing)} aria-pressed={isFollowing}>{isFollowing ? 'Following' : 'Follow'}</button>
              <button className="open" onClick={() => { onClose && onClose(); if (onOpen) onOpen(profile.id); }}>Open profile</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
