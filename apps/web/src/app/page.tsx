'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { MiBotLogo } from '../components/MiBotLogo';
import { useAuth } from '../lib/auth-context';

export default function HomePage() {
  const { token, user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: '¿Necesito conocimientos técnicos o de programación para usar miBot?',
      a: 'No, para nada. La plataforma está pensada para que cualquier persona pueda vincular su WhatsApp escaneando un código QR o usando un código de 8 dígitos y cargar sus documentos (PDF, Word, Excel) en minutos sin escribir una sola línea de código.',
    },
    {
      q: '¿Cómo aprende el agente sobre mi empresa y productos?',
      a: 'Utilizamos tecnología RAG (Generación Aumentada por Recuperación). Solo subes tus manuales de atención, catálogos, listas de precios o políticas comerciales y el agente consultará automáticamente esa base de conocimiento para responder a tus clientes de forma precisa y contextual.',
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
      a: 'Sí, miBot incorpora transcripción de audio automática de alta fidelidad, permitiendo a tu agente escuchar los mensajes de voz de tus clientes y responderles como texto en segundos.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-emerald-500 selection:text-black font-sans relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-emerald-500/15 via-teal-500/5 to-transparent rounded-full blur-[140px]" />
        <div className="absolute top-[35%] -left-40 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[160px]" />
        <div className="absolute top-[65%] -right-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[160px]" />
      </div>

      {/* ── HEADER / NAVBAR ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#090d16]/80 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <MiBotLogo className="w-9 h-9" textClassName="text-2xl" />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#caracteristicas" className="hover:text-emerald-400 transition-colors">
              Características
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
      <section className="relative z-10 pt-16 pb-24 md:pt-24 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Top badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-semibold mb-8 animate-fade-in">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Agentes de WhatsApp con IA Generativa & RAG</span>
          <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="hidden sm:inline-block text-slate-400 font-normal">Prueba gratis por 7 días</span>
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
          Conecta tu número en 60 segundos. Entrena tu bot con tus propios documentos, catálogos y tarifas para atender clientes, cotizar y cerrar ventas en tiempo real sin intervención manual.
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

        {/* ── HERO PREVIEW: Interactive Chat Simulator Mockup ── */}
        <div className="mt-16 max-w-4xl mx-auto rounded-3xl p-1 bg-gradient-to-b from-emerald-500/30 via-slate-800 to-slate-900/40 shadow-2xl shadow-emerald-500/10">
          <div className="rounded-[22px] bg-slate-950/95 border border-slate-800 p-4 sm:p-6 text-left">
            {/* Header Mockup */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-950 rounded-full" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Agente miBot IA
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      EN LÍNEA
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400">+56 9 8765 4321 · Conectado vía WhatsApp</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>Base de Conocimiento RAG Activa</span>
              </div>
            </div>

            {/* Simulated Chat Messages */}
            <div className="space-y-4 max-w-2xl mx-auto font-sans text-sm py-2">
              {/* User Message */}
              <div className="flex justify-end">
                <div className="bg-emerald-600/90 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] sm:max-w-[70%] shadow-md">
                  <p className="text-xs text-emerald-100 font-semibold mb-0.5">Cliente</p>
                  <p>¡Hola! ¿Tienen disponibilidad para el servicio de consultoría este jueves y qué precio tiene?</p>
                  <span className="text-[10px] text-emerald-200 mt-1 block text-right">10:42 AM</span>
                </div>
              </div>

              {/* Bot Response */}
              <div className="flex justify-start">
                <div className="bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] sm:max-w-[75%] shadow-md space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Respuesta generada con tus documentos</span>
                  </div>
                  <p>
                    ¡Hola! Sí, según nuestro calendario tenemos turnos disponibles este jueves a las <strong>11:00 hrs</strong> y <strong>16:00 hrs</strong>.
                  </p>
                  <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    💼 <strong>Plan de Consultoría:</strong> $45.000 CLP / sesión incluye informe técnico y soporte de 30 días.
                  </p>
                  <p className="text-xs text-emerald-300">
                    ¿Te gustaría que agende tu cita para las 11:00 o las 16:00?
                  </p>
                  <span className="text-[10px] text-slate-500 block text-right">10:42 AM · 0.4s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ───────────────────────────────────────────── */}
      <section id="caracteristicas" className="relative z-10 py-24 bg-slate-950/70 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs sm:text-sm font-extrabold text-emerald-400 uppercase tracking-widest mb-3">
              Potencia de Grado Empresarial
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              Todo lo que necesitas para operar tu WhatsApp con IA
            </p>
            <p className="mt-4 text-slate-400 text-base">
              Diseñado para responder con precisión comercial, integrarse con tus pasarelas de pago y mantener el control humano cuando lo necesites.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-7 rounded-3xl bg-slate-900/50 border border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Base de Conocimiento RAG</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Sube manuales, listas de precios, preguntas frecuentes o catálogos en PDF y Excel. La IA responderá usando únicamente tu información corporativa.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-7 rounded-3xl bg-slate-900/50 border border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-5 group-hover:scale-110 transition-transform">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Handoff Humano en Vivo</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Toma el control de cualquier conversación desde tu panel en tiempo real con un solo clic para atender consultas complejas o clientes VIP.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-7 rounded-3xl bg-slate-900/50 border border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Pagos con MercadoPago</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Genera links de cobro directos, cotizaciones y suscripciones recurrentes para que tus clientes paguen desde WhatsApp de forma segura.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-7 rounded-3xl bg-slate-900/50 border border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Transcripción de Notas de Voz</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tus clientes pueden enviar audios y tu agente los transcribirá al vuelo para comprender el mensaje y responder como si fuera texto.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-7 rounded-3xl bg-slate-900/50 border border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-5 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Memoria Semántica de Alta Velocidad</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Caché de embeddings vectoriales para responder en milisegundos a preguntas repetidas y reducir costos de cómputo.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-7 rounded-3xl bg-slate-900/50 border border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900/80 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Multi-Tenancy & Multi-Bot</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Administra múltiples números y canales para diferentes sucursales o marcas desde una sola cuenta centralizada.
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
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-lg mb-6 shadow-lg shadow-emerald-500/20">
              1
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Conecta tu WhatsApp</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Escanea el código QR desde tu app de WhatsApp o ingresa tu número para vincular mediante un código de 8 dígitos al instante.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 relative">
            <div className="w-10 h-10 rounded-xl bg-teal-400 text-slate-950 font-black flex items-center justify-center text-lg mb-6 shadow-lg shadow-teal-400/20">
              2
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Carga tu Información</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sube tus documentos comerciales y personaliza el tono, instrucciones y objetivos de tu asistente con el Prompt del sistema.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 relative">
            <div className="w-10 h-10 rounded-xl bg-cyan-400 text-slate-950 font-black flex items-center justify-center text-lg mb-6 shadow-lg shadow-cyan-400/20">
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
      <section id="planes" className="relative z-10 py-24 bg-slate-950/80 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs sm:text-sm font-extrabold text-emerald-400 uppercase tracking-widest mb-3">
              Planes Transparentes
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              Comienza hoy con 7 días de prueba gratis
            </p>
            <p className="mt-4 text-slate-400 text-base">
              Elige el plan que mejor se adapte al tamaño de tu empresa. Cancela o cambia de plan cuando quieras.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {/* Plan Starter */}
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white">Starter</h3>
                <p className="text-xs text-slate-400 mt-1">Ideal para profesionales y pequeños negocios.</p>
                <p className="text-4xl font-black text-white mt-6">
                  $29.000 <span className="text-sm text-slate-400 font-normal">CLP / mes</span>
                </p>
                <ul className="mt-8 space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>1 Agente de WhatsApp activo</span>
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
                <h3 className="text-xl font-bold text-emerald-400">Pro</h3>
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
                <h3 className="text-xl font-bold text-white">Enterprise</h3>
                <p className="text-xs text-slate-400 mt-1">Solución personalizada a gran escala.</p>
                <p className="text-4xl font-black text-white mt-6">
                  $199.000 <span className="text-sm text-slate-400 font-normal">CLP / mes</span>
                </p>
                <ul className="mt-8 space-y-3 text-sm text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Hasta 20 Agentes de WhatsApp</span>
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
