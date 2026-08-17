import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "../components/Header";
import { SiteFooter } from "../components/SiteFooter";
import { MoneyProvider } from "../lib/money/store";
import { LensProvider } from "../lib/lens/store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-ink">404</h1>
        <h2 className="font-display mt-4 text-xl text-ink">Page not found.</h2>
        <p className="mt-2 text-sm text-ink/70">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl text-ink">This page didn't load.</h1>
        <p className="mt-2 text-sm text-ink/70">
          Something went wrong. Try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-ink/30 bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink/[0.06]"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "The Bridge — See What Happened to the Money" },
      {
        name: "description",
        content:
          "An independent economic record for physician groups. Trace work to claim, adjudication, payment and bank cash — with every figure tied back to its source.",
      },
      { property: "og:title", content: "The Bridge — See What Happened to the Money" },
      { name: "twitter:title", content: "The Bridge — See What Happened to the Money" },
      {
        property: "og:description",
        content:
          "An independent economic record for physician groups. Trace work to claim, adjudication, payment and bank cash — with every figure tied back to its source.",
      },
      {
        name: "twitter:description",
        content:
          "An independent economic record for physician groups. Trace work to claim, adjudication, payment and bank cash — with every figure tied back to its source.",
      },
      { property: "og:url", content: "https://clinic-data-unite.lovable.app/" },
      { property: "og:image", content: "https://clinic-data-unite.lovable.app/og-bridge.jpg" },
      { name: "twitter:image", content: "https://clinic-data-unite.lovable.app/og-bridge.jpg" },

      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Hanken+Grotesk:wght@400;500&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideFooter = pathname === "/optimizer" || pathname === "/legacy/extractor";

  return (
    <QueryClientProvider client={queryClient}>
      <MoneyProvider>
        <LensProvider>
          <div className="flex min-h-screen flex-col bg-paper text-ink">
            <Header />
            {/* Required: nested routes render here. */}
            <div className="flex-1">
              <Outlet />
            </div>
            {!hideFooter && <SiteFooter />}
          </div>
        </LensProvider>
      </MoneyProvider>
    </QueryClientProvider>
  );
}
