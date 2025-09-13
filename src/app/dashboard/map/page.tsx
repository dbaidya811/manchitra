import { UserProfile } from "@/components/dashboard/user-profile";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default function DashboardMapPage() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <h1 className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-2xl font-bold text-transparent">
            Manchitra
          </h1>
        </div>
        <UserProfile />
      </header>
      <main className="flex-1">
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
