// src/contexts/NotificationsContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const NotificationsContext = createContext();

export const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setNotifications(data || []);
    setLoading(false);
  };

  const markAsRead = async (id) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    fetchNotifications();
  };

  // Send a notification to a user
  const sendNotification = async ({ userId, type, data }) => {
    try {
      // Prefer calling a secure Postgres RPC that inserts notifications with elevated privileges.
      // This function is not present by default; run the SQL (provided in the repo) in Supabase to create it.
      if (user && user.id) {
        const rpcRes = await supabase.rpc('notify_user', {
          p_user_id: userId,
          p_type: type,
          p_data: data,
          p_actor: user.id
        });
        if (!rpcRes || rpcRes.error) {
          // If RPC not found or fails due to RLS, fall back to client insert (may also fail under RLS)
          console.warn('notify_user rpc failed or missing, falling back to direct insert', rpcRes?.error ?? rpcRes)
        } else {
          if (user && user.id === userId) fetchNotifications();
          return true
        }
      }

      // Fallback: attempt direct insert (may be blocked by RLS)
      const { data: resData, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          data,
          read: false
        });
      if (error) {
        console.warn('sendNotification failed (insert)', error)
        return false
      }
      if (user && user.id === userId) fetchNotifications();
      return true
    } catch (err) {
      console.warn('sendNotification error', err)
      return false
    }
  };

  return (
    <NotificationsContext.Provider value={{ notifications, loading, fetchNotifications, markAsRead, sendNotification }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
