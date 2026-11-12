// Página de consentimiento OAuth de Seko CRM para Claude.
//
// Supabase Auth (servidor OAuth 2.1) redirige aquí con ?authorization_id=…
//   1. El socio entra con su correo y contraseña de Seko CRM (la sesión solo vive en esta
//      pestaña, en memoria; se cierra al terminar).
//   2. Se piden los detalles de la autorización. Solo se deja aprobar si el cliente es el de
//      «Seko CRM para Claude» (si está configurado) y la redirección es de claude.ai o claude.com.
//   3. Permitir o Cancelar → Supabase devuelve la URL de vuelta a Claude.
//
// Sin dependencias ni compilación: HTML + este archivo + consent.css + config-*.js.
// La configuración (URL del proyecto y clave PUBLISHABLE, que es pública) está en
// window.SEKO_CONSENT_CONFIG. Nunca va aquí una clave secreta.

;(function () {
  'use strict'

  // --- Protección contra marcos (clickjacking): GitHub Pages no permite cabeceras propias ---
  if (window.top !== window.self) {
    document.documentElement.classList.remove('ready')
    document.body.textContent = 'Por seguridad, esta página no se puede mostrar dentro de otra web.'
    return
  }
  document.documentElement.classList.add('ready')

  var config = window.SEKO_CONSENT_CONFIG || {}
  var SUPABASE_URL = String(config.supabaseUrl || '').replace(/\/+$/, '')
  var API_KEY = String(config.publishableKey || '')
  // Solo Client IDs con forma de uuid; cualquier otra cosa se descarta. Si no queda ninguno,
  // la página no deja continuar (falla cerrada; revisión de seguridad, BAJO-5).
  var ALLOWED_CLIENTS = (Array.isArray(config.allowedClientIds) ? config.allowedClientIds : [])
    .map(function (id) {
      return String(id).trim().toLowerCase()
    })
    .filter(function (id) {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)
    })
  var ALLOWED_HOSTS = config.allowedRedirectHosts || ['claude.ai', 'claude.com']
  var ALLOWED_PATH_PREFIX = config.allowedRedirectPathPrefix || '/api/mcp/auth_callback'

  var MSG = {
    missingId: 'Falta el código de la conexión. Vuelve a Claude y pulsa «Conectar» otra vez.',
    badConfig: 'Esta página no está bien configurada. Avisa al administrador de Seko CRM.',
    credentials: 'El correo o la contraseña no son correctos.',
    disabled: 'Tu cuenta de Seko CRM está desactivada. Habla con el administrador.',
    tooMany: 'Has hecho demasiados intentos. Espera unos minutos y vuelve a probar.',
    network: 'No hay conexión con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.',
    expired: 'Esta solicitud de conexión ha caducado o ya se usó. Vuelve a Claude y pulsa «Conectar» otra vez.',
    generic: 'No hemos podido completar la conexión. Vuelve a Claude e inténtalo de nuevo.',
    notClaude: 'Esta conexión no es de Claude. Por seguridad solo puedes cancelarla.'
  }

  var accessToken = null
  var details = null

  function $(id) {
    return document.getElementById(id)
  }

  function show(sectionId) {
    var sections = document.querySelectorAll('[data-section]')
    for (var i = 0; i < sections.length; i++) {
      sections[i].hidden = sections[i].id !== sectionId
    }
    var focusTarget = $(sectionId).querySelector('[data-autofocus]') || $(sectionId).querySelector('h1')
    if (focusTarget) focusTarget.focus()
  }

  function showError(text) {
    $('error-text').textContent = text
    show('error')
  }

  function setMessage(id, text) {
    var box = $(id)
    box.textContent = text || ''
    box.hidden = !text
  }

  function setBusy(busy) {
    var buttons = document.querySelectorAll('button')
    for (var i = 0; i < buttons.length; i++) buttons[i].disabled = busy
  }

  function headers(withToken) {
    var h = {
      apikey: API_KEY,
      'Content-Type': 'application/json',
      'X-Supabase-Api-Version': '2024-01-01'
    }
    if (withToken && accessToken) h.Authorization = 'Bearer ' + accessToken
    return h
  }

  function request(method, path, body, withToken) {
    return fetch(SUPABASE_URL + '/auth/v1' + path, {
      method: method,
      headers: headers(withToken),
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer'
    }).then(
      function (response) {
        return response.text().then(function (text) {
          var data = null
          try {
            data = text ? JSON.parse(text) : null
          } catch (e) {
            data = null
          }
          return { status: response.status, ok: response.ok, data: data }
        })
      },
      function () {
        return { status: 0, ok: false, data: null }
      }
    )
  }

  /** ¿La URL de vuelta es de Claude? (https, host exacto, ruta del callback de MCP) */
  function isClaudeUrl(value) {
    try {
      var url = new URL(value)
      return (
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        ALLOWED_HOSTS.indexOf(url.hostname.toLowerCase()) !== -1 &&
        (url.port === '' || url.port === '443') &&
        url.pathname.indexOf(ALLOWED_PATH_PREFIX) === 0
      )
    } catch (e) {
      return false
    }
  }

  function clientAllowed(client) {
    // Lista vacía = no se acepta ningún cliente.
    if (!ALLOWED_CLIENTS.length) return false
    return Boolean(client && client.id && ALLOWED_CLIENTS.indexOf(String(client.id).toLowerCase()) !== -1)
  }

  function signOut() {
    if (!accessToken) return Promise.resolve()
    return request('POST', '/logout?scope=local', null, true).then(function () {
      accessToken = null
    })
  }

  function goBack(redirectUrl) {
    if (!isClaudeUrl(redirectUrl)) {
      showError(MSG.generic)
      return
    }
    show('redirecting')
    signOut().then(function () {
      window.location.replace(redirectUrl)
    })
  }

  // --- 0. Comprobaciones iniciales ---
  var params = new URLSearchParams(window.location.search)
  var authorizationId = params.get('authorization_id') || ''

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(SUPABASE_URL) || !API_KEY || !ALLOWED_CLIENTS.length) {
    // Sin Client ID permitido ni siquiera se pide la contraseña.
    showError(MSG.badConfig)
    return
  }
  if (!/^[A-Za-z0-9_-]{8,200}$/.test(authorizationId)) {
    showError(MSG.missingId)
    return
  }
  if (config.environmentLabel) {
    var env = $('env')
    env.textContent = config.environmentLabel
    env.hidden = false
  }

  show('login')

  // --- 1. Inicio de sesión ---
  $('login-form').addEventListener('submit', function (event) {
    event.preventDefault()
    setMessage('login-message', '')
    var email = $('email').value.trim()
    var password = $('password').value
    if (!email || !password) {
      setMessage('login-message', 'Escribe tu correo y tu contraseña de Seko CRM.')
      return
    }
    setBusy(true)
    request('POST', '/token?grant_type=password', { email: email, password: password }, false).then(function (res) {
      $('password').value = ''
      if (!res.ok || !res.data || !res.data.access_token) {
        setBusy(false)
        var code = (res.data && (res.data.error_code || res.data.error)) || ''
        if (res.status === 0) setMessage('login-message', MSG.network)
        else if (res.status === 429 || code === 'over_request_rate_limit') setMessage('login-message', MSG.tooMany)
        else if (code === 'user_banned') setMessage('login-message', MSG.disabled)
        else setMessage('login-message', MSG.credentials)
        return
      }
      accessToken = res.data.access_token
      loadDetails()
    })
  })

  // --- 2. Detalles de la autorización ---
  function loadDetails() {
    request('GET', '/oauth/authorizations/' + encodeURIComponent(authorizationId), null, true).then(function (res) {
      setBusy(false)
      if (!res.ok || !res.data) {
        signOut()
        if (res.status === 0) showError(MSG.network)
        else if (res.status === 404 || res.status === 400 || res.status === 410) showError(MSG.expired)
        else showError(MSG.generic)
        return
      }
      // Ya había dado permiso antes: Supabase devuelve directamente la URL de vuelta.
      if (res.data.redirect_url && !res.data.authorization_id) {
        goBack(res.data.redirect_url)
        return
      }
      details = res.data
      var client = details.client || {}
      var trusted = clientAllowed(client) && isClaudeUrl(details.redirect_uri)
      if (!trusted) {
        $('blocked-text').textContent = MSG.notClaude
        $('blocked-destination').textContent = safeHost(details.redirect_uri)
        show('blocked')
        return
      }
      $('client-name').textContent = client.name || 'Claude'
      $('destination').textContent = safeHost(details.redirect_uri)
      $('account').textContent = (details.user && details.user.email) || ''
      show('consent')
    })
  }

  function safeHost(value) {
    try {
      return new URL(value).host
    } catch (e) {
      return 'desconocido'
    }
  }

  // --- 3. Permitir o cancelar ---
  function decide(action, navigate) {
    setBusy(true)
    request('POST', '/oauth/authorizations/' + encodeURIComponent(authorizationId) + '/consent', { action: action }, true).then(
      function (res) {
        if (!res.ok || !res.data || !res.data.redirect_url) {
          setBusy(false)
          signOut()
          showError(res.status === 0 ? MSG.network : MSG.expired)
          return
        }
        if (!navigate) {
          signOut().then(function () {
            show('cancelled')
          })
          return
        }
        goBack(res.data.redirect_url)
      }
    )
  }

  $('approve').addEventListener('click', function () {
    if (!details || !isClaudeUrl(details.redirect_uri) || !clientAllowed(details.client)) {
      showError(MSG.notClaude)
      return
    }
    decide('approve', true)
  })
  $('deny').addEventListener('click', function () {
    decide('deny', true)
  })
  // Conexión que no es de Claude: se rechaza y NO se redirige a la web desconocida.
  $('blocked-deny').addEventListener('click', function () {
    decide('deny', false)
  })
  $('login-cancel').addEventListener('click', function () {
    show('cancelled')
  })
})()
