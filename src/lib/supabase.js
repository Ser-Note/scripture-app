import { createClient } from '@supabase/supabase-js'

const DBURL = import.meta.env.VITE_SUPABASE_URL
const DBKEY = import.meta.env.VITE_SUPABASE_KEY

// Debug: Check if env vars are loaded
if (!DBURL || !DBKEY) {
  console.error('❌ Supabase environment variables not found!')
  console.log('VITE_SUPABASE_URL:', DBURL)
  console.log('VITE_SUPABASE_KEY:', DBKEY ? 'Found' : 'Missing')
} else {
  console.log('✅ Supabase configured:', DBURL)
}

export const supabase = createClient(DBURL, DBKEY)
