// Netlify Function: VEXT Analysis Engine - ULTRA-SPEED OPTIMIZED
const PRIMARY_MODEL = 'gemini-1.5-flash';

const VEXT_SYSTEM_PROMPT = `**ROLE:**
Eres VEXT, un analista de negocios brutalmente honesto y experto en conversión digital.
**OBJETIVO:**
Analizar la visión del usuario y generar:
1. Una Landing Page minimalista (Tailwind CSS, fondo negro, acentos verde neón #00ff88).
2. Nota (0-100) con justificación honesta.
3. Scripts virales.
**OUTPUT (SOLO JSON VÁLIDO):**
{
  "analysis": { "grade": 0-100, "grade_letter": "S-F", "target_audience": "...", "psychology": [], "strategy": "..." },
  "landing_page": { "headline": "...", "subheadline": "...", "tailwind_html": "..." },
  "viral_kit": { "hooks": [], "scripts": [] }
}`;

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

    try {
        const body = JSON.parse(event.body);
        const { hypothesis, mode = 'create', currentHtml = '', context: userContext = {}, is_chat_only = false } = body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        console.log(`[VEXT] Request: mode=${mode}, is_chat=${is_chat_only}`);

        if (!GEMINI_API_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };

        // Define prompts
        let systemPrompt = VEXT_SYSTEM_PROMPT;
        let userContent = `IDEA: "${hypothesis}"`;
        let maxTokens = 4000;

        if (is_chat_only) {
            systemPrompt = `Eres VEXT, un arquitecto web de élite. Responde de forma breve y profesional en español. No generes código. Máximo 2 frases.`;
            userContent = `USER_MSG: "${hypothesis}"`;
            maxTokens = 500;
        } else if (mode === 'refine') {
            const gradeValue = userContext.gradePercent || userContext.grade || 50;
            systemPrompt = `Eres VEXT. Modifica la landing page según pida el usuario. 
            Responde SOLO JSON con este formato: { "chat_response": "texto", "analysis": { "grade": ${gradeValue}, "grade_letter": "A", "grade_explanation": "..." }, "landing_page": { "headline": "...", "subheadline": "...", "tailwind_html": "..." } }`;
            userContent = `INSTRUCTION: "${hypothesis}"\nCURRENT_HTML: ${currentHtml}`;
        }

        // Try models in order of preference
        const models = [PRIMARY_MODEL, 'gemini-1.5-flash', 'gemini-pro'];
        let lastError = null;

        for (const model of models) {
            try {
                console.log(`[VEXT] Trying model: ${model}`);
                const result = await callGeminiDirect(systemPrompt, userContent, GEMINI_API_KEY, model, maxTokens);
                console.log(`[VEXT] Success with ${model}`);
                return { statusCode: 200, headers, body: JSON.stringify(result) };
            } catch (err) {
                console.warn(`[VEXT] Model ${model} failed:`, err.message);
                lastError = err;
            }
        }

        throw lastError || new Error('All models failed');

    } catch (error) {
        console.error('[VEXT] Global function error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', message: error.message }) };
    }
};

async function callGeminiDirect(systemPrompt, userContent, key, model, maxTokens = 4000) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    // Check if fetch is available (Global in Node 18+)
    if (typeof fetch === 'undefined') {
        throw new Error('Global fetch is not available. Ensure Node.js version is 18+');
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n---\n\n${userContent}` }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: maxTokens,
                responseMimeType: maxTokens > 500 ? "application/json" : "text/plain"
            }
        })
    });

    if (!response.ok) {
        const errTxt = await response.text();
        throw new Error(`Gemini API Error (${model}): ${response.status} - ${errTxt}`);
    }

    const data = await response.json();
    const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiContent) throw new Error(`Empty AI response from ${model}`);

    if (maxTokens <= 500) {
        return { chat_response: aiContent.trim() };
    }

    // Robust JSON parsing
    try {
        const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || aiContent.match(/```\s*([\s\S]*?)\s*```/);
        const jsonString = (jsonMatch ? jsonMatch[1] : aiContent).trim();
        return JSON.parse(jsonString);
    } catch (e) {
        console.error(`[VEXT] JSON Parse Error for ${model}:`, e.message);
        console.error(`[VEXT] Raw content was:`, aiContent.slice(0, 500) + '...');
        throw new Error(`Invalid JSON response from ${model}`);
    }
}
