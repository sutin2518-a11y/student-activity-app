import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://uqlazmdwctsprxzuyvds.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxbGF6bWR3Y3RzcHJ4enV5dmRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MTYzMjcsImV4cCI6MjEwODA5MjMyN30.C-NC1lndHUT27JPKZsENhe3DunD9iYkiFx8YG1ZE9Jo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);