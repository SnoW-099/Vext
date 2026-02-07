// VEXT Analysis Engine - HYPER-ROBUST VERSION
const PRIMARY_MODEL = 'gemini-1.5-flash';

const VEXT_SYSTEM_PROMPT = `Eres VEXT, un analista experto. Genera un JSON con este formato:
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
        if (!event.body) throw new Error('No body provided in request');

        const body = JSON.parse(event.body);
        const { hypothesis, mode = 'create', currentHtml = '', context: userContext = {}, is_chat_only = false } = body;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing in server environment');

        let systemPrompt = VEXT_SYSTEM_PROMPT;
        let userContent = `IDEA: "${hypothesis || 'No idea provided'}"`;
        let maxTokens = 4000;
        let isChat = !!is_chat_only;

        if (isChat) {
            systemPrompt = `Eres VEXT. Responde de forma breve y amigable en español (máx 2 frases). No generes código.`;
            userContent = `USER: "${hypothesis}"`;
            maxTokens = 600;
        } else if (mode === 'refine') {
            const gradeVal = userContext.gradePercent || 50;
            systemPrompt = `Eres VEXT. Modifica el HTML. Responde SOLO JSON: { "chat_response": "...", "analysis": { "grade": ${gradeVal}, ... }, "landing_page": { "tailwind_html": "..." } }`;
            userContent = `INSTRUCTION: "${hypothesis}"\nHTML: ${currentHtml}`;
        }

        console.log(`[VEXT] Executing: mode=${mode}, model=${PRIMARY_MODEL}`);

        // Try primary model then fallback
        const models = [PRIMARY_MODEL, 'gemini-1.5-flash', 'gemini-pro'];
        let lastErr = null;

        for (const model of models) {
            try {
                const result = await runGemini(systemPrompt, userContent, GEMINI_API_KEY, model, maxTokens, isChat);
                return { statusCode: 200, headers, body: JSON.stringify(result) };
            } catch (err) {
                console.error(`[VEXT] Model ${model} failed:`, err.message);
                lastErr = err;
            }
        }

        throw lastErr || new Error('All models failed');

    } catch (error) {
        console.error('[VEXT] Global Crash:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal server error',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};

async function runGemini(sys, user, key, model, maxTokens, isChat) {
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
        const txt = await response.text();
        throw new Error(`Gemini API Error (${model}): ${response.status} - ${txt}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(`Gemini API returned error: ${data.error.message}`);
    }

    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
        if (data.promptFeedback?.blockReason) {
            throw new Error(`Content blocked by safety filter: ${data.promptFeedback.blockReason}`);
        }
        throw new Error(`No candidates in Gemini response for ${model}`);
    }

    if (isChat) return { chat_response: aiText.trim() };

    // JSON extraction logic
    try {
        const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) || aiText.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = (jsonMatch ? jsonMatch[1] : aiText).trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('[VEXT] JSON Error:', e.message, 'Raw text length:', aiText.length);
        if (aiText.length < 500) return { chat_response: aiText };
        throw new Error('AI failed to generate valid JSON format');
    }
}
