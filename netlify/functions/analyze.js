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
            // Initial analysis - THE ARCHITECT PROMPT (Ultra Premium)
            systemPrompt += `
            ACTÚA COMO UN DISEÑADOR WEB SENIOR DE SILICON VALLEY. 
            Tu objetivo es crear una landing page "World Class" que enamore al usuario.
            
            REGLAS CRÍTICAS DE CALIDAD:
            - TODO el contenido debe estar dentro de un contenedor <div class="bg-[#0a0a0a] min-h-screen text-white font-sans">.
            - USA GRADIENTES: text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400.
            - USA GLASSMORPHISM: bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl.
            - IMÁGENES: Usa imágenes de alta calidad de Unsplash (ej: https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80).
            - SECCIONES OBLIGATORIAS:
                1. Nav (Glassmorphism fixed).
                2. Hero (Título gigante, Subtítulo elegante, Botón con sombra brillante).
                3. Social Proof (Logos de empresas ficticias o "Trusted by 1000+ users").
                4. Features Grid (3 columnas con iconos y borde sutil).
                5. High-Conversion Pricing (3 planes, el central destacado con gradiente).
                6. Footer (Elegant, dark).
            
            ESTRUCTURA DEL JSON:
            {
              "analysis": { 
                 "grade": 0-100, 
                 "grade_letter": "A", 
                 "grade_explanation": "Explicación brillante...", 
                 "target_audience": "Audiencia detallada...", 
                 "psychology": [ { "trigger": "Urgencia", "explanation": "..." } ],
                 "strategy": "Estrategia de crecimiento..." 
              },
              "landing_page": { 
                 "headline": "Título Impactante", 
                 "subheadline": "Subtítulo Persuasivo", 
                 "tailwind_html": "<!-- Código HTML Profesional Aquí con Tailwind -->" 
              },
              "viral_kit": { "hooks": ["Gancho 1"], "scripts": ["Script 1"] }
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
