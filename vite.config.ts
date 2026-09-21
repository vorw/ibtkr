import vinext from 'vinext';
import { defineConfig } from 'vite';
export default defineConfig(async () => {
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= 'false';
  process.env.WRANGLER_SEND_METRICS ??= 'false';
  const { cloudflare } = await import('@cloudflare/vite-plugin');
  return {
    server: { host: '0.0.0.0', allowedHosts: ['terminal.local'] },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        inspectorPort: false,
        configPath: './wrangler.json',
      }),
    ],
  };
});
