/* ComParte - Reservas: codigos de retiro, cancelacion e historial. */
(function (CP) {
  'use strict';

  var STORE = CP.store, UI = CP.ui, h = UI.h, icon = UI.icon;
  var state = { tab: 'active' };

  function init() {
    if (!CP.auth.requireAuth()) return;
    UI.mount({ screen: 'reservas.html', navKey: 'reservas', onExpiry: render });
    UI.storageGuard();
    build();
  }

  function build() {
    var root = UI.$('#reservas-root');
    UI.clear(root);

    var user = CP.auth.currentUser();
    var all = STORE.reservationsOfUser(user.id);
    var active = all.filter(function (r) { return r.status === 'reserved'; });
    var past = all.filter(function (r) { return r.status !== 'reserved'; });

    root.appendChild(h('div', { class: 'px-margin pt-2 pb-3 flex flex-col gap-2' }, [
      h('h1', { class: 'font-headline-sm text-headline-sm text-on-surface', text: 'Mis reservas' }),
      h('p', {
        class: 'font-body-sm text-body-sm text-on-surface-variant',
        text: active.length
          ? active.length === 1
            ? 'Tienes 1 ración apartada. Muestra el código al llegar.'
            : 'Tienes ' + active.length + ' reservas activas. Muestra el código al llegar.'
          : 'Aquí verás los códigos de retiro de lo que apartaste.'
      })
    ]));

    root.appendChild(h('div', { class: 'px-margin pb-1' }, [
      h('div', { class: 'inline-flex p-1 rounded-full bg-surface-container-high shadow-sm', role: 'tablist' }, [
        tab('active', 'Activas (' + active.length + ')'),
        tab('past', 'Historial (' + past.length + ')')
      ])
    ]));

    root.appendChild(h('div', { id: 'reservas-list', class: 'flex flex-col' }));
    render();
  }

  function tab(key, label) {
    var on = state.tab === key;
    return h('button', {
      type: 'button', role: 'tab', 'aria-selected': on ? 'true' : 'false',
      class: 'px-4 py-1.5 rounded-full font-label-md text-label-md transition-colors ' +
        (on ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold' : 'text-on-surface-variant'),
      text: label,
      onclick: function () { state.tab = key; build(); }
    });
  }

  function render() {
    var host = UI.$('#reservas-list');
    if (!host) return;
    UI.clear(host);
    var user = CP.auth.currentUser();
    var all = STORE.reservationsOfUser(user.id);
    var items = all.filter(function (r) { return state.tab === 'active' ? r.status === 'reserved' : r.status !== 'reserved'; });
    items.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

    if (!items.length) {
      var isDonor = STORE.canPublish(user.id);
      host.appendChild(UI.emptyState(
        state.tab === 'active' ? (isDonor ? 'No tienes reservas' : 'No tienes reservas activas') : 'Sin historial todavía',
        state.tab === 'active'
          ? (isDonor
              ? 'Tu rol de donante publica alimento en vez de retirarlo. Reservar es para cuentas beneficiarias.'
              : 'Aparta una ración desde Inicio para ver aquí su código de retiro.')
          : 'Cuando canceles o confirmes un retiro, quedará registrado aquí.',
        state.tab === 'active' ? 'Ver raciones cerca' : null,
        state.tab === 'active' ? function () { window.location.href = 'feed.html'; } : null
      ));
      return;
    }

    items.forEach(function (r) { host.appendChild(card(r)); });
  }

  var STATUS_META = {
    reserved: { label: 'Apartada', classes: 'bg-primary-fixed text-on-primary-fixed-variant' },
    picked_up: { label: 'Retirada', classes: 'bg-tertiary-container text-on-tertiary-container' },
    cancelled: { label: 'Cancelada', classes: 'bg-surface-container-highest text-on-surface-variant' },
    expired: { label: 'Vencida', classes: 'bg-surface-container-highest text-on-surface-variant' }
  };

  function card(reservation) {
    var listing = STORE.getListing(reservation.listingId);
    var owner = STORE.ownerOf(listing);
    var meta = STATUS_META[reservation.status] || STATUS_META.reserved;
    var section = h('section', { class: 'px-margin py-3 flex flex-col gap-2' });

    if (!listing) {
      section.appendChild(h('div', { class: 'p-3.5 rounded-xl bg-surface-container opacity-70' }, [
        h('span', { class: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm ' + meta.classes, text: meta.label }),
        h('p', { class: 'font-body-sm text-body-sm text-on-surface-variant mt-1.5', text: 'La publicación ya no está disponible en esta sesión.' })
      ]));
      return section;
    }

    var head = h('div', { class: 'flex gap-3' }, [
      h('img', { class: 'w-16 h-16 rounded-lg object-cover shrink-0 bg-surface-container', alt: listing.title, src: UI.photoFor(listing) }),
      h('div', { class: 'flex flex-col min-w-0 flex-1' }, [
        h('span', { class: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm self-start ' + meta.classes }, [
          h('span', { class: 'w-1.5 h-1.5 rounded-full ' + (reservation.status === 'reserved' ? 'bg-primary animate-pulse' : 'bg-current') }),
          meta.label
        ]),
        h('a', {
          href: 'detalle.html?id=' + encodeURIComponent(listing.id),
          class: 'font-title-md text-title-md text-on-surface font-semibold leading-tight line-clamp-2 mt-1 hover:text-primary',
          text: listing.title
        }),
        h('span', { class: 'font-body-sm text-body-sm text-on-surface-variant truncate', text: STORE.displayName(owner) + ' · ' + reservation.quantity + (reservation.quantity === 1 ? ' ración' : ' raciones') })
      ])
    ]);

    var body = h('div', { class: 'p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-2.5' }, [
      h('div', { class: 'flex items-center gap-1.5 text-on-surface-variant' }, [
        icon('schedule', 15),
        h('span', {
          class: 'font-label-sm text-label-sm',
          text: listing.status === 'active' && reservation.status === 'reserved'
            ? 'Recoge antes de ' + UI.fmtTime(listing.endTime) + ' (' + UI.fmtCountdown(listing.endTime) + ')'
            : 'Apartada ' + UI.fmtRelative(reservation.createdAt)
        })
      ]),
      h('div', { class: 'flex items-center gap-1.5 text-on-surface-variant' }, [
        icon('location_on', 15),
        h('span', { class: 'font-label-sm text-label-sm truncate', text: listing.pickupAddress })
      ])
    ]);

    if (reservation.status === 'reserved') {
      body.appendChild(codeBlock(reservation.code));
      var actions = h('div', { class: 'flex items-center gap-2 mt-0.5' });
      actions.appendChild(h('button', {
        type: 'button', 'aria-label': 'Copiar código',
        class: 'flex-1 h-11 inline-flex items-center justify-center gap-1.5 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md active:scale-95 transition-transform',
        onclick: function () { copyCode(reservation.code); }
      }, [icon('content_copy', 18), 'Copiar']));
      actions.appendChild(h('button', {
        type: 'button',
        class: 'flex-1 h-11 inline-flex items-center justify-center gap-1.5 rounded-full bg-error-container text-on-error-container font-label-md text-label-md active:scale-95 transition-transform',
        onclick: function () { confirmCancel(reservation); }
      }, [icon('close', 18), 'Cancelar']));
      body.appendChild(actions);
      body.appendChild(h('p', {
        class: 'font-body-sm text-body-sm text-on-surface-variant',
        text: 'El publicador confirma el retiro con este código. Al confirmarlo ganas ' + STORE.POINTS_PICKUP + ' puntos.'
      }));
    } else if (reservation.status === 'picked_up') {
      body.appendChild(h('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: 'Retirada ' + UI.fmtRelative(reservation.pickedUpAt || reservation.createdAt) + '. Sumaste ' + STORE.POINTS_PICKUP + ' puntos.' }));
    } else {
      body.appendChild(h('p', {
        class: 'font-body-sm text-body-sm text-on-surface-variant',
        text: reservation.status === 'cancelled'
          ? 'La cancelaste. Las raciones volvieron al stock de la publicación.'
          : 'La ventana de retiro cerró antes de que retiraras.'
      }));
    }

    section.appendChild(head);
    section.appendChild(body);
    return section;
  }

  function codeBlock(code) {
    return h('div', { class: 'p-3 rounded-xl bg-surface-container-highest flex flex-col items-center gap-1' }, [
      h('span', { class: 'font-label-sm text-label-sm text-on-surface-variant', text: 'Tu código de retiro' }),
      h('span', {
        class: 'font-display-lg-mobile text-display-lg-mobile text-primary tracking-[0.25em] tabular-nums',
        text: code
      })
    ]);
  }

  function copyCode(code) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(
        function () { UI.toast('Código ' + code + ' copiado.', 'success'); },
        function () { UI.toast('Cópialo a mano: ' + code, 'info'); }
      );
      return;
    }
    UI.toast('Cópialo a mano: ' + code, 'info');
  }

  function confirmCancel(reservation) {
    var listing = STORE.getListing(reservation.listingId);
    UI.confirmModal({
      title: '¿Cancelar la reserva?', icon: 'cancel', tone: 'danger',
      body: 'Tu código deja de servir y las ' + reservation.quantity + ' ración(es) vuelven a la publicación para otro vecino.',
      confirmText: 'Sí, cancelar', cancelText: 'Mejor no'
    }).then(function (ok) {
      if (!ok) return;
      var res = UI.withQuotaToast(function () { return STORE.cancelReservation(reservation.id, CP.auth.currentUser().id); });
      if (!res) return;
      if (res.error) { UI.toast('No pudimos cancelar esa reserva.', 'error'); return; }
      UI.toast('Reserva cancelada. Las raciones volvieron al stock.', 'success');
      build();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.ComParte = window.ComParte || {});
