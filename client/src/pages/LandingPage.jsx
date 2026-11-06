import React, { useState } from 'react';
import { useSEO } from '../hooks/useSEO.js';
import CheckoutModal from '../components/common/CheckoutModal.jsx';
import {
  Layers,
  Zap,
  GitBranch,
  ShieldCheck,
  BarChart3,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Star,
  ChevronDown,
  Building2,
  FolderKanban,
  Activity,
  Github,
  Mail,
  ExternalLink,
  Lock,
  Cpu
} from 'lucide-react';

const PLANS = [
  {
    id: 'free',
    name: 'Starter Developer',
    description: 'Perfect for indie hackers and small engineering teams getting started.',
    monthlyPrice: 0,
    annualPrice: 0,
    badge: 'Free Forever',
    popular: false,
    features: [
      'Up to 3 Team Members',
      'Unlimited Tasks & Columns',
      'O(1) Fractional Lexorank Kanban',
      'Real-Time Socket.IO Synchronization',
      'Basic Activity Audit Trail',
      'Community Support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Agile Team',
    description: 'Designed for fast-moving product squads requiring automated sprint velocity.',
    monthlyPrice: 29,
    annualPrice: 279,
    badge: 'Most Popular',
    popular: true,
    features: [
      'Unlimited Team Members',
      'Agile Sprints & Automated Rollover',
      'Milestone Gate Tracking',
      'GitHub Webhook Commit & PR Sync',
      'Burndown Charts & Velocity Analytics',
      'Streaming CSV & Excel Telemetry Export',
      'Priority Email & Slack Support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise Architect',
    description: 'High-compliance, multi-tenant isolation for enterprise engineering organizations.',
    monthlyPrice: 99,
    annualPrice: 950,
    badge: 'Enterprise Grade',
    popular: false,
    features: [
      'Everything in Pro Plan',
      'Two-Tier RBAC (Workspace + Project Roles)',
      'AES-256-GCM Credential Cipher Vault',
      'Timing-Safe HMAC Webhook Anti-Spoofing',
      'Custom SLA & 99.99% Uptime Guarantee',
      'Dedicated Customer Success Architect',
      'On-Premises / Private Cloud Deployment'
    ]
  }
];

const FAQS = [
  {
    q: 'How does DevFlow achieve $O(1)$ Kanban performance?',
    a: 'DevFlow utilizes a Lexorank fractional indexing algorithm that computes midpoints between adjacent order indices. When a card is moved, only that single document is updated in MongoDB—zero mass-array rewrites occur.'
  },
  {
    q: 'How is the GitHub integration secured?',
    a: 'Webhooks are validated using crypto.timingSafeEqual against SHA-256 HMAC signatures, preventing timing side-channel attacks. GitHub OAuth tokens are encrypted at rest using AES-256-GCM.'
  },
  {
    q: 'Can I switch between monthly and annual billing?',
    a: 'Yes! You can toggle between monthly and annual subscriptions anytime. Annual billing includes a 20% discount across all paid tiers.'
  },
  {
    q: 'Is there a free trial for the Pro plan?',
    a: 'Yes, you can test the entire platform without entering a credit card using our 1-Click Instant Explorer Mode.'
  },
  {
    q: 'What happens to incomplete tasks when a sprint completes?',
    a: 'DevFlow enforces a strict single-active sprint invariant. When a sprint is completed, any unresolved tasks automatically roll over into the next planned sprint or backlog.'
  }
];

export default function LandingPage({ onOpenAuth, onLaunchDemo }) {
  useSEO({
    title: 'DevFlow — Developer Project Management & Real-Time Agile Collaboration',
    description: 'Ultra-fast developer project management and agile team collaboration platform featuring Lexorank fractional indexing Kanban, real-time Socket.IO synchronization, sprint automation, and GitHub integration.',
    keywords: 'developer project management, agile collaboration, kanban board, sprint planning, lexorank, github integration, devops, jira alternative, linear alternative, real-time socket.io, prem patel, e-commerce saas'
  });

  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* 1. Semantic Navigation Bar */}
      <header role="banner" className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          {/* Brand Logo */}
          <a href="/" className="flex items-center space-x-2.5 group">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-tight text-white">DevFlow</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                v1.0.0
              </span>
            </div>
          </a>

          {/* Nav Links */}
          <nav role="navigation" className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-400">
            <a href="#features" className="hover:text-indigo-400 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-indigo-400 transition-colors">E-Commerce Pricing</a>
            <a href="#reviews" className="hover:text-indigo-400 transition-colors">Reviews</a>
            <a href="#faq" className="hover:text-indigo-400 transition-colors">FAQ</a>
            <a href="#docs" className="hover:text-indigo-400 transition-colors">Documentation</a>
          </nav>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onLaunchDemo}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>1-Click Launch Demo</span>
          </button>

          <button
            onClick={() => onOpenAuth(true)}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/30 active:scale-95"
          >
            Sign In
          </button>
        </div>
      </header>

      <main role="main">
        {/* 2. Hero Section with Semantic H1 */}
        <section id="hero" aria-label="Hero Introduction" className="relative pt-20 pb-24 px-6 max-w-7xl mx-auto text-center overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Next-Gen Agile Mesh Built for Real Developer Code</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white max-w-5xl mx-auto leading-tight sm:leading-none mb-6">
            Developer Project Management & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-500">Real-Time Agile</span> Collaboration.
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-3xl mx-auto mb-10 leading-relaxed">
            Eliminate Jira fatigue. DevFlow combines <strong>$O(1)$ fractional drag-and-drop Kanban</strong>, automated sprint roll-over, timing-safe GitHub webhook ingestion, and real-time Socket.IO synchronization into one ultra-fast platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <button
              onClick={onLaunchDemo}
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-bold shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Explore Live Dashboard (1-Click)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#pricing"
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <span>View E-Commerce Plans</span>
            </a>
          </div>

          {/* Trust Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-900 text-left">
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <span className="text-2xl font-black text-indigo-400">O(1)</span>
              <p className="text-xs text-slate-400 mt-1 font-semibold">Fractional Lexorank</p>
              <p className="text-[11px] text-slate-500">Zero mass array updates</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <span className="text-2xl font-black text-emerald-400">100%</span>
              <p className="text-xs text-slate-400 mt-1 font-semibold">Real-Time Sync</p>
              <p className="text-[11px] text-slate-500">Socket.IO mesh rooms</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <span className="text-2xl font-black text-amber-400">256-bit</span>
              <p className="text-xs text-slate-400 mt-1 font-semibold">AES-GCM Cipher</p>
              <p className="text-[11px] text-slate-500">GitHub token isolation</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <span className="text-2xl font-black text-purple-400">4.9 / 5</span>
              <p className="text-xs text-slate-400 mt-1 font-semibold">Developer Rating</p>
              <p className="text-[11px] text-slate-500">142 verified reviews</p>
            </div>
          </div>
        </section>

        {/* 3. Core Feature Pillars Section (#features) */}
        <section id="features" aria-label="Platform Architecture Features" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-900">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Engineered for Velocity</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Everything your engineering squad needs to deliver on schedule.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-5">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Interactive Kanban Board</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Hardware-accelerated drag-and-drop powered by @dnd-kit. Live priority filters, adaptive view toggles (Columns vs List Feed), and instantaneous 60fps movement.
              </p>
              <span className="text-[11px] font-semibold text-indigo-400">DEC-003 Verified • O(1) Reordering</span>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-5">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Agile Sprints & Rollover</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Enforces strict single-active sprint invariants. When a sprint is completed, remaining unfinished tasks rollover atomically into your next planned sprint.
              </p>
              <span className="text-[11px] font-semibold text-emerald-400">Automated Sprint Lifecycle</span>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center mb-5">
                <GitBranch className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">GitHub Webhook Ingress</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Real-time GitHub commit & PR synchronization. Tasks auto-link commits matching task keys (e.g. FLOW-101) with timing-safe HMAC spoofing defense.
              </p>
              <span className="text-[11px] font-semibold text-amber-400">DEC-007 Timing-Safe Equal</span>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Two-Tier RBAC Security</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Workspace Multi-Tenancy (Owner, Admin, Member) combined with Project-Level permissions (PM, Lead, Dev, Viewer). Zero cross-tenant data leakage.
              </p>
              <span className="text-[11px] font-semibold text-purple-400">DEC-004 RBAC Architecture</span>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-sky-600/20 text-sky-400 flex items-center justify-center mb-5">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Burndown & Telemetry</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Recharts visual velocity tracking, sprint burndown telemetry, and streaming CSV and Excel export engines with RFC 4180 sanitization.
              </p>
              <span className="text-[11px] font-semibold text-sky-400">Phase 10 Analytics Engine</span>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition">
              <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center mb-5">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AES-256 Token Cipher</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                GitHub Personal Access Tokens and secrets are encrypted with authenticated AES-256-GCM ciphers. Plaintext credentials never hit logs or client state.
              </p>
              <span className="text-[11px] font-semibold text-rose-400">DEC-006 Cryptographic Vault</span>
            </div>
          </div>
        </section>

        {/* 4. Commercial E-Commerce Pricing Section (#pricing) */}
        <section id="pricing" aria-label="E-Commerce Pricing Plans" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-900">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Commercial E-Commerce Plans</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              Transparent, developer-first pricing.
            </p>
            <p className="text-slate-400 text-sm">
              Upgrade your team anytime. Instant automated provisioning with a 14-day money-back guarantee.
            </p>

            {/* Billing Cycle Switcher */}
            <div className="inline-flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 mt-6">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  billingCycle === 'monthly'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Annual Billing</span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>

          {/* Product Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map((plan) => {
              const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;
              const period = billingCycle === 'annual' ? '/year' : '/month';

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-8 flex flex-col justify-between transition-all relative ${
                    plan.popular
                      ? 'bg-gradient-to-b from-indigo-950/80 to-slate-900 border-2 border-indigo-500 shadow-2xl shadow-indigo-600/20 md:-translate-y-2'
                      : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white text-[11px] font-black tracking-wider uppercase shadow-md">
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6 min-h-[36px]">{plan.description}</p>

                    <div className="flex items-baseline mb-6">
                      <span className="text-4xl sm:text-5xl font-black text-white">${price}</span>
                      <span className="text-xs font-semibold text-slate-400 ml-1.5">USD {period}</span>
                    </div>

                    <ul className="space-y-3 pt-6 border-t border-slate-800 text-xs">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-8">
                    {plan.id === 'free' ? (
                      <button
                        onClick={onLaunchDemo}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
                      >
                        Start Free (1-Click Demo)
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedPlanForCheckout(plan)}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <span>Subscribe Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. Customer Reviews & Social Proof (#reviews) */}
        <section id="reviews" aria-label="Customer Reviews" className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-900">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="flex items-center justify-center gap-1 text-amber-400 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400" />
              ))}
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Trusted by 1,400+ Engineering Teams
            </h2>
            <p className="text-xs text-slate-400 mt-2">Verified reviews across SaaS and enterprise developers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 text-xs">
              <p className="text-slate-300 leading-relaxed mb-4">
                "The O(1) Lexorank dragging is insanely fast compared to Jira. When our team has 200+ cards in sprint, moving tasks feels instant with zero lag."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center">
                  M
                </div>
                <div>
                  <h4 className="font-bold text-white">Marcus Vance</h4>
                  <p className="text-slate-500 text-[10px]">VP of Engineering, CloudScale</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 text-xs">
              <p className="text-slate-300 leading-relaxed mb-4">
                "The timing-safe GitHub webhook ingress auto-links PRs with task keys effortlessly. We dropped two legacy bot plugins after adopting DevFlow."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center">
                  S
                </div>
                <div>
                  <h4 className="font-bold text-white">Sarah Chen</h4>
                  <p className="text-slate-500 text-[10px]">Lead DevOps Architect, ByteStream</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 text-xs">
              <p className="text-slate-300 leading-relaxed mb-4">
                "Two-tier RBAC gives our enterprise clients complete peace of mind. Workspace multi-tenancy with AES-256 encrypted tokens passed our security audit on day one."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center">
                  A
                </div>
                <div>
                  <h4 className="font-bold text-white">Alex Mercer</h4>
                  <p className="text-slate-500 text-[10px]">Principal Architect, DevFlow Core</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. FAQ Accordion (#faq) */}
        <section id="faq" aria-label="Frequently Asked Questions" className="py-20 px-6 max-w-4xl mx-auto border-t border-slate-900">
          <div className="text-center mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Knowledge Base</h2>
            <p className="text-3xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden transition">
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-white hover:text-indigo-400 transition"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-400' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 7. Bottom CTA */}
        <section className="py-20 px-6 bg-gradient-to-b from-slate-950 to-indigo-950/60 border-t border-slate-900 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-6">
              Ready to accelerate your engineering sprint velocity?
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto mb-8">
              Join thousands of software engineers building faster with real-time fractional Kanban, automated rollover, and GitHub sync.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onLaunchDemo}
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Launch Live Demo (Zero Setup)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onOpenAuth(false)}
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-2xl text-xs font-bold transition"
              >
                Create Free Account
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 8. Semantic SEO Footer */}
      <footer role="contentinfo" id="docs" className="bg-slate-950 border-t border-slate-900 px-6 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Col */}
          <div className="col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-base font-extrabold text-white">DevFlow</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
              Enterprise developer project management and agile team collaboration platform built with MongoDB, Socket.IO, React 18, and Vite.
            </p>
            <p className="text-[11px] text-slate-500">
              Created & engineered by <strong>Prem Patel</strong> (<a href="mailto:prempatel55299@gmail.com" className="text-indigo-400 hover:underline">prempatel55299@gmail.com</a>)
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-3">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-slate-300 transition">Fractional Kanban</a></li>
              <li><a href="#features" className="hover:text-slate-300 transition">Sprint Orchestration</a></li>
              <li><a href="#features" className="hover:text-slate-300 transition">GitHub Integration</a></li>
              <li><a href="#pricing" className="hover:text-slate-300 transition">E-Commerce Pricing</a></li>
            </ul>
          </div>

          {/* Architecture & Docs */}
          <div>
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-3">Architecture</h4>
            <ul className="space-y-2">
              <li><span className="text-slate-400">Lexorank $O(1)$ Math</span></li>
              <li><span className="text-slate-400">AES-256-GCM Vault</span></li>
              <li><span className="text-slate-400">Two-Tier RBAC Engine</span></li>
              <li><span className="text-slate-400">Timing-Safe HMAC</span></li>
            </ul>
          </div>

          {/* Legal & Meta */}
          <div>
            <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] mb-3">Resources</h4>
            <ul className="space-y-2">
              <li><a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">robots.txt</a></li>
              <li><a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">sitemap.xml</a></li>
              <li><a href="https://github.com/PatelPrem123/DevFlown" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition flex items-center gap-1"><span>GitHub Repo</span><ExternalLink className="w-3 h-3" /></a></li>
              <li><span className="text-slate-400">OWASP Hardened</span></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p>© {new Date().getFullYear()} DevFlow Inc. All rights reserved. Author: Prem Patel.</p>
          <div className="flex items-center space-x-6">
            <span>SaaS E-Commerce Ready</span>
            <span>Semantic HTML5</span>
            <span>Schema.org JSON-LD Verified</span>
          </div>
        </div>
      </footer>

      {/* Commercial Checkout Modal */}
      <CheckoutModal
        isOpen={!!selectedPlanForCheckout}
        selectedPlan={selectedPlanForCheckout}
        billingCycle={billingCycle}
        onClose={() => setSelectedPlanForCheckout(null)}
        onPlanActivated={(planId) => {
          setSelectedPlanForCheckout(null);
          onLaunchDemo();
        }}
      />
    </div>
  );
}
