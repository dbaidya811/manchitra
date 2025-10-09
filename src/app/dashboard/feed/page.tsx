"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { UserProfile } from "@/components/dashboard/user-profile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { Loader } from "@/components/ui/loader";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Heart, PenLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { playLikeSound, playSaveSound } from "@/lib/sound";
 

export default function FeedPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  // Composer dialog state
  const [open, setOpen] = useState(false);
  // FAB animations removed per request
  // Author (pulled automatically from localStorage user when posting)
  const [authorName, setAuthorName] = useState("");
  const [authorAvatar, setAuthorAvatar] = useState<string | null>(null);
  const [cardQuery, setCardQuery] = useState("");
  const [cardName, setCardName] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allCards, setAllCards] = useState<string[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]); // data URLs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [overlayLikedId, setOverlayLikedId] = useState<string | null>(null);
  const [overlayPopId, setOverlayPopId] = useState<string | null>(null);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [realtimeOn] = useState(true);
  const [lastFeedHash, setLastFeedHash] = useState<string>("");
  const FEED_REFRESH_MS = 30000; // 30s auto-refresh (was 0.5s causing constant reloads)
  // Track liked posts per email locally to keep UI state consistent during polling
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  // Throttle guard to avoid rapid double toggles
  const lastToggleAtRef = useRef<Record<string, number>>({});

  const likedKey = (email: string | null) => email ? `liked_posts_${email}` : '';
  const loadLikedSet = (email: string | null): Set<string> => {
    try {
      if (!email) return new Set();
      const raw = localStorage.getItem(likedKey(email));
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.map(String));
      return new Set();
    } catch { return new Set(); }
  };
  const saveLikedSet = (email: string | null, setVal: Set<string>) => {
    try {
      if (!email) return;
      localStorage.setItem(likedKey(email), JSON.stringify(Array.from(setVal)));
    } catch {}
  };

  // Per-post Instagram-like media carousel
  const PostMedia: React.FC<{ photos: string[]; onDoubleLike: () => void }> = ({ photos, onDoubleLike }) => {
    const [api, setApi] = useState<CarouselApi | null>(null);
    const [index, setIndex] = useState(0);
    const lastTapRef = useRef<number>(0);
    const handleTouchEnd = (e: React.TouchEvent) => {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        e.preventDefault();
        onDoubleLike();
      }
      lastTapRef.current = now;
    };
    useEffect(() => {
      if (!api) return;
      const onSelect = () => setIndex(api.selectedScrollSnap());
      api.on('select', onSelect);
      onSelect();
      return () => { try { api.off('select', onSelect); } catch {} };
    }, [api]);
    if (!photos || photos.length === 0) return null;
    return (
      <div className="relative w-full">
        {photos.length > 1 ? (
          <Carousel opts={{ align: 'start', loop: true }} setApi={setApi} className="w-full">
            <CarouselContent>
              {photos.map((src, i) => (
                <CarouselItem key={i} className="basis-full">
                  <div className="relative w-full aspect-square select-none" onDoubleClick={onDoubleLike} onTouchEnd={handleTouchEnd}>
                    <Image src={src} alt={`post-${i + 1}`} fill className="object-cover" />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex !left-2 top-1/2 -translate-y-1/2" />
            <CarouselNext className="hidden sm:flex !right-2 top-1/2 -translate-y-1/2" />
          </Carousel>
        ) : (
          <div className="relative w-full aspect-square select-none" onDoubleClick={onDoubleLike} onTouchEnd={handleTouchEnd}>
            <Image src={photos[0]} alt="post" fill className="object-cover" />
          </div>
        )}
        {photos.length > 1 && (
          <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/60 text-white text-[11px] px-2 py-0.5">
            {index + 1}/{photos.length}
          </div>
        )}
      </div>
    );
  };

  type Post = {
    id: string;
    author?: string;
    avatarUrl?: string | null;
    cardName: string;
    text: string;
    photos: string[];
    createdAt: number;
    likes: number;
    likedByMe: boolean;
    ownerEmail?: string | null;
    edited?: boolean;
    updatedAt?: number | null;
    likedBy?: string[];
    poll?: {
      options: Array<{ id: string; text: string; votes: number; voters?: string[] }>;
      allowMultiple: boolean;
      expiresAt?: number | null;
    };
  };
  const [posts, setPosts] = useState<Post[]>([]);
  const LS_KEY = "social_feed_posts_v2"; // legacy, no longer used for persistence

  // Composer: emoji picker and poll
  const [emojiOpen, setEmojiOpen] = useState(false);
  const commonEmojis = ['😀','😁','😂','😊','😍','😎','😢','😡','🙏','👍','🔥','🎉','❤️','✨','✅'];
  const [emojiList, setEmojiList] = useState<Array<{ character: string; slug: string }>>([]);
  const [emojiLoading, setEmojiLoading] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState("");
  const [pollOpen, setPollOpen] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollAllowMultiple, setPollAllowMultiple] = useState<boolean>(false);

  // No author prefill needed anymore

  // Helpers to render a proper display name when author is missing
  const nameFromEmail = (email?: string | null): string | null => {
    if (!email) return null;
    try {
      const local = String(email).split('@')[0] || '';
      if (!local) return null;
      const cleaned = local.replace(/[._-]+/g, ' ').trim();
      if (!cleaned) return null;
      return cleaned
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    } catch { return null; }
  };
  const displayNameForPost = (p: Post): string => {
    // If this post belongs to the logged-in user, always prefer session name
    if (session?.user?.email && p.ownerEmail === session.user.email && session.user.name) {
      return String(session.user.name);
    }
    const a = (p.author || '').trim();
    // Hide anon-style author labels; prefer email-derived name instead
    const looksAnon = /^anon[:\s]/i.test(a);
    if (a && !looksAnon) return a;
    const derived = nameFromEmail(p.ownerEmail);
    return derived || 'User';
  };

  // Load posts from API (public feed)
  async function fetchPosts() {
    try {
      const res = await fetch('/api/feed?limit=100', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data?.ok && Array.isArray(data.posts)) {
        const list: Post[] = data.posts.map((p: any) => ({
          id: String(p.id),
          author: p.author || undefined,
          avatarUrl: p.avatarUrl || null,
          cardName: String(p.cardName),
          text: p.text || '',
          photos: Array.isArray(p.photos) ? p.photos : [],
          createdAt: p.createdAt ? Date.parse(p.createdAt) : Date.now(),
          likes: typeof p.likes === 'number' ? p.likes : 0,
          likedBy: Array.isArray(p.likedBy) ? p.likedBy : [],
          likedByMe: false, // computed below
          ownerEmail: p.ownerEmail ?? null,
          edited: !!p.edited,
          updatedAt: p.updatedAt ? Date.parse(p.updatedAt) : null,
          poll: p.poll && Array.isArray(p.poll.options)
            ? {
                options: p.poll.options.map((o: any) => ({
                  id: String(o.id), text: String(o.text || ''), votes: typeof o.votes === 'number' ? o.votes : 0, voters: Array.isArray(o.voters) ? o.voters : [],
                })),
                allowMultiple: !!p.poll.allowMultiple,
                expiresAt: p.poll.expiresAt ? Date.parse(p.poll.expiresAt) : null,
              }
            : undefined,
        }));
        // Merge with local liked set for current user so UI reflects liked state
        const setLocal = loadLikedSet(currentUserEmail);
        setLikedSet(setLocal);
        const withLiked = list.map((pp) => ({
          ...pp,
          likedByMe: (Array.isArray(pp.likedBy) ? pp.likedBy.includes(currentUserEmail || '') : false) || setLocal.has(pp.id),
        }));
        setPosts(withLiked);
      }
    } catch (_) {}
  }
  // Fetch posts once the user email (if any) is known, so likedByMe is computed correctly
  useEffect(() => {
    fetchPosts();
  }, [currentUserEmail]);

  // Compute a small hash from feed to detect changes (ids + updatedAt + likes)
  const computeFeedHash = (items: Post[]): string => {
    try {
      const key = items
        .map((p) => `${p.id}:${p.updatedAt ?? ''}:${p.likes}:${p.likedByMe ? 1 : 0}`)
        .join('|');
      let h = 0;
      for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
      return String(h);
    } catch { return String(Date.now()); }
  };

  // Realtime polling every 10s when visible and dialog not open
  useEffect(() => {
    if (!realtimeOn) return;
    let timer: any;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      if (document.hidden || open) { schedule(); return; }
      try {
        const res = await fetch('/api/feed?limit=100', { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && data?.ok && Array.isArray(data.posts)) {
          const list: Post[] = data.posts.map((p: any) => ({
            id: String(p.id),
            author: p.author || undefined,
            avatarUrl: p.avatarUrl || null,
            cardName: String(p.cardName),
            text: p.text || '',
            photos: Array.isArray(p.photos) ? p.photos : [],
            createdAt: p.createdAt ? Date.parse(p.createdAt) : Date.now(),
            likes: typeof p.likes === 'number' ? p.likes : 0,
            likedBy: Array.isArray(p.likedBy) ? p.likedBy : [],
            likedByMe: false,
            ownerEmail: p.ownerEmail ?? null,
            edited: !!p.edited,
            updatedAt: p.updatedAt ? Date.parse(p.updatedAt) : null,
            poll: p.poll && Array.isArray(p.poll.options)
              ? {
                  options: p.poll.options.map((o: any) => ({
                    id: String(o.id), text: String(o.text || ''), votes: typeof o.votes === 'number' ? o.votes : 0, voters: Array.isArray(o.voters) ? o.voters : [],
                  })),
                  allowMultiple: !!p.poll.allowMultiple,
                  expiresAt: p.poll.expiresAt ? Date.parse(p.poll.expiresAt) : null,
                }
              : undefined,
          }));
          const setLocal = loadLikedSet(currentUserEmail);
          setLikedSet(setLocal);
          const withLiked = list.map((pp) => {
            const serverLiked = Array.isArray(pp.likedBy) ? pp.likedBy.includes(currentUserEmail || '') : false;
            const localLiked = setLocal.has(pp.id);
            const likedByMe = serverLiked || localLiked;
            const likesAdj = localLiked && !serverLiked ? 1 : 0;
            return {
              ...pp,
              likedByMe,
              likes: (typeof pp.likes === 'number' ? pp.likes : 0) + likesAdj,
            };
          });
          const newHash = computeFeedHash(withLiked);
          if (newHash !== lastFeedHash) {
            setPosts(withLiked);
            setLastFeedHash(newHash);
          }
        }
      } catch {}
      schedule();
    };
    const schedule = () => { timer = setTimeout(tick, FEED_REFRESH_MS); };
    schedule();
    const onVisibility = () => { /* restart schedule immediately */ if (timer) clearTimeout(timer); schedule(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stopped = true; if (timer) clearTimeout(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [realtimeOn, open, lastFeedHash]);

  // If another page requests to edit a post, open composer prefilled
  useEffect(() => {
    try {
      const targetId = localStorage.getItem('feed_edit_post_id');
      if (!targetId) return;
      const p = posts.find((x) => x.id === targetId);
      if (!p) return;
      setCardName(p.cardName);
      setText(p.text);
      setPhotos(p.photos || []);
      setEditPostId(p.id);
      setOpen(true);
      localStorage.removeItem('feed_edit_post_id');
    } catch {}
  }, [posts]);

  // Capture current user email for ownership checks and prefill author
  useEffect(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) {
        const p = JSON.parse(u);
        if (p?.email) setCurrentUserEmail(String(p.email));
        if (p?.name) setAuthorName(String(p.name));
        if (p?.image) setAuthorAvatar(String(p.image));
      }
      // Fallback: ensure a stable anonymous ID so likes can work without login
      setCurrentUserEmail((prev) => {
        if (prev) return prev;
        let aid = localStorage.getItem('anon_id');
        if (!aid) {
          aid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
          localStorage.setItem('anon_id', aid);
        }
        return `anon:${aid}`;
      });
    } catch {}
  }, []);

  // Prefer next-auth session for name/email/avatar when logged in
  useEffect(() => {
    if (!session) return;
    const n = session.user?.name;
    const e = session.user?.email;
    const img = session.user?.image as string | undefined;
    if (e) setCurrentUserEmail(e);
    if (n) setAuthorName(n);
    if (img) setAuthorAvatar(img);
  }, [session]);

  // Load likedSet for current user and compute likedByMe when user changes
  useEffect(() => {
    const setLocal = loadLikedSet(currentUserEmail);
    setLikedSet(setLocal);
    if (!currentUserEmail) return;
    setPosts((prev) => prev.map((p) => ({
      ...p,
      likedByMe: (Array.isArray(p.likedBy) ? p.likedBy!.includes(currentUserEmail) : false) || setLocal.has(p.id),
    })));
    // Force next poll to re-render using new likedByMe by resetting hash
    setLastFeedHash("");
  }, [currentUserEmail]);

  // Load available card names from DB when dialog opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setIsLoadingCards(true);
        const res = await fetch('/api/places');
        const data = await res.json();
        const base: string[] = Array.isArray(data?.places)
          ? data.places
              .map((p: any) => {
                const n = p?.tags?.name;
                return typeof n === 'string' ? n.trim() : '';
              })
              .filter((n: string) => n.length > 0)
          : [];
        const names = Array.from(new Set(base)) as string[];
        names.sort((a: string, b: string) => a.localeCompare(b));
        setAllCards(names);
      } catch (_) {
        setAllCards([]);
      } finally {
        setIsLoadingCards(false);
      }
    })();
  }, [open]);

  // Filter suggestions locally from allCards
  useEffect(() => {
    const q = cardQuery.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const matches = allCards.filter((n) => n.toLowerCase().includes(q)).slice(0, 10);
    setSuggestions(matches);
  }, [cardQuery, allCards]);

  // Fetch emoji set on demand when opening the picker (best-effort)
  useEffect(() => {
    const fetchEmojis = async () => {
      try {
        setEmojiLoading(true);
        const res = await fetch('https://emoji-api.com/emojis?access_key=73094aaa6d540839afb981e07f15f63f32cdebba', { cache: 'force-cache' });
        const data = await res.json();
        if (Array.isArray(data)) {
          // Only keep needed fields
          const simplified = data.map((e: any) => ({ character: String(e.character || ''), slug: String(e.slug || '') })).filter((e: any) => e.character);
          setEmojiList(simplified);
        }
      } catch {
        // fall back to commonEmojis only
      } finally {
        setEmojiLoading(false);
      }
    };
    if (emojiOpen && emojiList.length === 0 && !emojiLoading) fetchEmojis();
  }, [emojiOpen, emojiList.length, emojiLoading]);

  const canPost = useMemo(() => {
    const hasText = text.trim().length > 0;
    const hasPhotos = photos.length > 0;
    const pollValid = pollOpen && pollOptions.filter(o => o.trim().length > 0).length >= 2;
    // Card selection is optional
    return hasText || hasPhotos || pollValid;
  }, [text, photos, pollOpen, pollOptions]);

  function resetComposer() {
    setCardQuery("");
    setCardName("");
    setSuggestions([]);
    setText("");
    setPhotos([]);
  }

  // Poll vote helper
  async function voteOnPoll(postId: string, optionIds: string[]) {
    try {
      // Ensure we have an identifier
      let email = currentUserEmail as string | null;
      if (!email) {
        try {
          let aid = localStorage.getItem('anon_id');
          if (!aid) { aid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2); localStorage.setItem('anon_id', aid); }
          email = `anon:${aid}`;
          setCurrentUserEmail(email);
        } catch { email = `anon:${Date.now()}`; }
      }
      const res = await fetch(`/api/feed/${postId}/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIds, voter: email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.options) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, poll: { ...(p.poll || { allowMultiple: false, options: [] }), options: data.options } } : p));
        // Play sound only if the chosen option now contains this voter (i.e., added vote)
        try {
          const chosen = String(optionIds[0]);
          if (chosen && email) {
            const found = Array.isArray(data.options)
              ? data.options.find((o: any) => String(o.id) === chosen)
              : null;
            const nowHas = found && Array.isArray(found.voters) ? found.voters.includes(email) : false;
            if (nowHas) { playLikeSound().catch(() => {}); }
          }
        } catch {}
        toast({ title: 'Vote recorded', description: 'Thanks for voting!' });
      } else {
        const msg = typeof data?.error === 'string' ? data.error : 'Unable to vote right now.';
        toast({ title: 'Vote failed', description: msg, variant: 'destructive' });
      }
    } catch {}
  }

  // Poll UI (click an option to vote/unvote; no separate vote button)
  const PollBlock: React.FC<{ post: Post }> = ({ post }) => {
    const poll = post.poll;
    if (!poll || !Array.isArray(poll.options) || poll.options.length < 2) return null;
    const total = poll.options.reduce((s, o) => s + (typeof o.votes === 'number' ? o.votes : 0), 0);
    const me = currentUserEmail || null;
    const hasVotedAny = !!me && poll.options.some(o => Array.isArray(o.voters) && o.voters.includes(me));
    const onClickOption = async (id: string) => {
      // Immediate vote toggle/switch via API; one id per click
      await voteOnPoll(post.id, [id]);
    };
    return (
      <div className="px-3 py-2">
        <div className="mb-2 text-xs text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
          <span className="font-medium">Poll</span>
          {poll.allowMultiple && <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-100 dark:bg-neutral-800">Multiple choice</span>}
        </div>
        <div className="space-y-2">
          {poll.options.map((o) => {
            const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
            const mine = !!me && Array.isArray(o.voters) && o.voters.includes(me);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onClickOption(o.id)}
                className={`w-full text-left rounded-lg border border-black/10 dark:border-white/10 px-3 py-2 relative ${mine ? 'ring-2 ring-emerald-300' : ''}`}
              >
                <div className="flex items-center justify-between gap-3 relative z-10">
                  <div className="truncate text-sm">{o.text}</div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">{pct}% • {o.votes}</div>
                </div>
                <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
                  <div className={`${mine ? 'bg-emerald-500/25 dark:bg-emerald-400/20' : 'bg-indigo-500/15 dark:bg-indigo-400/15'} h-full`} style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-end text-xs text-neutral-600 dark:text-neutral-400">{total} votes</div>
      </div>
    );
  };

  function handleFilesSelected(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5 - photos.length);
    const readers = arr.map(
      (file) =>
        new Promise<string>((resolve) => {
          const fr = new FileReader();
          fr.onloadend = () => resolve(String(fr.result));
          fr.readAsDataURL(file);
        })
    );
    Promise.all(readers).then((dataUrls) => {
      setPhotos((prev) => prev.concat(dataUrls).slice(0, 5));
    });
  }

  function handlePostSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canPost || submitting) return;
    setSubmitting(true);
    (async () => {
      try {
        if (editPostId) {
          const payload = {
            cardName: cardName.trim(),
            text: text.trim(),
            photos: photos,
          };
          const res = await fetch(`/api/feed/${editPostId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error('Update failed');
          toast({ title: 'Updated', description: 'Your post has been edited.' });
        } else {
          const newId = crypto.randomUUID();
          const payload = {
            id: newId,
            author: (session?.user?.name as string | undefined) || authorName || nameFromEmail(currentUserEmail) || 'User',
            avatarUrl: (session?.user?.image as string | undefined) || authorAvatar || null,
            cardName: cardName.trim(),
            text: text.trim(),
            photos: photos,
            createdAt: Date.now(),
            ownerEmail: (session?.user?.email as string | undefined) || currentUserEmail || null,
            poll: (pollOpen && pollOptions.filter(o => o.trim().length > 0).length >= 2)
              ? {
                  options: pollOptions.filter(o => o.trim().length > 0).slice(0,4),
                  allowMultiple: pollAllowMultiple,
                }
              : undefined,
          };
          const res = await fetch('/api/feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error('Create failed');
          toast({ title: 'Posted', description: 'Your post has been shared.' });
          // Play success tone for new card upload
          try { playSaveSound(); } catch {}
        }
        await fetchPosts();
      } catch (err) {
        toast({ title: 'Error', description: 'Something went wrong. Please try again.', variant: 'destructive' });
      } finally {
        setSubmitting(false);
        setOpen(false);
        resetComposer();
        setEditPostId(null);
      }
    })();
  }

  function toggleLike(id: string) {
    // Throttle per-post to avoid rapid duplicate toggles
    const now = Date.now();
    const lastAt = lastToggleAtRef.current[id] || 0;
    if (now - lastAt < 500) return;
    lastToggleAtRef.current[id] = now;
    const target = posts.find((pp) => pp.id === id);
    // Ensure we have an identifier; if missing, create anon on the fly
    let email = currentUserEmail as string | null;
    if (!email) {
      try {
        let aid = localStorage.getItem('anon_id');
        if (!aid) {
          aid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
          localStorage.setItem('anon_id', aid);
        }
        email = `anon:${aid}`;
        setCurrentUserEmail(email);
      } catch {
        email = `anon:${Date.now()}`;
      }
    }
    const isLiked = !!target?.likedByMe;
    if (isLiked) {
      // Optimistic UNLIKE
      setPosts((prev) => prev.map((p) => {
        if (p.id !== id) return p;
        const nextLikes = Math.max(0, p.likes - 1);
        const nextLikedBy = Array.isArray(p.likedBy) ? (p.likedBy as string[]).filter(e => e !== email) : [];
        return { ...p, likedByMe: false, likes: nextLikes, likedBy: nextLikedBy };
      }));
      // Update local liked set
      setLikedSet((prev) => {
        const next = new Set(prev);
        next.delete(id);
        saveLikedSet(email, next);
        return next;
      });
      fetch(`/api/feed/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, unlike: true }),
      })
        .then(async (r) => {
          const data = await r.json().catch(() => ({}));
          if (!r.ok || data?.ok === false) throw new Error('unlike failed');
          const liked = !!data?.liked;
          const likes = typeof data?.likes === 'number' ? data.likes : undefined;
          setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likedByMe: liked, likes: typeof likes === 'number' ? likes : p.likes } : p)));
          // liked should be false for unlike
        })
        .catch(() => {
          // rollback local unlike
          setLikedSet((prev) => {
            const next = new Set(prev); next.add(id); saveLikedSet(currentUserEmail, next); return next;
          });
          setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likedByMe: true, likes: p.likes + 1 } : p)));
        });
      return;
    }
    // Optimistic LIKE
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likedByMe: true, likes: p.likes + 1, likedBy: Array.isArray(p.likedBy) ? Array.from(new Set([...(p.likedBy as string[]), email!])) : [email!] } : p)));
    // Update local liked set
    setLikedSet((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveLikedSet(email, next);
      return next;
    });
    // Heart overlays
    setOverlayLikedId(id);
    setOverlayPopId(id);
    setTimeout(() => setOverlayLikedId((x) => (x === id ? null : x)), 700);
    setTimeout(() => setOverlayPopId((x) => (x === id ? null : x)), 450);
    // Notify backend like
    fetch(`/api/feed/${id}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, unlike: false }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok || data?.ok === false) throw new Error('like failed');
        const liked = !!data?.liked;
        const likes = typeof data?.likes === 'number' ? data.likes : undefined;
        setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likedByMe: liked, likes: typeof likes === 'number' ? likes : p.likes } : p)));
        if (liked) { try { playLikeSound(); } catch {} }
      })
      .catch(() => {
        // rollback local like
        setLikedSet((prev) => {
          const next = new Set(prev); next.delete(id); saveLikedSet(currentUserEmail, next); return next;
        });
        setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likedByMe: false, likes: Math.max(0, p.likes - 1) } : p)));
      });
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-b from-amber-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      {/* Glass header */}
      <header className="absolute top-3 left-3 right-3 z-[2000] flex h-14 items-center justify-between gap-3 px-3 md:px-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2">
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-xl md:text-2xl font-bold text-transparent drop-shadow-sm">
            Feed
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <UserProfile />
        </div>
      </header>

      <main className="relative flex-1 px-3 md:px-6 pt-20 md:pt-24 pb-[calc(4.5rem+28px)]">
        <div className="mx-auto w-full max-w-md md:max-w-lg space-y-6">
          {posts.map((p) => (
            <Card key={p.id} className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 shadow rounded-xl overflow-hidden">
              <CardContent className="p-0">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={p.avatarUrl || authorAvatar || ''}
                        alt={displayNameForPost(p)}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const t = e.currentTarget as HTMLImageElement;
                          t.src = '';
                        }}
                      />
                      <AvatarFallback>{displayNameForPost(p).slice(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{displayNameForPost(p)}</div>
                      <div className="text-[12px] text-neutral-600 dark:text-neutral-300 truncate">{p.cardName}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.edited && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-black/10 dark:border-white/10">Edited</span>
                    )}
                    <div className="text-[11px] text-neutral-500 whitespace-nowrap ml-2">{new Date(p.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                {/* Content layout depends on whether there are photos */}
                {Array.isArray(p.photos) && p.photos.length > 0 ? (
                  <>
                    {/* Media */}
                    <div className="relative w-full bg-black/5">
                      <PostMedia
                        photos={p.photos}
                        onDoubleLike={() => {
                          if (!p.likedByMe) {
                            toggleLike(p.id);
                          }
                        }}
                      />
                      {/* Heart overlay */}
                      <div className={`pointer-events-none absolute inset-0 ${overlayLikedId === p.id ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}>
                        <div className="absolute inset-0 grid place-items-center">
                          <Heart className="h-20 w-20 text-amber-400 drop-shadow-[0_6px_12px_rgba(249,115,22,0.45)] fill-amber-400 animate-heart-pop" />
                        </div>
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.45),rgba(253,186,116,0.35),rgba(249,115,22,0.2),rgba(253,186,116,0)_65%)] animate-like-ripple" />
                        {[...Array(10)].map((_, i) => (
                          <span key={i} className={`confetti confetti-${i} ${overlayLikedId === p.id ? 'animate-confetti' : ''}`} />
                        ))}
                      </div>
                    </div>
                    {/* Actions under media */}
                    <div className="px-3 py-2 flex items-center gap-3 justify-between">
                      <button onClick={() => toggleLike(p.id)} className={`inline-flex items-center gap-1 ${p.likedByMe ? 'text-rose-600' : 'text-neutral-800 dark:text-neutral-200'}`} aria-label="Like">
                        <Heart className={`h-6 w-6 ${p.likedByMe ? 'fill-rose-600' : ''} ${overlayPopId === p.id ? 'animate-like-pop' : ''}`} />
                      </button>
                      {currentUserEmail && p.ownerEmail === currentUserEmail && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCardName(p.cardName);
                              setText(p.text);
                              setPhotos(p.photos || []);
                              setEditPostId(p.id);
                              setOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              const ok = window.confirm('Delete this post?');
                              if (!ok) return;
                              try {
                                const q = currentUserEmail ? `?email=${encodeURIComponent(currentUserEmail)}` : '';
                                const res = await fetch(`/api/feed/${p.id}${q}`, { method: 'DELETE' });
                                if (!res.ok) throw new Error('Delete failed');
                                toast({ title: 'Deleted', description: 'Your post has been removed.' });
                                await fetchPosts();
                              } catch (_) {
                                toast({ title: 'Error', description: 'Failed to delete. Please try again.', variant: 'destructive' });
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="px-3 text-sm font-semibold">{p.likes} likes</div>
                    {p.text && <div className="px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">{p.text}</div>}
                    {/* Poll (if any) */}
                    {p.poll && <PollBlock post={p} />}
                    <div className="px-3 pb-3 text-[11px] uppercase tracking-wide text-neutral-500">{new Date(p.createdAt).toLocaleDateString()}</div>
                  </>
                ) : (
                  <>
                    {/* No images: caption first */}
                    {p.text && <div className="px-3 pt-3 text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">{p.text}</div>}
                    {/* Actions under caption */}
                    <div className="px-3 py-2 flex items-center gap-3 justify-between">
                      <button onClick={() => toggleLike(p.id)} className={`inline-flex items-center gap-1 ${p.likedByMe ? 'text-rose-600' : 'text-neutral-800 dark:text-neutral-200'}`} aria-label="Like">
                        <Heart className={`h-6 w-6 ${p.likedByMe ? 'fill-rose-600' : ''} ${overlayPopId === p.id ? 'animate-like-pop' : ''}`} />
                      </button>
                      {currentUserEmail && p.ownerEmail === currentUserEmail && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCardName(p.cardName);
                              setText(p.text);
                              setPhotos(p.photos || []);
                              setEditPostId(p.id);
                              setOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              const ok = window.confirm('Delete this post?');
                              if (!ok) return;
                              try {
                                try { const audio = new Audio('/sound/B%20tone.wav'); audio.play().catch(() => {}); } catch {}
                                const q = currentUserEmail ? `?email=${encodeURIComponent(currentUserEmail)}` : '';
                                const res = await fetch(`/api/feed/${p.id}${q}`, { method: 'DELETE' });
                                if (!res.ok) throw new Error('Delete failed');
                                toast({ title: 'Deleted', description: 'Your post has been removed.' });
                                await fetchPosts();
                              } catch (_) {
                                toast({ title: 'Error', description: 'Failed to delete. Please try again.', variant: 'destructive' });
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="px-3 text-sm font-semibold">{p.likes} likes</div>
                    {/* Poll (if any) */}
                    {p.poll && <PollBlock post={p} />}
                    <div className="px-3 pb-3 text-[11px] uppercase tracking-wide text-neutral-500">{new Date(p.createdAt).toLocaleDateString()}</div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
          {posts.length === 0 && (
            <div className="text-center text-sm text-neutral-600 dark:text-neutral-300 py-16 border border-dashed rounded-2xl border-black/10 dark:border-white/10">
              No posts yet. Tap + to create your first post.
            </div>
          )}
        </div>
      </main>

      <div className="relative z-[2000]"><MobileNav /></div>

      {/* Floating Action Button (right-aligned) */}
      <div
        className="fixed inset-x-0 z-[2200]"
        style={{
          bottom: 'max(88px, calc(env(safe-area-inset-bottom, 0px) + 96px))',
          pointerEvents: 'none',
        }}
      >
        <div
          className="mx-0 flex justify-end"
          style={{ paddingRight: 'calc(16px + env(safe-area-inset-right, 0px))' }}
        >
          <button
            onClick={() => setOpen(true)}
            className="h-14 w-14 rounded-full text-white grid place-items-center relative select-none bg-gradient-to-br from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500 shadow-[0_12px_24px_rgba(234,88,12,0.35)] ring-1 ring-white/40 focus:outline-none focus:ring-4 focus:ring-orange-300/40 transition-transform duration-200 ease-out hover:scale-105 active:scale-100"
            style={{ pointerEvents: 'auto' }}
            aria-label="Create post"
            title="Create post"
          >
            <span className="relative inline-flex items-center justify-center">
              <PenLine className="h-6 w-6" />
            </span>
          </button>
        </div>
      </div>

      {/* macOS-like bounce animation and loader + dialog pager-like animation styles */}
      <style jsx global>{`
        @keyframes mac-bounce {
          0% { transform: translateY(0) scale(1); }
          20% { transform: translateY(-8px) scale(1.06); }
          40% { transform: translateY(0) scale(1); }
          60% { transform: translateY(-4px) scale(1.03); }
          100% { transform: translateY(0) scale(1); }
        }
        .animate-mac-bounce { animation: mac-bounce 420ms cubic-bezier(0.2, 0.8, 0.2, 1); }

        /* Dialog slides in from the right like a pager */
        @keyframes dialog-slide-in-right {
          0% { transform: translateX(24px) scale(0.98); opacity: 0; }
          60% { transform: translateX(0) scale(1.01); opacity: 1; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        .animate-dialog-slide-in-right { animation: dialog-slide-in-right 260ms cubic-bezier(0.2, 0.8, 0.2, 1); }

        .loader {
          width: 48px;
          height: 48px;
          margin: auto;
          position: relative;
        }
        .loader:before {
          content: '';
          width: 48px;
          height: 5px;
          background: #000;
          opacity: 0.25;
          position: absolute;
          top: 60px;
          left: 0;
          border-radius: 50%;
          animation: shadow 0.5s linear infinite;
        }
        .loader:after {
          content: '';
          width: 100%;
          height: 100%;
          background: #fff;
          animation: bxSpin 0.5s linear infinite;
          position: absolute;
          top: 0;
          left: 0;
          border-radius: 4px;
        }
        @keyframes bxSpin {
          17% { border-bottom-right-radius: 3px; }
          25% { transform: translateY(9px) rotate(22.5deg); }
          50% { transform: translateY(18px) scale(1, .9) rotate(45deg); border-bottom-right-radius: 40px; }
          75% { transform: translateY(9px) rotate(67.5deg); }
          100% { transform: translateY(0) rotate(90deg); }
        }
        @keyframes shadow {
          0%, 100% { transform: scale(1, 1); }
          50% { transform: scale(1.2, 1); }
        }

        /* Like animations - orange/yellow theme */
        @keyframes heart-pop {
          0% { transform: scale(0.7) rotate(-8deg); filter: drop-shadow(0 8px 20px rgba(249,115,22,0.35)); }
          60% { transform: scale(1.18) rotate(0deg); filter: drop-shadow(0 10px 24px rgba(251,191,36,0.5)); }
          100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 6px 14px rgba(249,115,22,0.35)); }
        }
        .animate-heart-pop { animation: heart-pop 600ms cubic-bezier(.2,.8,.2,1); }

        @keyframes like-ripple {
          0% { opacity: .9; transform: translate(-50%, -50%) scale(0.6); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(2.2); }
        }
        .animate-like-ripple { animation: like-ripple 650ms ease-out forwards; }

        @keyframes like-pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        .animate-like-pop { animation: like-pop 380ms cubic-bezier(.2,.8,.2,1); }

        .confetti { position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; border-radius: 9999px; opacity: 0.95; }
        @keyframes confetti-burst {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.95; }
          80% { opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
        }
        .animate-confetti { animation: confetti-burst 700ms ease-out forwards; }
        /* 10 colorful pieces in orange/yellow directions */
        .confetti-0 { --tx: -120px; --ty: -60px; background: #f59e0b; }
        .confetti-1 { --tx: 110px; --ty: -50px; background: #fbbf24; }
        .confetti-2 { --tx: -90px; --ty: 40px; background: #f97316; }
        .confetti-3 { --tx: 70px; --ty: 80px; background: #f59e0b; }
        .confetti-4 { --tx: -60px; --ty: 100px; background: #fde047; }
        .confetti-5 { --tx: 140px; --ty: 20px; background: #fb923c; }
        .confetti-6 { --tx: 40px; --ty: -110px; background: #f59e0b; }
        .confetti-7 { --tx: -140px; --ty: 10px; background: #fdba74; }
        .confetti-8 { --tx: 95px; --ty: -95px; background: #fbbf24; }
        .confetti-9 { --tx: 10px; --ty: 130px; background: #f97316; }
      `}</style>

      {/* Compose Dialog */}
      <Dialog open={open} onOpenChange={(o) => { if (submitting) return; setOpen(o); if (!o) resetComposer(); }}>
        <DialogContent
          className="sm:max-w-md bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl shadow-black/10 dark:shadow-black/40 animate-dialog-slide-in-right"
          onInteractOutside={(e) => { if (submitting) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (submitting) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Create Post</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePostSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {isLoadingCards && (
                <div className="py-4 flex items-center justify-center">
                  <Loader />
                </div>
              )}
              <div className="relative">
                <Input
                  placeholder="Search existing card name"
                  value={cardQuery || cardName}
                  onChange={(e) => { setCardQuery(e.target.value); setCardName(""); }}
                  className="bg-white/80 dark:bg-white/10 rounded-xl ring-1 ring-black/10 dark:ring-white/10 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:border-emerald-500"
                  disabled={isLoadingCards || submitting}
                />
                {cardQuery && suggestions.length > 0 && (
                  <div className="absolute mt-2 w-full rounded-xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur border border-black/10 dark:border-white/10 shadow-xl max-h-64 overflow-auto z-50">
                    {suggestions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-orange-500/10"
                        onClick={() => { setCardName(name); setCardQuery(""); setSuggestions([]); }}
                      >
                        <div className="text-sm font-medium truncate">{name}</div>
                      </button>
                    ))}
                    {suggestions.length === 0 && <div className="px-3 py-2 text-xs text-neutral-600">No matches</div>}
                  </div>
                )}
                {!cardQuery && (
                  <p className="mt-1 text-xs text-neutral-500">Selected: {cardName || "—"}</p>
                )}
              </div>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write something..." rows={4} className="resize-none bg-white/80 dark:bg-white/10 rounded-xl ring-1 ring-black/10 dark:ring-white/10 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:border-emerald-500" disabled={submitting} />
              {/* Emoji + Poll controls */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setEmojiOpen(v => !v)}
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 text-white hover:from-yellow-500 hover:via-orange-500 hover:to-pink-600 shadow-lg border-0 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <span className="mr-1.5 text-lg">😊</span> Emojis
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPollOpen(v => !v)}
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 shadow-lg border-0 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <span className="mr-1.5 text-base">📊</span>
                  {pollOpen ? 'Remove poll' : 'Add poll'}
                </Button>
              </div>
              {emojiOpen && (
                <div className="mt-2 rounded-2xl border border-black/10 dark:border-white/10 p-4 bg-gradient-to-br from-white via-orange-50 to-pink-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800 shadow-xl bounce-in">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✨</span>
                      <div className="text-sm font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">Find emojis</div>
                    </div>
                    {emojiLoading && <div className="text-[11px] text-neutral-500 shimmer">Loading…</div>}
                  </div>
                  <div className="mb-3">
                    <Input
                      value={emojiQuery}
                      onChange={(e) => setEmojiQuery(e.target.value)}
                      placeholder="🔍 Search (e.g., smile, heart)"
                      className="h-10 text-sm bg-white dark:bg-neutral-800 rounded-xl border-2 border-orange-200 dark:border-orange-900 focus:border-orange-400 dark:focus:border-orange-600 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-8 sm:grid-cols-12 gap-1.5 max-h-64 overflow-auto pr-1 scrollbar-thin scrollbar-thumb-orange-300 dark:scrollbar-thumb-orange-700">
                    {((emojiList.length > 0
                      ? emojiList.filter(e => !emojiQuery.trim() || e.slug.includes(emojiQuery.trim().toLowerCase()))
                      : commonEmojis.map((c) => ({ character: c, slug: c }))
                    ).slice(0, 220)).map((em) => (
                      <button
                        key={em.slug}
                        type="button"
                        className="text-2xl p-2.5 rounded-xl bg-white/50 dark:bg-neutral-800/50 hover:bg-gradient-to-br hover:from-orange-100 hover:to-pink-100 dark:hover:from-orange-900/30 dark:hover:to-pink-900/30 transition-all duration-200 hover:scale-125 active:scale-95 hover:shadow-lg"
                        onClick={() => setText(prev => prev + em.character)}
                        title={em.slug}
                        aria-label={em.slug}
                      >
                        {em.character}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {pollOpen && (
                <div className="mt-2 rounded-xl ring-1 ring-black/10 dark:ring-white/10 p-3 bg-white/70 dark:bg-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Poll</div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 ring-1 ring-amber-300/50">Max 4 options</span>
                  </div>
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="text-xs w-6 h-8 grid place-items-center rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 select-none">{idx + 1}</div>
                      <Input
                        value={opt}
                        placeholder={`Option ${idx + 1}`}
                        onChange={(e) => {
                          const next = [...pollOptions];
                          next[idx] = e.target.value;
                          setPollOptions(next);
                        }}
                        className="bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-lg"
                      />
                      {pollOptions.length > 2 && (
                        <Button type="button" variant="ghost" className="text-xs" onClick={() => setPollOptions(prev => prev.filter((_, i) => i !== idx))}>Remove</Button>
                      )}
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-3">
                    {pollOptions.length < 4 && (
                      <Button type="button" variant="secondary" className="rounded-lg" onClick={() => setPollOptions(prev => (prev.length < 4 ? [...prev, ""] : prev))}>Add option</Button>
                    )}
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={pollAllowMultiple} onChange={(e) => setPollAllowMultiple(e.target.checked)} /> Allow multiple votes
                    </label>
                  </div>
                </div>
              )}
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFilesSelected(e.target.files)} />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-neutral-600 dark:text-neutral-300">Photos (optional) • {photos.length}/5</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={photos.length >= 5 || submitting} className="bg-orange-500 text-white hover:bg-orange-600 border-none rounded-xl shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
                    Add photos
                  </Button>
                </div>
                {photos.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {photos.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-md overflow-hidden group">
                        <Image src={src} alt={`preview-${i}`} fill className="object-cover" />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100"
                          onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { if (submitting) return; setOpen(false); resetComposer(); }}
                className="rounded-xl hover:bg-neutral-100/60 dark:hover:bg-white/10"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canPost || submitting}
                className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed min-w-[96px]"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2"><Loader size="sm" /> {editPostId ? 'Updating...' : 'Posting...'}</span>
                ) : (
                  editPostId ? 'Update' : 'Post'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
