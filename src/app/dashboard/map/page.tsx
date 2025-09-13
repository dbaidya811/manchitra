import { UserProfile } from "@/components/dashboard/user-profile";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default function DashboardMapPage() {
  return (
    <div className="relative h-screen">
      <header className="absolute top-0 left-0 right-0 z-10 flex h-16 shrink-0 items-center justify-between px-4 md:px-6 bg-transparent">
        <div className="flex items-center gap-2">
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-2xl font-bold text-transparent drop-shadow-md">
            Manchitra
          </h1>
        </div>
        <UserProfile />
      </header>
      <main className="h-full w-full">
        <iframe
            src="https://www.openstreetmap.org/export/embed.html?bbox=-0.004017949104309083%2C51.47612752051241%2C0.004017949104309083%2C51.47957975293232&layer=mapnik"
            style={{ border: 0, width: '100%', height: '100%' }}
            allowFullScreen
        ></iframe>
      </main>
      <MobileNav />
    </div>
  );
}
