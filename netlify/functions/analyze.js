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
            const history = body.history || [];
            const historyText = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
            const gradeVal = userContext.gradePercent || 50;

            systemPrompt = `Eres VEXT, un Arquitecto de Producto Senior con memoria impecable.
            Tu misión es EVOLUCIONAR la landing page basándote en el historial y la nueva instrucción.
            
            CONTEXTO DE MEMORIA:
            ${historyText}
            
            REGLAS DE REFINAMIENTO:
            1. RAZONAMIENTO: Antes de cambiar el código, analiza qué pidió el usuario antes y qué pide ahora.
            2. CONSISTENCIA: Mantén el estilo visual (colores, fuentes) a menos que te pidan cambiarlo.
            3. LIMPIEZA: Si te piden quitar algo, bórralo del HTML. Si piden añadir, intégralo orgánicamente.
            4. CHAT: En "chat_response", explica brevemente por qué has tomado ciertas decisiones de diseño.
            
            ESTRUCTURA DEL JSON:
            {
              "chat_response": "Razonamiento y explicación de los cambios...",
              "analysis": { 
                 "grade": ${gradeVal}, 
                 "grade_letter": "A", 
                 "grade_explanation": "Análisis de la evolución...",
                 "target_audience": "${userContext.targeting || 'Audiencia ideal'}",
                 "psychology": [ { "trigger": "...", "explanation": "..." } ],
                 "strategy": "Siguiente paso estratégico..."
              },
              "landing_page": { 
                 "headline": "${userContext.title || 'Título'}", 
                 "subheadline": "${userContext.tagline || 'Subtítulo'}", 
                 "tailwind_html": "<!-- Código HTML REFINADO aquí -->" 
              }
            }`;
            userContent = `NUEVA INSTRUCCIÓN: "${hypothesis}"\nCÓDIGO HTML ACTUAL: ${currentHtml}`;
        } else {
            // Initial analysis - THE PRODUCTION ENGINE v4.0 (FORCE FULL GENERATION)
            systemPrompt = `Eres un Desarrollador Web Senior experto en Tailwind CSS y Conversión.
            Tu misión es entregar una Landing Page COMPLETA, PROFESIONAL y FUNCIONAL desde el primer análisis. 
            No puedes fallar. No puedes ser perezoso. DEBES incluir el tailwind_html completo.
            
            REGLAS TÉCNICAS INNEGOCIABLES:
            1. HTML COMPLETO: Genera el código HTML íntegro (Header, Hero, Features, Pricing, Testimonials, Footer).
            2. TAILWIND RESPONSIVO: Usa clases móviles (default) y desktop (md:). Ej: text-3xl md:text-6xl.
            3. IMÁGENES: Usa IDs reales de Unsplash para el sector del negocio.
            4. SIN PLACEHOLDERS: Escribe el código real de todas las secciones.
            
            ESTILO: Oscuro, Elegante, Minimalista (Vercel/Apple).
            
            RESPONDE ÚNICAMENTE CON ESTE JSON:
            {
              "analysis": { 
                 "grade": 0-100, 
                 "grade_letter": "A", 
                 "grade_explanation": "Tu análisis cínico y realista...", 
                 "target_audience": "...", 
                 "psychology": [ { "trigger": "...", "explanation": "..." } ],
                 "strategy": "..." 
              },
              "landing_page": { 
                 "headline": "...", 
                 "subheadline": "...", 
                 "tailwind_html": "<!-- Aquí el HTML completo con Tailwind -->" 
              },
              "viral_kit": { "hooks": [], "scripts": [] }
            }`;
        }

        const result = await fetchGroq(systemPrompt, userContent, GROQ_API_KEY, GROQ_MODEL, 8000, isChat);
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
