
// Připojení k Supabase vytvořeno zde
const SUPABASE_URL = 'https://lmcmwrehrmgygsnyofdf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtY213cmVocm1neWdzbnlvZmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNjMzNzIsImV4cCI6MjA2MDgzOTM3Mn0.oJ7rRKOg2FAurmZanqvanyu4k0gnEXQfKawayZHeSBQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.supabaseClient = supabase;
