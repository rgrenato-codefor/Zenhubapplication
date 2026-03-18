/**
 * PostCard.tsx
 * Single Instagram-style post card.
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { Heart, MessageCircle, Share2, UserPlus, BookmarkIcon } from "../shared/icons";
import { CommentsModal } from "./CommentsModal";
import type { FeedPost, FeedComment } from "../../context/FeedContext";

interface Props {
  post: FeedPost;
  comments: FeedComment[];
  isLiked: boolean;
  isFollowed: boolean;
  onToggleLike: () => void;
  onToggleFollow: () => void;
  onAddComment: (text: string) => Promise<void>;
  primaryColor?: string;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function PostCard({ post, comments, isLiked, isFollowed, onToggleLike, onToggleFollow, onAddComment, primaryColor = "#7C3AED" }: Props) {
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);

  const approvedComments = comments.filter((c) => c.status === "approved");

  function handleDoubleTap() {
    if (!isLiked) {
      onToggleLike();
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 700);
    }
  }

  function goToProfile() {
    navigate(`/${post.therapistUsername}`);
  }

  return (
    <>
      <article className="bg-white border-b border-gray-100">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Avatar — click → therapist profile */}
          <button onClick={goToProfile} className="shrink-0 relative">
            <div
              className="w-9 h-9 rounded-full p-[2px]"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, #EC4899)` }}
            >
              <img
                src={post.therapistAvatar}
                alt={post.therapistName}
                className="w-full h-full rounded-full object-cover border-2 border-white"
              />
            </div>
          </button>
          {/* Name + specialty */}
          <button onClick={goToProfile} className="flex-1 min-w-0 text-left">
            <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>
              {post.therapistName}
            </p>
            <p className="text-xs text-gray-400 truncate">{post.therapistSpecialty}</p>
          </button>
          {/* Follow button */}
          <button
            onClick={onToggleFollow}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all shrink-0"
            style={
              isFollowed
                ? { borderColor: "#E5E7EB", color: "#6B7280" }
                : { borderColor: primaryColor, color: primaryColor, fontWeight: 600 }
            }
          >
            {!isFollowed && <UserPlus className="w-3.5 h-3.5" />}
            {isFollowed ? "Seguindo" : "Seguir"}
          </button>
          {/* Time */}
          <span className="text-xs text-gray-400 shrink-0 ml-1">{timeAgo(post.createdAt)}</span>
        </div>

        {/* Media */}
        <div className="relative bg-gray-100" onDoubleClick={handleDoubleTap}>
          <img
            src={post.mediaUrl}
            alt={post.caption}
            className="w-full object-cover"
            style={{ maxHeight: 500, minHeight: 200 }}
            draggable={false}
          />
          {/* Double-tap heart animation */}
          {likeAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart
                className="w-20 h-20 text-white drop-shadow-lg animate-ping"
                style={{ fill: "white" }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-4">
            {/* Like */}
            <button
              onClick={onToggleLike}
              className="flex items-center gap-1.5 transition-transform active:scale-90"
              aria-label={isLiked ? "Descurtir" : "Curtir"}
            >
              <Heart
                className="w-6 h-6 transition-colors"
                style={{ color: isLiked ? "#EF4444" : "#374151", fill: isLiked ? "#EF4444" : "none", strokeWidth: 1.8 }}
              />
            </button>
            {/* Comment */}
            <button
              onClick={() => setShowComments(true)}
              className="flex items-center gap-1.5"
              aria-label="Comentar"
            >
              <MessageCircle className="w-6 h-6 text-gray-700" style={{ strokeWidth: 1.8 }} />
            </button>
            {/* Share */}
            <button className="flex items-center gap-1.5" aria-label="Compartilhar">
              <Share2 className="w-6 h-6 text-gray-700" style={{ strokeWidth: 1.8 }} />
            </button>
            {/* Spacer */}
            <div className="flex-1" />
            {/* Save */}
            <button
              onClick={() => setSaved((s) => !s)}
              aria-label={saved ? "Remover" : "Salvar"}
            >
              <BookmarkIcon
                className="w-6 h-6 transition-colors"
                style={{ color: saved ? primaryColor : "#374151", fill: saved ? primaryColor : "none", strokeWidth: 1.8 }}
              />
            </button>
          </div>

          {/* Likes count */}
          <p className="mt-2 text-sm text-gray-900" style={{ fontWeight: 600 }}>
            {post.likesCount.toLocaleString("pt-BR")} curtidas
          </p>

          {/* Caption */}
          {post.caption && (
            <div className="mt-1 text-sm text-gray-800 leading-relaxed">
              <span className="mr-1" style={{ fontWeight: 600 }}>{post.therapistName.split(" ")[1] ?? post.therapistName}</span>
              <ExpandableCaption text={post.caption} />
            </div>
          )}

          {/* Comments preview */}
          {approvedComments.length > 0 && (
            <button
              onClick={() => setShowComments(true)}
              className="mt-2 text-xs text-gray-400 block"
            >
              Ver todos os {approvedComments.length} comentários
            </button>
          )}
          {approvedComments.slice(-2).map((c) => (
            <p key={c.id} className="text-xs text-gray-700 mt-1 truncate">
              <span style={{ fontWeight: 600 }}>{c.userName}</span>{" "}
              {c.text}
            </p>
          ))}

          {/* Add comment (compact) */}
          <button
            onClick={() => setShowComments(true)}
            className="mt-2 mb-1 flex items-center gap-2 w-full text-left"
          >
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
              <MessageCircle className="w-3 h-3 text-gray-400" />
            </div>
            <span className="text-xs text-gray-400 flex-1">Adicionar comentário…</span>
          </button>
        </div>
      </article>

      {/* Comments modal */}
      {showComments && (
        <CommentsModal
          postId={post.id}
          comments={comments}
          onClose={() => setShowComments(false)}
          onAdd={(text) => onAddComment(text)}
          primaryColor={primaryColor}
        />
      )}
    </>
  );
}

// ── Expandable caption ────────────────────────────────────────────────────────
function ExpandableCaption({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split("\n");
  const preview = lines[0];
  const hasMore = lines.length > 1 || text.length > 100;

  if (!hasMore || expanded) {
    return (
      <span style={{ whiteSpace: "pre-line" }}>
        {text}
        {expanded && hasMore && (
          <button
            className="ml-1 text-gray-400 text-xs"
            onClick={() => setExpanded(false)}
          >
            ver menos
          </button>
        )}
      </span>
    );
  }

  return (
    <span>
      {preview.length > 100 ? preview.slice(0, 100) + "…" : preview}
      <button
        className="ml-1 text-gray-400 text-xs"
        onClick={() => setExpanded(true)}
      >
        mais
      </button>
    </span>
  );
}