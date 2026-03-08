/**
 * TherapistGallery
 * Galeria de fotos do terapeuta — grid 3 colunas (estilo Instagram/produto),
 * ordenada da mais recente para a mais antiga.
 *
 * Upload via ImageKit CDN (pasta: zenhub-application/therapists/{id}/gallery)
 * Thumbnails otimizados via transformações IK (?tr=w-400,h-400,…)
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { uploadMedia, deleteMedia, ikFolders, ikThumb } from "../../../lib/imagekit";
import type { MediaItem } from "../../../lib/imagekit";
import {
  Camera, CloudUpload, X, Trash2, Play, Film,
  ChevronLeftIcon, ChevronRightIcon, AlertCircle,
} from "../../components/shared/icons";

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";
const MAX_MB   = 50;
const MAX_ITEMS = 60;

interface UploadSlot {
  id:       string;
  name:     string;
  progress: number;
  error?:   string;
}

export default function TherapistGallery() {
  const { user }    = useAuth();
  const {
    myTherapist,
    myGallery,
    mutateAddMyGalleryItem,
    mutateRemoveMyGalleryItem,
  } = usePageData();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading,   setUploading]   = useState<UploadSlot[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [isDragOver,  setIsDragOver]  = useState(false);

  // Ordenar mais recente primeiro (igual Instagram)
  const sorted = [...myGallery].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );

  // ── Lightbox teclado ──────────────────────────────────────────────────────
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")     setLightboxIdx(null);
      if (e.key === "ArrowRight") setLightboxIdx((i) => i !== null ? Math.min(i + 1, sorted.length - 1) : null);
      if (e.key === "ArrowLeft")  setLightboxIdx((i) => i !== null ? Math.max(i - 1, 0) : null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, sorted.length]);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || !myTherapist) return;
    const remaining = MAX_ITEMS - myGallery.length - uploading.length;
    const toUpload  = Array.from(files).slice(0, remaining);

    for (const file of toUpload) {
      if (file.size > MAX_MB * 1024 * 1024) {
        alert(`"${file.name}" excede ${MAX_MB}MB.`);
        continue;
      }
      const slot: UploadSlot = {
        id:       `slot_${Date.now()}_${Math.random()}`,
        name:     file.name,
        progress: 0,
      };
      setUploading((prev) => [...prev, slot]);

      const updatePct = (p: number) =>
        setUploading((prev) => prev.map((s) => s.id === slot.id ? { ...s, progress: p } : s));

      try {
        const item = await uploadMedia(
          file,
          ikFolders.therapistGallery(myTherapist.id),
          updatePct,
        );
        await mutateAddMyGalleryItem(item);
      } catch {
        setUploading((prev) =>
          prev.map((s) => s.id === slot.id ? { ...s, error: "Falha no upload" } : s),
        );
        setTimeout(() => setUploading((prev) => prev.filter((s) => s.id !== slot.id)), 3500);
        continue;
      }
      setUploading((prev) => prev.filter((s) => s.id !== slot.id));
    }
  }, [myGallery.length, myTherapist, uploading.length, mutateAddMyGalleryItem]);

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const onDragEnter = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Excluir ───────────────────────────────────────────────────────────────
  const handleDelete = async (item: MediaItem) => {
    setDeletingId(item.id);
    try {
      await deleteMedia(item.fileId);
      await mutateRemoveMyGalleryItem(item.id);
      if (lightboxIdx !== null) setLightboxIdx(null);
    } finally {
      setDeletingId(null);
    }
  };

  const canUpload     = myGallery.length + uploading.length < MAX_ITEMS;
  const lightboxItem  = lightboxIdx !== null ? sorted[lightboxIdx] : null;
  const totalCount    = myGallery.length;

  return (
    <div className="space-y-4">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Galeria</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {totalCount} {totalCount === 1 ? "foto" : "fotos"}
            {totalCount > 0 && ` · ${MAX_ITEMS - totalCount} disponíveis`}
          </p>
        </div>

        {canUpload && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm hover:opacity-90 transition-opacity shadow-sm"
            style={{ fontWeight: 600 }}
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Adicionar fotos</span>
            <span className="sm:hidden">Adicionar</span>
          </button>
        )}
      </div>

      {/* ── Hidden file input ────────────────────────────────────────────────── */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); (e.target as HTMLInputElement).value = ""; }}
      />

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {sorted.length === 0 && uploading.length === 0 && (
        <div
          onDragEnter={onDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-4 py-20 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
            isDragOver
              ? "border-violet-400 bg-violet-50"
              : "border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/40"
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
            <Camera className="w-8 h-8 text-violet-400" />
          </div>
          <div className="text-center px-6">
            <p className="text-gray-700 text-sm" style={{ fontWeight: 600 }}>
              Adicione suas primeiras fotos
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Arraste aqui ou clique para selecionar · JPG, PNG, WebP, MP4 · máx {MAX_MB}MB
            </p>
          </div>
        </div>
      )}

      {/* ── Grid 3 colunas (estilo Instagram) ──────────────────────────────── */}
      {(sorted.length > 0 || uploading.length > 0) && (
        <div
          onDragEnter={onDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`grid grid-cols-3 gap-0.5 rounded-xl overflow-hidden transition-all ${
            isDragOver ? "ring-2 ring-violet-400 ring-offset-2" : ""
          }`}
        >
          {/* Fotos existentes (mais recentes primeiro) */}
          {sorted.map((item, idx) => (
            <div
              key={item.id}
              className="relative aspect-square bg-gray-100 group cursor-pointer overflow-hidden"
              onClick={() => setLightboxIdx(idx)}
            >
              {/* Thumbnail */}
              {item.type === "video" ? (
                <>
                  {item.thumbnailUrl
                    ? <img src={item.thumbnailUrl} alt="vídeo" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center bg-gray-900"><Film className="w-8 h-8 text-gray-500" /></div>
                  }
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                      <Play className="w-4 h-4 text-white ml-0.5" />
                    </div>
                  </div>
                </>
              ) : (
                <img
                  src={ikThumb(item.url, 400)}
                  alt={item.caption ?? `foto ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}

              {/* Hover overlay escuro */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />

              {/* Botão excluir (aparece no hover) */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                disabled={deletingId === item.id}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 disabled:opacity-50 z-10"
              >
                {deletingId === item.id
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <X className="w-3 h-3" />
                }
              </button>
            </div>
          ))}

          {/* Slots de upload em andamento */}
          {uploading.map((slot) => (
            <div key={slot.id} className="relative aspect-square bg-gray-100 flex flex-col items-center justify-center gap-2 p-3">
              {slot.error ? (
                <>
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <p className="text-xs text-red-500 text-center" style={{ fontWeight: 600 }}>Erro</p>
                </>
              ) : (
                <>
                  <div
                    className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "#7C3AED40", borderTopColor: "#7C3AED" }}
                  />
                  <p className="text-xs text-gray-500 text-center truncate w-full px-1">{slot.name}</p>
                  <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{ width: `${slot.progress}%`, background: "#7C3AED" }}
                    />
                  </div>
                  <span className="text-xs text-violet-600" style={{ fontWeight: 700 }}>{slot.progress}%</span>
                </>
              )}
            </div>
          ))}

          {/* Tile "+ adicionar" (última célula se couber) */}
          {canUpload && sorted.length > 0 && uploading.length === 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square bg-white border border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:bg-violet-50 hover:border-violet-300 transition-colors group"
            >
              <CloudUpload className="w-5 h-5 text-violet-400 group-hover:text-violet-500" />
              <span className="text-[10px] text-violet-500" style={{ fontWeight: 600 }}>Adicionar</span>
            </button>
          )}
        </div>
      )}

      {/* Drag-over hint */}
      {isDragOver && (
        <p className="text-center text-sm text-violet-600" style={{ fontWeight: 600 }}>
          Solte para fazer upload
        </p>
      )}

      {/* ── Lightbox ──────────────────────────────────────────────────────────── */}
      {lightboxItem !== null && lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Fechar */}
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
            onClick={() => setLightboxIdx(null)}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Contador */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-xs z-10">
            {lightboxIdx + 1} / {sorted.length}
          </div>

          {/* Anterior */}
          {lightboxIdx > 0 && (
            <button
              className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
          )}

          {/* Próximo */}
          {lightboxIdx < sorted.length - 1 && (
            <button
              className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
            >
              <ChevronRightIcon className="w-6 h-6" />
            </button>
          )}

          {/* Mídia */}
          <div
            className="max-w-2xl max-h-[85vh] w-full mx-16 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxItem.type === "video" ? (
              <video
                key={lightboxItem.id}
                src={lightboxItem.url}
                controls
                autoPlay
                className="max-h-[80vh] max-w-full rounded-xl shadow-2xl"
              />
            ) : (
              <img
                src={lightboxItem.url}
                alt={lightboxItem.caption ?? `foto ${lightboxIdx + 1}`}
                className="max-h-[80vh] max-w-full rounded-xl shadow-2xl object-contain"
              />
            )}
          </div>

          {/* Barra inferior — excluir */}
          <div
            className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-end gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleDelete(lightboxItem)}
              disabled={deletingId === lightboxItem.id}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/30 text-red-300 hover:bg-red-500/50 transition-colors text-xs disabled:opacity-50"
            >
              {deletingId === lightboxItem.id
                ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                : <Trash2 className="w-3.5 h-3.5" />
              }
              Excluir foto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}