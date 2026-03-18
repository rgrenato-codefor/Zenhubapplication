/**
 * FeedContext.tsx
 *
 * Social-feed data layer for ZEN HUB.
 * Reads from Firestore collections:
 *   - feedPosts      → posts (feed + stories)
 *   - feedComments   → comments per post
 *   - feedLikes      → { userId, postId }
 *   - feedFollows    → { userId, therapistId }
 */

import {
  createContext, useContext, useState, useCallback,
  useMemo, useEffect, useRef,
} from "react";
import {
  collection, query, orderBy, onSnapshot, doc,
  setDoc, deleteDoc, updateDoc, increment,
  serverTimestamp, where, getDocs, writeBatch,
  Timestamp, addDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "./AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostType      = "feed" | "story";
export type MediaType     = "photo" | "video";
export type CommentStatus = "pending" | "approved" | "rejected";

export interface FeedPost {
  id: string;
  therapistId: string;
  therapistName: string;
  therapistAvatar: string;
  therapistSpecialty: string;
  therapistUsername: string;
  type: PostType;
  mediaType: MediaType;
  mediaUrl: string;
  caption: string;
  createdAt: number;       // Unix ms (converted from Timestamp)
  expiresAt?: number;
  likesCount: number;
  commentsCount: number;
}

export interface FeedComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: number;
  status: CommentStatus;
}

export interface DemoTherapist {
  id: string;
  name: string;
  avatar: string;
  specialty: string;
  username: string;
}

interface FeedContextValue {
  feedPosts: FeedPost[];
  stories: FeedPost[];
  myPosts: FeedPost[];
  comments: Record<string, FeedComment[]>;
  likedPostIds: Set<string>;
  followedTherapistIds: Set<string>;
  storyTherapists: DemoTherapist[];
  viewedStoryTherapistIds: Set<string>;
  loading: boolean;

  toggleLike: (postId: string) => void;
  toggleFollow: (therapistId: string) => void;
  addComment: (postId: string, text: string) => Promise<void>;
  addPost: (post: Omit<FeedPost, "id" | "createdAt" | "expiresAt" | "likesCount" | "commentsCount">) => void;
  deletePost: (postId: string) => void;
  moderateComment: (postId: string, commentId: string, status: "approved" | "rejected") => void;
  markStoryViewed: (therapistId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tsToMs(val: any): number {
  if (!val) return Date.now();
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === "number") return val;
  return Date.now();
}

// ─── Context ──────────────────────────────────────────────────────────────────

const FeedContext = createContext<FeedContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [posts, setPosts]     = useState<FeedPost[]>([]);
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [likedPostIds, setLikedPostIds]   = useState<Set<string>>(new Set());
  const [followedTherapistIds, setFollowedTherapistIds] = useState<Set<string>>(new Set());
  const [viewedStoryTherapistIds, setViewedStoryTherapistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // ── Subscribe: feedPosts ─────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "feedPosts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const loaded: FeedPost[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          therapistId:       data.therapistId       ?? "",
          therapistName:     data.therapistName     ?? "",
          therapistAvatar:   data.therapistAvatar   ?? "",
          therapistSpecialty: data.therapistSpecialty ?? "",
          therapistUsername: data.therapistUsername ?? "",
          type:              data.type              ?? "feed",
          mediaType:         data.mediaType         ?? "photo",
          mediaUrl:          data.mediaUrl          ?? "",
          caption:           data.caption           ?? "",
          createdAt:         tsToMs(data.createdAt),
          expiresAt:         data.expiresAt ? tsToMs(data.expiresAt) : undefined,
          likesCount:        data.likesCount        ?? 0,
          commentsCount:     data.commentsCount     ?? 0,
        } as FeedPost;
      });
      setPosts(loaded);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  // ── Subscribe: feedComments ──────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "feedComments"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, FeedComment[]> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        const comment: FeedComment = {
          id:         d.id,
          postId:     data.postId     ?? "",
          userId:     data.userId     ?? "",
          userName:   data.userName   ?? "Anônimo",
          userAvatar: data.userAvatar ?? undefined,
          text:       data.text       ?? "",
          createdAt:  tsToMs(data.createdAt),
          status:     data.status     ?? "pending",
        };
        if (!map[comment.postId]) map[comment.postId] = [];
        map[comment.postId].push(comment);
      });
      setComments(map);
    });
    return () => unsub();
  }, []);

  // ── Subscribe: feedLikes (current user) ─────────────────────────────────
  useEffect(() => {
    if (!user?.uid) { setLikedPostIds(new Set()); return; }
    const q = query(collection(db, "feedLikes"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setLikedPostIds(new Set(snap.docs.map((d) => d.data().postId as string)));
    });
    return () => unsub();
  }, [user?.uid]);

  // ── Subscribe: feedFollows (current user) ────────────────────────────────
  useEffect(() => {
    if (!user?.uid) { setFollowedTherapistIds(new Set()); return; }
    const q = query(collection(db, "feedFollows"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setFollowedTherapistIds(new Set(snap.docs.map((d) => d.data().therapistId as string)));
    });
    return () => unsub();
  }, [user?.uid]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const stories = useMemo(
    () => posts.filter((p) => p.type === "story" && (p.expiresAt ?? 0) > Date.now()),
    [posts]
  );

  const feedPosts = useMemo(
    () => posts.filter((p) => p.type === "feed"),
    [posts]
  );

  const storyTherapists = useMemo<DemoTherapist[]>(() => {
    const seen = new Set<string>();
    const result: DemoTherapist[] = [];
    [...stories].sort((a, b) => b.createdAt - a.createdAt).forEach((s) => {
      if (!seen.has(s.therapistId)) {
        seen.add(s.therapistId);
        result.push({
          id:        s.therapistId,
          name:      s.therapistName,
          avatar:    s.therapistAvatar,
          specialty: s.therapistSpecialty,
          username:  s.therapistUsername,
        });
      }
    });
    return result;
  }, [stories]);

  const myPosts = useMemo(() => {
    if (!user?.therapistId) return [];
    return posts
      .filter((p) => p.therapistId === user.therapistId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [posts, user?.therapistId]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const toggleLike = useCallback(async (postId: string) => {
    if (!user?.uid) return;
    const likeId = `${user.uid}_${postId}`;
    const likeRef = doc(db, "feedLikes", likeId);
    const postRef = doc(db, "feedPosts", postId);

    if (likedPostIds.has(postId)) {
      await deleteDoc(likeRef);
      await updateDoc(postRef, { likesCount: increment(-1) });
    } else {
      await setDoc(likeRef, { userId: user.uid, postId, createdAt: serverTimestamp() });
      await updateDoc(postRef, { likesCount: increment(1) });
    }
  }, [user?.uid, likedPostIds]);

  const toggleFollow = useCallback(async (therapistId: string) => {
    if (!user?.uid) return;
    const followId = `${user.uid}_${therapistId}`;
    const followRef = doc(db, "feedFollows", followId);

    if (followedTherapistIds.has(therapistId)) {
      await deleteDoc(followRef);
    } else {
      await setDoc(followRef, { userId: user.uid, therapistId, createdAt: serverTimestamp() });
    }
  }, [user?.uid, followedTherapistIds]);

  const addComment = useCallback(async (postId: string, text: string) => {
    if (!text.trim() || !user) throw new Error("Você precisa estar logado para comentar.");
    const commentData = {
      postId,
      userId:     user.uid,
      userName:   user.name ?? "Anônimo",
      userAvatar: user.avatar ?? null,
      text:       text.trim(),
      createdAt:  serverTimestamp(),
      status:     "pending" as CommentStatus,
    };
    await addDoc(collection(db, "feedComments"), commentData);
    await updateDoc(doc(db, "feedPosts", postId), { commentsCount: increment(1) });
  }, [user]);

  const addPost = useCallback(async (
    post: Omit<FeedPost, "id" | "createdAt" | "expiresAt" | "likesCount" | "commentsCount">
  ) => {
    const now = serverTimestamp();
    const data: any = {
      ...post,
      createdAt:  now,
      likesCount: 0,
      commentsCount: 0,
    };
    if (post.type === "story") {
      // expiresAt = now + 24h (we'll store as Timestamp via ms offset)
      data.expiresAt = Timestamp.fromMillis(Date.now() + 24 * 3_600_000);
    }
    await addDoc(collection(db, "feedPosts"), data);
  }, []);

  const deletePost = useCallback(async (postId: string) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, "feedPosts", postId));
    // Delete all comments for this post
    const commentsSnap = await getDocs(
      query(collection(db, "feedComments"), where("postId", "==", postId))
    );
    commentsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }, []);

  const moderateComment = useCallback(async (
    postId: string,
    commentId: string,
    status: "approved" | "rejected"
  ) => {
    await updateDoc(doc(db, "feedComments", commentId), { status });
    if (status === "rejected") {
      await updateDoc(doc(db, "feedPosts", postId), { commentsCount: increment(-1) });
    }
  }, []);

  const markStoryViewed = useCallback((therapistId: string) => {
    setViewedStoryTherapistIds((prev) => new Set([...prev, therapistId]));
  }, []);

  return (
    <FeedContext.Provider
      value={{
        feedPosts, stories, myPosts, comments,
        likedPostIds, followedTherapistIds,
        storyTherapists, viewedStoryTherapistIds,
        loading,
        toggleLike, toggleFollow, addComment,
        addPost, deletePost, moderateComment, markStoryViewed,
      }}
    >
      {children}
    </FeedContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFeed(): FeedContextValue {
  const ctx = useContext(FeedContext);
  if (!ctx) throw new Error("useFeed must be used inside <FeedProvider>");
  return ctx;
}