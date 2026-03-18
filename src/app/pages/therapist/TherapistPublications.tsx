/**
 * TherapistPublications.tsx
 * Post management + comment moderation for therapists.
 */

import { useState } from "react";
import {
  Plus, Image, Film, X, CheckCircle, Trash2,
  MessageCircle, Heart, Camera,
  Clock, AlertCircle,
  Check, EyeOff,
} from "../../components/shared/icons";
import { useFeed, type PostType, type MediaType, type FeedPost } from "../../context/FeedContext";
import { usePageData } from "../../hooks/usePageData";
import { useAuth } from "../../context/AuthContext";

type Tab = "posts" | "stories" | "comments";

const DEMO_IMAGES = [
  { url: "https://images.unsplash.com/photo-1765100478804-62091eb17a90?w=800&q=80", label: "Meditação" },
  { url: "https://images.unsplash.com/photo-1763699751431-dff04d232842?w=800&q=80", label: "Yoga" },
  { url: "https://images.unsplash.com/photo-1758466872568-081616ba938b?w=800&q=80", label: "Cristais" },
  { url: "https://images.unsplash.com/photo-1758599880425-7862af0a4b50?w=800&q=80", label: "Respiração" },
  { url: "https://images.unsplash.com/photo-1693821193050-c12fffcabe27?w=800&q=80", label: "Reiki" },
  { url: "https://images.unsplash.com/photo-1568819946028-dc9271a8d1a0?w=800&q=80", label: "Journaling" },
  { url: "https://images.unsplash.com/photo-1710611218341-3e67a7208d11?w=800&q=80", label: "Tigelas" },
  { url: "https://images.unsplash.com/photo-1529088512498-64b87b354b8f?w=800&q=80", label: "Acupuntura" },
];

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

// ── Blank form ────────────────────────────────────────────────────────────────
const BLANK = {
  postType: "feed" as PostType,
  mediaType: "photo" as MediaType,
  mediaUrl: "",
  customUrl: "",
  caption: "",
};

export default function TherapistPublications() {
  const { user } = useAuth();
  const { myTherapist: therapist } = usePageData();
  const { myPosts, comments, addPost, deletePost, moderateComment } = useFeed();

  const [tab, setTab] = useState<Tab>("posts");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [urlMode, setUrlMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Gather all comments on my posts
  const allMyComments = myPosts.flatMap((p) =>
    (comments[p.id] ?? []).map((c) => ({ ...c, postTitle: p.caption.slice(0, 40) }))
  );
  const pendingComments  = allMyComments.filter((c) => c.status === "pending");
  const approvedComments = allMyComments.filter((c) => c.status === "approved");
  const rejectedComments = allMyComments.filter((c) => c.status === "rejected");

  const feedPosts  = myPosts.filter((p) => p.type === "feed");
  const myStories  = myPosts.filter((p) => p.type === "story");

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handlePublish() {
    if (!therapist) return;
    const url = urlMode ? form.customUrl : form.mediaUrl;
    if (!url || !form.caption) return;

    addPost({
      therapistId: therapist.id ?? user?.therapistId ?? "me",
      therapistName: therapist.name,
      therapistAvatar: therapist.avatar ?? "",
      therapistSpecialty: therapist.specialty ?? "",
      therapistUsername: therapist.username ?? therapist.name.toLowerCase().replace(/\s+/g, "."),
      type: form.postType,
      mediaType: form.mediaType,
      mediaUrl: url,
      caption: form.caption,
    });
    setForm({ ...BLANK });
    setUrlMode(false);
    setModalOpen(false);
  }

  const primaryColor = "#7C3AED"; // violet — therapist palette

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Publicações</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gerencie seus posts e stories do feed</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)", fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" />
          Nova publicação
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Posts", value: feedPosts.length, color: "#7C3AED" },
          { label: "Stories", value: myStories.length, color: "#EC4899" },
          { label: "Comentários pendentes", value: pendingComments.length, color: pendingComments.length > 0 ? "#F59E0B" : "#10B981" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-2xl text-gray-900" style={{ fontWeight: 700, color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["posts", "stories", "comments"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all relative"
            style={
              tab === t
                ? { background: "#fff", color: primaryColor, fontWeight: 700, boxShadow: "0 1px 3px rgba(0,0,0,.08)" }
                : { color: "#6B7280" }
            }
          >
            {t === "posts" && "Feed"}
            {t === "stories" && "Stories"}
            {t === "comments" && (
              <>
                Comentários
                {pendingComments.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full text-white flex items-center justify-center" style={{ fontSize: 10, fontWeight: 700 }}>
                    {pendingComments.length}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: POSTS ──────────────────────────────────────────────────────── */}
      {tab === "posts" && (
        <PostGrid
          posts={feedPosts}
          deleteConfirm={deleteConfirm}
          setDeleteConfirm={setDeleteConfirm}
          onDelete={deletePost}
          primaryColor={primaryColor}
          emptyLabel="Você ainda não fez nenhum post no feed."
        />
      )}

      {/* ── TAB: STORIES ─────────────────────────────────────────────────── */}
      {tab === "stories" && (
        <PostGrid
          posts={myStories}
          deleteConfirm={deleteConfirm}
          setDeleteConfirm={setDeleteConfirm}
          onDelete={deletePost}
          primaryColor={primaryColor}
          emptyLabel="Você ainda não publicou nenhum story."
          isStory
        />
      )}

      {/* ── TAB: COMMENTS ────────────────────────────────────────────────── */}
      {tab === "comments" && (
        <div className="space-y-4">
          {/* Pending */}
          {pendingComments.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <p className="text-sm text-amber-700" style={{ fontWeight: 600 }}>
                  Aguardando moderação ({pendingComments.length})
                </p>
              </div>
              {pendingComments.map((c) => (
                <div key={c.id} className="bg-white rounded-lg p-3 border border-amber-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 truncate">
                        Em: <span style={{ fontWeight: 500 }}>{c.postTitle}…</span>
                      </p>
                      <p className="text-sm text-gray-900 mt-1">
                        <span style={{ fontWeight: 600 }}>{c.userName}:</span>{" "}
                        {c.text}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => moderateComment(c.postId, c.id, "approved")}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs hover:bg-emerald-100 transition-colors"
                        style={{ fontWeight: 600 }}
                      >
                        <Check className="w-3.5 h-3.5" /> Aprovar
                      </button>
                      <button
                        onClick={() => moderateComment(c.postId, c.id, "rejected")}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs hover:bg-red-100 transition-colors"
                        style={{ fontWeight: 600 }}
                      >
                        <X className="w-3.5 h-3.5" /> Recusar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Approved */}
          {approvedComments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                  Publicados ({approvedComments.length})
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {approvedComments.map((c) => (
                  <div key={c.id} className="px-4 py-3 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 truncate">
                        Em: <span style={{ fontWeight: 500 }}>{c.postTitle}…</span>
                      </p>
                      <p className="text-sm text-gray-800 mt-0.5">
                        <span style={{ fontWeight: 600 }}>{c.userName}:</span>{" "}
                        {c.text}
                      </p>
                    </div>
                    <button
                      onClick={() => moderateComment(c.postId, c.id, "rejected")}
                      className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                      title="Remover"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected */}
          {rejectedComments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                <X className="w-4 h-4 text-red-400" />
                <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                  Recusados ({rejectedComments.length})
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {rejectedComments.map((c) => (
                  <div key={c.id} className="px-4 py-3 flex items-start justify-between gap-2 opacity-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 truncate">
                        Em: <span style={{ fontWeight: 500 }}>{c.postTitle}…</span>
                      </p>
                      <p className="text-sm text-gray-800 mt-0.5 line-through">
                        <span style={{ fontWeight: 600 }}>{c.userName}:</span>{" "}
                        {c.text}
                      </p>
                    </div>
                    <button
                      onClick={() => moderateComment(c.postId, c.id, "approved")}
                      className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 transition-colors"
                      title="Restaurar"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {allMyComments.length === 0 && (
            <div className="text-center py-16">
              <MessageCircle className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-500">Nenhum comentário ainda.</p>
              <p className="text-xs text-gray-400 mt-1">Os comentários dos seus posts aparecerão aqui.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Create Post Modal ──────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "95vh" }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-violet-500" />
                <h3 className="text-gray-900 text-base" style={{ fontWeight: 700 }}>Nova publicação</h3>
              </div>
              <button
                onClick={() => { setModalOpen(false); setForm({ ...BLANK }); setUrlMode(false); }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

              {/* Type selector: Feed vs Story */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block" style={{ fontWeight: 600 }}>TIPO DE PUBLICAÇÃO</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["feed", "story"] as PostType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((f) => ({ ...f, postType: t }))}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all"
                      style={
                        form.postType === t
                          ? { borderColor: primaryColor, background: "#F5F3FF" }
                          : { borderColor: "#E5E7EB" }
                      }
                    >
                      {t === "feed"
                        ? <Image className="w-6 h-6" style={{ color: form.postType === t ? primaryColor : "#9CA3AF" }} />
                        : <Clock className="w-6 h-6" style={{ color: form.postType === t ? "#EC4899" : "#9CA3AF" }} />
                      }
                      <div>
                        <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                          {t === "feed" ? "Post do Feed" : "Story (24h)"}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t === "feed" ? "Permanente no perfil" : "Expira em 24 horas"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Media type: Photo vs Video */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block" style={{ fontWeight: 600 }}>TIPO DE MÍDIA</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["photo", "video"] as MediaType[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setForm((f) => ({ ...f, mediaType: m }))}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all text-sm"
                      style={
                        form.mediaType === m
                          ? { borderColor: primaryColor, color: primaryColor, fontWeight: 600, background: "#F5F3FF" }
                          : { borderColor: "#E5E7EB", color: "#6B7280" }
                      }
                    >
                      {m === "photo" ? <Image className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                      {m === "photo" ? "Foto" : "Vídeo"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image picker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500" style={{ fontWeight: 600 }}>
                    {form.mediaType === "photo" ? "IMAGEM" : "URL DO VÍDEO"}
                  </label>
                  <button
                    onClick={() => setUrlMode((v) => !v)}
                    className="text-xs text-violet-500 hover:text-violet-700 transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    {urlMode ? "← Usar galeria" : "Inserir URL →"}
                  </button>
                </div>

                {urlMode ? (
                  <input
                    value={form.customUrl}
                    onChange={(e) => setForm((f) => ({ ...f, customUrl: e.target.value }))}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-violet-400 transition-colors"
                  />
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {DEMO_IMAGES.map((img) => (
                      <button
                        key={img.url}
                        onClick={() => setForm((f) => ({ ...f, mediaUrl: img.url }))}
                        className="aspect-square rounded-xl overflow-hidden relative border-2 transition-all"
                        style={{ borderColor: form.mediaUrl === img.url ? primaryColor : "transparent" }}
                      >
                        <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                        {form.mediaUrl === img.url && (
                          <div className="absolute inset-0 bg-violet-600/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Preview */}
                {(urlMode ? form.customUrl : form.mediaUrl) && !urlMode && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-gray-100 h-32">
                    <img
                      src={form.mediaUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block" style={{ fontWeight: 600 }}>LEGENDA</label>
                <textarea
                  value={form.caption}
                  onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                  placeholder="Escreva sua legenda aqui… Use hashtags e emojis!"
                  rows={4}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-violet-400 transition-colors resize-none placeholder-gray-400"
                  maxLength={2200}
                />
                <p className="text-right text-xs text-gray-300 mt-1">{form.caption.length}/2200</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 shrink-0 bg-gray-50 flex gap-3">
              <button
                onClick={() => { setModalOpen(false); setForm({ ...BLANK }); setUrlMode(false); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-100 transition-colors"
                style={{ fontWeight: 500 }}
              >
                Cancelar
              </button>
              <button
                onClick={handlePublish}
                disabled={!(urlMode ? form.customUrl : form.mediaUrl) || !form.caption}
                className="flex-1 py-2.5 rounded-xl text-white text-sm transition-opacity disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)", fontWeight: 600 }}
              >
                Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Post Grid subcomponent ─────────────────────────────────────────────────────
function PostGrid({
  posts, deleteConfirm, setDeleteConfirm, onDelete, primaryColor, emptyLabel, isStory = false,
}: {
  posts: FeedPost[];
  deleteConfirm: string | null;
  setDeleteConfirm: (id: string | null) => void;
  onDelete: (id: string) => void;
  primaryColor: string;
  emptyLabel: string;
  isStory?: boolean;
}) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        {isStory
          ? <Clock className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          : <Image className="w-10 h-10 mx-auto mb-3 text-gray-200" />
        }
        <p className="text-gray-500">{emptyLabel}</p>
        <p className="text-xs text-gray-400 mt-1">Clique em "Nova publicação" para começar.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5">
      {posts.map((post) => (
        <div key={post.id} className="relative group aspect-square bg-gray-100 overflow-hidden">
          <img
            src={post.mediaUrl}
            alt={post.caption}
            className="w-full h-full object-cover"
          />
          {/* Story badge */}
          {isStory && post.expiresAt && (
            <div className="absolute top-1 left-1 bg-pink-500 text-white px-1.5 py-0.5 rounded-md" style={{ fontSize: 9, fontWeight: 700 }}>
              STORY
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-3 text-white text-xs">
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" /> {post.likesCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" /> {post.commentsCount}
              </span>
            </div>
            {deleteConfirm === post.id ? (
              <div className="flex flex-col gap-1 px-2 text-center">
                <p className="text-white text-[10px]">Excluir?</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => { onDelete(post.id); setDeleteConfirm(null); }}
                    className="px-2 py-1 bg-red-500 rounded text-white text-[10px]"
                    style={{ fontWeight: 700 }}
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-2 py-1 bg-white/30 rounded text-white text-[10px]"
                  >
                    Não
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(post.id)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}