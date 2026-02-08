// VEXT Analysis Engine - DIAGNOSTIC v5
const PRIMARY_MODEL = 'gemini-1.5-flash';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

    console.log('[VEXT-DEBUG] Request start');

    try {
        let rawBody = event.body;
        if (event.isBase64Encoded) {
            rawBody = Buffer.from(event.body, 'base64').toString('utf8');
        }

        if (!rawBody) throw new Error('Cuerpo vacío');
        const body = JSON.parse(rawBody);
        const { hypothesis, mode = 'create', currentHtml = '', context: userContext = {}, is_chat_only = false } = body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) throw new Error('API Key no configurada');

        let isChat = !!is_chat_only;
        let systemPrompt = `Eres VEXT, un analista de negocios. Responde siempre en español.`;
        let userContent = `IDEA: "${hypothesis}"`;
        let maxTokens = 4000;

        if (isChat) {
            systemPrompt = `Eres VEXT. Responde de forma muy breve e inteligente (máx 2 frases).`;
            userContent = `MENSAJE: "${hypothesis}"`;
            maxTokens = 800;
        } else if (mode === 'refine') {
            const gradeVal = userContext.gradePercent || 50;
            systemPrompt = `Eres VEXT. Modifica el código HTML. 
            Responde ÚNICAMENTE en JSON: { "chat_response": "...", "analysis": { "grade": ${gradeVal}, ... }, "landing_page": { "tailwind_html": "..." } }`;
            userContent = `INSTRUCCIÓN: "${hypothesis}"\nHTML: ${currentHtml}`;
        } else {
            systemPrompt = `Eres VEXT. Analiza la idea y genera un JSON:
            { "analysis": { "grade": 80, "grade_letter": "A", "grade_explanation": "...", "target_audience": "...", "psychology": [], "strategy": "..." }, 
              "landing_page": { "valentine_code": "...", "tailwind_html": "..." },
              "viral_kit": { "hooks": [], "scripts": [] } }`;
        }

        const models = [PRIMARY_MODEL, 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];
        let lastErrorMsg = "Ningún modelo respondió";

        for (const modelName of models) {
            try {
                console.log(`[VEXT-DEBUG] Trying ${modelName}`);
                const result = await fetchGemini(systemPrompt, userContent, GEMINI_API_KEY, modelName, maxTokens, isChat);
                return { statusCode: 200, headers, body: JSON.stringify(result) };
            } catch (err) {
                console.warn(`[VEXT-DEBUG] ${modelName} fail: ${err.message}`);
                lastErrorMsg = err.message;
            }
        }

        // --- ENHANCED FALLBACK WITH DIAGNOSTICS ---
        console.error('[VEXT-DEBUG] CRITICAL: Fallback triggered. Reason:', lastErrorMsg);
        const fallback = {
            chat_response: `[SISTEMA] El motor de IA tiene dificultades. Motivo: ${lastErrorMsg.slice(0, 100)}. Intentando restaurar...`,
            analysis: { grade: 60, grade_letter: "C", grade_explanation: "Análisis básico de seguridad activado." },
            landing_page: { headline: "VEXT Safety Mode", tailwind_html: currentHtml || "<!-- Safe Mode -->" }
        };
        return { statusCode: 200, headers, body: JSON.stringify(fallback) };

    } catch (error) {
        console.error('[VEXT-DEBUG] Global Error:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error interno', details: error.message })
        };
    }
};

async function fetchGemini(sys, user, key, model, maxT, isChat) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

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
        // Extract a clean error message if possible
        let cleanErr = `API Error ${response.status}`;
        try {
            const errJson = JSON.parse(text);
            cleanErr = errJson.error?.message || cleanErr;
        } catch (e) { }
        throw new Error(cleanErr);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (!candidate) throw new Error('Sin candidatos en la respuesta');
    if (candidate.finishReason === 'SAFETY') throw new Error('Bloqueado por filtro de SEGURIDAD');

    const aiText = candidate.content?.parts?.[0]?.text;
    if (!aiText) throw new Error('Respuesta de IA vacía');

    if (isChat) return { chat_response: aiText.trim() };

    try {
        const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) || aiText.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = (jsonMatch ? jsonMatch[1] : aiText).trim();
        return JSON.parse(jsonStr);
    } catch (pe) {
        if (aiText.length < 500) return { chat_response: aiText };
        throw new Error('Formato JSON de IA inválido');
    }
}
