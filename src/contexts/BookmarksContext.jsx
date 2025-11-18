// src/contexts/BookmarksContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const BookmarksContext = createContext()

export const BookmarksProvider = ({ children }) => {
  const { user } = useAuth()
  const [bookmarks, setBookmarks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchBookmarks()
    } else {
      setBookmarks([])
      setLoading(false)
    }
  }, [user])

  const fetchBookmarks = async () => {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBookmarks(data || [])
    } catch (err) {
      console.error('Error fetching bookmarks:', err)
    } finally {
      setLoading(false)
    }
  }

  const isBookmarked = (itemType, itemId) => {
    return bookmarks.some(b => b.item_type === itemType && b.item_id === itemId)
  }

  const addBookmark = async (itemType, itemId, itemData) => {
    if (!user) return { error: 'Must be logged in' }

    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          item_type: itemType,
          item_id: itemId,
          item_data: itemData
        })
        .select()
        .single()

      if (error) throw error
      
      setBookmarks(prev => [data, ...prev])
      return { data, error: null }
    } catch (err) {
      console.error('Error adding bookmark:', err)
      return { data: null, error: err.message }
    }
  }

  const removeBookmark = async (itemType, itemId) => {
    if (!user) return { error: 'Must be logged in' }

    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', itemType)
        .eq('item_id', itemId)

      if (error) throw error
      
      setBookmarks(prev => prev.filter(b => !(b.item_type === itemType && b.item_id === itemId)))
      return { error: null }
    } catch (err) {
      console.error('Error removing bookmark:', err)
      return { error: err.message }
    }
  }

  const toggleBookmark = async (itemType, itemId, itemData) => {
    if (isBookmarked(itemType, itemId)) {
      return await removeBookmark(itemType, itemId)
    } else {
      return await addBookmark(itemType, itemId, itemData)
    }
  }

  return (
    <BookmarksContext.Provider value={{
      bookmarks,
      loading,
      isBookmarked,
      addBookmark,
      removeBookmark,
      toggleBookmark,
      fetchBookmarks
    }}>
      {children}
    </BookmarksContext.Provider>
  )
}

export const useBookmarks = () => useContext(BookmarksContext)
