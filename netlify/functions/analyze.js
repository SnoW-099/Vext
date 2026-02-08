// VEXT Analysis Engine - FORENSIC STABILITY v4
const PRIMARY_MODEL = 'gemini-1.5-flash';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

    console.log('[VEXT-LOG] --- NEW REQUEST RECEIVED ---');
    console.log('[VEXT-LOG] Method:', event.httpMethod);
    console.log('[VEXT-LOG] isBase64:', !!event.isBase64Encoded);

    try {
        let rawBody = event.body;
        if (event.isBase64Encoded) {
            console.log('[VEXT-LOG] Decoding Base64 body...');
            rawBody = Buffer.from(event.body, 'base64').toString('utf8');
        }

        if (!rawBody) throw new Error('Cuerpo de la petición vacío');

        let body;
        try {
            body = JSON.parse(rawBody);
        } catch (je) {
            console.error('[VEXT-LOG] JSON Parse Error on Input:', je.message);
            console.log('[VEXT-LOG] Raw body snippet:', rawBody.slice(0, 100));
            throw new Error('Formato de datos inválido (JSON Error)');
        }

        const { hypothesis, mode = 'create', currentHtml = '', context: userContext = {}, is_chat_only = false } = body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        console.log(`[VEXT-LOG] Mode: ${mode}, isChat: ${is_chat_only}, HypoLen: ${hypothesis?.length || 0}`);

        if (!GEMINI_API_KEY) throw new Error('API Key faltante en variables de entorno');

        let systemPrompt = `Eres VEXT, un analista de negocios experto. Responde siempre en español.`;
        let userContent = `IDEA: "${hypothesis}"`;
        let maxTokens = 4000;
        let isChat = !!is_chat_only;

        if (isChat) {
            systemPrompt = `Eres VEXT. Responde de forma muy breve e inteligente (máx 2 frases). No generes código.`;
            userContent = `MENSAJE: "${hypothesis}"`;
            maxTokens = 800;
        } else if (mode === 'refine') {
            const gradeVal = userContext.gradePercent || 50;
            systemPrompt = `Eres VEXT. Modifica el código HTML según pida el usuario. 
            Responde ÚNICAMENTE en JSON con este formato exacto: 
            { "chat_response": "...", "analysis": { "grade": ${gradeVal}, ... }, "landing_page": { "tailwind_html": "..." } }`;
            userContent = `INSTRUCCIÓN: "${hypothesis}"\nHTML: ${currentHtml}`;
        } else {
            systemPrompt = `Eres VEXT. Analiza la idea y genera un JSON completo:
            { "analysis": { "grade": 80, "grade_letter": "A", "grade_explanation": "...", "target_audience": "...", "psychology": [], "strategy": "..." }, 
              "landing_page": { "headline": "...", "subheadline": "...", "tailwind_html": "..." },
              "viral_kit": { "hooks": [], "scripts": [] } }`;
        }

        const models = [PRIMARY_MODEL, 'gemini-1.5-pro', 'gemini-pro'];
        let lastError = null;

        for (const modelName of models) {
            try {
                console.log(`[VEXT-LOG] Attempting model: ${modelName}`);
                const result = await callGeminiAPI(systemPrompt, userContent, GEMINI_API_KEY, modelName, maxTokens, isChat);
                console.log(`[VEXT-LOG] Success with ${modelName}`);
                return { statusCode: 200, headers, body: JSON.stringify(result) };
            } catch (err) {
                console.error(`[VEXT-LOG] Failed ${modelName}:`, err.message);
                lastError = err;
            }
        }

        // --- SUPER FALLBACK ---
        console.warn('[VEXT-LOG] WARNING: All models failed. Returning Super-Fallback.');
        const fallbackResponse = {
            chat_response: "Lo siento, el motor de IA está saturado ahora mismo. He guardado tu idea, prueba a pedir un cambio pequeño en unos segundos.",
            analysis: { grade: 50, grade_letter: "B", grade_explanation: "Servicio en mantenimiento temporal." },
            landing_page: { tailwind_html: currentHtml || "<!-- Fallback -->" }
        };
        return { statusCode: 200, headers, body: JSON.stringify(fallbackResponse) };

    } catch (error) {
        console.error('[VEXT-LOG] CRITICAL ERROR:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Fallo crítico del sistema',
                details: error.message,
                trace: 'VEXT_TRACE_ALPHA'
            })
        };
    }
};

async function callGeminiAPI(sys, user, key, model, maxTokens, isChat) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `${sys}\n\n---\n\n${user}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens }
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google API ${model} Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (!candidate) throw new Error('No candidates in response');
    if (candidate.finishReason === 'SAFETY') throw new Error('Blocked by SAFETY filter');

    const aiText = candidate.content?.parts?.[0]?.text;
    if (!aiText) throw new Error('AI returned empty text');

    if (isChat) return { chat_response: aiText.trim() };

    try {
        const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) || aiText.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = (jsonMatch ? jsonMatch[1] : aiText).trim();
        return JSON.parse(jsonStr);
    } catch (pe) {
        console.error('[VEXT-LOG] JSON Extract Error:', pe.message);
        if (aiText.length < 500) return { chat_response: aiText };
        throw new Error('AI response was not valid JSON');
    }
}
