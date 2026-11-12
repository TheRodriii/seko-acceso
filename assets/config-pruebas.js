// Configuración de la página de acceso para el proyecto de PRUEBAS de Seko CRM.
// Solo datos públicos: la URL del proyecto y la clave PUBLISHABLE (pública por diseño).
// allowedClientIds: pega aquí el Client ID del cliente OAuth del proyecto de pruebas.
// Mientras esté vacío la página NO deja conectar a nadie (falla cerrada).
window.SEKO_CONSENT_CONFIG = {
  supabaseUrl: 'https://atoztoqjfnevkekyunjm.supabase.co',
  publishableKey: 'sb_publishable_6ECyMD4kpxMBShJDlEEjiw_UPScJlrD',
  allowedClientIds: ['5bcd2d74-a426-4b70-9466-3198876a1620'],
  allowedRedirectHosts: ['claude.ai', 'claude.com'],
  allowedRedirectPathPrefix: '/api/mcp/auth_callback',
  environmentLabel: 'Pruebas'
}
