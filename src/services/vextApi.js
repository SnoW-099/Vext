// VEXT API Service
// Handles communication with the Netlify function

const API_BASE = import.meta.env.DEV
    ? 'http://localhost:8888'
    : '';

export async function analyzeHypothesis(hypothesis) {
    console.log('[VEXT API] Starting analysis...', { hypothesis, API_BASE });

    const url = `${API_BASE}/.netlify/functions/analyze`;
    console.log('[VEXT API] Calling:', url);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hypothesis })
    });

    console.log('[VEXT API] Response status:', response.status);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[VEXT API] Error:', error);
        throw new Error(error.error || `API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[VEXT API] Success! Raw response:', data);

    // Transform to match existing frontend structure
    return {
        grade: data.analysis?.grade_letter || 'A',
        gradePercent: data.analysis?.grade || 87,
        targeting: data.analysis?.target_audience || '',
        psychology: data.analysis?.psychology?.map(p => p.trigger) || [],
        psychologyDetails: data.analysis?.psychology || [],
        websitePreview: {
            title: data.landing_page?.headline || hypothesis.slice(0, 50),
            tagline: data.landing_page?.subheadline || '',
            html: data.landing_page?.tailwind_html ? injectPreviewStyles(data.landing_page.tailwind_html) : ''
        },
        viralKit: {
            hooks: data.viral_kit?.hooks || [],
            scripts: data.viral_kit?.scripts || []
        },
        raw: data // Keep raw response for debugging
    };
}

// Fallback mock data for development without API
export function getMockAnalysis(hypothesis) {
    return {
        grade: 'A',
        gradePercent: 87,
        targeting: 'Young professionals aged 25-35 seeking productivity solutions',
        psychology: ['Urgency', 'Social Proof', 'Authority'],
        psychologyDetails: [
            { trigger: 'Urgency', explanation: 'Limited-time offer creates fear of missing out' },
            { trigger: 'Social Proof', explanation: 'Testimonials build trust and credibility' },
            { trigger: 'Authority', explanation: 'Expert positioning establishes dominance' }
        ],
        websitePreview: {
            title: hypothesis.slice(0, 50) + '...',
            tagline: 'Transform your workflow today',
            html: ''
        },
        viralKit: {
            hooks: [
                'The secret that 10x founders don\'t want you to know...',
                'I built a $1M business using just THIS strategy'
            ],
            scripts: [
                {
                    platform: 'TikTok',
                    duration: '15s',
                    script: '[HOOK] "Stop scrolling. This is important." [CUT] Show product [CUT] Results testimonial [CTA] "Link in bio"'
                }
            ]
        }
    };
}

function injectPreviewStyles(html) {
    const styles = `
    <style>
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #444; }
        body { overflow-x: hidden; }
    </style>
    `;
    return html.replace('</head>', `${styles}</head>`);
}
