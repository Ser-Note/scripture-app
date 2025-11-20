import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import UserProfile from './UserProfile'
import QuickPreview from './QuickPreview'
import useDebounce from '../hooks/useDebounce'
import ProfileCard from './ProfileCard'
import { useFollow } from '../contexts/FollowContext'
import { FixedSizeList } from 'react-window'
import '../styles/Profiles.css'

export default function Profiles() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [previewProfile, setPreviewProfile] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // grid or list
  const [sort, setSort] = useState('name_asc')
  const [hasAvatar, setHasAvatar] = useState(false)
  const [hasBio, setHasBio] = useState(false)

  const { following: ctxFollowing, followUser, unfollowUser, loading: followLoading, refreshFollowing } = useFollow()
  const [localFollowing, setLocalFollowing] = useState([])

  useEffect(() => {
    setLocalFollowing(ctxFollowing || [])
  }, [ctxFollowing])

  // Ensure follow state is fresh when this view mounts (helps when navigating back)
  useEffect(() => {
    try { refreshFollowing && refreshFollowing() } catch (e) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // when search or filters change reset to first page
    setPage(1)
    setProfiles([])
    fetchProfiles({ page: 1, append: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sort, hasAvatar, hasBio])

  useEffect(() => {
    fetchProfiles({ page, append: page > 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const fetchProfiles = async ({ page: p = page, append = false } = {}) => {
    setLoading(true)
    try {
      const query = supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url, followers_count, bio', { count: 'exact' })
      
      // apply sorting
      switch (sort) {
        case 'name_asc':
          query.order('display_name', { ascending: true }); break
        case 'name_desc':
          query.order('display_name', { ascending: false }); break
        case 'followers_desc':
          query.order('followers_count', { ascending: false }); break
        case 'followers_asc':
          query.order('followers_count', { ascending: true }); break
        default:
          query.order('display_name', { ascending: true });
      }

      if (debouncedSearch && debouncedSearch.trim().length > 0) {
        const term = `%${debouncedSearch}%`
        query.ilike('display_name', term).or(`email.ilike.${term}`)
      }

      if (hasAvatar) query.not('avatar_url', 'is', null)
      if (hasBio) query.not('bio', 'is', null)

      query.range((p - 1) * pageSize, p * pageSize - 1)

      const { data, error, count } = await query
      if (error) throw error
      setProfiles(prev => append ? [...prev, ...(data || [])] : (data || []))
      if (count !== null) setTotal(count)
    } catch (err) {
      console.error('Error fetching profiles', err)
    } finally {
      setLoading(false)
    }
  }

  const next = () => {
    if (total === null) return
    if (page * pageSize < total) setPage(p => p + 1)
  }
  const prev = () => { if (page > 1) setPage(p => p - 1) }

  const onView = (id) => setSelectedUserId(id)

  const onPreview = (profile) => setPreviewProfile(profile)

  // In-flight guard and announce helper live on `window` so they persist across
  // component unmounts and re-renders. This avoids re-creating a Map on every render.
  if (typeof window.__profilesInFlight === 'undefined') window.__profilesInFlight = new Map()

  const onFollowToggle = async (targetId, shouldFollow) => {
    const inFlight = window.__profilesInFlight

    const announce = (message) => {
      try {
        const el = document.getElementById('profiles-announce')
        if (el) el.innerText = message
      } catch (e) {
        // noop
      }
    }

    // Prevent concurrent requests for same target
    if (inFlight.has(targetId)) {
      return
    }

    const wasFollowing = localFollowing.includes(targetId)

    // Snapshot previous profile state for safe rollback
    const prevProfiles = profiles
    const prevProfile = prevProfiles.find(p => p.id === targetId)
    const prevFollowersCount = prevProfile ? (prevProfile.followers_count ?? 0) : 0

    // Optimistic local updates
    setLocalFollowing(prev => shouldFollow ? Array.from(new Set([...prev, targetId])) : prev.filter(id => id !== targetId))

    setProfiles(prev => prev.map(p => {
      if (p.id !== targetId) return p
      const current = p.followers_count ?? 0
      return { ...p, followers_count: shouldFollow ? current + 1 : Math.max(current - 1, 0) }
    }))

    // mark in-flight
    const inflightObj = {}
    inFlight.set(targetId, inflightObj)

    try {
      // Call a single RPC that performs follow/unfollow and returns canonical count
      // RPC signature expected: rpc_toggle_follow(target_id uuid, follow boolean) -> { followers_count int }
      const { data, error } = await supabase.rpc('rpc_toggle_follow', { target_id: targetId, follow: shouldFollow })

      if (error) throw error

      // RPC should return canonical followers_count; if available, use it
      if (data && typeof data[0]?.followers_count === 'number') {
        const canonicalCount = data[0].followers_count
        setProfiles(prev => prev.map(p => p.id === targetId ? { ...p, followers_count: canonicalCount } : p))
      } else if (data && typeof data.followers_count === 'number') {
        const canonicalCount = data.followers_count
        setProfiles(prev => prev.map(p => p.id === targetId ? { ...p, followers_count: canonicalCount } : p))
      } else {
        // As a fallback, fetch exact count from follows table (less ideal but safe)
        const { data: _, error: cntErr, count } = await supabase
          .from('follows')
          .select('follower_id', { count: 'exact' })
          .eq('followed_id', targetId)

        if (!cntErr && typeof count === 'number') {
          setProfiles(prev => prev.map(p => p.id === targetId ? { ...p, followers_count: count } : p))
        } else {
          // fallback to fetching profile row
          const { data: refreshedProfile, error: pErr } = await supabase
            .from('profiles')
            .select('id, followers_count')
            .eq('id', targetId)
            .single()

          if (!pErr && refreshedProfile) {
            setProfiles(prev => prev.map(p => p.id === targetId ? { ...p, followers_count: refreshedProfile.followers_count ?? 0 } : p))
          } else {
            // If all else fails, keep optimistic value (already set)
            console.debug('Could not refresh follower count; keeping optimistic value')
          }
        }
      }

      // announce success
      announce(shouldFollow ? 'Followed user' : 'Unfollowed user')

      // instrumentation
      try { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: 'follow_toggle', userId: targetId, follow: shouldFollow }); } catch (e) { console.log('analytics', { targetId, shouldFollow }) }

    } catch (err) {
      // rollback to snapshot
      setLocalFollowing(prev => {
        const wasMember = wasFollowing
        return wasMember ? Array.from(new Set([...prev, targetId])) : prev.filter(id => id !== targetId)
      })

      setProfiles(prev => prev.map(p => p.id === targetId ? { ...p, followers_count: prevFollowersCount } : p))

      console.error('Follow toggle failed', err)
      announce('Follow action failed')
    } finally {
      inFlight.delete(targetId)
    }
  }

  // intersection observer for infinite scroll
  useEffect(() => {
    const sentinel = document.getElementById('profiles-sentinel')
    if (!sentinel) return
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          // load next page
          if (total === null || page * pageSize < total) {
            setPage(p => p + 1)
          }
        }
      })
    }, { rootMargin: '300px' })
    obs.observe(sentinel)
    return () => obs.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, page, pageSize])

  return (
    <div className="profiles-view">
      <div className="profiles-header">
        <h2 className="profiles-title">All Profiles</h2>

        <div className="profiles-controls">
          <input
            aria-label="Search profiles"
            type="search"
            placeholder="Search by name or email"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="search-input"
          />

          <label className="profiles-sort">
            <span className="sort-label">Sort</span>
            <select value={sort} onChange={e => setSort(e.target.value)}>
              <option value="name_asc">Name ↑</option>
              <option value="name_desc">Name ↓</option>
              <option value="followers_desc">Most followers</option>
              <option value="followers_asc">Fewest followers</option>
            </select>
          </label>

          <label className="profiles-filter"><input type="checkbox" checked={hasAvatar} onChange={e => setHasAvatar(e.target.checked)} /> <span>Has avatar</span></label>
          <label className="profiles-filter"><input type="checkbox" checked={hasBio} onChange={e => setHasBio(e.target.checked)} /> <span>Has bio</span></label>

          <div className="view-toggle" role="tablist" aria-label="View mode">
            <button className={`mode-btn ${viewMode === 'grid' ? 'active' : ''}`} aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')} title="Grid view">▦</button>
            <button className={`mode-btn ${viewMode === 'list' ? 'active' : ''}`} aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')} title="List view">☰</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={viewMode === 'grid' ? 'profiles-grid profiles-loading' : 'profiles-list profiles-loading'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="profile-skeleton">
              <div className="skeleton-avatar" />
              <div className="skeleton-lines">
                <div className="skeleton-line short" />
                <div className="skeleton-line long" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {profiles.length === 0 ? (
            <div className="no-results">No profiles found. Try a different search or invite people.</div>
          ) : (
            <div>
              {viewMode === 'list' ? (
                <div className="profiles-list-virtual">
                  <FixedSizeList
                    height={Math.min(600, profiles.length * 120)}
                    itemCount={profiles.length}
                    itemSize={120}
                    width={'100%'}
                  >
                    {({ index, style }) => {
                      const p = profiles[index]
                      return (
                        <div style={style} key={p.id}>
                          <ProfileCard
                            profile={p}
                            isFollowing={localFollowing.includes(p.id)}
                            onFollowToggle={onFollowToggle}
                            onView={() => onView(p.id)}
                            onPreview={onPreview}
                          />
                        </div>
                      )
                    }}
                  </FixedSizeList>
                </div>
              ) : (
                <div className="profiles-grid">
                  {profiles.map(p => (
                    <ProfileCard
                      key={p.id}
                      profile={p}
                      isFollowing={localFollowing.includes(p.id)}
                      onFollowToggle={onFollowToggle}
                      onView={() => onView(p.id)}
                      onPreview={onPreview}
                    />
                  ))}
                </div>
              )}

              <div id="profiles-sentinel" style={{ height: 1 }} />
            </div>
          )}

          <div className="profiles-footer">
            <div className="profiles-paging">
              Page {page}{total !== null ? ` — ${Math.min((page - 1) * pageSize + 1, total)}-${Math.min(page * pageSize, total)} of ${total}` : ''}
            </div>
            <div className="profiles-paging-controls">
              <button className="prev-btn" onClick={prev} disabled={page === 1}>Previous</button>
              <button className="next-btn" onClick={next} disabled={total !== null && page * pageSize >= total}>Next</button>
            </div>
          </div>
        </>
      )}

      {selectedUserId && (
        <UserProfile userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}

      {previewProfile && (
        <QuickPreview
          profile={previewProfile}
          onClose={() => setPreviewProfile(null)}
          onOpen={(id) => { setSelectedUserId(id); setPreviewProfile(null); }}
          onFollowToggle={onFollowToggle}
          isFollowing={localFollowing.includes(previewProfile.id)}
        />
      )}

      <div aria-live="polite" role="status" id="profiles-announce" style={{ position: 'absolute', opacity: 0, height: 0, overflow: 'hidden' }} />
    </div>
  )
}
