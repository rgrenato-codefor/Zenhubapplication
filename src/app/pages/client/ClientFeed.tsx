/**
 * ClientFeed.tsx
 * Instagram-style feed for clients — stories + posts.
 */

import { useState } from "react";
import { useFeed } from "../../context/FeedContext";
import { usePageData } from "../../hooks/usePageData";
import { StoryViewer } from "../../components/feed/StoryViewer";
import { PostCard } from "../../components/feed/PostCard";
import { Sparkles } from "../../components/shared/icons";

export default function ClientFeed() {
  const { company } = usePageData();
  const primaryColor = company?.color || "#7C3AED";

  const {
    feedPosts, stories, storyTherapists, comments,
    likedPostIds, followedTherapistIds, viewedStoryTherapistIds,
    toggleLike, toggleFollow, addComment, markStoryViewed,
    loading,
  } = useFeed();

  const [storyOpen, setStoryOpen] = useState(false);
  const [storyStartId, setStoryStartId] = useState<string>("");

  function openStories(therapistId: string) {
    setStoryStartId(therapistId);
    setStoryOpen(true);
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-[470px] mx-auto bg-white min-h-screen">
        {/* Stories skeleton */}
        <div className="bg-white border-b border-gray-100 px-3 py-3">
          <div className="flex gap-4 overflow-x-auto pb-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-16 h-16 rounded-full bg-gray-100 animate-pulse" />
                <div className="w-12 h-2 rounded bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        {/* Posts skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-b border-gray-100 pb-4 mb-2">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 bg-gray-100 animate-pulse rounded" />
                <div className="h-2 w-20 bg-gray-100 animate-pulse rounded" />
              </div>
            </div>
            <div className="w-full aspect-square bg-gray-100 animate-pulse" />
            <div className="px-4 pt-3 space-y-2">
              <div className="h-3 w-3/4 bg-gray-100 animate-pulse rounded" />
              <div className="h-3 w-1/2 bg-gray-100 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-[470px] mx-auto bg-white min-h-screen">

      {/* ── Stories row ───────────────────────────────────────────────────── */}
      {storyTherapists.length > 0 && (
        <div className="bg-white border-b border-gray-100 px-3 py-3">
          <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
            {storyTherapists.map((therapist) => {
              const hasViewed = viewedStoryTherapistIds.has(therapist.id);
              return (
                <button
                  key={therapist.id}
                  onClick={() => openStories(therapist.id)}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  <div
                    className="w-16 h-16 rounded-full p-[2.5px] transition-opacity"
                    style={{
                      background: hasViewed
                        ? "#D1D5DB"
                        : `linear-gradient(135deg, ${primaryColor}, #EC4899, #F59E0B)`,
                    }}
                  >
                    <div className="w-full h-full rounded-full bg-white p-[2px]">
                      <img
                        src={therapist.avatar}
                        alt={therapist.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-600 text-center w-16 truncate" style={{ fontWeight: hasViewed ? 400 : 600 }}>
                    {therapist.name.split(" ")[1] ?? therapist.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Feed posts ────────────────────────────────────────────────────── */}
      {feedPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <Sparkles className="w-12 h-12 mb-4 text-gray-200" />
          <p className="text-gray-500" style={{ fontWeight: 600 }}>O feed está vazio</p>
          <p className="text-sm text-gray-400 mt-1">
            Os terapeutas ainda não publicaram nada. Volte em breve!
          </p>
        </div>
      ) : (
        <div>
          {feedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              comments={(comments[post.id] ?? []).filter((c) => c.status === "approved")}
              isLiked={likedPostIds.has(post.id)}
              isFollowed={followedTherapistIds.has(post.therapistId)}
              onToggleLike={() => toggleLike(post.id)}
              onToggleFollow={() => toggleFollow(post.therapistId)}
              onAddComment={(text) => addComment(post.id, text)}
              primaryColor={primaryColor}
            />
          ))}
          <div className="py-10 flex flex-col items-center gap-2 text-gray-300">
            <div className="w-8 h-px bg-gray-200" />
            <p className="text-xs">Você viu tudo por hoje</p>
          </div>
        </div>
      )}

      {/* ── Story viewer overlay ──────────────────────────────────────────── */}
      {storyOpen && (
        <StoryViewer
          therapists={storyTherapists}
          stories={stories}
          initialTherapistId={storyStartId}
          onClose={() => setStoryOpen(false)}
          onViewed={markStoryViewed}
          primaryColor={primaryColor}
        />
      )}
    </div>
  );
}