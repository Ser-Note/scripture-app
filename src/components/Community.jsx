import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import UserProfile from './UserProfile'

function CommunityView() {
    const { user, profile, isAdmin } = useAuth()
    const [submissions, setSubmissions] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    
    // FORM STATE: Store new post data
    const [newPost, setNewPost] = useState({
      content: '',
      category: 'Prayer'  // Default category
    })
    
    // SEARCH STATE: Store search term
    const [searchTerm, setSearchTerm] = useState('')
    
    // FILTER STATE: Store active category filter
    const [activeCategory, setActiveCategory] = useState('All')
    
    // CATEGORIES: List of available post categories
    const categories = ['All', 'Prayer', 'Testimony', 'Question', 'Praise', 'Study']
    
    // EDIT STATE: Track which post is being edited
    const [editingId, setEditingId] = useState(null)
    const [editContent, setEditContent] = useState('')
    
    // COMMENTS STATE: Track comments for each post
    const [comments, setComments] = useState({})  // Object: { postId: [comments] }
    const [newComment, setNewComment] = useState({})  // Object: { postId: 'comment text' }
    const [showComments, setShowComments] = useState({})  // Object: { postId: true/false }
    
    // CATEGORY INFO: Descriptions for each category
    const categoryInfo = {
      'Prayer': 'Share prayer requests - things you need help with or situations needing prayer',
      'Testimony': 'Share how God has worked in your life - healings, provisions, answered prayers',
      'Question': 'Ask questions about faith, Bible verses, or spiritual matters',
      'Praise': 'Give thanks and praise to God for His goodness and blessings',
      'Study': 'Share Bible study insights, scripture reflections, or theological discussions'
    }
    
    // TOOLTIP STATE: Show/hide category info
    const [showCategoryInfo, setShowCategoryInfo] = useState(false)
    
    // WELCOME MODAL STATE: Show welcome message on first visit
    const [showWelcomeModal, setShowWelcomeModal] = useState(false)
    
    // USER PROFILE MODAL STATE: Show user profile when clicking on names
    const [selectedUserId, setSelectedUserId] = useState(null)
    
    // CHECK: Show welcome modal on mount (unless user disabled it)
    useEffect(() => {
      const hasSeenWelcome = localStorage.getItem('communityWelcomeSeen')
      if (!hasSeenWelcome) {
        setShowWelcomeModal(true)
      }
    }, [])

    const fetchSubmissions = async () => {
        setLoading(true)
        try {
            // START: Build the query
            let query = supabase
                .from('community')
                .select('*')
                .order('created_at', { ascending: false })
            
            // FILTER: Add category filter if not "All"
            if (activeCategory !== 'All') {
              query = query.eq('category', activeCategory)
            }
            
            // FILTER: Add search filter if search term exists
            if (searchTerm.trim()) {
              // ilike = case-insensitive search, %term% = contains term
              query = query.ilike('content', `%${searchTerm}%`)
            }
            
            // EXECUTE: Run the query
            const { data, error } = await query

            if (error) throw error

            setSubmissions(data)
        } catch (err) {
            console.error('Error fetching submissions:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // RE-FETCH when search or filter changes
    useEffect(() => {
        fetchSubmissions()
    }, [searchTerm, activeCategory])  // Dependencies: re-run when these change

    // Updated addSubmission with user_id
    const addSubmission = async (newData) => {
      if (!user) {
        alert('Please login to post')
        return
      }

      try {
        const { data, error } = await supabase
          .from('community')
          .insert([
            {
              author: profile?.display_name || user.email.split('@')[0],
              content: newData.content,
              category: newData.category,
              user_id: user.id
            }
          ])
          .select()

        if (error) throw error
        
        // SUCCESS: Clear form and refresh posts
        setNewPost({ content: '', category: 'Prayer' })
        fetchSubmissions()
      } catch (err) {
        console.error('Error adding submission:', err)
        alert('Failed to create post')
      }
    }
    
    // HANDLER: Submit new post form
    const handleSubmitPost = (e) => {
      e.preventDefault()  // Prevent page reload
      
      // VALIDATION: Check if content is not empty
      if (!newPost.content.trim()) {
        alert('Please write something before posting')
        return
      }
      
      // Call the add function
      addSubmission(newPost)
    }

    // Only allow delete if user owns the post OR is admin
    const deleteSubmission = async (id, postUserId) => {
      if (!user) return
      
      // Check if user owns this post
      if (user.id !== postUserId && !isAdmin) {
        alert("You can't delete this post")
        return
      }

      try {
        const { error } = await supabase
          .from('community')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        fetchSubmissions()
      } catch (err) {
        console.error('Error deleting:', err)
      }
    }
    
    // EDIT: Start editing a post
    const startEdit = (post) => {
      setEditingId(post.id)
      setEditContent(post.content)
    }
    
    // EDIT: Cancel editing
    const cancelEdit = () => {
      setEditingId(null)
      setEditContent('')
    }
    
    // EDIT: Save edited post
    const saveEdit = async (id) => {
      if (!editContent.trim()) {
        alert('Post cannot be empty')
        return
      }
      
      try {
        const { error } = await supabase
          .from('community')
          .update({ content: editContent })
          .eq('id', id)
        
        if (error) throw error
        
        // SUCCESS: Clear edit state and refresh
        cancelEdit()
        fetchSubmissions()
      } catch (err) {
        console.error('Error updating post:', err)
        alert('Failed to update post')
      }
    }
    
    // COMMENTS: Fetch comments for a specific post
    const fetchComments = async (postId) => {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true })
        
        if (error) throw error
        
        // Store comments in state using postId as key
        setComments(prev => ({ ...prev, [postId]: data }))
      } catch (err) {
        console.error('Error fetching comments:', err)
      }
    }
    
    // COMMENTS: Toggle show/hide comments for a post
    const toggleComments = async (postId) => {
      const isCurrentlyShowing = showComments[postId]
      
      // Toggle the visibility
      setShowComments(prev => ({ ...prev, [postId]: !isCurrentlyShowing }))
      
      // Fetch comments if we're showing them and haven't fetched yet
      if (!isCurrentlyShowing && !comments[postId]) {
        await fetchComments(postId)
      }
    }
    
    // COMMENTS: Add a new comment
    const addComment = async (postId) => {
      if (!user) {
        alert('Please login to comment')
        return
      }
      
      const commentText = newComment[postId]?.trim()
      if (!commentText) {
        alert('Comment cannot be empty')
        return
      }
      
      try {
        const { error } = await supabase
          .from('comments')
          .insert([
            {
              post_id: postId,
              user_id: user.id,
              author_name: profile?.display_name || user.email.split('@')[0],
              content: commentText
            }
          ])
        
        if (error) throw error
        
        // Clear input and refresh comments
        setNewComment(prev => ({ ...prev, [postId]: '' }))
        await fetchComments(postId)
      } catch (err) {
        console.error('Error adding comment:', err)
        alert('Failed to add comment')
      }
    }
    
    // COMMENTS: Delete a comment
    const deleteComment = async (commentId, postId, commentUserId) => {
      if (!user) return
      
      // Check ownership or admin
      if (user.id !== commentUserId && !isAdmin) {
        alert("You can't delete this comment")
        return
      }
      
      try {
        const { error } = await supabase
          .from('comments')
          .delete()
          .eq('id', commentId)
        
        if (error) throw error
        
        // Refresh comments for this post
        await fetchComments(postId)
      } catch (err) {
        console.error('Error deleting comment:', err)
        alert('Failed to delete comment')
      }
    }
    
    // WELCOME MODAL: Close and optionally save preference
    const closeWelcomeModal = (dontShowAgain) => {
      setShowWelcomeModal(false)
      if (dontShowAgain) {
        localStorage.setItem('communityWelcomeSeen', 'true')
      }
    }

  if (loading) return <div className="community-loading">Loading community posts...</div>
  if (error) return <div className="community-error">Error: {error}</div>

  return (
    <div className="community-container">
      {/* WELCOME MODAL - Shows on first visit */}
      {showWelcomeModal && (
        <div className="modal-overlay" onClick={() => closeWelcomeModal(false)}>
          <div className="modal-content welcome-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => closeWelcomeModal(false)}>×</button>
            
            <div className="welcome-modal-content">
              <h2>📖 Welcome to Community</h2>
              
              {/* YOUR CUSTOM MESSAGE GOES HERE */}
              <div className="welcome-message">
                <p>
                  {/* Replace this with your own message */}
                  This is a space for believers, those new and old to the faith and those learning, to share, encourage, and pray for one another. We do not discriminate on Denomination, but are here to encourage, support, and teach one another.
                </p>
                
                <h3>Guidelines:</h3>
                <ul>
                  <li>Be respectful and kind to all members</li>
                  <li>Share authentically and encourage others</li>
                  <li>Keep discussions focused on faith and spiritual growth</li>
                  <li>Pray for and support your brothers and sisters</li>
                </ul>
                
                <p>
                  {/* Add more of your content here */}
                  Let's build each other up in love and truth! 💙
                </p>
              </div>
              
              <div className="welcome-modal-actions">
                <button 
                  onClick={() => closeWelcomeModal(true)}
                  className="dont-show-btn"
                >
                  Don't show this again
                </button>
                <button 
                  onClick={() => closeWelcomeModal(false)}
                  className="got-it-btn"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <h2>📖 Community</h2>
      
      {/* USER INFO / LOGIN PROMPT */}
      {!user ? (
        <div className="login-prompt">
          💡 Please login to create and interact with posts
        </div>
      ) : (
        <div className="user-info">
          Logged in as: <strong>{profile?.display_name || user.email}</strong>
          {isAdmin && <span className="admin-badge">👑 Admin</span>}
        </div>
      )}
      
      {/* CREATE POST FORM - Only show if user is logged in */}
      {user && (
        <form onSubmit={handleSubmitPost} className="create-post-form">
          <h3>✍️ Create a Post</h3>
          
          {/* CATEGORY SELECT - Dropdown to choose category */}
          <div className="category-select-wrapper">
            <label htmlFor="category">
              Category
              <button
                type="button"
                className="category-help-btn"
                onClick={() => setShowCategoryInfo(!showCategoryInfo)}
                title="Click to see what each category means"
              >
                ❓
              </button>
            </label>
            
            {/* CATEGORY INFO TOOLTIP */}
            {showCategoryInfo && (
              <div className="category-info-box">
                <h4>Category Meanings:</h4>
                {Object.entries(categoryInfo).map(([cat, desc]) => (
                  <div key={cat} className="category-info-item">
                    <strong>{cat}:</strong> {desc}
                  </div>
                ))}
              </div>
            )}
            
            <select
              id="category"
              value={newPost.category}
              onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
              className="category-select"
            >
              {categories.filter(cat => cat !== 'All').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          {/* CONTENT TEXTAREA - User types their post here */}
          <textarea
            placeholder="Share your prayer request, testimony, question, or praise..."
            value={newPost.content}
            onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
            className="post-textarea"
            rows="4"
          />
          
          {/* SUBMIT BUTTON */}
          <button type="submit" className="submit-post-btn">
            📮 Post to Community
          </button>
        </form>
      )}
      
      {/* SEARCH BAR */}
      <div className="search-section">
        <input
          type="text"
          placeholder="🔍 Search posts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="clear-search-btn">
            ✕ Clear
          </button>
        )}
      </div>
      
      {/* CATEGORY FILTER TABS */}
      <div className="category-filters">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>
      
      {/* EMPTY STATE - Show when no posts match filters */}
      {submissions.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No posts yet</h3>
          <p>
            {searchTerm
              ? `No posts found matching "${searchTerm}"`
              : activeCategory !== 'All'
              ? `No posts in ${activeCategory} category yet`
              : 'Be the first to share something with the community!'}
          </p>
        </div>
      )}
      
      {/* SUBMISSIONS LIST */}
      <div className="submissions-list">
        {submissions.map(sub => (
          <div key={sub.id} className="submission-card">
            <div className="submission-header">
              <div>
                <h3 
                  className="clickable-username"
                  onClick={() => setSelectedUserId(sub.user_id)}
                  title="View profile"
                >
                  {sub.author}
                </h3>
                <span className="category-tag">{sub.category}</span>
              </div>
              <span className="timestamp">
                {new Date(sub.created_at).toLocaleDateString()}
              </span>
            </div>
            
            {/* EDIT MODE: Show textarea if editing this post */}
            {editingId === sub.id ? (
              <div className="edit-mode">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="edit-textarea"
                  rows="3"
                />
                <div className="edit-actions">
                  <button onClick={() => saveEdit(sub.id)} className="save-btn">
                    ✓ Save
                  </button>
                  <button onClick={cancelEdit} className="cancel-btn">
                    ✕ Cancel
                  </button>
                </div>
              </div>
            ) : (
              // VIEW MODE: Show content normally
              <p className="post-content">{sub.content}</p>
            )}
            
            {/* COMMENTS SECTION */}
            <div className="comments-section">
              {/* TOGGLE COMMENTS BUTTON */}
              <button 
                onClick={() => toggleComments(sub.id)}
                className="toggle-comments-btn"
              >
                💬 {showComments[sub.id] ? 'Hide' : 'Show'} Comments 
                ({comments[sub.id]?.length || 0})
              </button>
              
              {/* COMMENTS LIST - Only show if toggled on */}
              {showComments[sub.id] && (
                <div className="comments-list">
                  {/* ADD COMMENT FORM - Only if logged in */}
                  {user && (
                    <div className="add-comment-form">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={newComment[sub.id] || ''}
                        onChange={(e) => setNewComment(prev => ({
                          ...prev,
                          [sub.id]: e.target.value
                        }))}
                        className="comment-input"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addComment(sub.id)
                          }
                        }}
                      />
                      <button 
                        onClick={() => addComment(sub.id)}
                        className="add-comment-btn"
                      >
                        💬 Send
                      </button>
                    </div>
                  )}
                  
                  {/* EXISTING COMMENTS */}
                  {comments[sub.id]?.length > 0 ? (
                    comments[sub.id].map(comment => (
                      <div key={comment.id} className="comment-card">
                        <div className="comment-header">
                          <strong 
                            className="clickable-username"
                            onClick={() => setSelectedUserId(comment.user_id)}
                            title="View profile"
                          >
                            {comment.author_name}
                          </strong>
                          <span className="comment-time">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="comment-content">{comment.content}</p>
                        {(user?.id === comment.user_id || isAdmin) && (
                          <button
                            onClick={() => deleteComment(comment.id, sub.id, comment.user_id)}
                            className="delete-comment-btn"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="no-comments">No comments yet. Be the first!</p>
                  )}
                </div>
              )}
            </div>
            
            {/* ACTIONS - Only show if user owns post or is admin */}
            {(user?.id === sub.user_id || isAdmin) && editingId !== sub.id && (
              <div className="submission-footer">
                {user?.id === sub.user_id && (
                  <button 
                    onClick={() => startEdit(sub)}
                    className="edit-btn"
                  >
                    ✏️ Edit
                  </button>
                )}
                <button 
                  onClick={() => deleteSubmission(sub.id, sub.user_id)}
                  className="delete-btn"
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        ))}
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

export default CommunityView