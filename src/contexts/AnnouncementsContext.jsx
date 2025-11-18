// src/contexts/AnnouncementsContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const AnnouncementsContext = createContext();

export const AnnouncementsProvider = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    // Fetch announcements
    const { data: announcementsData, error } = await supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      setLoading(false);
      return;
    }

    // Fetch author display names for each announcement
    const authorIds = [...new Set((announcementsData || []).map(a => a.author_id).filter(Boolean))];
    let authorMap = {};
    if (authorIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', authorIds);
      if (profilesData) {
        profilesData.forEach(p => {
          authorMap[p.id] = {
            display_name: p.display_name,
            email: p.email
          };
        });
      }
    }

    // Attach display_name or email to each announcement
    const announcementsWithNames = (announcementsData || []).map(a => {
      let author_display_name = null;
      if (a.author_id && authorMap[a.author_id]) {
        author_display_name = authorMap[a.author_id].display_name || authorMap[a.author_id].email || null;
      }
      return {
        ...a,
        author_display_name
      };
    });
    setAnnouncements(announcementsWithNames);
    setLoading(false);
  };

  const addAnnouncement = async (title, message, pinned = false) => {
    if (!isAdmin || !user) return { error: 'Not authorized' };
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title,
        message,
        author_id: user.id,
        pinned
      })
      .select()
      .single();
    if (!error) setAnnouncements(prev => [data, ...prev]);
    return { data, error };
  };

  const removeAnnouncement = async (id) => {
    if (!isAdmin) return { error: 'Not authorized' };
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);
    if (!error) setAnnouncements(prev => prev.filter(a => a.id !== id));
    return { error };
  };

  const pinAnnouncement = async (id, pinned) => {
    if (!isAdmin) return { error: 'Not authorized' };
    const { data, error } = await supabase
      .from('announcements')
      .update({ pinned })
      .eq('id', id)
      .select()
      .single();
    if (!error) setAnnouncements(prev => prev.map(a => a.id === id ? data : a));
    return { data, error };
  };

  return (
    <AnnouncementsContext.Provider value={{
      announcements,
      loading,
      fetchAnnouncements,
      addAnnouncement,
      removeAnnouncement,
      pinAnnouncement
    }}>
      {children}
    </AnnouncementsContext.Provider>
  );
};

export const useAnnouncements = () => useContext(AnnouncementsContext);
