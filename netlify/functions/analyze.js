// VEXT Analysis Engine - ULTRA-STABLE & FAST
const PRIMARY_MODEL = 'gemini-1.5-flash-latest';

const VEXT_SYSTEM_PROMPT = `Eres VEXT, un analista de negocios experto.
**OBJETIVO:** Generar un análisis y una landing page en JSON.
**FORMATO OBLIGATORIO:**
{
  "analysis": { "grade": 0-100, "grade_letter": "A", "grade_explanation": "...", "target_audience": "...", "psychology": [], "strategy": "..." },
  "landing_page": { "headline": "...", "subheadline": "...", "tailwind_html": "..." },
  "viral_kit": { "hooks": [], "scripts": [] }
}`;

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

    try {
        // --- BASE64 DECODING SUPPORT ---
        let rawBody = event.body;
        if (event.isBase64Encoded) {
            rawBody = Buffer.from(event.body, 'base64').toString('utf8');
        }

        if (!rawBody) throw new Error('Cuerpo de la petición vacío');
        const body = JSON.parse(rawBody);

        const { hypothesis, mode = 'create', currentHtml = '', context: userContext = {}, is_chat_only = false } = body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY no configurada en el servidor');

        let systemPrompt = VEXT_SYSTEM_PROMPT;
        let userContent = `IDEA: "${hypothesis}"`;
        let maxTokens = 4000;
        let isChat = !!is_chat_only;

        if (isChat) {
            systemPrompt = `Eres VEXT. Responde de forma muy breve e inteligente en español (máx 2 frases). No generes código.`;
            userContent = `USUARIO: "${hypothesis}"`;
            maxTokens = 600;
        } else if (mode === 'refine') {
            const gradeVal = userContext.gradePercent || 50;
            systemPrompt = `Eres VEXT. Modifica el código HTML según pida el usuario. Responde SOLO JSON con: { "chat_response": "...", "analysis": { "grade": ${gradeVal}, ... }, "landing_page": { "tailwind_html": "..." } }`;
            userContent = `INSTRUCCIÓN: "${hypothesis}"\nHTML_ACTUAL: ${currentHtml}`;
        }

        console.log(`[VEXT] Procesando: mode=${mode}, is_chat=${isChat}`);

        // Iterar sobre modelos por si uno falla
        const models = [PRIMARY_MODEL, 'gemini-1.5-pro-latest', 'gemini-1.5-flash'];
        let lastError = null;

        for (const model of models) {
            try {
                const result = await callGemini(systemPrompt, userContent, GEMINI_API_KEY, model, maxTokens, isChat);
                return { statusCode: 200, headers, body: JSON.stringify(result) };
            } catch (err) {
                console.error(`[VEXT] Fallo con ${model}:`, err.message);
                lastError = err;
            }
        }

        throw lastError || new Error('Todos los modelos de IA fallaron');

    } catch (error) {
        console.error('[VEXT] Error Fatal:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Error del servidor VEXT',
                message: error.message,
                tip: 'Revisa tu conexión o intenta con una descripción más clara.'
            })
        };
    }
};

async function callGemini(sys, user, key, model, maxTokens, isChat) {
    // Usar la ruta correcta de Google AI Studio
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
        const text = await response.text();
        throw new Error(`API de Google respondió ${response.status}: ${text}`);
    }

    const data = await response.json();

    if (data.error) throw new Error(`Google API Error: ${data.error.message}`);

    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('No se recibió respuesta de la IA');

    if (candidate.finishReason === 'SAFETY') {
        throw new Error('La respuesta fue bloqueada por filtros de seguridad de Google. Intenta suavizar tu descripción.');
    }

    const aiText = candidate.content?.parts?.[0]?.text;
    if (!aiText) throw new Error('Respuesta de IA vacía');

    if (isChat) return { chat_response: aiText.trim() };

    // Limpieza de JSON robusta
    try {
        const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) || aiText.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = (jsonMatch ? jsonMatch[1] : aiText).trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        // Si el JSON falla pero el texto es corto, devolver como chat
        if (aiText.length < 400) return { chat_response: aiText };
        throw new Error('La IA no generó un formato de datos válido. Intenta simplificar tu petición.');
    }
}
