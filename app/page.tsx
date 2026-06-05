import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-5xl font-bold mb-4">
        EventForge
      </h1>

      <p className="text-xl text-muted-foreground mb-8">
        Webhook Ingestion & Delivery Platform
      </p>

      <Link
        href="/dashboard"
        className="px-6 py-3 rounded-md bg-black text-white"
      >
        Open Dashboard
      </Link>
    </main>
  );
}