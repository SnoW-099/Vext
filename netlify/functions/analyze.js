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

        if (!GEMINI_API_KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };

        // --- SPEED SHORT-CIRCUIT: CHAT ONLY ---
        if (is_chat_only) {
            console.log('[CHAT_SPEED] Simple chat detected. Short-circuiting...');
            const CHAT_PROMPT = `Eres VEXT, un arquitecto web de élite. Responde de forma breve y profesional en español. No generes código. Máximo 2 frases.`;
            const result = await callGeminiDirect(CHAT_PROMPT, `USER_MSG: "${hypothesis}"`, GEMINI_API_KEY, 400);
            return { statusCode: 200, headers, body: JSON.stringify(result) };
        }

        // --- MODE: REFINE ---
        if (mode === 'refine') {
            const gradeValue = userContext.gradePercent || userContext.grade || 50;
            const REFINE_PROMPT = `Eres VEXT. Modifica la landing page según pida el usuario. 
            Responde SOLO JSON: { "chat_response": "...", "analysis": { "grade": ${gradeValue}, ... }, "landing_page": { ..., "tailwind_html": "..." } }`;
            const result = await callGeminiDirect(REFINE_PROMPT, `INSTRUCTION: "${hypothesis}"\nCURRENT_HTML: ${currentHtml}`, GEMINI_API_KEY, 4000);
            return { statusCode: 200, headers, body: JSON.stringify(result) };
        }

        // --- MODE: CREATE ---
        const result = await callGeminiDirect(VEXT_SYSTEM_PROMPT, `IDEA: "${hypothesis}"`, GEMINI_API_KEY, 4000);
        return { statusCode: 200, headers, body: JSON.stringify(result) };

    } catch (error) {
        console.error('Function error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', message: error.message }) };
    }
};

async function callGeminiDirect(systemPrompt, userContent, key, maxTokens = 4000) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${PRIMARY_MODEL}:generateContent?key=${key}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n---\n\n${userContent}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens, responseMimeType: "application/json" }
        })
    });

    if (!response.ok) {
        const errTxt = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errTxt}`);
    }

    const data = await response.json();
    const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiContent) throw new Error('Empty AI response');

    // Robust JSON parsing
    try {
        const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || aiContent.match(/```\s*([\s\S]*?)\s*```/);
        return JSON.parse((jsonMatch ? jsonMatch[1] : aiContent).trim());
    } catch (e) {
        // Fallback for non-JSON responses in chat mode
        if (maxTokens <= 500) return { chat_response: aiContent };
        throw e;
    }
}
