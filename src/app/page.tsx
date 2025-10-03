"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageCollage } from "@/components/image-collage";
import { useRouter } from "next/navigation";
import { LoginDialog } from "@/components/login-dialog";
import { signIn } from "next-auth/react";

const GuestIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default function Home() {
  const router = useRouter();
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  // Ensure description on home page shows only 6 words regardless of length
  const truncateWords = (text: string, count: number) => {
    const words = text.trim().split(/\s+/);
    const sliced = words.slice(0, count).join(" ");
    return words.length > count ? `${sliced}...` : sliced;
  };

  const description = "your hoping patner";

  const handleGuestLogin = () => {
    router.push("/dashboard");
  };

  const handleGoogleLogin = async () => {
    // Triggers NextAuth Google OAuth flow and redirects to /dashboard on success
    await signIn("google", { callbackUrl: "/dashboard", prompt: "select_account" });
  };

  const collageImages = [
    "https://i.pinimg.com/736x/b4/90/d0/b490d035caa62b7115306e27c3ddea74.jpg",
    "https://i.pinimg.com/1200x/36/42/35/3642357207110498b34eab1298d99e71.jpg",
    "https://i.pinimg.com/736x/56/4f/24/564f243d5f6aac08d28acc0a85eb0240.jpg",
    "https://i.pinimg.com/1200x/25/c4/4b/25c44b215e00a7437496a30ae24982a8.jpg",
    "https://i.pinimg.com/736x/32/66/2d/32662d78cc5419e76ca4b0080712d5b8.jpg",
  ];

  return (
    <>
      <main className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-yellow-200 via-orange-300 to-red-400 p-4 overflow-hidden">
        <ImageCollage images={collageImages} />
        <div className="flex flex-col items-center justify-center text-center z-10">
          <h1 className="animate-fade-in-up bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-8xl font-bold text-transparent drop-shadow-lg md:text-9xl">
            Manchitra
          </h1>
          <p
            className="mt-3 animate-fade-in-up bg-gradient-to-r from-yellow-100/90 to-orange-200/90 bg-clip-text text-transparent text-lg font-semibold md:text-2xl"
            style={{ animationDelay: '0.25s', animationFillMode: 'backwards' }}
          >
            {truncateWords(description, 6)}
          </p>
          <div className="mt-8 flex animate-fade-in-up flex-col gap-3 sm:flex-row sm:gap-4 w-full max-w-xs sm:max-w-none" style={{ animationDelay: '0.5s', animationFillMode: 'backwards' }}>
            <Button
              size="lg"
              onClick={handleGoogleLogin}
              className="w-full rounded-full px-6 py-6 bg-white text-gray-800 border border-gray-200 shadow-md hover:bg-gray-50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-200 transition-all duration-200 active:scale-[0.99]"
            >
              {/* Inline Google G icon to avoid external image dependency */}
              <svg className="mr-2 h-5 w-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-1.6 3.5-5.4 3.5-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 2.2 14.7 1.3 12 1.3 6.9 1.3 2.7 5.5 2.7 10.6S6.9 19.9 12 19.9c6.9 0 9.6-4.8 9.6-7.3 0-.5-.1-.8-.1-1.1H12z"/>
                <path fill="#4285F4" d="M23 12.6c0-.5-.1-.8-.1-1.1H12v3.9h5.4c-.3 1.6-1.8 2.8-3.4 3.5l2.7 2.1C20 19.8 23 16.8 23 12.6z"/>
                <path fill="#34A853" d="M8.6 14.5c-.3-.8-.5-1.6-.5-2.5s.2-1.7.5-2.5L5.9 6.9C5.1 8.4 4.7 10 4.7 12s.4 3.6 1.2 5.1l2.7-2.6z"/>
                <path fill="#FBBC05" d="M12 4.6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 2.2 14.7 1.3 12 1.3 6.9 1.3 2.7 5.5 2.7 10.6c0 1.9.5 3.6 1.2 5.1l2.7-2.6c-.3-.8-.5-1.6-.5-2.5s.2-1.7.5-2.5L12 4.6z"/>
              </svg>
              Login with Google
            </Button>
            <Button
              size="lg"
              variant="default"
              onClick={() => setIsLoginDialogOpen(true)}
              className="w-full rounded-full px-6 py-6 bg-gradient-to-r from-orange-500 via-red-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 hover:from-orange-600 hover:via-red-600 hover:to-rose-600 hover:shadow-orange-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-300 transition-all duration-200 active:scale-[0.99]"
            >
              <GuestIcon className="mr-2 h-5 w-5" />
              Login Email
            </Button>
          </div>
        </div>
      </main>
      <LoginDialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen} />
    </>
  );
}
