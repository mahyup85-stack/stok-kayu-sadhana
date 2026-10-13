// ================================================================
// DETEKSI ENVIRONMENT OTOMATIS (LOCAL vs VERCEL)
// ================================================================

const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.includes('192.168.');

// 🔴 Otomatis: true jika di local host, false jika di Vercel / Production
const IS_DEBUG = isLocal;

if (!IS_DEBUG) {
    window._originalConsoleLog = console.log;
    console.log = function () { };
}

// Konfigurasi URL & Key untuk masing-masing environment
const DEV_CONFIG = {
    SUPURL: 'https://smjfyhrohjprpafytocv.supabase.co', 
    SUPKEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtamZ5aHJvaGpwcnBhZnl0b2N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3TpI4MzY2NDAsImV4cCI6MjEwNzQxMjY0MH0.4_cw7ILoLpC9LGPgJTlXL2jqLVzBcAPlKQcxN7HmU4g' 
};

const PROD_CONFIG = {
    SUPURL: window.__ENV?.SUPABASE_URL || 'https://fcccuqnyxuwsrddlookt.supabase.co',
    SUPKEY: window.__ENV?.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjY2N1cW55eHV3c3JkZGxvb2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDU2NzQsImV4cCI6MjA4NTQyMTY3NH0.w9p0yxWW1CtLm3Gj3uD1z3P1eWQxW_hB288iUwkfCd8'
};

export const config = {
    SUPABASE_URL: isLocal ? DEV_CONFIG.SUPURL : PROD_CONFIG.SUPURL,
    SUPABASE_KEY: isLocal ? DEV_CONFIG.SUPKEY : PROD_CONFIG.SUPKEY,
    IS_DEBUG: IS_DEBUG
};

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