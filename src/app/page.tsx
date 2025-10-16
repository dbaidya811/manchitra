"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ImageCollage } from "@/components/image-collage";
import { LoginDialog } from "@/components/login-dialog";
import { ArrowRight, Compass, MapPin, Users, ShieldCheck, Sparkles, Smartphone, Apple } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [pwaPromptEvent, setPwaPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const [showAndroidSteps, setShowAndroidSteps] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isReloadingAfterOAuth, setIsReloadingAfterOAuth] = useState(false);

  // Track client-side mounting to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if we just came back from OAuth callback and reload if needed
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const hasAuthCallback = urlParams.has('auth_callback');
    
    console.log('Home - URL params check:', {
      hasAuthCallback,
      reloadDone: sessionStorage.getItem('oauth_reload_done'),
      currentStatus: status
    });
    
    if (hasAuthCallback && !sessionStorage.getItem('oauth_reload_done')) {
      console.log('🔄 Home - OAuth callback detected, hard reloading...');
      sessionStorage.setItem('oauth_reload_done', '1');
      
      // Clean URL and do hard reload after showing spinner
      setTimeout(() => {
        console.log('🔄 Executing hard reload now...');
        window.history.replaceState({}, '', '/');
        window.location.href = window.location.origin + '/';
      }, 500); // Increased to 500ms to ensure spinner shows
      return;
    }
    
    // Clear the reload flag after successful check
    if (!hasAuthCallback) {
      sessionStorage.removeItem('oauth_reload_done');
    }
  }, [status]);

  // Auto-redirect to dashboard if already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user && !hasRedirected) {
      console.log('Home - User authenticated, redirecting to dashboard...');
      setHasRedirected(true);
      // Use window.location for hard redirect to ensure proper navigation
      window.location.href = "/dashboard";
    }
  }, [status, session, hasRedirected]);


  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallMessage(null);
      setPwaPromptEvent(event);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  const triggerAndroidInstall = async () => {
    if (!pwaPromptEvent) {
      setInstallMessage("Open the browser menu and tap \"Install app\" to add Manchitra.");
      return;
    }
    try {
      await pwaPromptEvent.prompt();
      const choice = await pwaPromptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstallMessage("Thanks! Follow your browser instructions to finish installing.");
      } else {
        setInstallMessage("Install dismissed. You can install from the browser menu anytime.");
      }
    } catch {
      setInstallMessage("We couldn't open the install prompt. Use the browser menu instead.");
    } finally {
      setPwaPromptEvent(null);
    }
  };

  // Wait for client-side hydration to complete
  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
        </div>
      </div>
    );
  }

  // Show loading spinner if reloading after OAuth
  if (isReloadingAfterOAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
          <div className="text-center">
            <p className="text-white text-lg font-semibold">Completing sign in...</p>
            <p className="text-white/80 text-sm mt-2">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking session OR if authenticated (during redirect)
  if (status === "loading" || (status === "authenticated" && !hasRedirected)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
          {status === "authenticated" && <p className="text-white text-sm">Redirecting to dashboard...</p>}
        </div>
      </div>
    );
  }

  // If we somehow still have authenticated status after redirect flag is set, force redirect
  if (status === "authenticated" && hasRedirected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
          <p className="text-white text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Ensure description on home page shows only 6 words regardless of length
  const truncateWords = (text: string, count: number) => {
    const words = text.trim().split(/\s+/);
    const sliced = words.slice(0, count).join(" ");
    return words.length > count ? `${sliced}...` : sliced;
  };

  const description = "your hoping patner";

  const handleGoogleLogin = async () => {
    console.log('Starting Google login...');
    // Use redirect: true to let NextAuth handle the full redirect flow
    await signIn("google", {
      callbackUrl: "/dashboard",
      redirect: true
    });
  };

  const collageImages = [
    "https://i.pinimg.com/736x/b4/90/d0/b490d035caa62b7115306e27c3ddea74.jpg",
    "https://i.pinimg.com/1200x/36/42/35/3642357207110498b34eab1298d99e71.jpg",
    "https://i.pinimg.com/736x/56/4f/24/564f243d5f6aac08d28acc0a85eb0240.jpg",
    "https://i.pinimg.com/1200x/25/c4/4b/25c44b215e00a7437496a30ae24982a8.jpg",
    "https://i.pinimg.com/736x/32/66/2d/32662d78cc5419e76ca4b0080712d5b8.jpg",
  ];

  const features = [
    {
      title: "Vibrant Social Feed",
      description: "Share memories, polls, and discoveries with your community in a beautiful, real-time feed.",
      icon: Sparkles,
    },
    {
      title: "Smart Navigation",
      description: "Navigate new places with intelligent routing, offline-ready maps, and live status tracking.",
      icon: Compass,
    },
    {
      title: "Community Hotspots",
      description: "See where friends have been, what they loved, and build collaborative travel plans together.",
      icon: MapPin,
    },
    {
      title: "Privacy First",
      description: "Control who sees your trips, manage history with ease, and keep memories safe and secure.",
      icon: ShieldCheck,
    },
  ];

  const steps = [
    {
      title: "Request Access",
      blurb: "Log in with Google or request an OTP link to join the Manchitra experience instantly.",
    },
    {
      title: "Explore & Share",
      blurb: "Discover curated places, capture your journey, and post stories that inspire your circle.",
    },
    {
      title: "Plan Together",
      blurb: "Build shared itineraries, vote on destinations, and navigate as a team wherever you are.",
    },
  ];

  const testimonials = [
    {
      quote: "Manchitra keeps our distributed dev squad aligned. Updates, polls, and maps live in one space now.",
      name: "Deep Baidya",
      role: "Lead Developer",
      socialLabel: "LinkedIn",
      socialUrl: "https://www.linkedin.com/in/dbaidya811/",
    },
    {
      quote: "Syncing places, tasks, and community stories is effortless. It’s our hub for every deployment walkthrough.",
      name: "Dip Bhattacharjee",
      role: "Assistant Developer",
      socialLabel: "LinkedIn",
      socialUrl: "https://www.linkedin.com/in/dip-bhattacharjee-aa833430a/",
    },
    {
      quote: "We plan meetups, share highlights, and rally the team right inside the feed. Manchitra keeps the energy high.",
      name: "Prajit Mandal",
      role: "Assistant Developer",
      socialLabel: "LinkedIn",
      socialUrl: "https://www.linkedin.com/in/prajit-mondal-b9546a320/",
    },
  ];

  return (
    <>
      <LoginDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <main className="relative min-h-screen bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400 overflow-hidden">
        <ImageCollage images={collageImages} />
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-16 sm:pb-20 space-y-16 md:space-y-24">
          <section
            className="relative flex flex-col items-center justify-center overflow-hidden rounded-[32px] border border-white/35 bg-black/30 shadow-[0_30px_90px_rgba(0,0,0,0.4)] px-5 py-12 sm:py-16 min-h-[90vh] sm:min-h-[75vh] text-center gap-6 animate-fade-in"
            style={{
              backgroundImage:
                "linear-gradient(140deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05)), url('https://i.pinimg.com/1200x/36/42/35/3642357207110498b34eab1298d99e71.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-black/35" />
            <div className="absolute -top-24 -left-20 h-60 w-60 rounded-full bg-gradient-to-br from-rose-400/70 via-orange-400/60 to-amber-300/60 blur-3xl animate-blob" />
            <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-amber-400/70 via-yellow-400/60 to-white/60 blur-3xl animate-blob-slower" />
            <div className="relative z-10 flex flex-col items-center gap-3 animate-slide-up" style={{ animationDelay: '0.1s', animationFillMode: 'backwards' }}>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80">
                <Sparkles className="h-3.5 w-3.5" /> Live. Share. Explore.
              </span>
              <h1 className="bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 bg-clip-text text-5xl sm:text-6xl md:text-7xl font-bold text-transparent drop-shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                Manchitra
              </h1>
              <p className="max-w-xl text-sm sm:text-base md:text-lg font-medium text-white/85">
                Build living maps with friends, relive stories on the go, and discover what your circle is exploring right now.
              </p>
            </div>
            <div className="relative z-10 grid w-full max-w-lg gap-4 sm:gap-5">
              <Button
                size="lg"
                onClick={() => setDialogOpen(true)}
                className="w-full rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/40 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-300 transition-transform duration-200 active:scale-[0.99] animate-slide-up"
                style={{ animationDelay: '0.25s', animationFillMode: 'backwards' }}
              >
                Login with Email
              </Button>
              <Button
                size="lg"
                onClick={handleGoogleLogin}
                className="w-full rounded-full bg-white text-gray-800 border border-white/80 shadow-lg shadow-black/15 hover:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/60 transition-transform duration-200 active:scale-[0.99] animate-slide-up"
                style={{ animationDelay: '0.35s', animationFillMode: 'backwards' }}
              >
                <img
                  src="https://cdn-icons-png.flaticon.com/512/281/281764.png"
                  alt="Google icon"
                  className="mr-2 h-5 w-5 shrink-0"
                  referrerPolicy="no-referrer"
                />
                Login with Google
              </Button>
            </div>
            <div className="relative z-10 mt-10 flex flex-col items-center gap-2 text-white/80 text-xs uppercase tracking-[0.3em]">
              <span>Scroll to discover more</span>
              <span className="h-12 w-[1px] bg-white/60" />
            </div>
          </section>

          <section className="rounded-3xl bg-white/80 backdrop-blur shadow-xl shadow-orange-500/10 border border-white/60 p-6 sm:p-8 md:p-10 animate-fade-in" style={{ animationDelay: '0.15s', animationFillMode: 'backwards' }}>
            <div className="flex flex-col gap-3 text-center">
              <span className="inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-orange-600 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>Why explorers choose Manchitra</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 animate-slide-up" style={{ animationDelay: '0.25s', animationFillMode: 'backwards' }}>A travel companion built for community adventures</h2>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="rounded-2xl border border-black/5 bg-white/90 p-5 text-left shadow-sm hover:shadow-md transition animate-slide-up" style={{ animationDelay: `${0.3 + features.indexOf(feature) * 0.08}s`, animationFillMode: 'backwards' }}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-neutral-900">{feature.title}</h3>
                        <p className="text-sm text-neutral-600">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-white/50 bg-white/60 backdrop-blur-lg p-6 sm:p-8 md:p-10 shadow-lg shadow-orange-500/10 animate-fade-in" style={{ animationDelay: '0.25s', animationFillMode: 'backwards' }}>
            <div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-start">
              <div className="flex flex-col gap-2 text-center md:text-left animate-slide-up" style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-orange-600">
                  <Users className="h-4 w-4" /> How it works
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">From idea to shared journey</h2>
                <p className="text-sm text-neutral-600">A lightweight flow to take you from "where should we go?" to "we made it!".</p>
              </div>
              <ol className="space-y-4">
                {steps.map((step, index) => (
                  <li key={step.title} className="rounded-2xl bg-white p-5 shadow-sm border border-black/5 animate-slide-up" style={{ animationDelay: `${0.35 + index * 0.08}s`, animationFillMode: 'backwards' }}>
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white text-lg font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900">{step.title}</h3>
                        <p className="mt-1 text-sm text-neutral-600">{step.blurb}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="space-y-6 animate-fade-in" style={{ animationDelay: '0.35s', animationFillMode: 'backwards' }}>
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-orange-600">Loved by explorers everywhere</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white">Stories from the Manchitra community</h2>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {testimonials.map((item) => (
                <blockquote key={item.name} className="rounded-3xl border border-white/30 bg-white/30 backdrop-blur p-6 text-left shadow-md text-white animate-slide-up" style={{ animationDelay: `${0.45 + testimonials.indexOf(item) * 0.1}s`, animationFillMode: 'backwards' }}>
                  <p className="text-sm sm:text-base leading-relaxed">"{item.quote}"</p>
                  <div className="mt-4 text-sm font-semibold">{item.name}</div>
                  <div className="text-xs uppercase tracking-widest text-white/70">{item.role}</div>
                  {item.socialUrl && item.socialLabel && (
                    <a
                      href={item.socialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-orange-100 hover:text-white transition-colors"
                    >
                      {item.socialLabel}
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </blockquote>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/45 bg-white/75 backdrop-blur-lg p-6 sm:p-8 md:p-10 shadow-xl shadow-orange-500/15 animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}>
            <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
              <div className="space-y-3 text-center lg:text-left animate-slide-up" style={{ animationDelay: '0.45s', animationFillMode: 'backwards' }}>
                <span className="inline-flex items-center justify-center lg:justify-start gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-orange-600">Install the app</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">Add Manchitra to your phone</h2>
                <p className="text-sm text-neutral-600">Use Manchitra like a native app by installing the PWA. It works offline-ready on Android and iOS once saved to your home screen.</p>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm animate-slide-up" style={{ animationDelay: '0.5s', animationFillMode: 'backwards' }}>
                  <div className="flex items-center gap-3 text-neutral-900">
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/5969/5969042.png"
                      alt="Android icon"
                      className="h-10 w-10 rounded-full object-contain"
                    />
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wide">Android</div>
                      <p className="text-xs text-neutral-500">Chrome, Edge, Brave</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-neutral-600">Install directly or follow the quick steps.</p>
                  <Button
                    type="button"
                    className="mt-3 w-full rounded-full bg-emerald-500 text-white hover:bg-emerald-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                    onClick={() => setShowAndroidSteps((prev) => !prev)}
                  >
                    {showAndroidSteps ? "Hide Android steps" : "Show Android steps"}
                  </Button>
                  {showAndroidSteps && (
                    <ul className="mt-4 space-y-2 rounded-xl bg-neutral-100/80 p-4 text-xs text-neutral-600">
                      <li>• Tap the browser menu ⋮.</li>
                      <li>• In the menu, tap "Add to Home screen" ("Install app" on some browsers).</li>
                      <li>• Confirm the prompt to add Manchitra.</li>
                    </ul>
                  )}
                </div>
                <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm animate-slide-up" style={{ animationDelay: '0.55s', animationFillMode: 'backwards' }}>
                  <div className="flex items-center gap-3 text-neutral-900">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white"><Apple className="h-5 w-5" /></span>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wide">iOS & iPadOS</div>
                      <p className="text-xs text-neutral-500">Safari</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-neutral-600">Install Manchitra using the Share menu and "Add to Home Screen".</p>
                  <Button
                    type="button"
                    className="mt-4 w-full rounded-full bg-black text-white hover:bg-black focus-visible:ring-0 focus-visible:ring-offset-0"
                    onClick={() => setShowIosSteps((prev) => !prev)}
                  >
                    {showIosSteps ? "Hide iOS steps" : "Show iOS steps"}
                  </Button>
                  {showIosSteps && (
                    <ul className="mt-4 space-y-2 rounded-xl bg-neutral-100/80 p-4 text-xs text-neutral-600">
                      <li>• Open Manchitra in Safari.</li>
                      <li>• Tap the Share icon.</li>
                      <li>• Select "Add to Home Screen".</li>
                      <li>• Tap Add to finish.</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </section>

          <style jsx>{`
            @import url('https://fonts.googleapis.com/css2?family=Lobster&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Playwrite+AU+TAS:wght@400&display=swap');
            
            /* Hide scrollbar for Chrome, Safari and Opera */
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            
            /* Hide scrollbar for IE, Edge and Firefox */
            .scrollbar-hide {
              -ms-overflow-style: none;  /* IE and Edge */
              scrollbar-width: none;  /* Firefox */
            }
            
            @keyframes scroll-x {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(-50%);
              }
            }
            
            @keyframes color-shift {
              0% {
                color: #8B4513;
              }
              25% {
                color: #FF6B6B;
              }
              50% {
                color: #4ECDC4;
              }
              75% {
                color: #FFD93D;
              }
              100% {
                color: #8B4513;
              }
            }
            
            @keyframes color-wave {
              0% {
                background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(249, 115, 22, 0.3), rgba(236, 72, 153, 0.3));
              }
              33% {
                background: linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(251, 191, 36, 0.3), rgba(249, 115, 22, 0.3));
              }
              66% {
                background: linear-gradient(135deg, rgba(249, 115, 22, 0.3), rgba(236, 72, 153, 0.3), rgba(251, 191, 36, 0.3));
              }
              100% {
                background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(249, 115, 22, 0.3), rgba(236, 72, 153, 0.3));
              }
            }
            
            @media (min-width: 640px) {
              .sm\\:animate-scroll-x {
                animation: scroll-x 20s linear infinite;
              }
              
              .sm\\:animate-scroll-x:hover {
                animation-play-state: paused;
              }
            }
            
            .animate-color-shift {
              animation: color-shift 2s ease-in-out infinite;
            }
            
            .animate-color-wave {
              animation: color-wave 3s ease-in-out infinite;
            }
          `}</style>

        </div>

        <footer className="relative z-10 border-t border-white/30 bg-black/20 backdrop-blur text-white/80">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 text-center text-sm sm:flex-row sm:text-left">
            <div>© {new Date().getFullYear()} Manchitra. Built for explorers, storytellers, and dreamers.</div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-white/70">
              <span>Privacy</span>
              <span>Community</span>
              <span>Support</span>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
