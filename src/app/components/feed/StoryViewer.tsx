/**
 * StoryViewer.tsx
 * Full-screen story viewer — progress bar, auto-advance, swipe-style navigation.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "../shared/icons";
import type { DemoTherapist, FeedPost } from "../../context/FeedContext";

interface Props {
  therapists: DemoTherapist[];
  stories: FeedPost[];   // all active stories
  initialTherapistId: string;
  onClose: () => void;
  onViewed: (therapistId: string) => void;
  primaryColor?: string;
}

const STORY_DURATION_MS = 5000;

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function StoryViewer({ therapists, stories, initialTherapistId, onClose, onViewed, primaryColor = "#7C3AED" }: Props) {
  // Which therapist's stories we're viewing
  const [therapistIdx, setTherapistIdx] = useState(
    () => Math.max(0, therapists.findIndex((t) => t.id === initialTherapistId))
  );
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef    = useRef(0);
  const elapsed     = useRef(0);

  const currentTherapist = therapists[therapistIdx];
  const therapistStories = stories.filter((s) => s.therapistId === currentTherapist?.id);
  const currentStory     = therapistStories[storyIdx];

  // Mark viewed
  useEffect(() => {
    if (currentTherapist) onViewed(currentTherapist.id);
  }, [currentTherapist, onViewed]);

  const goNextStory = useCallback(() => {
    if (storyIdx < therapistStories.length - 1) {
      setStoryIdx((i) => i + 1);
      setProgress(0);
      elapsed.current = 0;
    } else if (therapistIdx < therapists.length - 1) {
      setTherapistIdx((i) => i + 1);
      setStoryIdx(0);
      setProgress(0);
      elapsed.current = 0;
    } else {
      onClose();
    }
  }, [storyIdx, therapistStories.length, therapistIdx, therapists.length, onClose]);

  const goPrevStory = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (therapistIdx > 0) {
      setTherapistIdx((i) => i - 1);
      setStoryIdx(0);
    }
    setProgress(0);
    elapsed.current = 0;
  }, [storyIdx, therapistIdx]);

  // Auto-progress
  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      elapsed.current += 50;
      const pct = Math.min(100, (elapsed.current / STORY_DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        elapsed.current = 0;
        goNextStory();
      }
    }, 50);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, storyIdx, therapistIdx, goNextStory]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNextStory();
      if (e.key === "ArrowLeft") goPrevStory();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNextStory, goPrevStory]);

  if (!currentStory || !currentTherapist) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Story container — max 430px wide, full height */}
      <div
        className="relative w-full max-w-sm h-full flex flex-col"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2 pt-3">
          {therapistStories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%",
                  transitionProperty: "none",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-20 flex items-center gap-3 px-4 pt-2">
          <img
            src={currentTherapist.avatar}
            alt={currentTherapist.name}
            className="w-9 h-9 rounded-full object-cover border-2 border-white"
          />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm truncate" style={{ fontWeight: 600 }}>
              {currentTherapist.name}
            </p>
            <p className="text-white/70 text-xs">{timeAgo(currentStory.createdAt)}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media */}
        <img
          src={currentStory.mediaUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-8">
            <p className="text-white text-sm leading-relaxed">{currentStory.caption}</p>
          </div>
        )}

        {/* Left / Right tap zones */}
        <button
          className="absolute left-0 top-0 w-1/3 h-full z-30 focus:outline-none"
          onClick={(e) => { e.stopPropagation(); goPrevStory(); }}
          aria-label="Story anterior"
        />
        <button
          className="absolute right-0 top-0 w-1/3 h-full z-30 focus:outline-none"
          onClick={(e) => { e.stopPropagation(); goNextStory(); }}
          aria-label="Próximo story"
        />
      </div>

      {/* Prev / Next therapist buttons (desktop) */}
      {therapistIdx > 0 && (
        <button
          onClick={goPrevStory}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 items-center justify-center text-white transition-colors z-40"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {therapistIdx < therapists.length - 1 && (
        <button
          onClick={goNextStory}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 items-center justify-center text-white transition-colors z-40"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
