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
            // Initial analysis - THE PRODUCTION ENGINE v3.0 (IMMACULATE DESIGN)
            systemPrompt += `
            ACTÚA COMO UN SENIOR PRODUCT DESIGNER DE ELITE (ESTILO VERCEL/APPLE/LINEAR).
            Tu misión es crear una Landing Page de impacto visual absoluto y conversión máxima.
            
            DIRECCIÓN DE ARTE OBLIGATORIA:
            1. ESPACIADO Y LAYOUT: Prohibido centrar todo en una columna estrecha. Usa secciones de ancho completo (max-w-7xl mx-auto px-6).
            2. TIPOGRAFÍA MODERNA: Headlines masivos (text-6xl a text-8xl), tracking-tighter, y gradientes elegantes de blanco a gris plata.
            3. IMÁGENES DE ALTO RENDIMIENTO: Usa Unsplash con IDs específicos para dar realismo.
               - Ej: Tecnología/IA (photo-1677442136019-21780ecad995), Business (photo-1460925895917-afdab827c52f), Lifestyle (photo-1511367461989-f85a21fda167).
            4. COMPONENTES DE ALTA FIDELIDAD:
               - Bento Grids para mostrar características de forma moderna.
               - Glassmorphism real: bg-white/5 backdrop-blur-xl border border-white/10.
               - Micro-animaciones: hover:scale-[1.02] transition-transform.
            5. ESTRUCTURA: Nav fixed (blur), Hero explosivo, Marquee de "Confianza", Grid de beneficios, Pricing Profesional, Footer minimalista.
            
            JSON OUTPUT STRICT:
            {
              "analysis": { 
                 "grade": 0-100, 
                 "grade_letter": "A", 
                 "grade_explanation": "Crítica brutal, experta y directa...", 
                 "target_audience": "Perfil detallado...", 
                 "psychology": [ { "trigger": "...", "explanation": "..." } ],
                 "strategy": "Plan de ejecución..." 
              },
              "landing_page": { 
                 "headline": "...", 
                 "subheadline": "...", 
                 "tailwind_html": "<!-- Código HTML de Nivel Producción 2026 -->" 
              },
              "viral_kit": { "hooks": ["Gancho Disruptivo"], "scripts": ["Guion Pro"] }
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
