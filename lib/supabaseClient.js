const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials not configured. OTP features will be disabled.");
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      realtime: {
        transport: ws,
      },
    })
  : null;

module.exports = { supabase };
