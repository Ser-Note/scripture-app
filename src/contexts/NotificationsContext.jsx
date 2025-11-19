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
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        data,
        read: false
      });
    // Optionally refresh notifications for the current user
    if (user && user.id === userId) fetchNotifications();
  };

  return (
    <NotificationsContext.Provider value={{ notifications, loading, fetchNotifications, markAsRead, sendNotification }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);
