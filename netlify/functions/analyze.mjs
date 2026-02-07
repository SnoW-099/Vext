// Netlify Function: VEXT Analysis Engine
// Calls Claude 3.5 Sonnet with the VEXT system prompt

const VEXT_SYSTEM_PROMPT = `**ROLE:**
You are VEXT, a high-performance Tactical Conversion Architect. You don't just build websites; you engineer digital sales engines. Your output is a combination of psychological warfare, elite copywriting, and minimalist modern design.

**OBJECTIVE:**
Analyze the user's business vision and generate a 360° strategy that includes:
1. A minimalist, high-conversion Landing Page (Tailwind CSS).
2. A tactical breakdown of the psychological triggers used.
3. A market viability score (VEXT Grade).
4. Viral growth scripts for social media (TikTok/Reels).

**TONAL GUIDELINES:**
- **Analytical & Direct:** No fluff. No "Welcome to our website."
- **Authoritative:** Speak like a Silicon Valley growth lead.
- **Technical:** Use marketing terminology (AIDA, Loss Aversion, Social Proof, Anchor Pricing).

**DESIGN CONSTRAINTS (VEXT AESTHETIC):**
- **Colors:** Background #000000, Accents #39FF14 (Neon Green).
- **Typography:** Sans-serif clean (Inter/Geist).
- **Components:** High contrast, massive whitespace, border-thin (zinc-800).
- **CTA:** Only one primary action. Aggressive and clear.

**OUTPUT FORMAT (MANDATORY - JSON ONLY):**
You MUST respond with ONLY valid JSON. No markdown, no explanation, just pure JSON with this exact structure:

{
  "analysis": {
    "grade": 87,
    "grade_letter": "A",
    "target_audience": "Deep demographic and psychographic profile description",
    "psychology": [
      {"trigger": "Urgency", "explanation": "Why this works for conversion"},
      {"trigger": "Social Proof", "explanation": "Why this works for conversion"}
    ]
  },
  "landing_page": {
    "headline": "Magnetic H1 headline",
    "subheadline": "Benefit-driven H2",
    "tailwind_html": "<div class='min-h-screen bg-black text-white'>...</div>"
  },
  "viral_kit": {
    "hooks": ["Hook 1 - attention grabber", "Hook 2 - curiosity driver"],
    "scripts": [
      {
        "platform": "TikTok",
        "duration": "15s",
        "script": "Full script with visual cues [SHOW product] [CUT TO face]..."
      }
    ]
  }
}

CRITICAL: The tailwind_html must be a complete, self-contained landing page using Tailwind CSS classes. Dark mode. Mobile-first. Include CDN link for Tailwind in a <script> tag.`;

export default async (request, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
    }

    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers }
        );
    }

    try {
        const { hypothesis } = await request.json();

        if (!hypothesis || hypothesis.trim().length < 10) {
            return new Response(
                JSON.stringify({ error: 'Hypothesis must be at least 10 characters' }),
                { status: 400, headers }
            );
        }

        const ANTHROPIC_API_KEY = Netlify.env.get('ANTHROPIC_API_KEY');

        if (!ANTHROPIC_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'API key not configured' }),
                { status: 500, headers }
            );
        }

        // Call Claude API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4096,
                messages: [
                    {
                        role: 'user',
                        content: `Analyze this business hypothesis and generate the full VEXT strategy:\n\n"${hypothesis}"`
                    }
                ],
                system: VEXT_SYSTEM_PROMPT
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Anthropic API error:', errorData);
            return new Response(
                JSON.stringify({ error: 'AI service error', details: response.status }),
                { status: 502, headers }
            );
        }

        const data = await response.json();
        const aiContent = data.content[0].text;

        // Parse the JSON response from Claude
        let parsedResponse;
        try {
            // Extract JSON if wrapped in code blocks
            const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                aiContent.match(/```\s*([\s\S]*?)\s*```/);
            const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
            parsedResponse = JSON.parse(jsonString.trim());
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Raw content:', aiContent);
            return new Response(
                JSON.stringify({ error: 'Failed to parse AI response', raw: aiContent }),
                { status: 500, headers }
            );
        }

        return new Response(
            JSON.stringify(parsedResponse),
            { status: 200, headers }
        );

    } catch (error) {
        console.error('Function error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error', message: error.message }),
            { status: 500, headers }
        );
    }
};

export const config = {
    path: '/api/analyze'
};
