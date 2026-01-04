import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { matchContext, lastBall, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "ball_commentary") {
      systemPrompt = `You are an exciting cricket commentator. Generate engaging, concise ball-by-ball commentary (1-2 sentences max). Be enthusiastic for boundaries and wickets, analytical for dot balls. Use cricket terminology naturally.`;
      
      userPrompt = `Match: ${matchContext.team1} vs ${matchContext.team2}
Score: ${matchContext.score}
Over: ${matchContext.over}.${matchContext.ball}
Batsman: ${lastBall.batsman}
Bowler: ${lastBall.bowler}
Result: ${lastBall.runs} runs${lastBall.isWicket ? ' - WICKET!' : ''}${lastBall.isBoundary ? (lastBall.runs === 6 ? ' - SIX!' : ' - FOUR!') : ''}
${lastBall.extras ? `Extras: ${lastBall.extraType}` : ''}

Generate exciting commentary for this delivery:`;
    } else if (type === "match_summary") {
      systemPrompt = `You are a professional cricket analyst. Provide concise, insightful match summaries highlighting key moments, top performers, and match-turning points.`;
      
      userPrompt = `Generate a match summary for:
${matchContext.team1}: ${matchContext.team1Score}
${matchContext.team2}: ${matchContext.team2Score}
Result: ${matchContext.result}
Top performers: ${matchContext.topPerformers}`;
    } else if (type === "prediction") {
      systemPrompt = `You are a cricket analytics AI. Provide win probability analysis based on current match situation. Be data-driven but engaging.`;
      
      userPrompt = `Analyze win probability:
${matchContext.team1}: ${matchContext.team1Score} (${matchContext.team1Overs} overs)
${matchContext.team2}: ${matchContext.team2Score} (${matchContext.team2Overs} overs)
Target: ${matchContext.target}
Required rate: ${matchContext.requiredRate}
Wickets in hand: ${matchContext.wicketsInHand}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const commentary = data.choices?.[0]?.message?.content || "Great delivery!";

    return new Response(JSON.stringify({ commentary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
