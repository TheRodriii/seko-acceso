# Página de acceso de Seko CRM para Claude

Página estática (HTML + JS + CSS, sin compilar ni dependencias) que Supabase Auth abre cuando un socio conecta Claude con Seko CRM: el socio entra con su correo y contraseña del CRM y pulsa **Permitir** o **Cancelar**.

- Relacionado: [[conector-claude-puesta-en-marcha]] · [[arquitectura-v1]]
- Se publica en **GitHub Pages**, en un repositorio **público aparte** que solo contiene esta carpeta. No lleva código del CRM ni secretos: solo la URL del proyecto y la clave *publishable* de Supabase, que son públicas por diseño.

## Qué hay

| Archivo | Para qué |
|---|---|
| `oauth/consent.html` | Página para el proyecto de **producción** |
| `pruebas/oauth/consent.html` | La misma página para el proyecto de **pruebas** |
| `assets/consent.js` | Lógica: inicio de sesión, detalles de la solicitud, Permitir / Cancelar |
| `assets/consent.css` | Estilo (colores de `DESIGN.md`, claro y oscuro) |
| `assets/config-produccion.js` · `assets/config-pruebas.js` | URL del proyecto, clave publishable y Client ID permitido |
| `index.html` | Portada mínima |
| `.nojekyll` | GitHub Pages sirve los archivos tal cual |

## Seguridad

- **CSP** en una etiqueta `<meta>` (GitHub Pages no deja poner cabeceras): solo scripts y estilos propios y conexiones al proyecto de Supabase.
- **Clickjacking**: GitHub Pages no permite `X-Frame-Options` ni `frame-ancestors` (no funciona en `<meta>`). La página no se muestra si está dentro de un marco (se oculta con CSS hasta que el script lo comprueba).
- Solo deja **Permitir** si la vuelta es a `https://claude.ai/api/mcp/auth_callback` o `https://claude.com/api/mcp/auth_callback` y, si está configurado, si el cliente es «Seko CRM para Claude». Si no, solo **Cancelar** y **no** redirige a la web desconocida.
- La sesión de esta página vive solo en memoria y se cierra al terminar (`/logout?scope=local`).

## Publicarla en GitHub Pages (una vez)

En **PowerShell** (la sesión de `gh` de PowerShell es la que tiene la cuenta de GitHub; ver [[CLAUDE]] del CRM). Cambia `TheRodriii` si el repositorio va en otra cuenta.

```powershell
cd "C:\Users\Usuario\OneDrive\Escritorio\agencia diseño"
New-Item -ItemType Directory -Force seko-acceso | Out-Null
Copy-Item -Recurse -Force "CRM_Softwere\consent-page\*" seko-acceso\
Copy-Item -Force "CRM_Softwere\consent-page\.nojekyll" seko-acceso\
cd seko-acceso
git init -b main
git add .
git commit -m "Página de acceso de Seko CRM para Claude"
gh repo create TheRodriii/seko-acceso --public --source . --push --description "Página de consentimiento OAuth de Seko CRM (sin código ni secretos)"
gh api -X POST repos/TheRodriii/seko-acceso/pages -f "source[branch]=main" -f "source[path]=/"
```

Espera 1–2 minutos y comprueba:

```powershell
gh api repos/TheRodriii/seko-acceso/pages --jq ".html_url,.status"
```

- Producción: `https://therodriii.github.io/seko-acceso/oauth/consent`
- Pruebas: `https://therodriii.github.io/seko-acceso/pruebas/oauth/consent`

Cuando GitHub tenga el certificado listo (unos minutos), fuerza HTTPS:

```powershell
gh api -X PUT repos/TheRodriii/seko-acceso/pages -F https_enforced=true
```

## Actualizarla (por ejemplo, al poner el Client ID)

1. Edita `CRM_Softwere/consent-page/assets/config-produccion.js` (o `config-pruebas.js`) y pon el Client ID en `allowedClientIds: ['…']`. **Sin Client ID la página no deja conectar a nadie** (falla cerrada a propósito).
2. Copia y publica:

```powershell
cd "C:\Users\Usuario\OneDrive\Escritorio\agencia diseño"
Copy-Item -Recurse -Force "CRM_Softwere\consent-page\*" seko-acceso\
cd seko-acceso
git add .
git commit -m "Actualiza la página de acceso"
git push
```

## Configuración en Supabase

Ver [[conector-claude-puesta-en-marcha]]: **Site URL** = `https://therodriii.github.io/seko-acceso` (producción) o `https://therodriii.github.io/seko-acceso/pruebas` (pruebas) y **Authorization Path** = `/oauth/consent`.
