/**
 * App Router re-mounts this template on every navigation, so it doubles as a
 * page-enter transition. It is a PURE CSS animation (`page-in`), not
 * framer-motion, on purpose: the old motion wrapper rendered the whole page at
 * opacity:0 in the server HTML and only revealed it after ~1MB of wallet SDK
 * hydrated — a 15s LCP on slow mobile. CSS runs the instant styles arrive, so
 * content paints immediately with no JS on the critical path. No "use client",
 * so this stays a server component and adds nothing to the bundle.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
