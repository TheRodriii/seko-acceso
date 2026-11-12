// Configuración de la página de acceso para el proyecto de PRODUCCIÓN de Seko CRM.
// Solo datos públicos: la URL del proyecto y la clave PUBLISHABLE (pública por diseño).
// allowedClientIds: pega aquí el Client ID de «Seko CRM para Claude» (Supabase >
// Authentication > OAuth Apps). Mientras esté vacío la página NO deja conectar a nadie
// (falla cerrada): rellénalo en el paso 6 de docs/conector-claude-puesta-en-marcha.md.
window.SEKO_CONSENT_CONFIG = {
  supabaseUrl: 'https://hpmqbpgvxihnkkcplosq.supabase.co',
  publishableKey: 'sb_publishable_Q_4Crk0v7otlPR-EIAxxWA_CDHIpUkk',
  allowedClientIds: [],
  allowedRedirectHosts: ['claude.ai', 'claude.com'],
  allowedRedirectPathPrefix: '/api/mcp/auth_callback',
  environmentLabel: ''
}
