import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://appcqbvzcfaqnptkxgdz.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcGNxYnZ6Y2ZhcW5wdGt4Z2R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzcxMzksImV4cCI6MjA3MjA1MzEzOX0.bnlYbRQNXU3vCGfcZ0FfN9h9X_Vx4fls5VLg7v8S9xg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
