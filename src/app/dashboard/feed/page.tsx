"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
 

export default function FeedPage() {
  const { toast } = useToast();
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
    if (!photos || photos.length === 0) return (
      <div className="relative w-full aspect-square overflow-hidden bg-black/5">
        <img src="https://i.pinimg.com/736x/95/71/da/9571da0d80045d4c10d0fae897de6bab.jpg" alt="post" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
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
  };
  const [posts, setPosts] = useState<Post[]>([]);
  const LS_KEY = "social_feed_posts_v2"; // legacy, no longer used for persistence

  // No author prefill needed anymore

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
        }));
        setPosts(list);
      }
    } catch (_) {}
  }
  useEffect(() => {
    fetchPosts();
  }, []);

  // Compute a small hash from feed to detect changes (ids + updatedAt + likes)
  const computeFeedHash = (items: Post[]): string => {
    try {
      const key = items
        .map((p) => `${p.id}:${p.updatedAt ?? ''}:${p.likes}`)
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
          }));
          const newHash = computeFeedHash(list);
          if (newHash !== lastFeedHash) {
            setPosts(list);
            setLastFeedHash(newHash);
          }
        }
      } catch {}
      schedule();
    };
    const schedule = () => { timer = setTimeout(tick, 10000); };
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
    } catch {}
  }, []);

  // Compute likedByMe when posts or current user changes
  useEffect(() => {
    if (!currentUserEmail) return;
    setPosts((prev) => prev.map((p) => ({ ...p, likedByMe: Array.isArray(p.likedBy) ? p.likedBy!.includes(currentUserEmail) : p.likedByMe })));
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

  const canPost = useMemo(() => allCards.includes(cardName.trim()) && (text.trim().length > 0 || photos.length > 0), [cardName, text, photos, allCards]);

  function resetComposer() {
    setCardQuery("");
    setCardName("");
    setSuggestions([]);
    setText("");
    setPhotos([]);
  }

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
            author: authorName || 'User',
            avatarUrl: authorAvatar || null,
            cardName: cardName.trim(),
            text: text.trim(),
            photos: photos,
            createdAt: Date.now(),
            ownerEmail: currentUserEmail || null,
          };
          const res = await fetch('/api/feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error('Create failed');
          toast({ title: 'Posted', description: 'Your post has been shared.' });
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
    const wasLiked = posts.find((pp) => pp.id === id)?.likedByMe;
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, likedByMe: !p.likedByMe, likes: p.likes + (p.likedByMe ? -1 : 1) } : p)));
    if (!wasLiked) {
      setOverlayLikedId(id);
      setOverlayPopId(id);
      setTimeout(() => setOverlayLikedId((x) => (x === id ? null : x)), 700);
      setTimeout(() => setOverlayPopId((x) => (x === id ? null : x)), 450);
    }
    // Fire and forget
    fetch(`/api/feed/${id}/like`, { method: 'POST' }).catch(() => {});
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
                        alt={p.author || 'user'}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const t = e.currentTarget as HTMLImageElement;
                          t.src = '';
                        }}
                      />
                      <AvatarFallback>{(p.author || 'U').slice(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{p.author || 'User'}</div>
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

                {/* Media */}
                <div className="relative w-full bg-black/5">
                  <PostMedia
                    photos={p.photos || []}
                    onDoubleLike={() => {
                      toggleLike(p.id);
                      setOverlayLikedId(p.id);
                      setOverlayPopId(p.id);
                      setTimeout(() => setOverlayLikedId((x) => (x === p.id ? null : x)), 700);
                      setTimeout(() => setOverlayPopId((x) => (x === p.id ? null : x)), 450);
                    }}
                  />
                  {/* Heart overlay */}
                  <div className={`pointer-events-none absolute inset-0 ${overlayLikedId === p.id ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}> 
                    <div className="absolute inset-0 grid place-items-center">
                      <Heart className="h-20 w-20 text-amber-400 drop-shadow-[0_6px_12px_rgba(249,115,22,0.45)] fill-amber-400 animate-heart-pop" />
                    </div>
                    {/* Gradient ripple */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.45),rgba(253,186,116,0.35),rgba(249,115,22,0.2),rgba(253,186,116,0)_65%)] animate-like-ripple" />
                    {/* Confetti burst */}
                    {[...Array(10)].map((_, i) => (
                      <span key={i} className={`confetti confetti-${i} ${overlayLikedId === p.id ? 'animate-confetti' : ''}`} />
                    ))}
                  </div>
                </div>

                {/* Actions */}
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
                          // Prefill composer for editing
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
                            const res = await fetch(`/api/feed/${p.id}`, { method: 'DELETE' });
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
                {/* Likes count */}
                <div className="px-3 text-sm font-semibold">{p.likes} likes</div>
                {/* Caption */}
                {p.text && <div className="px-3 py-2 text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">{p.text}</div>}
                {/* Timestamp */}
                <div className="px-3 pb-3 text-[11px] uppercase tracking-wide text-neutral-500">{new Date(p.createdAt).toLocaleDateString()}</div>
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
