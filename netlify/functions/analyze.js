// VEXT Analysis Engine - 2026 FRONTIER v8
const PRIMARY_MODEL = 'gemini-2.5-flash';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

    console.log('[VEXT] Global Execution v8');

    try {
        let rawBody = event.body;
        if (event.isBase64Encoded) {
            rawBody = Buffer.from(event.body, 'base64').toString('utf8');
        }

        if (!rawBody) throw new Error('Body empty');
        const body = JSON.parse(rawBody);
        const { hypothesis, mode = 'create', currentHtml = '', context: userContext = {}, is_chat_only = false } = body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');

        let isChat = !!is_chat_only;
        let systemPrompt = `Eres VEXT, un analista de élite. Responde siempre en español. Formato JSON.`;
        let userContent = `IDEA: "${hypothesis}"`;
        let maxTokens = 4000;

        if (isChat) {
            systemPrompt = `Eres VEXT. Responde muy brevemente (máx 2 frases).`;
            userContent = `MENSAJE: "${hypothesis}"`;
            maxTokens = 800;
        } else if (mode === 'refine') {
            const gradeVal = userContext.gradePercent || 50;
            systemPrompt = `Eres VEXT. Modifica el HTML. Responde SOLO JSON con { "chat_response": "...", "analysis": { "grade": ${gradeVal}, ... }, "landing_page": { "tailwind_html": "..." } }`;
            userContent = `INSTRUCCIÓN: "${hypothesis}"\nHTML: ${currentHtml}`;
        }

        // --- 2026 MODEL MATRIX ---
        const configs = [
            { ver: 'v1beta', mod: 'gemini-2.5-flash' },
            { ver: 'v1beta', mod: 'gemini-2.5-pro' },
            { ver: 'v1beta', mod: 'gemini-3-flash-preview' },
            { ver: 'v1beta', mod: 'gemini-1.5-flash' }, // Legacy fallback
            { ver: 'v1', mod: 'gemini-1.5-flash' }  // Ultra-Legacy
        ];

        let errors = [];

        for (const config of configs) {
            try {
                console.log(`[VEXT] Attempting ${config.mod} (${config.ver})`);
                const result = await fetchGemini(systemPrompt, userContent, GEMINI_API_KEY, config.ver, config.mod, maxTokens, isChat);
                return { statusCode: 200, headers, body: JSON.stringify(result) };
            } catch (err) {
                console.warn(`[VEXT] Skip ${config.mod}: ${err.message}`);
                errors.push(`${config.mod}: ${err.message.slice(0, 50)}`);
                if (err.message.includes('API_KEY')) break;
            }
        }

        // --- EMERGENCY DIAGNOSTIC ---
        let availableModels = "Unknown";
        try {
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
            const listRes = await fetch(listUrl);
            const listData = await listRes.json();
            availableModels = listData.models?.map(m => m.name.split('/').pop()).join(', ') || "NoneFound";
        } catch (e) { availableModels = "ErrorListingModels"; }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                chat_response: `[VEXT] Error de Modelos. Intentados: ${errors.join(' | ')}. Tu cuenta dispone de: ${availableModels}.`,
                analysis: { grade: 0, grade_letter: "F", grade_explanation: "Fallo de sincronización de modelos." },
                landing_page: { headline: "Config Error", tailwind_html: currentHtml || "<!-- Error -->" }
            })
        };

    } catch (error) {
        console.error('[VEXT] Fatal:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
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
        let msg = `Err ${response.status}`;
        try {
            const j = JSON.parse(text);
            msg = j.error?.message || msg;
        } catch (e) { }
        throw new Error(msg);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('No candidates');
    if (candidate.finishReason === 'SAFETY') throw new Error('Safety filter');

    const aiText = candidate.content?.parts?.[0]?.text;
    if (!aiText) throw new Error('No text');

    if (isChat) return { chat_response: aiText.trim() };

    try {
        const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) || aiText.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = (jsonMatch ? jsonMatch[1] : aiText).trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        if (aiText.length < 500) return { chat_response: aiText };
        throw new Error('Invalid JSON format');
    }
}
