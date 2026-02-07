// Netlify Function: VEXT Analysis Engine
// Calls OpenAI GPT-4o-mini with the VEXT system prompt

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
You MUST respond with ONLY valid JSON. No markdown, no explanation, no code blocks, just pure JSON with this exact structure:

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
    "tailwind_html": "<html><head><script src='https://cdn.tailwindcss.com'></script></head><body class='min-h-screen bg-black text-white'>...</body></html>"
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

CRITICAL: The tailwind_html must be a COMPLETE HTML document with the Tailwind CDN script tag. Dark mode. Mobile-first.`;

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { hypothesis } = JSON.parse(event.body);

        if (!hypothesis || hypothesis.trim().length < 10) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Hypothesis must be at least 10 characters' })
            };
        }

        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        if (!OPENAI_API_KEY) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'API key not configured' })
            };
        }

        // Call OpenAI API
        console.log('Calling OpenAI GPT-4o-mini...');

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: VEXT_SYSTEM_PROMPT
                    },
                    {
                        role: 'user',
                        content: `Analyze this business hypothesis and generate the full VEXT strategy:\n\n"${hypothesis}"`
                    }
                ],
                temperature: 0.7,
                max_tokens: 4096,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('OpenAI API error:', response.status, errorData);
            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({ error: 'AI service error', status: response.status, openaiError: errorData })
            };
        }

        const data = await response.json();

        // Extract the content from OpenAI response
        const aiContent = data.choices?.[0]?.message?.content;

        if (!aiContent) {
            console.error('No content in OpenAI response:', data);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Empty AI response' })
            };
        }

        // Parse the JSON response
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(aiContent);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Raw content:', aiContent);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to parse AI response', raw: aiContent })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(parsedResponse)
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', message: error.message })
        };
    }
};
