/* ComParte - Notificaciones: avisos reales generados por el store. */
(function (CP) {
  'use strict';

  var STORE = CP.store, UI = CP.ui, h = UI.h, icon = UI.icon;

  var TYPE_META = {
    listing_published: { icon: 'campaign', classes: 'bg-primary-fixed text-on-primary-fixed-variant', label: 'Publicación' },
    reservation_created: { icon: 'local_mall', classes: 'bg-secondary-fixed text-on-secondary-fixed', label: 'Reserva' },
    reservation_cancelled: { icon: 'undo', classes: 'bg-surface-container-high text-on-surface-variant', label: 'Reserva' },
    reservation_expired: { icon: 'timer_off', classes: 'bg-surface-container-highest text-on-surface-variant', label: 'Vencida' },
    pickup_confirmed: { icon: 'task_alt', classes: 'bg-tertiary-container text-on-tertiary-container', label: 'Retiro' },
    listing_updated: { icon: 'edit', classes: 'bg-primary-fixed text-on-primary-fixed-variant', label: 'Edición' },
    info: { icon: 'info', classes: 'bg-surface-container-high text-on-surface-variant', label: 'Aviso' }
  };

  function init() {
    if (!CP.auth.requireAuth()) return;
    UI.mount({ screen: 'notificacion.html', nav: false, onExpiry: render });
    UI.storageGuard();
    build();
    // Avisos nuevos reaching esta pantalla se marcan como vistos al abrirla.
    markAllReadSoon();
  }

  function build() {
    var root = UI.$('#notif-root');
    UI.clear(root);
    var user = CP.auth.currentUser();
    var items = STORE.notifications(user.id);
    var unread = items.filter(function (n) { return !n.read; });

    var head = h('section', { class: 'px-margin pt-2 pb-3 flex items-start justify-between gap-2' }, [
      h('div', { class: 'flex flex-col' }, [
        h('h1', { class: 'font-headline-sm text-headline-sm text-on-surface', text: 'Notificaciones' }),
        h('p', {
          class: 'font-body-sm text-body-sm text-on-surface-variant mt-0.5',
          text: unread.length
            ? unread.length + (unread.length === 1 ? ' aviso nuevo' : ' avisos nuevos')
            : items.length ? 'Todo al día' : 'Aquí te avisamos de reservas y retiros'
        })
      ]),
      unread.length ? h('button', {
        type: 'button',
        class: 'shrink-0 h-10 px-3.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm active:scale-95 transition-transform',
        text: 'Marcar leídas',
        onclick: function () {
          var n = STORE.markAllRead(CP.auth.currentUser().id);
          UI.refreshBadge();
          build();
          UI.toast(n + (n === 1 ? ' aviso leído' : ' avisos leídos'), 'success');
        }
      }) : null
    ]);
    root.appendChild(head);
    root.appendChild(h('div', { id: 'notif-list', class: 'flex flex-col px-margin pb-6 gap-1' }));
    render();
  }

  function markAllReadSoon() {
    var user = CP.auth.currentUser();
    if (!user) return;
    var unread = STORE.notifications(user.id).filter(function (n) { return !n.read; });
    if (!unread.length) return;
    setTimeout(function () {
      if (CP.auth.currentFile() !== 'notificacion.html') return;
      STORE.markAllRead(user.id);
      UI.refreshBadge();
      build();
    }, 1200);
  }

  function render() {
    var host = UI.$('#notif-list');
    if (!host) return;
    UI.clear(host);
    var items = STORE.notifications(CP.auth.currentUser().id);

    if (!items.length) {
      host.appendChild(UI.emptyState(
        'Sin notificaciones',
        'Cuando reserves, publiques o alguien confirme un retiro, te avisamos aquí.',
        'Ver raciones cerca',
        function () { window.location.href = 'feed.html'; }
      ));
      return;
    }

    var groups = [
      { key: 'today', label: 'Hoy', items: [] },
      { key: 'week', label: 'Esta semana', items: [] },
      { key: 'older', label: 'Antes', items: [] }
    ];
    var now = Date.now();
    items.forEach(function (n) {
      var age = now - new Date(n.createdAt).getTime();
      if (age < 86400000) groups[0].items.push(n);
      else if (age < 7 * 86400000) groups[1].items.push(n);
      else groups[2].items.push(n);
    });

    groups.forEach(function (g) {
      if (!g.items.length) return;
      host.appendChild(h('h2', { class: 'font-title-sm text-title-sm text-on-surface-variant pt-3 pb-1', text: g.label }));
      g.items.forEach(function (n) { host.appendChild(row(n)); });
    });
  }

  function row(n) {
    var meta = TYPE_META[n.type] || TYPE_META.info;
    var listing = n.listingId ? STORE.getListing(n.listingId) : null;
    var href = null;
    if (n.type === 'pickup_confirmed' || n.reservationId) {
      href = 'reservas.html';
    } else if (listing) {
      href = 'detalle.html?id=' + encodeURIComponent(listing.id);
    } else {
      href = 'feed.html';
    }

    var inner = [
      h('div', { class: 'w-9 h-9 rounded-full flex items-center justify-center shrink-0 ' + meta.classes }, [icon(meta.icon, 20)]),
      h('div', { class: 'flex flex-col min-w-0 flex-1' }, [
        h('div', { class: 'flex items-center gap-2' }, [
          h('span', { class: 'font-title-sm text-title-sm text-on-surface line-clamp-2', text: n.title }),
          !n.read ? h('span', { class: 'w-2 h-2 rounded-full bg-secondary shrink-0', 'aria-label': 'No leído' }) : null
        ]),
        h('p', { class: 'font-body-sm text-body-sm text-on-surface-variant line-clamp-2', text: n.body }),
        h('span', { class: 'font-label-sm text-label-sm text-on-surface-variant opacity-70 mt-0.5', text: meta.label + ' · ' + UI.fmtRelative(n.createdAt) })
      ])
    ];

    var node = h(href ? 'a' : 'div', {
      href: href || null,
      class: 'flex items-start gap-3 p-3 rounded-xl ' + (n.read ? 'bg-surface-container-low' : 'bg-surface-container')
    }, inner);

    if (href) {
      node.addEventListener('click', function () {
        if (!n.read) { STORE.markRead(n.id, CP.auth.currentUser().id); UI.refreshBadge(); }
      });
    }
    return node;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.ComParte = window.ComParte || {});
