export const metadata = { title: "Offline · Peoplearound" };

/**
 * Served by the service worker when a navigation fails. Kept static and
 * dependency-free so it can be cached at install time.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <p className="text-5xl" aria-hidden>
        🌤️
      </p>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
        You&rsquo;re offline
      </h1>
      <p className="mt-2 max-w-sm text-sm text-black/60 dark:text-white/60">
        Peoplearound needs a connection to show what&rsquo;s happening around
        you. This page will work again the moment you&rsquo;re back.
      </p>
      <p className="mt-6 text-sm text-black/40 dark:text-white/40">
        Good time to go knock on a door.
      </p>
    </main>
  );
}
