import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import UserProfile from './UserProfile'

function AdminDashboard() {
  const { user, profile, isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(null)

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
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      })

      if (error) throw error

      setMessage('✅ User completely deleted from system')
      fetchAllUsers()
      fetchPendingUsers()
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
          
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(usr => (
                  <tr key={usr.id}>
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
