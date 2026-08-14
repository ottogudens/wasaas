import React, { useState, useRef } from 'react';
import { Upload, FileText, Send, Loader2, Trash2 } from 'lucide-react';
import { useDocuments } from '../../hooks/useDocuments';
import { useAuth } from '../../lib/auth-context';

export function KnowledgeBasePanel() {
  const { token } = useAuth();
  const { documents, isProcessing, processDocument, deleteDocument } = useDocuments(token);

  const [documentTitle, setDocumentTitle] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadFileSize, setUploadFileSize] = useState<string | null>(null);
  const [ragStatus, setRagStatus] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKb = (file.size / 1024).toFixed(1);
    setUploadFileName(file.name);
    setUploadFileSize(`${sizeKb} KB`);
    setDocumentTitle(file.name.replace(/\.[^/.]+$/, "")); // Strip extension for title

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setDocumentContent(text);
        setRagStatus(`📂 Archivo cargado (${sizeKb} KB). Listo para almacenar.`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProcessRag = async () => {
    if (!documentTitle || !documentContent) return;
    setRagStatus('Procesando y generando embeddings vectoriales...');
    try {
      const res = await processDocument({ title: documentTitle, content: documentContent });
      setRagStatus(`✅ Documento procesado: ${res.totalChunksProcessed} vectores almacenados`);
      setDocumentTitle('');
      setDocumentContent('');
      setUploadFileName(null);
      setUploadFileSize(null);
    } catch (err: any) {
      setRagStatus(`❌ Error: ${err.message}`);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await deleteDocument(id);
      setRagStatus(`🗑️ Documento RAG eliminado`);
    } catch (err: any) {
      setRagStatus(`❌ Error eliminando documento: ${err.message}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Base de Conocimiento (RAG + pgvector)</h2>
        <p className="text-slate-400 text-sm">Almacena información que tus agentes consultarán en tiempo real.</p>
      </div>

      {/* File Upload Box */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Upload className="w-4 h-4 text-emerald-400" />
          Subir Archivo de Conocimiento
        </h3>
        <p className="text-xs text-slate-400">
          Selecciona un archivo para extraer automáticamente su contenido y entrenar a tus agentes.
        </p>

        <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 text-center transition-all bg-slate-950/50 group cursor-pointer relative">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,.json,.md,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <Upload className="w-10 h-10 text-slate-600 group-hover:text-emerald-400 mx-auto transition-colors mb-2" />
          <p className="text-sm font-medium text-slate-300">
            Arrastra tu archivo aquí o <span className="text-emerald-400 underline font-semibold">haz clic para explorar</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Soporta .txt, .csv, .json, .md, .pdf</p>

          {uploadFileName && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs inline-flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span><strong>{uploadFileName}</strong> ({uploadFileSize})</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Título del Documento</label>
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            placeholder="Ej. Precios y Servicios 2026"
            className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Contenido / Texto Corporativo</label>
          <textarea
            value={documentContent}
            onChange={(e) => setDocumentContent(e.target.value)}
            placeholder="Pega información del negocio, catálogo de productos, FAQ..."
            rows={6}
            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm font-mono"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={handleProcessRag}
            disabled={isProcessing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold text-slate-950 hover:opacity-90 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Procesar y Almacenar Vectores
          </button>
          {ragStatus && <span className="text-xs font-medium text-emerald-400">{ragStatus}</span>}
        </div>
      </div>

      {/* Document list */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg text-slate-200">Documentos Almacenados ({documents.length})</h3>
        {documents.map((doc: any) => (
          <div key={doc.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm text-slate-200">{doc.title}</h4>
              <span className="text-xs text-slate-500">{doc._count?.chunks || 0} fragmentos vectoriales</span>
            </div>
            <button
              onClick={() => handleDeleteDocument(doc.id)}
              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
