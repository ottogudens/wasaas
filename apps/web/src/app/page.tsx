'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bot,
  MessageSquare,
  Zap,
  ShieldCheck,
  Database,
  CreditCard,
  Mic,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  QrCode,
  Users,
  ChevronDown,
  Headphones,
  FileText,
  Clock,
  TrendingUp,
  ChevronRight,
  ExternalLink,
  Laptop,
  Check,
  Play,
  Layers,
  BarChart3,
  PhoneCall,
  Lock,
} from 'lucide-react';
import { MiBotLogo } from '../components/MiBotLogo';
import { useAuth } from '../lib/auth-context';

export default function HomePage() {
  const { token } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const stats = [
    { value: '99.4%', label: 'Precisión en respuestas con RAG' },
    { value: '< 1.2s', label: 'Tiempo promedio de respuesta' },
    { value: '24/7/365', label: 'Disponibilidad ininterrumpida' },
    { value: '+85%', label: 'Ahorro en costo de soporte' },
  ];

  const faqs = [
    {
      q: '¿Necesito conocimientos técnicos o de programación para usar miBot?',
      a: 'No, para nada. La plataforma está pensada para que cualquier persona pueda vincular su WhatsApp escaneando un código QR o usando un código de 8 dígitos y cargar sus documentos (PDF, Word, Excel) en minutos sin escribir una sola línea de código.',
    },
    {
      q: '¿Cómo aprende el agente sobre mi empresa y productos?',
      a: 'Utilizamos tecnología RAG (Generación Aumentada por Recuperación) con base vectorial PostgreSQL pgvector. Subes tus manuales de atención, catálogos, listas de precios o políticas comerciales y el agente consultará automáticamente esa información para responder de forma exacta y contextual.',
    },
    {
      q: '¿Qué pasa si un cliente pide hablar con una persona real?',
      a: 'miBot incluye un sistema de Handoff Humano inteligente. Puedes activar el "Modo Humano" en cualquier conversación desde el panel de Live Chat para responder manualmente sin que la IA intervenga.',
    },
    {
      q: '¿Cómo funciona la prueba gratuita de 7 días?',
      a: 'Al registrarte obtienes acceso inmediato y completo con 1 Agente de WhatsApp activo durante 7 días para probar todas las funciones, subir documentos y conectar tu línea. No solicitamos tarjeta de crédito al momento del registro.',
    },
    {
      q: '¿El bot puede entender audios y notas de voz?',
      a: 'Sí, miBot incorpora transcripción de audio automática Whisper de alta fidelidad, permitiendo a tu agente escuchar los mensajes de voz de tus clientes y responderles como texto en segundos.',
    },
    {
      q: '¿Cómo se procesan los pagos y cobros automáticos?',
      a: 'El sistema está conectado nativamente con MercadoPago. Tu bot puede generar links de cobro seguros, comprobantes y cotizaciones en PDF directamente en la conversación de WhatsApp.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-emerald-500 selection:text-black font-sans relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-emerald-500/20 via-teal-500/5 to-transparent rounded-full blur-[140px]" />
        <div className="absolute top-[30%] -left-40 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[160px]" />
        <div className="absolute top-[60%] -right-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[160px]" />
      </div>

      {/* ── HEADER / NAVBAR ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#090d16]/85 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <MiBotLogo className="w-9 h-9" textClassName="text-2xl" />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#caracteristicas" className="hover:text-emerald-400 transition-colors">
              Características
            </a>
            <a href="#soluciones" className="hover:text-emerald-400 transition-colors">
              Soluciones
            </a>
            <a href="#como-funciona" className="hover:text-emerald-400 transition-colors">
              Cómo Funciona
            </a>
            <a href="#planes" className="hover:text-emerald-400 transition-colors">
              Planes
            </a>
            <a href="#preguntas" className="hover:text-emerald-400 transition-colors">
              Preguntas
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {token ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all"
              >
                <Laptop className="w-4 h-4" />
                Ir al Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] transition-all"
                >
                  Registrarse Gratis
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ────────────────────────────────────────────────── */}
      <section className="relative z-10 pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Top badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold mb-8 animate-fade-in shadow-inner">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Agentes de WhatsApp con IA Generativa & RAG</span>
          <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="hidden sm:inline-block text-slate-400 font-normal">7 Días de Prueba Gratis</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.12]">
          Automatiza tus ventas y atención en{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            WhatsApp con IA
          </span>{' '}
          24/7
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
          Conecta tu número en 60 segundos. Entrena a tus agentes con tus catálogos, PDFs y listas de precios para responder clientes, cotizar y cerrar ventas en tiempo real sin intervención humana.
        </p>

        {/* Call to Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <Link
            href="/register"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 font-extrabold text-base shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Comenzar Prueba Gratis (7 Días)
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-white font-semibold text-base transition-all"
          >
            Ya tengo una cuenta
          </Link>
        </div>

        {/* Trust bullet points */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Sin tarjeta de crédito requerida</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Activación en menos de 2 minutos</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Compatible con WhatsApp Web & Celular</span>
          </div>
        </div>

        {/* ── HERO IMAGE SHOWCASE ───────────────────────────────────────── */}
        <div className="mt-14 max-w-5xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition duration-700" />
          <div className="relative rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl">
            <img
              src="/images/hero-dashboard.jpg"
              alt="miBot AI WhatsApp Dashboard Interface"
              className="w-full h-auto object-cover rounded-3xl"
            />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────────────────── */}
      <section className="relative z-10 border-y border-slate-800/80 bg-slate-950/60 backdrop-blur-md py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {stats.map((st, i) => (
              <div key={i} className="space-y-1">
                <p className="text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  {st.value}
                </p>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">{st.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPOTLIGHT FEATURE 1: RAG KNOWLEDGE ─────────────────────────── */}
      <section id="soluciones" className="relative z-10 py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Database className="w-3.5 h-3.5" />
              Inteligencia Documental RAG
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Entrena a tu bot con los archivos de tu empresa en segundos
            </h2>
            <p className="text-base text-slate-300 leading-relaxed">
              Olvídate de configurar flujos rígidos tipo árbol. Sube tus manuales, catálogos en PDF, tablas de Excel o documentos Word. Nuestro motor de búsqueda semántica vectorial (pgvector) extrae la respuesta exacta y la redacta con tono profesional para cada cliente.
            </p>

            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Cero alucinaciones:</strong> El bot solo responde basándose en los documentos que tú apruebes.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Soporta PDF, Word, Excel y TXT:</strong> Procesa automáticamente tablas, precios y condiciones.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Actualización instantánea:</strong> Agrega o elimina documentos y el bot sabrá los cambios de inmediato.</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-emerald-400 font-bold text-sm hover:text-emerald-300 transition-colors group"
              >
                Probar carga de documentos gratis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Image Showcase */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500/30 to-cyan-500/30 rounded-3xl blur-lg opacity-40 group-hover:opacity-70 transition duration-500" />
            <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
              <img
                src="/images/feature-rag.jpg"
                alt="RAG Document Intelligence with pgvector"
                className="w-full h-auto object-cover rounded-3xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── SPOTLIGHT FEATURE 2: LIVE CHAT & HUMAN HANDOFF ─────────────── */}
      <section className="relative z-10 py-24 bg-slate-950/70 border-t border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Image Showcase */}
            <div className="relative group order-2 lg:order-1">
              <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500/30 to-emerald-500/30 rounded-3xl blur-lg opacity-40 group-hover:opacity-70 transition duration-500" />
              <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
                <img
                  src="/images/feature-handoff.jpg"
                  alt="Live Chat and Human Handoff Mode"
                  className="w-full h-auto object-cover rounded-3xl"
                />
              </div>
            </div>

            {/* Text Content */}
            <div className="space-y-6 text-left order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Headphones className="w-3.5 h-3.5" />
                Handoff Humano & Live Chat
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Control total: Intervén en cualquier conversación en vivo
              </h2>
              <p className="text-base text-slate-300 leading-relaxed">
                Tus ejecutivos y tu inteligencia artificial colaboran en perfecta armonía. Monitorea todas las conversaciones de WhatsApp en tiempo real y activa el Modo Humano cuando un cliente requiera atención personalizada.
              </p>

              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Modo Humano con 1 clic:</strong> Pausa las respuestas de la IA instantáneamente para responder como agente.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Historial centralizado:</strong> Consulta todos los chats de WhatsApp con etiquetas y filtros de búsqueda.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Notificaciones instantáneas:</strong> Detecta leads de alto valor y oportunidades de venta inmediata.</span>
                </li>
              </ul>

              <div className="pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-cyan-400 font-bold text-sm hover:text-cyan-300 transition-colors group"
                >
                  Conectar tu WhatsApp para probar el Live Chat
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SPOTLIGHT FEATURE 3: PAYMENTS & INVOICING ──────────────────── */}
      <section className="relative z-10 py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold uppercase tracking-wider">
              <CreditCard className="w-3.5 h-3.5" />
              Cobros & MercadoPago
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Cierra ventas y cobra directamente por WhatsApp
            </h2>
            <p className="text-base text-slate-300 leading-relaxed">
              Integra tu cuenta de MercadoPago para emitir links de pago automáticos, comprobantes digitales y facturas en PDF que tu bot envía al cliente tan pronto confirma su compra o servicio.
            </p>

            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Links de pago generados al vuelo:</strong> Tarjeta de crédito, débito y transferencias seguras.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Envío automático de documentos:</strong> Cotizaciones y recibos oficiales en formato PDF por WhatsApp.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Webhooks en tiempo real:</strong> Confirma pagos y actualiza el estado del pedido automáticamente.</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-teal-400 font-bold text-sm hover:text-teal-300 transition-colors group"
              >
                Comenzar ahora con 7 días de prueba
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Image Showcase */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-teal-500/30 to-emerald-500/30 rounded-3xl blur-lg opacity-40 group-hover:opacity-70 transition duration-500" />
            <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
              <img
                src="/images/feature-payments.jpg"
                alt="Automated Payments and Invoicing via MercadoPago"
                className="w-full h-auto object-cover rounded-3xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── CORE CAPABILITIES GRID ─────────────────────────────────────── */}
      <section id="caracteristicas" className="relative z-10 py-24 bg-slate-950/80 border-t border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs sm:text-sm font-extrabold text-emerald-400 uppercase tracking-widest mb-3">
              Arquitectura Robusta
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              Todo lo que necesitas para operar a escala
            </p>
            <p className="mt-4 text-slate-400 text-base">
              Construido con tecnología moderna para empresas que no pueden permitirse caídas ni demoras en sus canales de venta.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Capability 1 */}
            <div className="p-7 rounded-3xl bg-slate-900/50 border border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Entendimiento de Notas de Voz</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tus clientes pueden enviar audios de cualquier duración. La IA los transcribe con precisión y genera una respuesta contextual inmediata.
              </p>
            </div>

            {/* Capability 2 */}
            <div className="p-7 rounded-3xl bg-slate-900/50 border border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-5 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Caché Semántica Vectorial</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Las preguntas frecuentes se responden en milisegundos sin consumir cuota de modelos de lenguaje, optimizando tiempos y costos.
              </p>
            </div>

            {/* Capability 3 */}
            <div className="p-7 rounded-3xl bg-slate-900/50 border border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Conexión por QR o Teléfono</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Vincula tu número escaneando el código QR en pantalla o solicitando un código de 8 dígitos directo a tu app de WhatsApp.
              </p>
            </div>

            {/* Capability 4 */}
            <div className="p-7 rounded-3xl bg-slate-900/50 border border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Múltiples Modelos de IA</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Elige entre GPT-4o-mini, GPT-4o o modelos dedicados según el nivel de razonamiento y complejidad de tus requerimientos.
              </p>
            </div>

            {/* Capability 5 */}
            <div className="p-7 rounded-3xl bg-slate-900/50 border border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-5 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Privacidad y Multi-Tenant</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tus datos e historiales de conversación están aislados de forma segura con cifrado en tránsito y en reposo.
              </p>
            </div>

            {/* Capability 6 */}
            <div className="p-7 rounded-3xl bg-slate-900/50 border border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Panel Super Admin</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Gestión completa de organizaciones, suscripciones, estados de servicio y planes de facturación centralizados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────── */}
      <section id="como-funciona" className="relative z-10 py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs sm:text-sm font-extrabold text-emerald-400 uppercase tracking-widest mb-3">
            Puesta en Marcha en 3 Pasos
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white">
            Tu agente listo en menos de 2 minutos
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xl mb-6 shadow-lg shadow-emerald-500/20">
              1
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Conecta tu WhatsApp</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Escanea el código QR desde tu app de WhatsApp o ingresa tu número para vincular mediante un código de 8 dígitos al instante.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 relative">
            <div className="w-12 h-12 rounded-2xl bg-teal-400 text-slate-950 font-black flex items-center justify-center text-xl mb-6 shadow-lg shadow-teal-400/20">
              2
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Carga tu Información</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sube tus documentos comerciales y personaliza el tono, instrucciones y objetivos de tu asistente con el Prompt del sistema.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 relative">
            <div className="w-12 h-12 rounded-2xl bg-cyan-400 text-slate-950 font-black flex items-center justify-center text-xl mb-6 shadow-lg shadow-cyan-400/20">
              3
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Vende en Piloto Automático</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Tu bot comenzará a responder clientes, calificar prospectos y generar ventas 24 horas al día, 7 días a la semana.
            </p>
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ─────────────────────────────────────────────── */}
      <section id="planes" className="relative z-10 py-24 bg-slate-950/80 border-t border-slate-800/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs sm:text-sm font-extrabold text-emerald-400 uppercase tracking-widest mb-3">
              Planes Transparentes
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              Comienza hoy con 7 días de prueba gratis
            </p>
            <p className="mt-4 text-slate-400 text-base">
              Elige el plan que mejor se adapte al tamaño de tu empresa. Cancela o cambia de plan cuando quieras con MercadoPago.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {/* Plan Starter */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white">Plan Starter</h3>
                <p className="text-xs text-slate-400 mt-1">Ideal para profesionales y pequeños negocios.</p>
                <p className="text-4xl font-black text-white mt-6">
                  $29.000 <span className="text-sm text-slate-400 font-normal">CLP / mes</span>
                </p>
                <ul className="mt-8 space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>1 Agente</strong> de WhatsApp activo</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Mensajes ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>RAG de hasta 50 documentos</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Soporte estándar</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 font-bold text-center text-sm text-white transition-all block"
              >
                Probar 7 Días Gratis
              </Link>
            </div>

            {/* Plan Pro (Destacado) */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-emerald-500/50 flex flex-col justify-between space-y-6 relative shadow-2xl shadow-emerald-500/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-md">
                Más Popular
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-400">Plan Pro</h3>
                <p className="text-xs text-slate-400 mt-1">Para empresas con alto volumen de atención y ventas.</p>
                <p className="text-4xl font-black text-white mt-6">
                  $79.000 <span className="text-sm text-slate-400 font-normal">CLP / mes</span>
                </p>
                <ul className="mt-8 space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><strong>5 Agentes</strong> de WhatsApp simultáneos</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Mensajes ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>RAG de hasta 200 documentos</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Transcripción de audios incluida</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Soporte prioritario 24/7</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-extrabold text-center text-sm text-slate-950 shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all block"
              >
                Probar 7 Días Gratis
              </Link>
            </div>

            {/* Plan Enterprise */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white">Plan Enterprise</h3>
                <p className="text-xs text-slate-400 mt-1">Solución personalizada para grandes corporaciones.</p>
                <p className="text-4xl font-black text-white mt-6">
                  $199.000 <span className="text-sm text-slate-400 font-normal">CLP / mes</span>
                </p>
                <ul className="mt-8 space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Hasta <strong>20 Agentes</strong> de WhatsApp</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>RAG de hasta 1.000 documentos</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Instancia de IA dedicada</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Account Manager exclusivo</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 font-bold text-center text-sm text-white transition-all block"
              >
                Contactar Ventas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ─────────────────────────────────────────────────── */}
      <section id="preguntas" className="relative z-10 py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-xs sm:text-sm font-extrabold text-emerald-400 uppercase tracking-widest mb-3">
            Dudas Frecuentes
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-white">
            Preguntas Frecuentes
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 font-semibold text-white text-base hover:text-emerald-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-emerald-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 pt-0 text-sm text-slate-400 leading-relaxed border-t border-slate-800/40 mt-1">
                    <p className="pt-3">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA FINAL BANNER ────────────────────────────────────────────── */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl p-8 sm:p-14 bg-gradient-to-r from-emerald-900/40 via-slate-900 to-cyan-900/40 border border-emerald-500/30 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px]" />
          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              ¿Listo para transformar tu canal de WhatsApp?
            </h2>
            <p className="text-base sm:text-lg text-slate-300 font-normal">
              Crea tu cuenta gratuita hoy y activa tu primer agente de inteligencia artificial en menos de 2 minutos.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-extrabold text-base shadow-xl shadow-emerald-500/25 hover:opacity-90 transition-all"
              >
                Comenzar Prueba Gratis (7 Días)
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white font-semibold text-base transition-all"
              >
                Ingresar a mi cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <MiBotLogo className="w-7 h-7" textClassName="text-xl" />
            <span className="text-xs text-slate-500">© 2026 miBot SaaS. Todos los derechos reservados.</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <Link href="/login" className="hover:text-emerald-400 transition-colors">
              Iniciar Sesión
            </Link>
            <Link href="/register" className="hover:text-emerald-400 transition-colors">
              Registrarse
            </Link>
            <a href="#planes" className="hover:text-emerald-400 transition-colors">
              Planes
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
