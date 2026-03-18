/**
 * CommentsModal.tsx
 * Slide-up comments sheet — shows approved comments, lets client add new ones.
 */

import { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle } from "../shared/icons";
import type { FeedComment } from "../../context/FeedContext";

interface Props {
  postId: string;
  comments: FeedComment[];
  onClose: () => void;
  onAdd: (text: string) => Promise<void>;
  primaryColor?: string;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function CommentsModal({ postId, comments, onClose, onAdd, primaryColor = "#7C3AED" }: Props) {
  const [text, setText]           = useState("");
  const [sending, setSending]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  const approved = comments.filter((c) => c.status === "approved");

  useEffect(() => {
    // small delay so the sheet animation doesn't fight with keyboard
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // scroll list to bottom when approved comments change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [approved.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    setError(null);

    try {
      await onAdd(text.trim());
      setText("");
      setSubmitted(true);
    } catch (err: any) {
      // Surface the real error so it's visible
      const msg: string =
        err?.code === "permission-denied"
          ? "Sem permissão para comentar. Verifique as regras do Firestore."
          : err?.message ?? "Erro ao enviar comentário. Tente novamente.";
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
              Comentários
            </span>
            <span className="text-xs text-gray-400">({approved.length})</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comments list */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {approved.length === 0 ? (
            <div className="text-center py-10">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhum comentário ainda.</p>
              <p className="text-xs text-gray-300 mt-1">Seja o primeiro a comentar!</p>
            </div>
          ) : (
            approved.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs shrink-0"
                  style={{ background: primaryColor, fontWeight: 700 }}
                >
                  {c.userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{c.userName}</span>
                    <span className="text-xs text-gray-400">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 break-words">{c.text}</p>
                </div>
              </div>
            ))
          )}

          {/* Success notice */}
          {submitted && !error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-amber-700" style={{ fontWeight: 500 }}>
                Seu comentário foi enviado e aguarda aprovação do terapeuta. ✓
              </p>
            </div>
          )}

          {/* Error notice */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-red-600" style={{ fontWeight: 500 }}>
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="shrink-0 flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-white"
        >
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); setError(null); }}
            placeholder="Adicionar comentário…"
            className="flex-1 text-sm text-gray-800 bg-gray-100 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:bg-white placeholder-gray-400 transition-all"
            style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
            maxLength={500}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-opacity shrink-0"
            style={{ background: primaryColor }}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
