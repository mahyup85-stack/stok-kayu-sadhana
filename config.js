// 🔴 Pengaturan Debugging Global (Set false saat mau commit/deploy)
const IS_DEBUG = false; 

if (!IS_DEBUG) {
    window._originalConsoleLog = console.log;
    console.log = function () {};
}

export const config = {
    SUPABASE_URL: 'https://fcccuqnyxuwsrddlookt.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjY2N1cW55eHV3c3JkZGxvb2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDU2NzQsImV4cCI6MjA4NTQyMTY3NH0.w9p0yxWW1CtLm3Gj3uD1z3P1eWQxW_hB288iUwkfCd8'
};

// Daftarkan ke window agar aman dibaca secara global
window.config = config;

export function getSupabaseClient() {
    if (!window.api) {
        const supabaseLib = window.supabase || (typeof supabase !== 'undefined' ? supabase : null);
        if (supabaseLib) {
            window.api = supabaseLib.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
        } else {
            console.error("❌ CDN Supabase belum dimuat di HTML!");
        }
    }
    
    if (window.api) {
        window.supabaseClient = window.api;
    }
    
    return window.api;
}

export const api = getSupabaseClient();

if (window.api) {
    window.supabaseClient = window.api;
}