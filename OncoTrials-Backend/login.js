// login.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // Use ANON key, not SERVICE_ROLE key
);

async function login() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.SUPABASE_EMAIL,
    password: process.env.SUPABASE_PASSWORD
  });
  
  if (error) {
    console.error('Login failed:', error.message);
    return;
  }
  
  console.log('\n✅ Login successful!');
  console.log('\nCopy this token and use it in your curl command:');
  console.log('\n' + data.session.access_token);
  console.log('\nExpires at:', new Date(data.session.expires_at * 1000));
}

login();