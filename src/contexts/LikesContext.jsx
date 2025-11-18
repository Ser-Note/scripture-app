// src/contexts/LikesContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const LikesContext = createContext();

export const LikesProvider = ({ children }) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLikes();
    } else {
      setLikes([]);
      setLoading(false);
    }
  }, [user]);

  const fetchLikes = async () => {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      setLikes(data || []);
    } catch (err) {
      console.error('Error fetching likes:', err);
    } finally {
      setLoading(false);
    }
  };

  const isLiked = (itemType, itemId) => {
    return likes.some(l => l.item_type === itemType && l.item_id === itemId);
  };

  const likeCount = async (itemType, itemId) => {
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('item_type', itemType)
      .eq('item_id', itemId);
    if (error) return 0;
    return count || 0;
  };

  const addLike = async (itemType, itemId) => {
    if (!user) return { error: 'Must be logged in' };
    try {
      const { data, error } = await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          item_type: itemType,
          item_id: itemId
        })
        .select()
        .single();
      if (error) throw error;
      setLikes(prev => [data, ...prev]);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  };

  const removeLike = async (itemType, itemId) => {
    if (!user) return { error: 'Must be logged in' };
    try {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('item_type', itemType)
        .eq('item_id', itemId);
      if (error) throw error;
      setLikes(prev => prev.filter(l => !(l.item_type === itemType && l.item_id === itemId)));
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const toggleLike = async (itemType, itemId) => {
    if (isLiked(itemType, itemId)) {
      return await removeLike(itemType, itemId);
    } else {
      return await addLike(itemType, itemId);
    }
  };

  return (
    <LikesContext.Provider value={{
      likes,
      loading,
      isLiked,
      likeCount,
      addLike,
      removeLike,
      toggleLike,
      fetchLikes
    }}>
      {children}
    </LikesContext.Provider>
  );
};

export const useLikes = () => useContext(LikesContext);
