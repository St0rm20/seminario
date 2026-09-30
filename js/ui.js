/* ComParte - componentes compartidos: header, nav inferior, toasts, modales,
   formateo y tarjetas. Reemplaza el header/nav duplicados de cada HTML. */
(function (CP) {
  'use strict';

  var STORE = CP.store;
  var ASSETS = CP.Seed.ASSETS;

  /* ---------- Constructor de DOM (sin innerHTML para datos de usuario) ---------- */

  function h(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        var value = props[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'text') { node.textContent = String(value); return; }
        if (key === 'class') { node.className = value; return; }
        if (key === 'style' && typeof value === 'object') { Object.assign(node.style, value); return; }
        if (key.slice(0, 2) === 'on' && typeof value === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), value);
          return;
        }
        if (value === true) { node.setAttribute(key, ''); return; }
        node.setAttribute(key, String(value));
      });
    }
    (Array.isArray(children) ? children : children ? [children] : []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
    });
    return node;
  }

  function icon(name, size, extraClass) {
    return h('span', { class: 'material-symbols-outlined ' + (extraClass || ''), style: { fontSize: (size || 20) + 'px' }, 'aria-hidden': 'true', text: name });
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }
  function show(node, visible) { if (node) node.classList.toggle('hidden', !visible); }

  /* ---------- Formateo ---------- */

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function fmtTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '--:--';
    var h12 = d.getHours();
    var suffix = h12 >= 12 ? 'p. m.' : 'a. m.';
    h12 = h12 % 12 || 12;
    return h12 + ':' + pad(d.getMinutes()) + ' ' + suffix;
  }

  function fmtDayTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '--';
    var today = new Date();
    var tomorrow = new Date(today.getTime() + 86400000);
    var same = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
    if (same(d, today)) return 'Hoy, ' + fmtTime(iso);
    if (same(d, tomorrow)) return 'Mañana, ' + fmtTime(iso);
    return d.getDate() + ' de ' + ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][d.getMonth()] + ', ' + fmtTime(iso);
  }

  function fmtWindow(startIso, endIso) {
    return fmtDayTime(startIso) + ' – ' + fmtTime(endIso);
  }

  function fmtRelative(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var mins = Math.round(diff / 60000);
    if (mins < 1) return 'ahora mismo';
    if (mins < 60) return 'hace ' + mins + ' min';
    var hours = Math.round(mins / 60);
    if (hours < 24) return 'hace ' + hours + ' h';
    var days = Math.round(hours / 24);
    return 'hace ' + days + (days === 1 ? ' día' : ' días');
  }

  /* "Vence en 45 min" / "Venció hace 10 min" */
  function fmtCountdown(endIso) {
    var diff = new Date(endIso).getTime() - Date.now();
    if (diff <= 0) return 'Venció';
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vence ya';
    if (mins < 60) return 'Vence en ' + mins + ' min';
    var hours = Math.floor(mins / 60);
    var rest = mins % 60;
    if (hours < 24) return 'Vence en ' + hours + ' h' + (rest ? ' ' + rest + ' min' : '');
    return 'Vence en ' + Math.floor(hours / 24) + ' d';
  }

  function haversine(lat1, lng1, lat2, lng2) {
    if ([lat1, lng1, lat2, lng2].some(function (v) { return !isFinite(v) || v === 0; })) return null;
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function fmtDistance(km) {
    if (km === null || !isFinite(km)) return 'Sin distancia';
    if (km < 1) return Math.max(10, Math.round(km * 1000 / 10) * 10) + ' m';
    return (Math.round(km * 10) / 10).toFixed(1).replace('.', ',') + ' km';
  }

  function fmtNumber(n) {
    return String(Math.round((Number(n) || 0) * 10) / 10).replace('.', ',');
  }

  function fmtKg(n) { return fmtNumber(n) + ' kg'; }

  function currentZone() {
    var z = CP.Seed.zoneById(STORE.selectedZone() || 'chapinero');
    return z;
  }

  function distanceTo(listing) {
    var z = currentZone();
    return haversine(z.lat, z.lng, listing.lat, listing.lng);
  }

  /* ---------- Imagenes: placeholder por categoria y avatar ---------- */

  var placeholderCache = {};
  function placeholderPhoto(categoryId) {
    if (placeholderCache[categoryId]) return placeholderCache[categoryId];
    var cat = null;
    STORE.CATEGORIES.forEach(function (c) { if (c.id === categoryId) cat = c; });
    var color = cat ? cat.color : '#6e7a6f';
    var initial = cat ? cat.label.charAt(0).toUpperCase() : 'C';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">' +
      '<rect width="320" height="320" fill="#f0eee9"/>' +
      '<circle cx="160" cy="150" r="76" fill="' + color + '" fill-opacity="0.16"/>' +
      '<circle cx="160" cy="150" r="52" fill="' + color + '" fill-opacity="0.10"/>' +
      '<text x="160" y="152" font-family="Epilogue, Inter, sans-serif" font-size="86" font-weight="700" fill="' + color + '" text-anchor="middle" dominant-baseline="central">' + initial + '</text>' +
      '<text x="160" y="252" font-family="Inter, sans-serif" font-size="22" font-weight="600" fill="#3e4a3f" text-anchor="middle">Sin foto</text>' +
      '</svg>';
    var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    placeholderCache[categoryId] = url;
    return url;
  }

  function photoFor(listing) {
    return (listing && listing.photo) ? listing.photo : placeholderPhoto(listing ? listing.category : 'otros');
  }

  var avatarCache = {};
  function avatar(user, size) {
    var name = (user && (user.name || user.businessName)) || 'C';
    var initials = name.trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
    var key = initials + (user ? user.id : '') + '_' + (size || 32);
    if (avatarCache[key]) return avatarCache[key];
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">' +
      '<rect width="128" height="128" fill="#018646"/>' +
      '<text x="64" y="66" font-family="Epilogue, Inter, sans-serif" font-size="52" font-weight="700" fill="#f6fff4" text-anchor="middle" dominant-baseline="central">' + initials + '</text>' +
      '</svg>';
    var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    avatarCache[key] = url;
    return url;
  }

  /* ---------- Toasts ---------- */

  var toastRoot = null;
  function toastRootNode() {
    if (!toastRoot) {
      toastRoot = h('div', { id: 'toast-root', class: 'fixed top-20 inset-x-margin z-[60] flex flex-col gap-2 pointer-events-none', 'aria-live': 'polite' });
      document.body.appendChild(toastRoot);
    }
    return toastRoot;
  }

  function toast(message, tone, actionLabel, onAction) {
    var tones = {
      success: { bg: 'bg-tertiary', fg: 'text-on-tertiary', icon: 'check_circle' },
      error: { bg: 'bg-error-container', fg: 'text-on-error-container', icon: 'error' },
      info: { bg: 'bg-inverse-surface', fg: 'text-inverse-on-surface', icon: 'info' }
    };
    var t = tones[tone] || tones.info;
    var node = h('div', {
      class: 'p-3.5 rounded-xl ' + t.bg + ' ' + t.fg + ' shadow-lg flex items-start gap-2.5 pointer-events-auto animate-[toast-in_0.2s_ease-out]',
      role: 'status'
    }, [
      icon(t.icon, 22, 'shrink-0'),
      h('div', { class: 'flex flex-col min-w-0 flex-1' }, [
        h('span', { class: 'font-title-sm text-title-sm', text: message })
      ])
    ]);
    if (actionLabel) {
      node.appendChild(h('button', {
        type: 'button',
        class: 'shrink-0 font-label-md text-label-md underline underline-offset-2',
        text: actionLabel,
        onclick: function () { dismiss(); if (onAction) onAction(); }
      }));
    }
    toastRootNode().appendChild(node);
    var timer = setTimeout(dismiss, actionLabel ? 8000 : 4200);
    function dismiss() {
      clearTimeout(timer);
      if (!node.parentNode) return;
      node.style.opacity = '0';
      node.style.transition = 'opacity .2s';
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 200);
    }
    return dismiss;
  }

  /* ---------- Modal de confirmacion ---------- */

  function closeAllOverlays() {
    $$('[data-overlay]').forEach(function (n) { n.parentNode && n.parentNode.removeChild(n); });
  }

  function confirmModal(options) {
    var opts = options || {};
    return new Promise(function (resolve) {
      var overlay = h('div', {
        'data-overlay': 'confirm',
        class: 'fixed inset-0 z-[70] bg-inverse-surface/50 backdrop-blur-sm flex items-end sm:items-center justify-center',
        role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'confirm-title'
      });
      var lastFocus = document.activeElement;
      var panel = h('div', { class: 'w-full max-w-md bg-surface rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4' }, [
        h('div', { class: 'flex items-start gap-3' }, [
          h('div', {
            class: 'w-11 h-11 rounded-full flex items-center justify-center shrink-0 ' +
              (opts.tone === 'danger' ? 'bg-error-container text-on-error-container' : 'bg-primary-fixed text-on-primary-fixed-variant')
          }, [icon(opts.icon || (opts.tone === 'danger' ? 'warning' : 'help'), 24)]),
          h('div', { class: 'flex flex-col min-w-0' }, [
            h('h3', { id: 'confirm-title', class: 'font-headline-sm text-headline-sm text-on-surface', text: opts.title || '¿Confirmas?' }),
            opts.body ? h('p', { class: 'font-body-sm text-body-sm text-on-surface-variant mt-0.5', text: opts.body }) : null
          ])
        ]),
        opts.detail || null,
        h('div', { class: 'flex items-center gap-3' }, [
          h('button', {
            type: 'button', class: 'flex-1 h-12 rounded-full bg-surface-container-high text-on-surface font-label-lg text-label-lg active:scale-95 transition-transform',
            text: opts.cancelText || 'Cancelar',
            onclick: function () { done(false); }
          }),
          h('button', {
            type: 'button',
            class: 'flex-1 h-12 rounded-full font-label-lg text-label-lg font-semibold shadow-md active:scale-95 transition-transform ' +
              (opts.tone === 'danger' ? 'bg-error text-on-error' : 'bg-primary text-on-primary'),
            text: opts.confirmText || 'Confirmar',
            onclick: function () { done(true); }
          })
        ])
      ]);
      overlay.appendChild(panel);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) done(false); });
      document.addEventListener('keydown', onKey);
      function onKey(e) { if (e.key === 'Escape') done(false); }
      function done(value) {
        document.removeEventListener('keydown', onKey);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (lastFocus && lastFocus.focus) lastFocus.focus();
        resolve(value);
      }
      document.body.appendChild(overlay);
      var focusTarget = panel.querySelector('button');
      if (focusTarget) focusTarget.focus();
    });
  }

  /* ---------- Header con selector de zona y badge de notificaciones ---------- */

  var SCREEN_TITLES = {
    'feed.html': 'Inicio', 'map.html': 'Mapa', 'publicar.html': 'Publicar',
    'reservas.html': 'Reservas', 'notificacion.html': 'Notificaciones',
    'perfil.html': 'Mi perfil', 'detalle.html': 'Detalle', 'acerca.html': 'Acerca de',
    'login.html': 'Ingresa', 'register.html': 'Crea tu cuenta'
  };

  function renderHeader(container, options) {
    var opts = options || {};
    var user = CP.auth.currentUser();
    clear(container);

    var zoneLabel = h('span', { id: 'cp-zone-label', class: 'font-label-md text-label-md truncate max-w-[130px]', text: currentZone().label });
    var zoneBtn = h('button', {
      type: 'button',
      class: 'flex items-center gap-0.5 text-on-surface-variant hover:text-primary transition-colors text-left min-h-[28px]',
      'aria-label': 'Cambiar zona de referencia',
      onclick: openZonePicker
    }, [icon('location_on', 16, 'text-secondary leading-none'), zoneLabel, icon('expand_more', 16, 'leading-none')]);

    var badge = h('span', {
      id: 'cp-badge',
      class: 'hidden absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-secondary text-on-secondary text-[10px] font-bold items-center justify-center ring-2 ring-surface'
    });
    var bell = h('a', {
      href: 'notificacion.html', 'aria-label': 'Notificaciones',
      class: 'relative w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container active:bg-surface-container-high transition-colors'
    }, [icon('notifications', 24), badge]);

    var profile = h('a', {
      href: 'perfil.html', 'aria-label': 'Perfil de usuario',
      class: 'w-11 h-11 flex items-center justify-center rounded-full hover:opacity-90 transition-opacity'
    }, [h('img', { alt: 'Tu perfil', class: 'w-8 h-8 rounded-full object-cover', src: avatar(user, 32) })]);

    var title = SCREEN_TITLES[opts.screen] || 'Inicio';
    var bar = h('div', { class: 'h-16 px-margin flex items-center justify-between gap-space-sm' }, [
      h('a', { href: 'feed.html', class: 'flex items-center gap-space-sm min-w-0', 'aria-label': 'ComParte, ir a Inicio' }, [
        h('img', { alt: 'ComParte', class: 'h-8 w-auto object-contain shrink-0', src: ASSETS.logo }),
        h('div', { class: 'flex flex-col min-w-0' }, [
          h('div', { class: 'flex items-center gap-space-xs' }, [
            h('span', { class: 'font-title-lg text-title-lg text-primary tracking-tight leading-none', text: 'ComParte' }),
            h('span', { class: 'hidden sm:inline font-label-sm text-label-sm text-on-surface-variant', text: title })
          ]),
          (opts.hideZone || opts.minimal) ? h('span', { class: 'font-label-sm text-label-sm text-on-surface-variant', text: title }) : zoneBtn
        ])
      ]),
      opts.minimal
        ? h('a', {
            href: 'index.html', class: 'h-10 px-4 inline-flex items-center rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md',
            text: 'Inicio'
          })
        : h('div', { class: 'flex items-center gap-space-xs shrink-0' }, [bell, profile])
    ]);

    container.appendChild(h('header', { class: 'fixed top-0 inset-x-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe' }, [bar]));

    refreshBadge();
    return { badge: badge, zoneBtn: zoneBtn };
  }

  function refreshBadge() {
    var user = CP.auth.currentUser();
    var count = user ? STORE.unreadCount(user.id) : 0;
    $$('#cp-badge').forEach(function (b) {
      b.textContent = count > 9 ? '9+' : String(count);
      b.classList.toggle('hidden', count === 0);
      b.classList.toggle('flex', count > 0);
    });
  }

  function openZonePicker() {
    var current = currentZone();
    var overlay = h('div', {
      'data-overlay': 'zone', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Elegir zona',
      class: 'fixed inset-0 z-[70] bg-inverse-surface/50 backdrop-blur-sm flex items-end sm:items-center justify-center'
    });
    var list = h('div', { class: 'flex flex-col gap-1' });
    CP.Seed.ZONAS.forEach(function (z) {
      var active = z.id === current.id;
      list.appendChild(h('button', {
        type: 'button',
        class: 'flex items-center justify-between gap-3 w-full min-h-[48px] px-3 rounded-xl text-left ' +
          (active ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'hover:bg-surface-container'),
        onclick: function () {
          STORE.setSelectedZone(z.id);
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          $$('#cp-zone-label').forEach(function (n) { n.textContent = z.label; });
          document.dispatchEvent(new CustomEvent('comparte:zonechange', { detail: { zone: z } }));
        }
      }, [
        h('span', { class: 'flex flex-col' }, [
          h('span', { class: 'font-title-sm text-title-sm', text: z.label }),
          h('span', { class: 'font-label-sm text-label-sm text-on-surface-variant', text: 'Bogotá D.C.' })
        ]),
        active ? icon('check_circle', 20, 'text-primary') : null
      ]));
    });
    overlay.appendChild(h('div', { class: 'w-full max-w-md bg-surface rounded-t-3xl p-5 shadow-2xl flex flex-col gap-4' }, [
      h('div', { class: 'w-12 h-1.5 bg-surface-container-highest rounded-full mx-auto' }),
      h('div', { class: 'flex flex-col' }, [
        h('h3', { class: 'font-headline-sm text-headline-sm text-on-surface', text: '¿Desde dónde buscas?' }),
        h('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: 'Las distancias de Inicio y Mapa se calculan desde esta zona.' })
      ]),
      list,
      h('button', {
        type: 'button', class: 'h-11 rounded-full bg-surface-container text-on-surface font-label-md text-label-md',
        text: 'Cerrar', onclick: function () { overlay.parentNode && overlay.parentNode.removeChild(overlay); }
      })
    ]));
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.parentNode.removeChild(overlay); });
    document.body.appendChild(overlay);
  }

  /* ---------- Nav inferior ---------- */

  var NAV_ITEMS = [
    { key: 'inicio', href: 'feed.html', label: 'Inicio', icon: 'volunteer_activism' },
    { key: 'mapa', href: 'map.html', label: 'Mapa', icon: 'map' },
    { key: 'publicar', href: 'publicar.html', label: 'Publicar', icon: 'add_circle', primary: true },
    { key: 'reservas', href: 'reservas.html', label: 'Reservas', icon: 'shopping_bag' },
    { key: 'perfil', href: 'perfil.html', label: 'Perfil', icon: 'person' }
  ];

  function navItemsFor(user) {
    if (user && !STORE.canPublish(user.id)) {
      return NAV_ITEMS.filter(function (item) { return !item.primary; });
    }
    return NAV_ITEMS;
  }

  function renderNav(container, activeKey) {
    clear(container);
    var items = navItemsFor(CP.auth.currentUser());
    var row = h('div', { class: 'flex justify-around items-center h-20 px-space-xs' });
    items.forEach(function (item) {
      var isActive = item.key === activeKey;
      var pill = h('div', {
        class: 'icon-pill flex items-center justify-center w-14 h-8 rounded-full transition-colors ' +
          (isActive ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant')
      }, [icon(item.icon, 22)]);
      var label = h('span', {
        class: 'nav-label font-label-sm text-label-sm tracking-wide ' +
          (isActive ? 'text-primary font-semibold' : (item.primary ? 'text-secondary font-semibold' : 'text-on-surface-variant'))
      }, [item.label]);
      row.appendChild(h('a', {
        href: item.href, 'data-path': item.key,
        'aria-current': isActive ? 'page' : null,
        'aria-label': item.label,
        class: 'flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 gap-1 transition-all'
      }, [
        item.primary
          ? h('div', { class: 'relative' }, [pill, h('span', { class: 'absolute inset-0 rounded-full shadow-[0_4px_12px_rgba(245,138,61,0.35)] pointer-events-none' })])
          : pill,
        label
      ]));
    });
    container.appendChild(h('nav', {
      'aria-label': 'Navegación principal',
      class: 'fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.05)]'
    }, [row]));
  }

  /* ---------- Chrome completo ---------- */

  function mount(options) {
    var opts = options || {};
    STORE.runExpiry();
    var headerHost = $('#app-header');
    var navHost = $('#app-nav');
    if (headerHost) renderHeader(headerHost, { screen: opts.screen, hideZone: opts.hideZone });
    if (navHost && opts.nav !== false) renderNav(navHost, opts.navKey);
    startExpiryWatcher(opts.onExpiry);
    return { currentUser: CP.auth.currentUser() };
  }

  function startExpiryWatcher(onChange) {
    if (startExpiryWatcher.timer) clearInterval(startExpiryWatcher.timer);
    startExpiryWatcher.timer = setInterval(function () {
      var changes = STORE.runExpiry();
      refreshBadge();
      if ((changes.listings || changes.reservations) && onChange) onChange(changes);
    }, 30000);
  }

  /* ---------- Estados de lista ---------- */

  function stateBox(iconName, title, body, extra) {
    return h('div', { class: 'flex flex-col items-center text-center gap-2 py-8 px-margin' }, [
      h('div', { class: 'w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant' }, [icon(iconName, 26)]),
      h('p', { class: 'font-title-md text-title-md text-on-surface', text: title }),
      body ? h('p', { class: 'font-body-sm text-body-sm text-on-surface-variant max-w-[300px]', text: body }) : null,
      extra || null
    ]);
  }
  function emptyState(title, body, actionLabel, onAction) {
    return stateBox('search_off', title || 'Nada por aquí', body || null,
      actionLabel ? h('button', {
        type: 'button', class: 'mt-1 h-11 px-5 rounded-full bg-primary text-on-primary font-label-md text-label-md',
        text: actionLabel, onclick: onAction
      }) : null);
  }
  function errorState(message, onRetry) {
    return stateBox('error', 'No pudimos cargar esto', message || 'Ocurrió un problema inesperado.',
      onRetry ? h('button', {
        type: 'button', class: 'mt-1 h-11 px-5 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md',
        text: 'Reintentar', onclick: onRetry
      }) : null);
  }
  function loadingState(message) {
    return h('div', { class: 'flex items-center justify-center gap-2 py-8 text-on-surface-variant' }, [
      h('span', { class: 'material-symbols-outlined animate-spin text-[20px]', text: 'progress_activity' }),
      h('span', { class: 'font-body-sm text-body-sm', text: message || 'Cargando…' })
    ]);
  }

  /* ---------- Badge de estado de la publicacion ---------- */

  var STATUS_META = {
    active: { label: 'Disponible', classes: 'bg-primary-fixed text-on-primary-fixed-variant' },
    soldout: { label: 'Agotada', classes: 'bg-surface-container-highest text-on-surface-variant' },
    expired: { label: 'Vencida', classes: 'bg-surface-container-highest text-on-surface-variant' },
    cancelled: { label: 'Cancelada', classes: 'bg-error-container text-on-error-container' }
  };

  function statusBadge(listing, extraClass) {
    var meta = STATUS_META[listing.status] || STATUS_META.active;
    return h('span', {
      class: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm ' + meta.classes + ' ' + (extraClass || '')
    }, [
      h('span', { class: 'w-1.5 h-1.5 rounded-full ' + (listing.status === 'active' ? 'bg-primary animate-pulse' : 'bg-current') }),
      meta.label
    ]);
  }

  function categoryOf(id) {
    var cat = null;
    STORE.CATEGORIES.forEach(function (c) { if (c.id === id) cat = c; });
    return cat || STORE.CATEGORIES[STORE.CATEGORIES.length - 1];
  }

  function urgencyBar(listing) {
    if (listing.status !== 'active') {
      return h('div', { class: 'flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm min-w-0' }, [
        icon(listing.status === 'soldout' ? 'inventory_2' : 'timer', 15, 'shrink-0'),
        h('span', { class: 'truncate', text: listing.status === 'soldout' ? 'Sin raciones disponibles' : (listing.status === 'cancelled' ? 'Publicación cancelada' : 'La ventana de retiro ya cerró') })
      ]);
    }
    var urgent = new Date(listing.endTime).getTime() - Date.now() < 45 * 60000;
    return h('div', {
      class: 'flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-label-sm text-label-sm min-w-0 ' +
        (urgent ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-surface-container-high text-on-surface-variant')
    }, [
      icon('schedule', 15, 'shrink-0 ' + (urgent ? 'text-secondary' : 'text-outline')),
      h('span', { class: 'truncate font-medium', text: 'Recoge antes de ' + fmtTime(listing.endTime) + ' (' + fmtCountdown(listing.endTime) + ')' })
    ]);
  }

  /* ---------- Tarjeta de publicacion ---------- */

  function listingCard(listing, options) {
    var opts = options || {};
    var owner = STORE.ownerOf(listing);
    var cat = categoryOf(listing.category);
    var km = distanceTo(listing);
    var canReserve = STORE.canReserve(listing, opts.userId).ok;

    var media = h('div', { class: 'relative w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-surface-container-high' }, [
      h('img', {
        class: 'w-full h-full object-cover', alt: listing.title, loading: 'lazy',
        src: photoFor(listing)
      }),
      listing.status === 'soldout' ? h('span', {
        class: 'absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-inverse-surface/85 text-inverse-on-surface font-label-sm text-[10px] leading-tight'
      }, ['Agotada']) : null,
      listing.status === 'expired' ? h('span', {
        class: 'absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-inverse-surface/85 text-inverse-on-surface font-label-sm text-[10px] leading-tight'
      }, ['Vencida']) : null
    ]);

    var head = h('div', { class: 'flex items-center justify-between gap-1' }, [
      h('span', { class: 'font-label-md text-label-md text-on-surface-variant truncate', text: STORE.displayName(owner) }),
      h('span', { class: 'font-label-sm text-label-sm text-on-surface-variant shrink-0', text: fmtDistance(km) })
    ]);

    var title = h('h3', { class: 'font-title-md text-title-md text-on-surface font-semibold leading-tight line-clamp-2 mt-0.5' }, [
      h('a', { href: 'detalle.html?id=' + encodeURIComponent(listing.id), class: 'hover:text-primary', text: listing.title })
    ]);

    var chips = h('div', { class: 'flex items-center gap-2 mt-1 flex-wrap' }, [
      h('span', { class: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm' }, [
        icon('inventory_2', 13), listing.portionsLeft + ' ' + (listing.portionsLeft === 1 ? 'ración' : 'raciones')
      ]),
      h('span', { class: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm' }, [
        icon(cat.icon, 13), cat.label
      ])
    ]);

    var body = h('div', { class: 'flex-1 min-w-0 flex flex-col justify-between' }, [head, title, chips]);

    var action = null;
    if (opts.hideAction) {
      action = h('a', {
        href: 'detalle.html?id=' + encodeURIComponent(listing.id),
        class: 'flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md shrink-0'
      }, ['Ver detalle', icon('arrow_forward', 18)]);
    } else if (canReserve) {
      action = h('a', {
        href: 'detalle.html?id=' + encodeURIComponent(listing.id),
        class: 'flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-secondary-container text-on-secondary-container font-label-lg text-label-lg shadow-sm active:scale-95 transition-all shrink-0'
      }, ['Apartar gratis', icon('arrow_forward', 18)]);
    } else {
      action = h('a', {
        href: 'detalle.html?id=' + encodeURIComponent(listing.id),
        class: 'flex items-center justify-center h-10 px-4 rounded-full bg-surface-container-highest text-on-surface-variant font-label-md text-label-md shrink-0'
      }, [listing.status === 'active' ? 'Ver detalle' : 'No disponible']);
    }

    return h('article', { class: 'flex flex-col p-3 rounded-xl bg-surface-container shadow-sm' }, [
      h('div', { class: 'flex gap-3' }, [media, body]),
      h('div', { class: 'mt-3 pt-2.5 flex items-center justify-between gap-2' }, [urgencyBar(listing), action])
    ]);
  }

  /* ---------- Compresion de imagenes ---------- */

  /* Redimensiona a max 800px y guarda como dataURL JPEG comprimido. */
  function compressImage(file, cb) {
    var reader = new FileReader();
    reader.onerror = function () { cb(null, 'No pudimos leer esa imagen.'); };
    reader.onload = function () {
      var img = new Image();
      img.onerror = function () { cb(null, 'Ese archivo no es una imagen válida.'); };
      img.onload = function () {
        var maxSide = 800;
        var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        var w = Math.max(1, Math.round(img.width * scale));
        var hgt = Math.max(1, Math.round(img.height * scale));
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = hgt;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, hgt);
        var quality = 0.72;
        var dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 220000 && quality > 0.4) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        cb(dataUrl, null);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  /* ---------- Barra de error global de almacenamiento ---------- */

  function storageGuard() {
    if (STORE.isDegraded()) {
      toast('Tu navegador bloqueó el almacenamiento de sesión. Los datos de esta demo vivirán solo en memoria.', 'info', null, null);
    }
  }

  function withQuotaToast(fn) {
    try {
      return fn();
    } catch (err) {
      if (err && err.code === 'quota') {
        toast('Se llenó el espacio de esta sesión. Quita alguna foto o restablece los datos demo.', 'error', 'Restablecer', function () {
          STORE.reset();
          window.location.reload();
        });
      } else if (err && err.code === 'unavailable') {
        toast('Este navegador no dejó guardar los cambios.', 'error');
      } else {
        toast('Ocurrió un problema al guardar.', 'error');
      }
      return null;
    }
  }

  CP.ui = {
    h: h, icon: icon, $: $, $$: $$, clear: clear, show: show,
    fmtTime: fmtTime, fmtDayTime: fmtDayTime, fmtWindow: fmtWindow, fmtRelative: fmtRelative,
    fmtCountdown: fmtCountdown, fmtDistance: fmtDistance, fmtNumber: fmtNumber, fmtKg: fmtKg,
    haversine: haversine, distanceTo: distanceTo, currentZone: currentZone,
    placeholderPhoto: placeholderPhoto, photoFor: photoFor, avatar: avatar,
    toast: toast, confirmModal: confirmModal, closeAllOverlays: closeAllOverlays,
    renderHeader: renderHeader, renderNav: renderNav, mount: mount, refreshBadge: refreshBadge,
    openZonePicker: openZonePicker, startExpiryWatcher: startExpiryWatcher,
    statusBadge: statusBadge, categoryOf: categoryOf, urgencyBar: urgencyBar, STATUS_META: STATUS_META,
    emptyState: emptyState, errorState: errorState, loadingState: loadingState, stateBox: stateBox,
    listingCard: listingCard, compressImage: compressImage, storageGuard: storageGuard, withQuotaToast: withQuotaToast,
    NAV_ITEMS: NAV_ITEMS
  };
})(window.ComParte = window.ComParte || {});
