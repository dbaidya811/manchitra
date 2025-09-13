"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageCollage } from "@/components/image-collage";
import { useRouter } from "next/navigation";
import { LoginDialog } from "@/components/login-dialog";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M20.98 12.18c0-.83-.07-1.62-.2-2.38H12v4.51h5.04c-.2 1.44-.82 2.65-1.74 3.48v2.85h3.66c2.14-1.97 3.38-4.8 3.38-8.46z" fill="#4285F4" stroke="none" />
    <path d="M12 21c3.2 0 5.86-1.07 7.8-2.9l-3.66-2.85c-1.07.71-2.42 1.13-3.94 1.13-3.03 0-5.59-2.04-6.5-4.82H1.72v2.94C3.65 18.99 7.55 21 12 21z" fill="#34A853" stroke="none" />
    <path d="M5.5 14.28c-.2-.6-.31-1.25-.31-1.92s.11-1.32.31-1.92V7.5H1.72C.83 9.17.33 11.01.33 13s.5 3.83 1.39 5.5l3.78-2.92z" fill="#FBBC05" stroke="none" />
    <path d="M12 5.38c1.68 0 3.2.58 4.39 1.7l3.24-3.24C17.86 1.94 15.2 0 12 0 7.55 0 3.65 2.01 1.72 5.5l3.78 2.92C6.41 7.42 8.97 5.38 12 5.38z" fill="#EA4335" stroke="none" />
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );

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


  const handleGuestLogin = () => {
    router.push("/dashboard");
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
        <div className="mt-8 flex animate-fade-in-up flex-col gap-4 sm:flex-row" style={{ animationDelay: '0.5s', animationFillMode: 'backwards' }}>
           <Button size="lg" variant="secondary" onClick={handleGuestLogin}>
            <GoogleIcon className="mr-2 h-5 w-5" />
            Login with Google
          </Button>
          <Button size="lg" variant="secondary" onClick={handleGuestLogin} className="bg-[#1877F2] text-white hover:bg-[#1877F2]/90">
            <FacebookIcon className="mr-2 h-5 w-5" />
            Login with Facebook
          </Button>
          <div className="animate-pulse">
            <Button size="lg" variant="outline" onClick={() => setIsLoginDialogOpen(true)}>
              <GuestIcon className="mr-2 h-5 w-5" />
              Login as Guest
            </Button>
          </div>
        </div>
      </div>
    </main>
    <LoginDialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen} />
    </>
  );
}
