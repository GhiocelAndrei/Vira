import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// TODO: add "@/*" path alias to match tsconfig once features grow.
//
// Opt-in dev proxy: set VITE_API_PROXY_TARGET (and VITE_API_BASE_URL=/api) to route API calls
// through the dev server to a remote backend (e.g. the deployed one) *same-origin*. This is the
// reliable way to use the prod backend while developing locally: the browser only ever talks to
// localhost, so the `vira_session` cookie stays first-party (no SameSite=None / third-party-cookie
// blocking) and there's no CORS. Leave the vars unset for the normal local backend on :8080.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_API_PROXY_TARGET;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: proxyTarget
        ? {
            "/api": {
              target: proxyTarget,
              changeOrigin: true, // send the target's Host header so it accepts the request
              secure: true, // the target has a valid TLS cert
              rewrite: (path) => path.replace(/^\/api/, ""), // backend routes are /creator, /brand, …
              cookieDomainRewrite: "localhost", // so Set-Cookie sticks to localhost
            },
          }
        : undefined,
    },
  };
});
