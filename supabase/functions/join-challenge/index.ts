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
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
  );

  const { user } = (await supabase.auth.getUser()).data;

  if (!user) {
    return new Response(JSON.stringify({error: "Unauthorized"}), {status: 401});
  }

  const body = await req.json();
  const {challenge_id, amount} = body;

  // Check that the challenge exists
  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("id")
    .eq("id", challenge_id)
    .maybeSingle();

  if (challengeError || !challenge) {
    return new Response(JSON.stringify({ error: "Challenge not found" }), { status: 404 });
  }

  // Check if already joined
  const { data: existingParticipant } = await supabase
    .from("participants")
    .select("id")
    .eq("challenge_id", challenge_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingParticipant) {
    return new Response(JSON.stringify({ error: "Already joined" }), { status: 400 });
  }

  // Check wallet balance
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!wallet || wallet.balance < amount) {
    return new Response(JSON.stringify({ error: "Insufficient funds" }), { status: 400 });
  }

  // Begin joining process
  // 1. Insert into participants
  const {error: pError} = await supabase.from("participants").insert({
    user_id: user.id,
    challenge_id
  });
  if (pError) throw new Error("Failed to join challenge.", pError)

  // 2. Deduct funds from wallet
  const {error: wError} = await supabase.from("wallets")
    .update({ balance: wallet.balance - amount })
    .eq("user_id", user.id);
    if (wError) throw new Error("Wallet error", wError)

  // 3. Record the transaction
  const {error: tError} = await supabase.from("transactions").insert({
    user_id: user.id,
    challenge_id,
    amount,
    type: "withdrawal"
  });
  if (tError) throw new Error("Transaction error", tError)

  return new Response(JSON.stringify({ message: "Challenge joined successfully!" }), {
    status: 200,
  });
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/join-challenge' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
