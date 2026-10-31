/**
 * Supabase configuration for Aesthete Hairdressing.
 * Values are loaded from /api/config (Vercel env) or window overrides.
 */
(function () {
  const PLACEHOLDER = 'YOUR_SUPABASE';

  function isPlaceholder(value) {
    return !value || value.includes(PLACEHOLDER);
  }

  window.AestheteSupabase = {
    url: window.SUPABASE_URL || '',
    anonKey: window.SUPABASE_ANON_KEY || '',
    client: null,
    ready: false,
    configured: false,

    async init() {
      if (!this.url || !this.anonKey) {
        await this.loadRemoteConfig();
      }

      this.configured = !isPlaceholder(this.url) && !isPlaceholder(this.anonKey);

      if (this.configured && typeof supabase !== 'undefined') {
        this.client = supabase.createClient(this.url, this.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
        this.ready = true;
      }

      return this.client;
    },

    async loadRemoteConfig() {
      try {
        const res = await fetch('/api/config');
        if (!res.ok) return;
        const cfg = await res.json();
        if (cfg.supabaseUrl && !isPlaceholder(cfg.supabaseUrl)) {
          this.url = cfg.supabaseUrl;
        }
        if (cfg.supabaseAnonKey && !isPlaceholder(cfg.supabaseAnonKey)) {
          this.anonKey = cfg.supabaseAnonKey;
        }
      } catch (_) {
        /* static/local fallback */
      }
    },
  };
})();
