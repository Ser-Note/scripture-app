// src/contexts/FollowContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationsContext';

const FollowContext = createContext();

export const FollowProvider = ({ children }) => {
  const { user } = useAuth();
  const { sendNotification } = useNotifications();
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFollowing();
      fetchFollowers();
    }
  }, [user]);

  const fetchFollowing = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('followed_id')
        .eq('follower_id', user.id);
      if (error) throw error
      setFollowing(data ? data.map(f => f.followed_id) : []);
    } catch (err) {
      console.error('fetchFollowing error', err)
      setFollowing([])
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowers = async () => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('followed_id', user.id);
      if (error) throw error
      setFollowers(data ? data.map(f => f.follower_id) : []);
    } catch (err) {
      console.error('fetchFollowers error', err)
      setFollowers([])
    }
  };

  const followUser = async (targetId) => {
    if (!user || user.id === targetId) return false;
    try {
      const payload = { follower_id: user.id, followed_id: targetId }
      // return the inserted row so the client can use it immediately
      const res = await supabase
        .from('follows')
        .insert(payload)
        .select()
        .single()

      // Debug log full response for troubleshooting
      if (res && (res.error || !res.data)) {
        console.error('followUser response', { payload, response: res })
      }
      const { data, error } = res
      if (error) {
        // if unique violation (already following), treat as success
        if (error.code && (error.code === '23505' || error.message?.toLowerCase().includes('duplicate'))) {
          // proceed to refresh
        } else {
          throw error
        }
      }
      await fetchFollowing();

      // Fetch follower profile for display name
      let displayName = '';
      try {
        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();
        if (!pErr && profile && profile.display_name) displayName = profile.display_name;
      } catch (e) { /* ignore */ }

      // Send notification to the followed user (don't block on failures)
      sendNotification({
        userId: targetId,
        type: 'follow',
        data: { followerId: user.id, display_name: displayName }
      }).catch(() => {})

      // Call an atomic RPC to increment the follower count (server-side)
      // This is safer/atomic versus read-then-update from the client.
      try {
        if (data) {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('rpc_increment_followers_count', { p_id: targetId })
          if (rpcErr) console.debug('rpc_increment_followers_count error', rpcErr)
        }
      } catch (e) {
        console.debug('Could not call rpc_increment_followers_count', e)
      }

      // return the inserted follow row (or true if not available)
      return data || true;
    } catch (err) {
      console.error('followUser error', err)
      throw err
    }
  };

  const unfollowUser = async (targetId) => {
    if (!user || user.id === targetId) return false;
    try {
      const payload = { follower_id: user.id, followed_id: targetId }
      // return deleted row where possible
      // Use match + select without .single() to avoid errors when multiple rows exist
      const res = await supabase
        .from('follows')
        .delete()
        .match({ follower_id: user.id, followed_id: targetId })
        .select();

      // Log full response for debugging (can be removed after verification)
      if (res && res.error) console.error('unfollowUser response (error)', { payload, response: res })
      else console.debug('unfollowUser response', { payload, response: res })

      const { data, error } = res
      if (error) throw error

      // Always refresh the following list so UI reflects actual DB state
      await fetchFollowing();

      // If rows were returned, return them; otherwise return true to indicate success
      // Call an atomic RPC to decrement the follower count if rows were deleted
      try {
        if (data && data.length) {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('rpc_decrement_followers_count', { p_id: targetId })
          if (rpcErr) console.debug('rpc_decrement_followers_count error', rpcErr)
        }
      } catch (e) {
        console.debug('Could not call rpc_decrement_followers_count', e)
      }

      return data && data.length ? data : true;
    } catch (err) {
      console.error('unfollowUser error', err)
      throw err
    }
  };

  // expose a refresh function so views can explicitly refresh follow state
  const refreshFollowing = fetchFollowing

  return (
    <FollowContext.Provider value={{ following, followers, followUser, unfollowUser, loading, refreshFollowing }}>
      {children}
    </FollowContext.Provider>
  );
};

export const useFollow = () => useContext(FollowContext);
