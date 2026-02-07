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
        grade: data.analysis?.grade_letter || calculateGradeLetter(data.analysis?.grade),
        gradePercent: data.analysis?.grade || 65,
        gradeExplanation: data.analysis?.grade_explanation || getGradeExplanation(data.analysis?.grade),
        strategy: data.analysis?.strategy || "Proyecto analizado. Listo para refinar.",
        targeting: data.analysis?.target_audience || 'Audiencia no definida.',
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

const SYSTEM_PROMPT = `
You are VEXT, an elite AI web architect. Generate a high-conversion Single Page Application (SPA).
DESIGN RULES:
1. Premium Aesthetic: Dark mode or high-contrast light. Use gradients, glassmorphism.
2. Navigation: Use anchor links (#features, #pricing). NO external pages.
3. Content: Hero, Features (Grid), Testimonials, Pricing, FAQ, Footer.
4. Interactive: Hover effects on all buttons/cards.
`;

function getGradeExplanation(score) {
    if (!score) return "El análisis no se ha completado correctamente. Inténtalo de nuevo.";
    if (score >= 90) return "Tu idea tiene un potencial excepcional. La fricción de mercado detectada es mínima y la demanda parece alta.";
    if (score >= 80) return "Tienes una base sólida. Con optimización en la oferta y el mensaje, podría ser un negocio líder.";
    if (score >= 70) return "El concepto es válido, pero le falta diferenciación clara frente a competidores establecidos.";
    if (score >= 50) return "Se detectan riesgos significativos en el modelo actual. Necesitas redefinir tu propuesta de valor única.";
    return "Existen fallos críticos en la viabilidad o ejecución. El mercado podría estar saturado o la demanda ser insuficiente.";
}

export async function refineHypothesis(currentHtml, instruction, context) {
    console.log('[VEXT API] Starting refinement...', { instruction });
    const url = `${API_BASE}/.netlify/functions/analyze`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            hypothesis: instruction, // Treated as instruction in refine mode
            mode: 'refine',
            currentHtml,
            context
        })
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'Unknown' }));
        console.error('[VEXT API] Refinement failed:', response.status, errorBody);
        throw new Error(`Refinement Error: ${response.status} - ${errorBody.details || errorBody.error || 'Unknown'}`);
    }

    const data = await response.json();
    return {
        // Merge with existing data structure where possible
        grade: data.analysis?.grade || context.grade,
        gradePercent: data.analysis?.grade || context.gradePercent,
        chatResponse: data.chat_response || 'Cambios aplicados.',
        websitePreview: {
            title: data.landing_page?.headline || context.title,
            tagline: data.landing_page?.subheadline || context.tagline,
            html: data.landing_page?.tailwind_html ? injectPreviewStyles(data.landing_page.tailwind_html) : ''
        }
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
            html: `
            <div class="bg-slate-900 text-white min-h-screen font-sans selection:bg-emerald-500 selection:text-white">
                <nav class="fixed w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
                    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <span class="font-bold text-xl tracking-tighter">VEXT<span class="text-emerald-400">.GENERATED</span></span>
                        <div class="hidden md:flex gap-8 text-sm font-medium text-slate-400">
                            <a href="#features" class="hover:text-emerald-400 transition-colors">Features</a>
                            <a href="#demo" class="hover:text-emerald-400 transition-colors">Demo</a>
                            <a href="#pricing" class="hover:text-emerald-400 transition-colors">Pricing</a>
                        </div>
                        <button class="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-2 rounded-full font-bold transition-all hover:scale-105">Get Started</button>
                    </div>
                </nav>

                <main>
                    <section class="pt-32 pb-20 px-6 text-center">
                        <div class="inline-block px-4 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
                            New: AI-Powered Analysis 2.0
                        </div>
                        <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
                            ${hypothesis.slice(0, 30)}...<br/>
                            <span class="text-emerald-500">Made Simple.</span>
                        </h1>
                        <p class="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                            Stop wasting time on manual processes. Our solution automates the heavy lifting so you can focus on what actually matters—growing your business.
                        </p>
                        <div class="flex flex-col md:flex-row justify-center gap-4">
                            <button class="bg-emerald-500 text-slate-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-emerald-400 transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
                                Start Free Trial
                            </button>
                            <button class="px-8 py-4 rounded-full font-bold text-lg border border-white/10 hover:bg-white/5 transition-all">
                                View Demo
                            </button>
                        </div>
                    </section>

                    <section id="features" class="py-24 bg-slate-800/50">
                        <div class="max-w-7xl mx-auto px-6">
                            <h2 class="text-3xl font-bold mb-16 text-center">Why Industry Leaders Choose Us</h2>
                            <div class="grid md:grid-cols-3 gap-8">
                                <div class="p-8 rounded-3xl bg-slate-900 border border-white/5 hover:border-emerald-500/30 transition-all group">
                                    <div class="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <svg class="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                    </div>
                                    <h3 class="text-xl font-bold mb-4">Lightning Fast</h3>
                                    <p class="text-slate-400 leading-relaxed">Optimized for speed and performance. Don't let slow tools hold you back anymore.</p>
                                </div>
                                <div class="p-8 rounded-3xl bg-slate-900 border border-white/5 hover:border-emerald-500/30 transition-all group">
                                    <div class="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <svg class="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                    </div>
                                    <h3 class="text-xl font-bold mb-4">Bank-Grade Security</h3>
                                    <p class="text-slate-400 leading-relaxed">Your data is encrypted and protected by enterprise-level security protocols.</p>
                                </div>
                                <div class="p-8 rounded-3xl bg-slate-900 border border-white/5 hover:border-emerald-500/30 transition-all group">
                                    <div class="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <svg class="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                                    </div>
                                    <h3 class="text-xl font-bold mb-4">Real-fime Analytics</h3>
                                    <p class="text-slate-400 leading-relaxed">Track your growth with our comprehensive dashboard and reporting tools.</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
            `
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
        body { overflow-x: hidden; scroll-behavior: smooth; }
    </style>
    <script>
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link) {
                e.preventDefault();
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                    const target = document.querySelector(href);
                    if (target) target.scrollIntoView({ behavior: 'smooth' });
                } else {
                    alert('Link disabled in preview mode.');
                }
            }
        });
    </script>
    `;
    return html.replace('</head>', `${styles}</head>`);
}

function calculateGradeLetter(score) {
    if (!score) return 'C';
    if (score >= 95) return 'S';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}
