// VEXT Analysis Engine - GROQ HYPER-SPEED EDITION
const GROQ_MODEL = 'llama-3.3-70b-versatile';

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

    console.log('[VEXT] Groq Execution Started');

    try {
        let rawBody = event.body;
        if (event.isBase64Encoded) {
            rawBody = Buffer.from(event.body, 'base64').toString('utf8');
        }

        if (!rawBody) throw new Error('Body empty');
        const body = JSON.parse(rawBody);
        const { hypothesis, mode = 'create', currentHtml = '', context: userContext = {}, is_chat_only = false } = body;
        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set in Netlify environment');

        let isChat = !!is_chat_only;
        let systemPrompt = `Eres VEXT, un analista de negocios experto. Tu misión es analizar ideas y generar landing pages de alto impacto.
        RESPONDE SIEMPRE EN ESPAÑOL.
        SIEMPRE RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO.`;

        let userContent = `Analiza esta idea de negocio: "${hypothesis}"`;
        let maxTokens = 4000;

        if (isChat) {
            systemPrompt = `Eres VEXT. Responde de forma muy breve e inteligente (máximo 2 frases).`;
            userContent = `Mensaje del usuario: "${hypothesis}"`;
            maxTokens = 800;
        } else if (mode === 'refine') {
            const gradeVal = userContext.gradePercent || 50;
            systemPrompt = `Eres VEXT. Tu tarea es modificar el código HTML de la landing page según las instrucciones.
            RESPONDE ÚNICAMENTE CON UN OBJETO JSON que incluya:
            1. "chat_response": Explicación breve del cambio.
            2. "analysis": Objeto con el análisis actualizado (grade: ${gradeVal}).
            3. "landing_page": Objeto con el nuevo "tailwind_html".`;
            userContent = `Instrucción: "${hypothesis}"\nCódigo HTML actual: ${currentHtml}`;
        } else {
            // Initial analysis prompt - STRENGTHENED
            systemPrompt += `
            DEBES GENERAR UNA LANDING PAGE COMPLETA Y PROFESIONAL.
            
            REGLAS DE DISEÑO:
            - Usa Tailwind CSS.
            - Estilo: Moderno, Minimalista, Apple-like.
            - Colores: Fondo oscuro (#0a0a0a) con acentos vibrantes.
            - Secciones: Hero con CTA, Características, Prueba Social, Precios, Footer.
            - Imágenes: Usa <img src="https://images.unsplash.com/photo-..." alt="...">.
            - Interactividad: Usa efectos hover de Tailwind.
            
            ESTRUCTURA OBLIGATORIA DEL JSON:
            {
              "analysis": { 
                "grade": 0-100, 
                "grade_letter": "A", 
                "grade_explanation": "...", 
                "target_audience": "...", 
                "psychology": [ { "trigger": "...", "explanation": "..." } ], 
                "strategy": "..." 
              },
              "landing_page": { 
                "valentine_code": "VEXT-2026", 
                "headline": "...", 
                "subheadline": "...", 
                "tailwind_html": "<div class='min-h-screen bg-black text-white'>... código completo aquí ...</div>" 
              },
              "viral_kit": { 
                "hooks": ["Gancho 1", "Gancho 2"], 
                "scripts": ["Guion 1", "Guion 2"] 
              }
            }`;
        }

        const result = await fetchGroq(systemPrompt, userContent, GROQ_API_KEY, GROQ_MODEL, maxTokens, isChat);
        return { statusCode: 200, headers, body: JSON.stringify(result) };

    } catch (error) {
        console.error('[VEXT] Fatal Error:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Error en el servidor VEXT',
                details: error.message,
                chat_response: `[Error] No he podido procesar tu solicitud: ${error.message}`
            })
        };
    }
};

async function fetchGroq(sys, user, key, model, maxT, isChat) {
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: sys },
                { role: 'user', content: user }
            ],
            temperature: 0.7,
            max_tokens: maxT,
            response_format: isChat ? undefined : { type: 'json_object' }
        })
    });

    if (!response.ok) {
        const text = await response.text();
        console.error('[GROQ ERROR]', text);
        throw new Error(`Groq API Error: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content;

    if (!aiText) throw new Error('Groq no devolvió texto');

    if (isChat) return { chat_response: aiText.trim() };

    try {
        return JSON.parse(aiText);
    } catch (e) {
        // Fallback search for JSON in string
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        throw new Error('Formato JSON inválido de Groq');
    }
}
