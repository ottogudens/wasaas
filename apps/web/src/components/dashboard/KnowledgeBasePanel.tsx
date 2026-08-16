'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Send,
  Loader2,
  Trash2,
  Globe,
  RefreshCw,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Database,
  Plus,
  BookOpen,
} from 'lucide-react';
import { useDocuments } from '../../hooks/useDocuments';
import { useAuth } from '../../lib/auth-context';
import { useBots } from '../../hooks/useBots';

export function KnowledgeBasePanel() {
  const { token } = useAuth();
  const {
    documents,
    isLoading,
    processDocument,
    isProcessing,
    processUrl,
    isProcessingUrl,
    resyncUrl,
    deleteDocument,
    isDeleting,
  } = useDocuments(token);
  const { bots } = useBots(token);

  // Tab for ingestion method: 'url' | 'file' | 'text'
  const [ingestionTab, setIngestionTab] = useState<'url' | 'file' | 'text'>('url');

  // Bot target state
  const [targetBotId, setTargetBotId] = useState<string>('');

  // URL state
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [resyncingId, setResyncingId] = useState<string | null>(null);

  // Manual / File state
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadFileSize, setUploadFileSize] = useState<string | null>(null);

  // Status banners
  const [ragStatus, setRagStatus] = useState<{ success: boolean; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKb = (file.size / 1024).toFixed(1);
    setUploadFileName(file.name);
    setUploadFileSize(`${sizeKb} KB`);
    setDocumentTitle(file.name.replace(/\.[^/.]+$/, ''));

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setDocumentContent(text);
        setRagStatus({ success: true, message: `📂 Archivo "${file.name}" cargado (${sizeKb} KB). Listo para almacenar.` });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProcessTextOrFile = async () => {
    if (!documentTitle || !documentContent) return;
    setRagStatus(null);
    try {
      const res = await processDocument({ title: documentTitle, content: documentContent, botId: targetBotId || undefined });
      setRagStatus({
        success: true,
        message: `✅ Documento "${documentTitle}" procesado: ${res.totalChunksProcessed} vectores almacenados con éxito.`,
      });
      setDocumentTitle('');
      setDocumentContent('');
      setUploadFileName(null);
      setUploadFileSize(null);
    } catch (err: any) {
      setRagStatus({ success: false, message: `Error al procesar documento: ${err.message}` });
    }
  };

  const handleProcessUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteUrl.trim()) return;
    setRagStatus(null);

    try {
      const res = await processUrl({
        url: websiteUrl.trim(),
        title: urlTitle.trim() || undefined,
        botId: targetBotId || undefined,
      });

      setRagStatus({
        success: true,
        message: `✅ Página Web "${res.documentTitle}" indexada con éxito: ${res.totalChunksProcessed} fragmentos vectoriales almacenados.`,
      });
      setWebsiteUrl('');
      setUrlTitle('');
    } catch (err: any) {
      setRagStatus({ success: false, message: `Error al procesar sitio web: ${err.message}` });
    }
  };

  const handleResyncUrl = async (docId: string, title: string) => {
    try {
      setResyncingId(docId);
      setRagStatus(null);
      const res = await resyncUrl(docId);
      setRagStatus({
        success: true,
        message: `🔄 Página Web "${title}" re-sincronizada y actualizada: ${res.chunksProcessed} vectores renovados.`,
      });
    } catch (err: any) {
      setRagStatus({ success: false, message: `Error al re-sincronizar: ${err.message}` });
    } finally {
      setResyncingId(null);
    }
  };

  const handleDeleteDocument = async (id: string, title: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${title}" de la base de conocimientos?`)) return;
    try {
      await deleteDocument(id);
      setRagStatus({ success: true, message: `🗑️ Documento "${title}" eliminado de la base de conocimientos.` });
    } catch (err: any) {
      setRagStatus({ success: false, message: `Error eliminando documento: ${err.message}` });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-7">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          Base de Conocimientos (RAG + pgvector)
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Indexa sitios web, documentos y catálogos. Tus agentes consultarán esta información en tiempo real para responder con máxima precisión sin gastar tokens extras.
        </p>
      </div>

      {/* Alert / Status Banner */}
      {ragStatus && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-sm ${
            ragStatus.success
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
              : 'bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-500/30'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {ragStatus.success ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
            <span>{ragStatus.message}</span>
          </div>
          <button onClick={() => setRagStatus(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            ×
          </button>
        </div>
      )}

      {/* Ingestion Type Switcher Tabs */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              Agregar Nuevo Conocimiento
            </h3>
            <p className="text-xs text-slate-500">Selecciona la fuente de información que deseas que tu IA aprenda.</p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setIngestionTab('url')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                ingestionTab === 'url'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Sitio Web / URL
            </button>

            <button
              onClick={() => setIngestionTab('file')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                ingestionTab === 'file'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Subir Archivo
            </button>

            <button
              onClick={() => setIngestionTab('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                ingestionTab === 'text'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Texto / FAQ
            </button>
          </div>
        </div>

        {/* Bot selector */}
        <div className="pt-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            Asignar Conocimiento a un Agente (Opcional)
          </label>
          <select
            value={targetBotId}
            onChange={(e) => setTargetBotId(e.target.value)}
            className="w-full sm:w-1/2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">Global (Todos los agentes acceden a esto)</option>
            {bots.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* ── 1. URL INGESTION FORM ── */}
        {ingestionTab === 'url' && (
          <form onSubmit={handleProcessUrl} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                  URL de la Página Web *
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    required
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://tuempresa.cl/servicios o https://empresa.com/faq"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                  Título Identificador (Opcional)
                </label>
                <input
                  type="text"
                  value={urlTitle}
                  onChange={(e) => setUrlTitle(e.target.value)}
                  placeholder="Ej: Servicios y Precios 2026"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
              <p className="text-[11px] text-slate-500">
                💡 El sistema escaneará el texto limpio de la página y creará embeddings. Podrás re-sincronizarla en cualquier momento si la web cambia.
              </p>

              <button
                type="submit"
                disabled={isProcessingUrl || !websiteUrl.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-md hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {isProcessingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                Escanear e Indexar Sitio Web
              </button>
            </div>
          </form>
        )}

        {/* ── 2. FILE INGESTION FORM ── */}
        {ingestionTab === 'file' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition-all bg-slate-50 dark:bg-slate-950/50 group cursor-pointer relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,.json,.md,.pdf,.doc,.docx,.xlsx,.xls"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="w-10 h-10 text-slate-400 group-hover:text-emerald-500 mx-auto transition-colors mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Arrastra tu archivo aquí o <span className="text-emerald-600 dark:text-emerald-400 underline font-bold">haz clic para explorar</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Soporta PDF, DOCX, XLSX, TXT, CSV, MD</p>

              {uploadFileName && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs inline-flex items-center gap-2 font-semibold">
                  <FileText className="w-4 h-4" />
                  <span>
                    <strong>{uploadFileName}</strong> ({uploadFileSize})
                  </span>
                </div>
              )}
            </div>

            {uploadFileName && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleProcessTextOrFile}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-md hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Procesar Archivo e Indexar
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 3. DIRECT TEXT INGESTION FORM ── */}
        {ingestionTab === 'text' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Título del Documento *
              </label>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="Ej: Catálogo de Productos, Políticas de Garantía..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                Contenido / Información *
              </label>
              <textarea
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                placeholder="Pega aquí la información, preguntas frecuentes, lista de precios o instrucciones..."
                rows={5}
                className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 text-xs font-mono"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleProcessTextOrFile}
                disabled={isProcessing || !documentTitle.trim() || !documentContent.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-md hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Guardar e Indexar Vectores
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── DOCUMENTS LIST ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500" />
            Fuentes de Conocimiento Indexadas ({documents.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-40" />
            <p className="text-slate-700 dark:text-slate-300 font-bold text-sm">No hay fuentes de conocimiento almacenadas</p>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              Ingresa la URL de la página de tu empresa o sube un archivo para que tu IA aprenda sobre tu negocio.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {documents.map((doc: any) => {
              const isUrl = doc.sourceType === 'URL' || !!doc.sourceUrl;
              const isSyncing = resyncingId === doc.id;

              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isUrl
                          ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20'
                          : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                      }`}
                    >
                      {isUrl ? <Globe className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{doc.title}</h4>
                        <span
                          className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${
                            isUrl
                              ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isUrl ? '🌐 SITIO WEB' : '📄 DOCUMENTO'}
                        </span>

                        {doc.botId ? (
                          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full border bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30 flex items-center gap-1">
                            🤖 Solo: {doc.bot?.name || 'Agente'}
                          </span>
                        ) : (
                          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 flex items-center gap-1">
                            🌎 Global (Todos)
                          </span>
                        )}
                      </div>

                      {isUrl && doc.sourceUrl && (
                        <a
                          href={doc.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 mt-0.5 truncate"
                        >
                          <span className="truncate">{doc.sourceUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span>{doc._count?.chunks || 0} fragmentos vectoriales</span>
                        {doc.lastSyncedAt && (
                          <span>
                            • Sincronizado: {new Date(doc.lastSyncedAt).toLocaleDateString('es-CL')}{' '}
                            {new Date(doc.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {isUrl && (
                      <button
                        onClick={() => handleResyncUrl(doc.id, doc.title)}
                        disabled={isSyncing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50"
                        title="Volver a escanear la página para actualizar la información"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
                        {isSyncing ? 'Actualizando...' : 'Re-sincronizar'}
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteDocument(doc.id, doc.title)}
                      className="p-2 rounded-xl bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 transition-colors"
                      title="Eliminar de la base de conocimientos"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
