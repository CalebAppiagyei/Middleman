// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js";


console.log("Hello from Functions!")

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  // const response = await supabase.auth.getUser();
  // const user = response.data.user;
  const { user } = (await supabase.auth.getUser()).data;

  if (!user) {
    return new Response(JSON.stringify({error: "Unauthorized"}), {status: 401});
  }

  const body = await req.json();
  const {title, amount, payout_type_id, description, event_date} = body;

  const {data, error} = await supabase
    .from("challenges")
    .insert({
      title,
      amount,
      payout_type_id,
      creator_id: user.id,
      description: description || null,
      event_date: event_date || null,
    })
    .select()
    .single();

    if (error) {
      return new Response(JSON.stringify({error: error.message}), {status: 400});
    }

    return new Response(JSON.stringify(data), {status: 200});
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-challenge' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
