import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import UserProfile from './UserProfile'
import '../styles/AdminDashboard.css'

function AdminDashboard() {
  const { user, profile, isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    if (isAdmin) {
      fetchAllUsers()
      fetchPendingUsers()
    }
  }, [isAdmin])

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setMessage('❌ Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingUsers = async () => {
    try {
      // Get users who haven't been approved yet (if you add an 'approved' column)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .is('role', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPendingUsers(data || [])
    } catch (err) {
      console.error('Error fetching pending users:', err)
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const selectAllVisible = (visible) => {
    const visibleIds = visible.map(u => u.id)
    const allSelected = visibleIds.every(id => selectedIds.includes(id))
    setSelectedIds(allSelected ? [] : visibleIds)
  }

  const exportSelectedCSV = () => {
    if (!selectedIds.length) return
    const rows = users.filter(u => selectedIds.includes(u.id)).map(u => ({
      name: u.display_name || '',
      email: u.email || '',
      role: u.role || '',
      joined: new Date(u.created_at).toLocaleDateString()
    }))
    const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `selected-users-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const bulkMakeAdmin = async () => {
    if (!selectedIds.length) return
    try {
      setMessage('⏳ Updating roles for selected users...')
      await Promise.all(selectedIds.map(id => updateUserRole(id, 'admin')))
      setSelectedIds([])
      setMessage('✅ Updated roles for selected users')
      fetchAllUsers()
    } catch (err) {
      console.error(err)
      setMessage('❌ Failed to update roles for some users')
    }
  }

  const bulkDeleteUsers = async () => {
    if (!selectedIds.length) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} users? This action cannot be undone.`)) return
    try {
      setMessage('⏳ Deleting selected users...')
      await Promise.all(selectedIds.map(async id => {
        try {
          await supabase.functions.invoke('delete-user', { body: { userId: id } })
        } catch (err) {
          console.error('delete-user error for', id, err)
          // Try fetching server response body for more details
          try {
            const url = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/delete-user`
            // Try to include the logged-in user's access token so the function can verify admin role
            const { data: { session } = {} } = await supabase.auth.getSession()
            const bearer = session?.access_token
            const res = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_KEY,
                'Authorization': bearer ? `Bearer ${bearer}` : `Bearer ${import.meta.env.VITE_SUPABASE_KEY}`
              },
              body: JSON.stringify({ userId: id })
            })
            const text = await res.text()
            console.error('Fallback fetch response:', res.status, text)
          } catch (fetchErr) {
            console.error('Fallback fetch failed', fetchErr)
          }
          throw err
        }
      }))
      setSelectedIds([])
      setMessage('✅ Deleted selected users')
      fetchAllUsers()
      fetchPendingUsers()
    } catch (err) {
      console.error(err)
      setMessage('❌ Failed to delete some users')
    }
  }

  const updateUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      setMessage(`✅ User role updated to ${newRole}`)
      fetchAllUsers()
      fetchPendingUsers()
    } catch (err) {
      console.error('Error updating user role:', err)
      setMessage('❌ Failed to update user role')
    }
  }

  const deleteUser = async (userId, userEmail) => {
    if (!confirm(`Are you sure you want to delete user: ${userEmail}?\n\nThis will permanently delete their account and all associated data (posts, comments).`)) {
      return
    }

    setMessage('⏳ Deleting user from authentication system...')

    try {
      // Call the Edge Function to delete user from auth.users
      // This will cascade to profiles, community, and comments tables
      // Use the SDK invoke and capture errors; if the SDK throws on non-2xx,
      // fall back to a plain fetch to surface the response body for debugging.
      try {
        const { data, error } = await supabase.functions.invoke('delete-user', { body: { userId } })
        if (error) throw error
        setMessage('✅ User completely deleted from system')
        fetchAllUsers()
        fetchPendingUsers()
        return
      } catch (err) {
        console.error('Functions invoke failed:', err)
        // Fallback: call the function endpoint directly to read response text
        try {
          const url = `${import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/delete-user`
          // Include the current user's access token if available so the function can validate admin role
          const { data: { session } = {} } = await supabase.auth.getSession()
          const bearer = session?.access_token
          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_KEY,
              'Authorization': bearer ? `Bearer ${bearer}` : `Bearer ${import.meta.env.VITE_SUPABASE_KEY}`
            },
            body: JSON.stringify({ userId })
          })
          const text = await resp.text()
          console.error('Direct function response', resp.status, text)
          setMessage(`❌ Failed to delete user: ${resp.status} ${text}`)
        } catch (fetchErr) {
          console.error('Fallback fetch failed', fetchErr)
          setMessage('❌ Failed to delete user: unknown error (see console)')
        }
        return
      }
    } catch (err) {
      console.error('Error deleting user:', err)
      setMessage('❌ Failed to delete user: ' + err.message)
    }
  }

  // Only show to admins
  if (!user) {
    return (
      <div className="admin-view">
        <div className="admin-empty">
          <h2>🔐 Access Denied</h2>
          <p>Please login to access this page.</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="admin-view">
        <div className="admin-empty">
          <h2>⛔ Admin Access Only</h2>
          <p>You don't have permission to view this page.</p>
        </div>
      </div>
    )
  }

  const visibleUsers = users.filter(u => {
    if (!query) return true
    const q = query.toLowerCase()
    return (u.display_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <div className="admin-view">
        <div className="admin-loading">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="admin-view">
      <div className="admin-container">
        <div className="admin-header">
          <h1>👑 Admin Dashboard</h1>
          <p>Manage users and permissions</p>
        </div>

        {message && (
          <div className={`admin-message ${message.includes('❌') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        {/* Pending Users Section */}
        {pendingUsers.length > 0 && (
          <div className="admin-section">
            <h2>⏳ Pending Approvals ({pendingUsers.length})</h2>
            <p className="section-description">New signups waiting for approval</p>
            
            <div className="users-grid">
              {pendingUsers.map(pendingUser => (
                <div key={pendingUser.id} className="user-card pending">
                  <div className="user-card-header">
                    <div className="user-avatar-small">
                      {pendingUser.avatar_url ? (
                        <img src={pendingUser.avatar_url} alt="" />
                      ) : (
                        <div className="avatar-placeholder-small">
                          {(pendingUser.display_name || pendingUser.email)?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="user-info">
                      <h3 
                        className="clickable-username"
                        onClick={() => setSelectedUserId(pendingUser.id)}
                        title="View profile"
                      >
                        {pendingUser.display_name || 'No name'}
                      </h3>
                      <p className="user-email-small">{pendingUser.email}</p>
                    </div>
                  </div>
                  
                  <div className="user-details">
                    <span className="user-detail">
                      <strong>Joined:</strong> {new Date(pendingUser.created_at).toLocaleDateString()}
                    </span>
                    <span className="pending-badge">⏳ Pending</span>
                  </div>

                  <div className="user-actions">
                    <button 
                      onClick={() => updateUserRole(pendingUser.id, 'user')}
                      className="approve-btn"
                    >
                      ✅ Approve
                    </button>
                    <button 
                      onClick={() => deleteUser(pendingUser.id, pendingUser.email)}
                      className="reject-btn"
                    >
                      ❌ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Users Section */}
        <div className="admin-section">
          <h2>👥 All Users ({users.length})</h2>
          <p className="section-description">Manage user roles and access</p>
          <div className="admin-filter-bar">
            <input
              className="admin-search-input"
              type="search"
              placeholder="Search users by name or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search users"
            />
          </div>
          {selectedIds.length > 0 && (
            <div className="bulk-toolbar" role="toolbar" aria-label="Bulk actions">
              <div style={{ fontWeight: 600 }}>{selectedIds.length} selected</div>
              <div style={{ flex: 1 }} />
              <button className="action-btn" onClick={exportSelectedCSV} title="Export selected">📁 Export</button>
              <button className="action-btn" onClick={bulkMakeAdmin} title="Make admin">👑 Make Admin</button>
              <button className="action-btn delete" onClick={bulkDeleteUsers} title="Delete selected">🗑️ Delete</button>
            </div>
          )}
          
          {/* Desktop Table View */}
          <div className="users-table">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 46 }}>
                    <input
                      type="checkbox"
                      aria-label="Select all visible users"
                      checked={visibleUsers.length > 0 && visibleUsers.every(u => selectedIds.includes(u.id))}
                      onChange={() => selectAllVisible(visibleUsers)}
                    />
                  </th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map(usr => (
                  <tr key={usr.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select user ${usr.email}`}
                        checked={selectedIds.includes(usr.id)}
                        onChange={() => toggleSelect(usr.id)}
                      />
                    </td>
                    <td>
                      <div className="table-user">
                        {usr.avatar_url ? (
                          <img src={usr.avatar_url} alt="" className="table-avatar" />
                        ) : (
                          <div className="table-avatar-placeholder">
                            {(usr.display_name || usr.email)?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <span 
                          className="clickable-username"
                          onClick={() => setSelectedUserId(usr.id)}
                          title="View profile"
                        >
                          {usr.display_name || 'No name'}
                        </span>
                      </div>
                    </td>
                    <td>{usr.email}</td>
                    <td>
                      {usr.role === 'admin' ? (
                        <span className="role-badge admin">👑 Admin</span>
                      ) : usr.role === 'user' ? (
                        <span className="role-badge user">👤 User</span>
                      ) : (
                        <span className="role-badge pending">⏳ Pending</span>
                      )}
                    </td>
                    <td>{new Date(usr.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="table-actions">
                        {usr.id !== user.id && (
                          <>
                            {usr.role !== 'admin' && (
                              <button
                                onClick={() => updateUserRole(usr.id, 'admin')}
                                className="action-btn promote"
                                title="Make Admin"
                              >
                                👑
                              </button>
                            )}
                            {usr.role === 'admin' && (
                              <button
                                onClick={() => updateUserRole(usr.id, 'user')}
                                className="action-btn demote"
                                title="Remove Admin"
                              >
                                👤
                              </button>
                            )}
                            {!usr.role && (
                              <button
                                onClick={() => updateUserRole(usr.id, 'user')}
                                className="action-btn approve-small"
                                title="Approve User"
                              >
                                ✅
                              </button>
                            )}
                            <button
                              onClick={() => deleteUser(usr.id, usr.email)}
                              className="action-btn delete"
                              title="Delete User"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                        {usr.id === user.id && (
                          <span className="you-label">You</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="users-mobile-cards">
            {visibleUsers.map(usr => (
              <div key={usr.id} className="user-card">
                <div className="user-card-header">
                  <div style={{ marginRight: 8 }}>
                    <input
                      type="checkbox"
                      aria-label={`Select user ${usr.email}`}
                      checked={selectedIds.includes(usr.id)}
                      onChange={() => toggleSelect(usr.id)}
                    />
                  </div>
                  <div className="user-avatar-small">
                    {usr.avatar_url ? (
                      <img src={usr.avatar_url} alt="" />
                    ) : (
                      <div className="avatar-placeholder-small">
                        {(usr.display_name || usr.email)?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="user-info">
                    <h3 
                      className="clickable-username"
                      onClick={() => setSelectedUserId(usr.id)}
                      title="View profile"
                    >
                      {usr.display_name || 'No name'}
                      {usr.id === user.id && <span className="you-label"> (You)</span>}
                    </h3>
                    <p className="user-email-small">{usr.email}</p>
                  </div>
                </div>
                
                <div className="user-details">
                  <span className="user-detail">
                    <strong>Joined:</strong> {new Date(usr.created_at).toLocaleDateString()}
                  </span>
                  {usr.role === 'admin' ? (
                    <span className="role-badge admin">👑 Admin</span>
                  ) : usr.role === 'user' ? (
                    <span className="role-badge user">👤 User</span>
                  ) : (
                    <span className="role-badge pending">⏳ Pending</span>
                  )}
                </div>

                {usr.id !== user.id && (
                  <div className="user-actions">
                    {usr.role !== 'admin' && (
                      <button
                        onClick={() => updateUserRole(usr.id, 'admin')}
                        className="approve-btn"
                      >
                        👑 Make Admin
                      </button>
                    )}
                    {usr.role === 'admin' && (
                      <button
                        onClick={() => updateUserRole(usr.id, 'user')}
                        className="approve-btn"
                      >
                        👤 Remove Admin
                      </button>
                    )}
                    {!usr.role && (
                      <button
                        onClick={() => updateUserRole(usr.id, 'user')}
                        className="approve-btn"
                      >
                        ✅ Approve User
                      </button>
                    )}
                    <button
                      onClick={() => deleteUser(usr.id, usr.email)}
                      className="reject-btn"
                    >
                      🗑️ Delete User
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-number">{users.length}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{users.filter(u => u.role === 'admin').length}</div>
            <div className="stat-label">Admins</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{users.filter(u => u.role === 'user').length}</div>
            <div className="stat-label">Active Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{pendingUsers.length}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
      </div>

      {/* USER PROFILE MODAL */}
      {selectedUserId && (
        <UserProfile 
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  )
}

export default AdminDashboard
