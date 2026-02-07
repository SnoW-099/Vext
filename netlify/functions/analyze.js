// Netlify Function: VEXT Analysis Engine
// Calls Gemini API with auto-discovery of available models

const VEXT_SYSTEM_PROMPT = `**ROLE:**
Eres VEXT, un analista de negocios brutalmente honesto y experto en conversión digital. NO eres amable por defecto. Tu trabajo es dar una evaluación REAL del potencial de negocio del usuario.

**TU FILOSOFÍA:**
- Si la idea es mala, DILO CLARAMENTE. No des falsas esperanzas.
- Si la idea no tiene sentido comercial, da nota F (0-30).
- Si la idea es vaga o genérica, da nota D (30-50).
- Si la idea es decente pero sin diferenciación, da nota C (50-70).
- Si la idea tiene potencial real, da nota B (70-85).
- Si la idea es excelente con ventaja competitiva clara, da nota A (85-95).
- Solo ideas excepcionales merecen S (95-100).

**OBJETIVO:**
Analizar la visión del usuario y generar:
1. Una Landing Page minimalista (Tailwind CSS, fondo negro, acentos verde neón #00ff88).
2. Triggers psicológicos REALES (no genéricos).
3. Una nota HONESTA con justificación.
4. Scripts virales para TikTok/Reels.

**REGLAS DE EVALUACIÓN:**
- "Una tienda de ropa" → F/D. Demasiado genérico.
- "Una web de cacas" → F. Sin sentido comercial.
- "App de fitness para embarazadas con IA" → B/A. Nicho específico + tecnología.
- NUNCA des 87 a todo. Varía las notas según el input.

**TONO:**
- Directo y profesional, no robótico.
- Responde en español.
- Críticas constructivas pero sin suavizar la realidad.

**ESTÉTICA (OBLIGATORIO):**
- Background #000000, Acentos #00ff88 (verde neón).
- Tipografía limpia Inter/Geist. 
- Alto contraste, mucho espacio blanco, bordes zinc-800.
- Solo UN call-to-action claro.

**OUTPUT (SOLO JSON VÁLIDO):**
{
  "analysis": {
    "grade": "Número 0-100 HONESTO según la calidad de la idea",
    "grade_letter": "F/D/C/B/A/S según grade",
    "target_audience": "Perfil demográfico y psicográfico REALISTA",
    "psychology": [
      {"trigger": "Trigger específico", "explanation": "Por qué funciona para conversión"}
    ],
    "strategy": "Resumen estratégico de 2 líneas explicando el enfoque tomado (ej: 'Se prioriza la prueba social y la urgencia...')"
  },
  "landing_page": {
    "headline": "Headline magnético",
    "subheadline": "Subtítulo con beneficio claro",
    "tailwind_html": "<html><head><script src='https://cdn.tailwindcss.com'></script></head><body class='min-h-screen bg-black text-white'>...</body></html>"
  },
  "viral_kit": {
    "hooks": ["Hook 1", "Hook 2"],
    "scripts": [{"platform": "TikTok", "duration": "15s", "script": "Script completo..."}]
  }
}

CRÍTICO: tailwind_html debe ser un documento HTML COMPLETO con Tailwind CDN. Mobile-first.`;

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const { hypothesis, mode = 'create', currentHtml = '', context = {} } = JSON.parse(event.body);
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
        }

        // MODE: REFINE (Modify existing HTML)
        if (mode === 'refine') {
            console.log('[REFINE] Mode activated');
            console.log('[REFINE] Hypothesis/Instruction:', hypothesis);
            console.log('[REFINE] CurrentHtml length:', currentHtml?.length || 0);
            console.log('[REFINE] Context:', JSON.stringify(context));

            // Safely extract context values and escape them
            const gradeValue = context.gradePercent || context.grade || 50;
            const gradeLetter = context.grade || 'C';
            const titleSafe = String(context.title || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            const taglineSafe = String(context.tagline || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            const instructionSafe = String(hypothesis).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

            const REFINE_PROMPT = `Eres VEXT, un asistente de diseño web amigable y experto. El usuario te ha pedido que modifiques su landing page.

**Instrucción del usuario:** "${instructionSafe}"

**Tu personalidad:**
- Eres cercano, profesional pero no robótico
- Respondes siempre en español
- Explicas brevemente qué cambios hiciste y por qué
- Si la instrucción no tiene sentido, lo dices amablemente

**IMPORTANTE:**
1. PRIORIDAD ABSOLUTA a la instrucción visual del usuario. SIEMPRE obedece cambios de color/estilo.
2. Si el usuario pide "minimalista", "blanco y negro" o similar, ELIMINA el estilo neón/negro por defecto.
3. SOLO si el usuario NO especifica colores, mantén el estilo VEXT (fondo negro, acentos neón).
4. Sé camaleónico: adáptate al estilo que pida el usuario.

**Responde SOLO con este JSON:**
{
  "chat_response": "Tu respuesta natural y amigable explicando los cambios (máx 2 frases)",
  "analysis": {
    "grade": ${gradeValue},
    "grade_letter": "${gradeLetter}",
    "psychology": []
  },
  "landing_page": {
    "headline": "Nuevo headline si cambió",
    "subheadline": "Nuevo subheadline si cambió",
    "tailwind_html": "HTML COMPLETO ACTUALIZADO"
  }
}
`;

            // Re-use callGemini but with specific prompt
            try {
                const refinement = await callGeminiWithPrompt(REFINE_PROMPT, currentHtml, GEMINI_API_KEY);
                return { statusCode: 200, headers, body: JSON.stringify(refinement) };
            } catch (error) {
                console.error('Refinement failed:', error);
                return { statusCode: 500, headers, body: JSON.stringify({ error: 'Refinement failed', details: error.message }) };
            }
        }

        // MODE: CREATE (Standard Logic) followed by existing code...

        // 1. Try Primary Model (Gemini 1.5 Flash)
        try {
            const result = await callGemini(hypothesis, 'gemini-1.5-flash', GEMINI_API_KEY);
            return { statusCode: 200, headers, body: JSON.stringify(result) };
        } catch (error) {
            console.log('Primary model failed:', error.message);
        }

        // 2. Try Fallback Model (Gemini Pro)
        try {
            const result = await callGemini(hypothesis, 'gemini-pro', GEMINI_API_KEY);
            return { statusCode: 200, headers, body: JSON.stringify(result) };
        } catch (error) {
            console.log('Fallback model failed:', error.message);
        }

        // 3. AUTO-DISCOVERY: Fetch available models and use the best one
        try {
            console.log('Attempting model auto-discovery...');
            const modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
            const modelsResponse = await fetch(modelsUrl);
            const modelsData = await modelsResponse.json();

            if (!modelsData.models) {
                throw new Error('Failed to list models');
            }

            // Find valid models that support generation
            const validModels = modelsData.models.filter(m =>
                m.supportedGenerationMethods &&
                m.supportedGenerationMethods.includes('generateContent')
            );

            // Sort by preference: Flash > Pro > Default
            validModels.sort((a, b) => {
                const scoreA = getModelScore(a.name);
                const scoreB = getModelScore(b.name);
                return scoreB - scoreA;
            });

            if (validModels.length > 0) {
                console.log(`Found ${validModels.length} candidates. Trying in order of preference...`);

                for (const model of validModels) {
                    const modelName = model.name.replace(/^models\//, '');
                    console.log(`Trying auto-discovered model: ${modelName}`);

                    try {
                        const result = await callGemini(hypothesis, modelName, GEMINI_API_KEY);
                        console.log(`Success with ${modelName}`);
                        return { statusCode: 200, headers, body: JSON.stringify(result) };
                    } catch (modelError) {
                        console.warn(`Failed with ${modelName}:`, modelError.message);
                        // Continue to next model
                    }
                }
            }

            console.error('All auto-discovered models failed.');
            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({
                    error: 'All AI models failed',
                    message: 'Tried all available models but none worked. Check quotas.',
                    debug_models: modelsData.models.map(m => ({ name: m.name, methods: m.supportedGenerationMethods }))
                })
            };
        } catch (autoError) {
            console.error('Auto-discovery failed:', autoError);
            return {
                statusCode: 502,
                headers,
                body: JSON.stringify({
                    error: 'Auto-discovery error',
                    message: autoError.message
                })
            };
        }

        return {
            statusCode: 502,
            headers,
            body: JSON.stringify({
                error: 'All AI models failed',
                message: 'Could not find a working Gemini model for this API key.'
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', message: error.message })
        };
    }
};

function getModelScore(name) {
    if (name.includes('1.5-flash')) return 10;
    if (name.includes('gemini-pro')) return 8;
    if (name.includes('flash')) return 6;
    if (name.includes('1.0-pro')) return 5;
    return 1;
}

async function callGemini(hypothesis, model, key) {
    // API endpoint expects models/{modelName}:generateContent
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    console.log(`Attempting to call ${model}...`);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `${VEXT_SYSTEM_PROMPT}\n\n---\n\nAnalyze: "${hypothesis}"` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: "application/json" }
        })
    });

    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Model ${model} failed with ${response.status}: ${txt}`);
    }

    const data = await response.json();
    const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiContent) throw new Error('Empty response');

    const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || aiContent.match(/```\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
    return JSON.parse(jsonString.trim());
}

async function callGeminiWithPrompt(systemPrompt, userContent, key) {
    console.log('[REFINE] Starting auto-discovery for refinement...');
    console.log('[REFINE] User content length:', userContent?.length || 0);

    // First, discover what models are available
    const modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const modelsResponse = await fetch(modelsUrl);
    const modelsData = await modelsResponse.json();

    if (!modelsData.models) {
        throw new Error('Failed to list available models');
    }

    // Filter models that support generateContent
    const validModels = modelsData.models.filter(m =>
        m.supportedGenerationMethods &&
        m.supportedGenerationMethods.includes('generateContent')
    );

    // Sort by preference (same logic as CREATE mode)
    validModels.sort((a, b) => {
        const scoreA = getModelScore(a.name);
        const scoreB = getModelScore(b.name);
        return scoreB - scoreA;
    });

    console.log('[REFINE] Found', validModels.length, 'valid models');

    // Try each model until one works
    for (const modelObj of validModels) {
        const model = modelObj.name.replace(/^models\//, '');
        console.log('[REFINE] Trying model:', model);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${systemPrompt}\n\n---\n\nCONTENT TO MODIFY:\n${userContent || 'No content provided'}` }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: "application/json" }
                })
            });

            if (!response.ok) {
                console.error(`[REFINE] Model ${model} failed:`, response.status);
                continue;
            }

            const data = await response.json();
            const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!aiContent) {
                console.error('[REFINE] Empty response from', model);
                continue;
            }

            console.log('[REFINE] Success with', model);

            // Parse JSON
            const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || aiContent.match(/```\s*([\s\S]*?)\s*```/);
            const jsonString = jsonMatch ? jsonMatch[1] : aiContent;

            try {
                return JSON.parse(jsonString.trim());
            } catch (parseError) {
                console.error('[REFINE] JSON parse failed:', parseError.message);
                continue;
            }
        } catch (fetchError) {
            console.error(`[REFINE] Fetch error with ${model}:`, fetchError.message);
            continue;
        }
    }

    throw new Error('All refinement models failed');
}
