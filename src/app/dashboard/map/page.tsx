import { MobileNav } from "@/components/dashboard/mobile-nav";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
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
