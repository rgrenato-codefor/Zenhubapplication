/**
 * MediaGallery — Galeria reutilizável de imagens e vídeos.
 *
 * Suporta:
 *  • Upload por clique ou drag-and-drop (imagens + vídeos)
 *  • Barra de progresso de upload item a item
 *  • Lightbox com navegação por teclado/setas
 *  • Reprodução de vídeo inline no lightbox
 *  • Exclusão com confirmação hover
 *  • Caption por item (edição inline)
 */

import { useState, useRef, useCallback, useEffect } from "react";
import type { MediaItem } from "../../../lib/imagekit";
import {
  X, Image, Film, Play, CloudUpload, Trash2, ChevronLeftIcon, ChevronRightIcon,
  Edit2, Check, AlertCircle,
} from "./icons";

const MAX_FILE_SIZE_MB = 100;
const ACCEPTED_TYPES   = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,video/avi";

interface MediaGalleryProps {
  items:      MediaItem[];
  onUpload:   (file: File, onProgress: (p: number) => void) => Promise<MediaItem>;
  onRemove:   (itemId: string) => Promise<void>;
  canEdit?:   boolean;
  accentColor?: string;
  maxItems?:  number;
  title?:     string;
  folder?:    string; // displayed in info only
}

interface UploadSlot {
  id:       string;
  name:     string;
  progress: number;
  error?:   string;
}

export function MediaGallery({
  items,
  onUpload,
  onRemove,
  canEdit   = true,
  accentColor = "#7C3AED",
  maxItems  = 50,
  title     = "Galeria",
}: MediaGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef  = useRef<HTMLDivElement>(null);

  const [uploading,   setUploading]   = useState<UploadSlot[]>([]);
  const [isDragOver,  setIsDragOver]  = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [hoverId,     setHoverId]     = useState<string | null>(null);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState<{ id: string; value: string } | null>(null);

  // ── Keyboard navigation in lightbox ─────────────────────────────────────
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")      setLightboxIdx(null);
      if (e.key === "ArrowRight")  setLightboxIdx((i) => i !== null ? Math.min(i + 1, items.length - 1) : null);
      if (e.key === "ArrowLeft")   setLightboxIdx((i) => i !== null ? Math.max(i - 1, 0) : null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIdx, items.length]);

  // ── Upload handler ───────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const remaining = maxItems - items.length - uploading.length;
    const toUpload  = Array.from(files).slice(0, remaining);

    for (const file of toUpload) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`"${file.name}" excede ${MAX_FILE_SIZE_MB}MB.`);
        continue;
      }

      const slot: UploadSlot = {
        id:       `slot_${Date.now()}_${Math.random()}`,
        name:     file.name,
        progress: 0,
      };

      setUploading((prev) => [...prev, slot]);

      const updateProgress = (p: number) =>
        setUploading((prev) => prev.map((s) => s.id === slot.id ? { ...s, progress: p } : s));

      try {
        await onUpload(file, updateProgress);
      } catch (err) {
        setUploading((prev) =>
          prev.map((s) => s.id === slot.id ? { ...s, error: "Falha no upload" } : s)
        );
        setTimeout(() => setUploading((prev) => prev.filter((s) => s.id !== slot.id)), 3000);
        continue;
      }
      setUploading((prev) => prev.filter((s) => s.id !== slot.id));
    }
  }, [items.length, maxItems, uploading.length, onUpload]);

  // ── Drag & drop ──────────────────────────────────────────────────────────
  const onDragEnter = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try { await onRemove(id); }
    finally { setDeletingId(null); }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const canUploadMore = canEdit && items.length + uploading.length < maxItems;
  const lightboxItem  = lightboxIdx !== null ? items[lightboxIdx] : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${accentColor}15` }}>
            <Image className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div>
            <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{title}</p>
            <p className="text-xs text-gray-400">
              {items.length} {items.length === 1 ? "item" : "itens"}
              {maxItems < 999 && ` · máx ${maxItems}`}
            </p>
          </div>
        </div>

        {canUploadMore && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-white transition-opacity hover:opacity-90"
            style={{ background: accentColor, fontWeight: 600 }}
          >
            <CloudUpload className="w-3.5 h-3.5" />
            Adicionar
          </button>
        )}
      </div>

      {/* Drop zone (when gallery is empty) + hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
      />

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      {items.length === 0 && uploading.length === 0 ? (
        /* Empty state drop zone */
        <div
          ref={dropZoneRef}
          onDragEnter={canEdit ? onDragEnter : undefined}
          onDragOver={canEdit ? (e) => e.preventDefault() : undefined}
          onDragLeave={canEdit ? onDragLeave : undefined}
          onDrop={canEdit ? onDrop : undefined}
          onClick={canEdit ? () => fileInputRef.current?.click() : undefined}
          className={`flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border-2 border-dashed transition-colors
            ${canEdit ? "cursor-pointer" : ""}
            ${isDragOver ? "border-opacity-100 bg-opacity-5" : "border-gray-200 bg-gray-50/60"}`}
          style={isDragOver ? { borderColor: accentColor, backgroundColor: `${accentColor}08` } : {}}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: `${accentColor}15` }}>
            <CloudUpload className="w-6 h-6" style={{ color: accentColor }} />
          </div>
          {canEdit ? (
            <>
              <p className="text-sm text-gray-600" style={{ fontWeight: 600 }}>
                Arraste arquivos ou clique para selecionar
              </p>
              <p className="text-xs text-gray-400 text-center px-6">
                Imagens (JPG, PNG, WebP, GIF) e vídeos (MP4, MOV, WebM) · máx {MAX_FILE_SIZE_MB}MB por arquivo
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">Nenhum item na galeria</p>
          )}
        </div>
      ) : (
        <div
          ref={dropZoneRef}
          onDragEnter={canEdit ? onDragEnter : undefined}
          onDragOver={canEdit ? (e) => e.preventDefault() : undefined}
          onDragLeave={canEdit ? onDragLeave : undefined}
          onDrop={canEdit ? onDrop : undefined}
          className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-1 rounded-2xl transition-colors
            ${isDragOver ? "ring-2 ring-dashed" : ""}`}
          style={isDragOver ? { ["--tw-ring-color" as string]: accentColor } : {}}
        >
          {/* Existing items */}
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
              onMouseEnter={() => setHoverId(item.id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={() => setLightboxIdx(idx)}
            >
              {/* Thumbnail */}
              {item.type === "video" ? (
                <>
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.caption ?? "video"} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <Film className="w-10 h-10 text-gray-500" />
                    </div>
                  )}
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </div>
                  {/* Video badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm">
                    <Film className="w-2.5 h-2.5 text-white" />
                    <span className="text-white text-xs" style={{ fontWeight: 600 }}>VÍD</span>
                  </div>
                </>
              ) : (
                <img src={item.url} alt={item.caption ?? `foto ${idx + 1}`} className="w-full h-full object-cover" />
              )}

              {/* Hover overlay */}
              <div className={`absolute inset-0 bg-black/30 flex items-end transition-opacity ${hoverId === item.id ? "opacity-100" : "opacity-0"}`}>
                {item.caption && (
                  <p className="text-white text-xs p-2 truncate w-full" style={{ fontWeight: 500 }}>
                    {item.caption}
                  </p>
                )}
              </div>

              {/* Delete button */}
              {canEdit && hoverId === item.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                  disabled={deletingId === item.id}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500/80 transition-colors disabled:opacity-50 z-10"
                >
                  {deletingId === item.id
                    ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <X className="w-3.5 h-3.5" />
                  }
                </button>
              )}
            </div>
          ))}

          {/* Uploading slots */}
          {uploading.map((slot) => (
            <div key={slot.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 shadow-sm">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3">
                {slot.error ? (
                  <>
                    <AlertCircle className="w-6 h-6 text-red-400" />
                    <p className="text-xs text-red-500 text-center" style={{ fontWeight: 600 }}>Erro</p>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: `${accentColor}40`, borderTopColor: accentColor }} />
                    <p className="text-xs text-gray-500 text-center truncate w-full px-1">{slot.name}</p>
                    {/* Progress bar */}
                    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{ width: `${slot.progress}%`, background: accentColor }}
                      />
                    </div>
                    <span className="text-xs" style={{ color: accentColor, fontWeight: 700 }}>{slot.progress}%</span>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Add more tile */}
          {canUploadMore && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-opacity-60 transition-colors group"
              style={{ "--hover-color": accentColor } as React.CSSProperties}
            >
              <CloudUpload className="w-6 h-6 group-hover:text-opacity-70 transition-colors"
                style={{ color: accentColor }} />
              <span className="text-xs" style={{ color: accentColor, fontWeight: 600 }}>Adicionar</span>
            </button>
          )}
        </div>
      )}

      {/* Drag-over active hint */}
      {isDragOver && (
        <p className="text-center text-sm" style={{ color: accentColor, fontWeight: 600 }}>
          Solte para fazer upload
        </p>
      )}

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightboxItem !== null && lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
            onClick={() => setLightboxIdx(null)}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-xs z-10">
            {lightboxIdx + 1} / {items.length}
          </div>

          {/* Prev */}
          {lightboxIdx > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
            >
              <ChevronLeftIcon className="w-6 h-6" />
            </button>
          )}

          {/* Next */}
          {lightboxIdx < items.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
            >
              <ChevronRightIcon className="w-6 h-6" />
            </button>
          )}

          {/* Media */}
          <div
            className="max-w-4xl max-h-[80vh] w-full mx-16 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxItem.type === "video" ? (
              <video
                key={lightboxItem.id}
                src={lightboxItem.url}
                controls
                autoPlay
                className="max-h-[75vh] max-w-full rounded-lg shadow-2xl"
              />
            ) : (
              <img
                src={lightboxItem.url}
                alt={lightboxItem.caption ?? `foto ${lightboxIdx + 1}`}
                className="max-h-[75vh] max-w-full rounded-lg shadow-2xl object-contain"
              />
            )}
          </div>

          {/* Caption + edit (bottom) */}
          <div
            className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {editCaption?.id === lightboxItem.id ? (
              <>
                <input
                  autoFocus
                  value={editCaption.value}
                  onChange={(e) => setEditCaption({ id: lightboxItem.id, value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEditCaption(null);
                    if (e.key === "Escape") setEditCaption(null);
                  }}
                  className="flex-1 bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/40 placeholder-white/40"
                  placeholder="Adicione uma legenda..."
                />
                <button
                  onClick={() => setEditCaption(null)}
                  className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20"
                >
                  <Check className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <p className="flex-1 text-white/80 text-sm truncate">
                  {lightboxItem.caption || (canEdit ? <span className="italic text-white/40">Sem legenda — clique para editar</span> : "")}
                </p>
                {canEdit && (
                  <button
                    onClick={() => setEditCaption({ id: lightboxItem.id, value: lightboxItem.caption ?? "" })}
                    className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={() => { handleDelete(lightboxItem.id); setLightboxIdx(null); }}
                    className="p-1.5 rounded-lg bg-red-500/30 text-red-300 hover:bg-red-500/50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
