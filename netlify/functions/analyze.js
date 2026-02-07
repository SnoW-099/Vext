// Netlify Function: VEXT Analysis Engine
// Calls Gemini API with fallback and model listing for debugging

const VEXT_SYSTEM_PROMPT = `**ROLE:**
You are VEXT, a high-performance Tactical Conversion Architect... [Truncated for brevity, same as before] ...
**OUTPUT FORMAT (MANDATORY - JSON ONLY):**
...`;

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
        const { hypothesis } = JSON.parse(event.body);
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured' }) };
        }

        // 1. Try Primary Model (Gemini 1.5 Flash)
        try {
            const result = await callGemini(hypothesis, 'gemini-1.5-flash', GEMINI_API_KEY);
            return { statusCode: 200, headers, body: JSON.stringify(result) };
        } catch (error) {
            console.log('Primary model failed, trying fallback...');
        }

        // 2. Try Fallback Model (Gemini Pro)
        try {
            const result = await callGemini(hypothesis, 'gemini-pro', GEMINI_API_KEY);
            return { statusCode: 200, headers, body: JSON.stringify(result) };
        } catch (error) {
            console.log('Fallback model failed.');
        }

        // 3. If both fail, LIST AVAILABLE MODELS to debug
        const modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
        const modelsResponse = await fetch(modelsUrl);
        const modelsData = await modelsResponse.json();

        console.error('Available models:', JSON.stringify(modelsData));

        return {
            statusCode: 502,
            headers,
            body: JSON.stringify({
                error: 'No compatible models found',
                availableModels: modelsData,
                message: 'Please check the console logs or the availableModels property to see what models are enabled for your key.'
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

async function callGemini(hypothesis, model, key) {
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
        throw new Error(`Model ${model} failed with ${response.status}`);
    }

    const data = await response.json();
    const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiContent) throw new Error('Empty response');

    const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || aiContent.match(/```\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : aiContent;
    return JSON.parse(jsonString.trim());
}
