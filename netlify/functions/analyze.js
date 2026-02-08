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
            systemPrompt = `ACTÚA COMO UN ARQUITECTO DE NEGOCIOS CÍNICO Y EXIGENTE. 
            Tu misión es refinar la landing page basándote en las instrucciones del usuario, pero manteniendo un estándar de calidad brutal.
            
            REGLAS ABSOLUTAS:
            1. RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO.
            2. Si piden "quitar algo", elimínalo del código HTML de forma limpia.
            3. Si piden cambios de diseño, usa Tailwind CSS profesional (Glassmorphism, gradientes, espaciado perfecto).
            4. El "chat_response" debe ser breve, inteligente y un poco arrogante/directo (estilo VEXT).
            
            ESTRUCTURA DEL JSON:
            {
              "chat_response": "Explicación breve de lo que has hecho...",
              "analysis": { 
                 "grade": ${gradeVal}, 
                 "grade_letter": "A", 
                 "grade_explanation": "Tu análisis sutil aquí...",
                 "target_audience": "${userContext.targeting || 'Audiencia ideal'}",
                 "psychology": [ { "trigger": "...", "explanation": "..." } ],
                 "strategy": "Estrategia de crecimiento..."
              },
              "landing_page": { 
                 "headline": "${userContext.title || 'Título'}", 
                 "subheadline": "${userContext.tagline || 'Subtítulo'}", 
                 "tailwind_html": "<!-- Código HTML modificado con Tailwind -->" 
              }
            }`;
            userContent = `INSTRUCCIÓN DEL USUARIO: "${hypothesis}"\nCÓDIGO HTML ACTUAL: ${currentHtml}`;
        } else {
            // Initial analysis - THE PRODUCTION ENGINE v3.1 (STABLE & RESPONSIVE)
            systemPrompt += `
            ACTÚA COMO UN SENIOR UI/UX ENGINEER. Tu objetivo es una web impecable y RESPONSIVA.
            
            REGLAS DE ORO DE DISEÑO (PROXIMIDAD Y ESCALA):
            1. TIPOGRAFÍA RESPONSIVA: Usa clases como "text-4xl md:text-7xl". NUNCA uses text-7xl fijo (rompe en móvil). Usa "leading-tight" y "tracking-tighter".
            2. NAVEGACIÓN LIMPIA: El Nav debe ser simple. Evita que ocupe demasiado espacio o tape el texto. Usa "sticky top-0 z-50 bg-black/50 backdrop-blur-lg".
            3. IMÁGENES QUE CARGAN: Usa IDs de Unsplash variados. Usa "w-full aspect-video object-cover rounded-2xl" para que se vean bien.
            4. BENTO GRIDS INTELIGENTES: En móvil usa "grid-cols-1", en desktop "md:grid-cols-3". 
            5. ESPACIADO: Usa "px-6" para móvil y "md:px-12" para desktop. No dejes que el texto toque los bordes.
            
            ESTILO VISUAL: Minimalismo técnico. Mucho espacio negativo, bordes muy finos (border-white/5), tipografía Sans (Inter).
            
            JSON OUTPUT STRICT:
            {
              "analysis": { 
                 "grade": 0-100, 
                 "grade_letter": "A", 
                 "grade_explanation": "Análisis experto...", 
                 "target_audience": "...", 
                 "psychology": [ { "trigger": "...", "explanation": "..." } ],
                 "strategy": "..." 
              },
              "landing_page": { 
                 "headline": "...", 
                 "subheadline": "...", 
                 "tailwind_html": "<!-- Código HTML PROFESIONAL, RESPONSIVO y SIN ERRORES DE DISEÑO -->" 
              },
              "viral_kit": { "hooks": [], "scripts": [] }
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
