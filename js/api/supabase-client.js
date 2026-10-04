const SUPABASE_URL = 'https://eibfahbctgzqnmubrhzy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpYmZhaGJjdGd6cW5tdWJyaHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODM1OTksImV4cCI6MjA4MTA1OTU5OX0.2Xc1oqi_UPhnFqJsFRO-eAHpiCLpjF16JQAGyIrl18E';

// Exact version: jsDelivr caches it for a year (a range like @2 is re-resolved every
// few days). Keep in sync with package-lock.json and the <link rel="preload"> of the pages.
const SUPABASE_JS_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.99.3/dist/umd/supabase.js';

let supabase = null;
let initPromise = null;

async function loadSupabaseScript() {
    if (window.supabase) return;
    const script = document.createElement('script');
    script.src = SUPABASE_JS_URL;
    document.head.appendChild(script);
    await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
    });
}

export async function getSupabaseClient() {
    if (supabase) return supabase;
    if (!initPromise) {
        initPromise = (async () => {
            await loadSupabaseScript();
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            return supabase;
        })();
    }
    return initPromise;
}
