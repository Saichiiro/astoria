import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eibfahbctgzqnmubrhzy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpYmZhaGJjdGd6cW5tdWJyaHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODM1OTksImV4cCI6MjA4MTA1OTU5OX0.2Xc1oqi_UPhnFqJsFRO-eAHpiCLpjF16JQAGyIrl18E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Kept async for backwards compatibility — all callers already await it.
export async function getSupabaseClient() {
    return supabase;
}
