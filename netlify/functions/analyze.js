// Netlify Function: VEXT Analysis Engine
// Calls Gemini API with auto-discovery of available models

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
    "grade": "Integer 0-100. Be brutally honest. Vague inputs get <50. detailed inputs get >80.",
    "grade_letter": "Calculate based on grade (F, D, C, B, A, S)",
    "target_audience": "Deep demographic and psychographic profile description",
    "psychology": [
      {"trigger": "Specific Trigger 1", "explanation": "Why this works for conversion"},
      {"trigger": "Specific Trigger 2", "explanation": "Why this works for conversion"}
    ]
  },
  "landing_page": {
    "headline": "Magnetic H1 headline",
    "subheadline": "Benefit-driven H2",
    "tailwind_html": "<html><head><script src='https://cdn.tailwindcss.com'></script></head><body class='min-h-screen bg-black text-white'>...</body></html>"
  },
  "viral_kit": {
    "hooks": ["Hook 1", "Hook 2"],
    "scripts": [
      {
        "platform": "TikTok",
        "duration": "15s",
        "script": "Full script..."
      }
    ]
  }
}

CRITICAL: 
1. The tailwind_html must be a COMPLETE HTML document with the Tailwind CDN script tag. Dark mode. Mobile-first.
2. GRADING RULE: If the user input is short/vague (e.g. "coffee shop"), give a LOW grade (40-60) and basic triggers. If detailed, give HIGH grade. DO NOT ALWAYS GIVE 87. Make it feel real.`;

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { hypothesis, mode = 'create', currentHtml = '', context = {} } = JSON.parse(event.body);
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
        }

        // MODE: REFINE (Modify existing HTML)
        if (mode === 'refine') {
            console.log('[REFINE] Mode activated');
            console.log('[REFINE] Hypothesis/Instruction:', hypothesis);
            console.log('[REFINE] CurrentHtml length:', currentHtml?.length || 0);
            console.log('[REFINE] Context:', JSON.stringify(context));

            // Safely extract context values and escape them
            const gradeValue = context.gradePercent || context.grade || 50;
            const gradeLetter = context.grade || 'C';
            const titleSafe = String(context.title || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            const taglineSafe = String(context.tagline || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            const instructionSafe = String(hypothesis).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

            const REFINE_PROMPT = `**ROLE:** Senior Frontend Engineer & Conversion Expert.
**TASK:** Modify the provided Tailwind CSS HTML based on the user's instruction.
**CONTEXT:** 
- Instruction: "${instructionSafe}"

**RULES:**
1. Keep the core structure unless asked to change.
2. Return JSON with updated landing_page and analysis.
3. Maintain VEXT design aesthetic (black bg, neon green accents).

**OUTPUT JSON:**
{
  "analysis": {
    "grade": ${gradeValue}, 
    "grade_letter": "${gradeLetter}",
    "psychology": [] 
  },
  "landing_page": {
    "headline": "${titleSafe}",
    "subheadline": "${taglineSafe}",
    "tailwind_html": "FULL_UPDATED_HTML"
  }
}
`;

            // Re-use callGemini but with specific prompt
            try {
                const refinement = await callGeminiWithPrompt(REFINE_PROMPT, currentHtml, GEMINI_API_KEY);
                return { statusCode: 200, headers, body: JSON.stringify(refinement) };
            } catch (error) {
                console.error('Refinement failed:', error);
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'Refinement failed', details: error.message }) };
            }
        }

        // MODE: CREATE (Standard Logic) followed by existing code...

        // 1. Try Primary Model (Gemini 1.5 Flash)
        try {
            const result = await callGemini(hypothesis, 'gemini-1.5-flash', GEMINI_API_KEY);
            return { statusCode: 200, headers, body: JSON.stringify(result) };
        } catch (error) {
            console.log('Primary model failed:', error.message);
        }

        // 2. Try Fallback Model (Gemini Pro)
        try {
            const result = await callGemini(hypothesis, 'gemini-pro', GEMINI_API_KEY);
            return { statusCode: 200, headers, body: JSON.stringify(result) };
        } catch (error) {
            console.log('Fallback model failed:', error.message);
        }

        // 3. AUTO-DISCOVERY: Fetch available models and use the best one
        try {
            console.log('Attempting model auto-discovery...');
            const modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
            const modelsResponse = await fetch(modelsUrl);
            const modelsData = await modelsResponse.json();

            if (!modelsData.models) {
                throw new Error('Failed to list models');
            }

            // Find valid models that support generation
            const validModels = modelsData.models.filter(m =>
                m.supportedGenerationMethods &&
                m.supportedGenerationMethods.includes('generateContent')
            );

            // Sort by preference: Flash > Pro > Default
            validModels.sort((a, b) => {
                const scoreA = getModelScore(a.name);
                const scoreB = getModelScore(b.name);
                return scoreB - scoreA;
            });

            if (validModels.length > 0) {
                console.log(`Found ${validModels.length} candidates. Trying in order of preference...`);

                for (const model of validModels) {
                    const modelName = model.name.replace(/^models\//, '');
                    console.log(`Trying auto-discovered model: ${modelName}`);

                    try {
                        const result = await callGemini(hypothesis, modelName, GEMINI_API_KEY);
                        console.log(`Success with ${modelName}`);
                        return { statusCode: 200, headers, body: JSON.stringify(result) };
                    } catch (modelError) {
                        console.warn(`Failed with ${modelName}:`, modelError.message);
                        // Continue to next model
                    }
                }
            }

            console.error('All auto-discovered models failed.');
            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({
                    error: 'All AI models failed',
                    message: 'Tried all available models but none worked. Check quotas.',
                    debug_models: modelsData.models.map(m => ({ name: m.name, methods: m.supportedGenerationMethods }))
                })
            };
        } catch (autoError) {
            console.error('Auto-discovery failed:', autoError);
            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({
                    error: 'Auto-discovery error',
                    message: autoError.message
                })
            };
        }

        return {
            statusCode: 502,
            headers,
            body: JSON.stringify({
                error: 'All AI models failed',
                message: 'Could not find a working Gemini model for this API key.'
            })
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

function getModelScore(name) {
    if (name.includes('1.5-flash')) return 10;
    if (name.includes('gemini-pro')) return 8;
    if (name.includes('flash')) return 6;
    if (name.includes('1.0-pro')) return 5;
    return 1;
}

async function callGemini(hypothesis, model, key) {
    // API endpoint expects models/{modelName}:generateContent
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    console.log(`Attempting to call ${model}...`);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `${VEXT_SYSTEM_PROMPT}\n\n---\n\nAnalyze: "${hypothesis}"` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: "application/json" }
        })
    });

    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Model ${model} failed with ${response.status}: ${txt}`);
    }

    const data = await response.json();
    const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiContent) throw new Error('Empty response');

    const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || aiContent.match(/```\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
    return JSON.parse(jsonString.trim());
}

async function callGeminiWithPrompt(systemPrompt, userContent, key) {
    console.log('[REFINE] Starting auto-discovery for refinement...');
    console.log('[REFINE] User content length:', userContent?.length || 0);

    // First, discover what models are available
    const modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const modelsResponse = await fetch(modelsUrl);
    const modelsData = await modelsResponse.json();

    if (!modelsData.models) {
        throw new Error('Failed to list available models');
    }

    // Filter models that support generateContent
    const validModels = modelsData.models.filter(m =>
        m.supportedGenerationMethods &&
        m.supportedGenerationMethods.includes('generateContent')
    );

    // Sort by preference (same logic as CREATE mode)
    validModels.sort((a, b) => {
        const scoreA = getModelScore(a.name);
        const scoreB = getModelScore(b.name);
        return scoreB - scoreA;
    });

    console.log('[REFINE] Found', validModels.length, 'valid models');

    // Try each model until one works
    for (const modelObj of validModels) {
        const model = modelObj.name.replace(/^models\//, '');
        console.log('[REFINE] Trying model:', model);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${systemPrompt}\n\n---\n\nCONTENT TO MODIFY:\n${userContent || 'No content provided'}` }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: "application/json" }
                })
            });

            if (!response.ok) {
                console.error(`[REFINE] Model ${model} failed:`, response.status);
                continue;
            }

            const data = await response.json();
            const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!aiContent) {
                console.error('[REFINE] Empty response from', model);
                continue;
            }

            console.log('[REFINE] Success with', model);

            // Parse JSON
            const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || aiContent.match(/```\s*([\s\S]*?)\s*```/);
            const jsonString = jsonMatch ? jsonMatch[1] : aiContent;

            try {
                return JSON.parse(jsonString.trim());
            } catch (parseError) {
                console.error('[REFINE] JSON parse failed:', parseError.message);
                continue;
            }
        } catch (fetchError) {
            console.error(`[REFINE] Fetch error with ${model}:`, fetchError.message);
            continue;
        }
    }

    throw new Error('All refinement models failed');
}
