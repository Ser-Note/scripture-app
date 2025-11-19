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
    const { data, error } = await supabase
      .from('follows')
      .select('followed_id')
      .eq('follower_id', user.id);
    setFollowing(data ? data.map(f => f.followed_id) : []);
    setLoading(false);
  };

  const fetchFollowers = async () => {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('followed_id', user.id);
    setFollowers(data ? data.map(f => f.follower_id) : []);
  };

  const followUser = async (targetId) => {
    if (!user || user.id === targetId) return;
    await supabase
      .from('follows')
      .insert({ follower_id: user.id, followed_id: targetId });
    fetchFollowing();
    // Fetch follower profile for display name
    let displayName = '';
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();
    if (profile && profile.display_name) {
      displayName = profile.display_name;
    }
    // Send notification to the followed user
    await sendNotification({
      userId: targetId,
      type: 'follow',
      data: { followerId: user.id, display_name: displayName }
    });
  };

  const unfollowUser = async (targetId) => {
    if (!user || user.id === targetId) return;
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('followed_id', targetId);
    fetchFollowing();
  };

  return (
    <FollowContext.Provider value={{ following, followers, followUser, unfollowUser, loading }}>
      {children}
    </FollowContext.Provider>
  );
};

export const useFollow = () => useContext(FollowContext);
