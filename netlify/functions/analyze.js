// VEXT Analysis Engine - TOTAL RELIABILITY v6
// Using 2026-tested stable model paths
const PRIMARY_MODEL = 'gemini-1.5-flash';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

    console.log('[VEXT] Starting execution...');

    try {
        let rawBody = event.body;
        if (event.isBase64Encoded) {
            rawBody = Buffer.from(event.body, 'base64').toString('utf8');
        }

        if (!rawBody) throw new Error('Body empty');
        const body = JSON.parse(rawBody);
        const { hypothesis, mode = 'create', currentHtml = '', context: userContext = {}, is_chat_only = false } = body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) throw new Error('API Key missing');

        let isChat = !!is_chat_only;
        let systemPrompt = `Eres VEXT, un analista experto. Genera un JSON con este formato: { "analysis": { "grade": 80, ... }, "landing_page": { "tailwind_html": "..." } }`;
        let userContent = `IDEA: "${hypothesis}"`;
        let maxTokens = 4000;

        if (isChat) {
            systemPrompt = `Eres VEXT. Responde de forma muy breve e inteligente (máx 2 frases).`;
            userContent = `MENSAJE: "${hypothesis}"`;
            maxTokens = 800;
        } else if (mode === 'refine') {
            const gradeVal = userContext.gradePercent || 50;
            systemPrompt = `Eres VEXT. Modifica el código HTML. Responde SOLO JSON con { "chat_response": "...", "analysis": { "grade": ${gradeVal}, ... }, "landing_page": { "tailwind_html": "..." } }`;
            userContent = `INSTRUCCIÓN: "${hypothesis}"\nHTML: ${currentHtml}`;
        }

        // --- MODEL & VERSION MATRIX ---
        const configs = [
            { ver: 'v1beta', mod: 'gemini-1.5-flash' },
            { ver: 'v1', mod: 'gemini-1.5-flash' },
            { ver: 'v1beta', mod: 'gemini-1.5-pro' },
            { ver: 'v1beta', mod: 'gemini-pro' }
        ];

        let lastErrorMsg = "No models available";

        for (const config of configs) {
            try {
                console.log(`[VEXT] Trying ${config.mod} via ${config.ver}...`);
                const result = await fetchGemini(systemPrompt, userContent, GEMINI_API_KEY, config.ver, config.mod, maxTokens, isChat);
                return { statusCode: 200, headers, body: JSON.stringify(result) };
            } catch (err) {
                console.warn(`[VEXT] Fail ${config.mod}/${config.ver}: ${err.message}`);
                lastErrorMsg = err.message;
                // If it's a key error, don't keep trying models
                if (err.message.includes('API_KEY')) break;
            }
        }

        // --- FALLBACK ---
        console.error('[VEXT] All models failed. Fallback triggered.');
        const fallback = {
            chat_response: `[VEXT-SISTEMA] Error técnico: ${lastErrorMsg.slice(0, 50)}. Estamos optimizando el motor. Por favor, intenta de nuevo en un momento.`,
            analysis: { grade: 70, grade_letter: "B", grade_explanation: "Análisis en pausa por saturación de red." },
            landing_page: { headline: "VEXT Safety Mode", tailwind_html: currentHtml || "<!-- Safe -->" }
        };
        return { statusCode: 200, headers, body: JSON.stringify(fallback) };

    } catch (error) {
        console.error('[VEXT] Fatal handler error:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Server Error', details: error.message })
        };
    }
};

async function fetchGemini(sys, user, key, version, model, maxT, isChat) {
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${key}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `${sys}\n\n---\n\n${user}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: maxT }
        })
    });

    if (!response.ok) {
        const text = await response.text();
        let msg = `Error ${response.status}`;
        try {
            const j = JSON.parse(text);
            msg = j.error?.message || msg;
        } catch (e) { }
        throw new Error(msg);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('No candidates');
    if (candidate.finishReason === 'SAFETY') throw new Error('Blocked: Safety');

    const aiText = candidate.content?.parts?.[0]?.text;
    if (!aiText) throw new Error('Empty AI response');

    if (isChat) return { chat_response: aiText.trim() };

    try {
        const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) || aiText.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = (jsonMatch ? jsonMatch[1] : aiText).trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        if (aiText.length < 500) return { chat_response: aiText };
        throw new Error('AI format invalid');
    }
}
