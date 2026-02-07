// Netlify Function: VEXT Analysis Engine - RELIABILITY & SPEED
const PRIMARY_MODEL = 'gemini-1.5-flash';

const VEXT_SYSTEM_PROMPT = `**ROLE:** Eres VEXT, un analista de negocios experto.
**OBJETIVO:** Analizar la idea del usuario y generar una Landing Page minimalista.
**REGLAS:**
- Fondo negro (#000000), acentos verde neón (#00ff88).
- Responde siempre en español.
- Si la idea es mala, sé honesto y directo.
**OUTPUT (SOLO JSON VÁLIDO):**
{
  "analysis": { "grade": 0-100, "grade_letter": "S-F", "target_audience": "...", "psychology": [], "strategy": "..." },
  "landing_page": { "headline": "...", "subheadline": "...", "tailwind_html": "..." },
  "viral_kit": { "hooks": [], "scripts": [] }
}
CRÍTICO: Devuelve solo JSON válido.`;

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
        if (!event.body) throw new Error('Request body is empty');
        const body = JSON.parse(event.body);
        const { hypothesis, mode = 'create', currentHtml = '', context: userContext = {}, is_chat_only = false } = body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        console.log(`[VEXT] Request: mode=${mode}, is_chat=${is_chat_only}, model=${PRIMARY_MODEL}`);

        if (!GEMINI_API_KEY) throw new Error('API key not configured');

        let systemPrompt = VEXT_SYSTEM_PROMPT;
        let userContent = `IDEA: "${hypothesis}"`;
        let maxTokens = 4000;
        let isChat = is_chat_only;

        if (isChat) {
            systemPrompt = `Eres VEXT, un arquitecto web profesional. Responde de forma muy breve y amigable en español. Máximo 2 frases. No generes código.`;
            userContent = `USER_MESSAGE: "${hypothesis}"`;
            maxTokens = 800;
        } else if (mode === 'refine') {
            const gradeVal = userContext.gradePercent || userContext.grade || 50;
            systemPrompt = `Eres VEXT. Modifica la landing page. Responde SOLO JSON: { "chat_response": "...", "analysis": { "grade": ${gradeVal}, ... }, "landing_page": { "tailwind_html": "..." } }`;
            userContent = `INSTRUCTION: "${hypothesis}"\nCURRENT_HTML: ${currentHtml}`;
        }

        // Sequential try for models
        const modelsToTry = [PRIMARY_MODEL, 'gemini-1.5-flash', 'gemini-pro'];
        const tried = new Set();
        let lastError = null;

        for (const modelName of modelsToTry) {
            if (tried.has(modelName)) continue;
            tried.add(modelName);

            try {
                console.log(`[VEXT] Calling ${modelName}...`);
                const result = await callGemini(systemPrompt, userContent, GEMINI_API_KEY, modelName, maxTokens, isChat);
                return { statusCode: 200, headers, body: JSON.stringify(result) };
            } catch (err) {
                console.warn(`[VEXT] ${modelName} failed:`, err.message);
                lastError = err;
            }
        }

        throw lastError || new Error('All Gemini models failed');

    } catch (error) {
        console.error('[VEXT] Engine Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', message: error.message })
        };
    }
};

async function callGemini(sys, user, key, model, maxT, isChat) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    // We use standard fetch from Node 18+
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `${sys}\n\n---\n\n${user}` }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: maxT,
                // responseMimeType is dangerous if fallback model doesn't support it
                ...(model.includes('1.5') ? { responseMimeType: isChat ? "text/plain" : "application/json" } : {})
            }
        })
    });

    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`API ${model} returned ${response.status}: ${txt}`);
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) throw new Error(`Empty response from ${model}`);

    if (isChat) return { chat_response: aiText.trim() };

    try {
        const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) || aiText.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = (jsonMatch ? jsonMatch[1] : aiText).trim();
        return JSON.parse(jsonStr);
    } catch (parseErr) {
        console.error(`[VEXT] JSON Parse Error (${model}):`, parseErr.message);
        // If it's chat-like even if not flagged, return as chat
        if (aiText.length < 500 && !aiText.includes('html')) return { chat_response: aiText };
        throw new Error(`Invalid JSON format from ${model}`);
    }
}
