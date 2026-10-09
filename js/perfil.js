/* ComParte - Perfil: impacto real, mis publicaciones, edicion de datos y cierre de sesion. */
(function (CP) {
  'use strict';

  var STORE = CP.store, UI = CP.ui, h = UI.h, icon = UI.icon;
  var state = { tab: 'listings' };

  function init() {
    if (!CP.auth.requireAuth()) return;
    UI.mount({ screen: 'perfil.html', navKey: 'perfil', onExpiry: render });
    UI.storageGuard();
    build();
  }

  function build() {
    var root = UI.$('#perfil-root');
    UI.clear(root);
    var user = CP.auth.currentUser();
    var stats = STORE.userStats(user.id);
    var zone = CP.Seed.zoneById(user.zoneId) || UI.currentZone();
    var isDonor = STORE.canPublish(user.id);
    if (!isDonor) state.tab = 'reservations';

    root.appendChild(h('section', { class: 'px-margin pt-2 pb-3 flex flex-col items-center text-center gap-2' }, [
      h('img', { class: 'w-20 h-20 rounded-full object-cover shadow-sm', alt: 'Tu avatar', src: UI.avatar(user, 80) }),
      h('div', { class: 'flex flex-col items-center' }, [
        h('h1', { class: 'font-headline-sm text-headline-sm text-on-surface', text: user.businessName || user.name }),
        user.businessName ? h('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: user.name }) : null,
        h('button', {
          type: 'button',
          class: 'mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm active:scale-95 transition-transform',
          onclick: UI.openZonePicker
        }, [icon('location_on', 14), zone.label])
      ]),
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm' }, [
          icon(isDonor ? 'storefront' : 'volunteer_activism', 15), CP.auth.roleLabel(user.role)
        ]),
        h('span', { class: 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-md text-label-md' }, [
          icon('stars', 16), user.points + ' puntos'
        ])
      ])
    ]));

    root.appendChild(impactCard(stats, user));

    var tabs = [];
    if (isDonor) tabs.push(tab('listings', 'Publicaciones (' + stats.publishedCount + ')'));
    tabs.push(tab('reservations', 'Reservas (' + STORE.reservationsOfUser(user.id).length + ')'));
    root.appendChild(h('section', { class: 'px-margin py-3' }, [
      h('div', { class: 'inline-flex p-1 rounded-full bg-surface-container-high shadow-sm w-full', role: 'tablist' }, tabs)
    ]));

    root.appendChild(h('div', { id: 'perfil-list', class: 'flex flex-col px-margin pb-4' }));
    render();
  }

  function impactCard(stats, user) {
    var isDonor = STORE.canPublish(user.id);
    var cells;
    if (isDonor) {
      cells = [
        stat('Raciones que compartiste', stats.portionsGiven),
        stat('Publicaciones activas', stats.activeCount),
        stat('Comida publicada', UI.fmtKg(stats.kgShared)),
        stat('CO₂e evitado al publicar', UI.fmtKg(stats.co2))
      ];
    } else {
      var picked = STORE.reservationsOfUser(user.id).filter(function (r) { return r.status === STORE.STATUS_RESERVATION.PICKED_UP; }).length;
      cells = [
        stat('Raciones que retiraste', stats.portionsReceived),
        stat('Retiros confirmados', picked),
        stat('Comida retirada', UI.fmtKg(stats.kgReceived)),
        stat('CO₂e evitado al retirar', UI.fmtKg(STORE.co2(stats.kgReceived)))
      ];
    }
    return h('section', { class: 'px-margin py-2' }, [
      h('div', { class: 'p-4 rounded-2xl bg-primary-fixed text-on-primary-fixed-variant flex flex-col gap-3' }, [
        h('div', { class: 'flex items-center gap-2' }, [
          icon('eco', 20),
          h('h2', { class: 'font-title-md text-title-md', text: isDonor ? 'Tu impacto en esta sesión' : 'Lo que retiraste' })
        ]),
        h('div', { class: 'grid grid-cols-2 gap-3' }, cells),
        h('p', {
          class: 'font-body-sm text-body-sm opacity-90',
          text: isDonor
            ? (stats.publishedCount
                ? 'Publicaste ' + stats.activeCount + ' publicación(es) activa(s) de ' + stats.publishedCount + ' en total.'
                : 'Todavía no has publicado nada. Comparte lo que te sobre en unos pasos.')
            : 'Cada retiro confirmado suma ' + STORE.POINTS_PICKUP + ' puntos a tu perfil.'
        })
      ])
    ]);
  }

  function stat(label, value) {
    return h('div', { class: 'flex flex-col' }, [
      h('span', { class: 'font-headline-sm text-headline-sm leading-none', text: String(value) }),
      h('span', { class: 'font-label-sm text-label-sm opacity-85 mt-0.5', text: label })
    ]);
  }

  function tab(key, label) {
    var on = state.tab === key;
    return h('button', {
      type: 'button', role: 'tab', 'aria-selected': on ? 'true' : 'false',
      class: 'flex-1 px-3 py-2 rounded-full font-label-sm text-label-sm transition-colors ' +
        (on ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold' : 'text-on-surface-variant'),
      text: label,
      onclick: function () {
        state.tab = key;
        UI.$$('[role="tab"]').forEach(function (b) {
          var isOn = b.textContent === label;
          b.setAttribute('aria-selected', isOn ? 'true' : 'false');
          b.className = 'flex-1 px-3 py-2 rounded-full font-label-sm text-label-sm transition-colors ' +
            (isOn ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold' : 'text-on-surface-variant');
        });
        render();
      }
    });
  }

  function render() {
    var host = UI.$('#perfil-list');
    if (!host) return;
    UI.clear(host);
    var user = CP.auth.currentUser();

    if (state.tab === 'listings') {
      var mine = STORE.listingsByOwner(user.id);
      if (!mine.length) {
        host.appendChild(UI.emptyState('Todavía no publicas nada', 'Publica lo que te sobre y suma puntos a la vez.', 'Publicar ahora',
          function () { window.location.href = 'publicar.html'; }));
      } else {
        mine.forEach(function (l) {
          var wrapper = h('div', { class: 'flex flex-col gap-1.5 mb-3' }, [UI.listingCard(l, { userId: user.id, hideAction: false })]);
          wrapper.appendChild(h('div', { class: 'flex items-center gap-2' }, [
            ownerAction('Editar', 'edit', function () { window.location.href = 'publicar.html?id=' + encodeURIComponent(l.id); }),
            ownerAction('Eliminar', 'delete', function () { confirmCancelListing(l); }, true)
          ]));
          host.appendChild(wrapper);
        });
      }
    } else {
      var reservations = STORE.reservationsOfUser(user.id).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
      if (!reservations.length) {
        if (STORE.canPublish(user.id)) {
          host.appendChild(UI.emptyState('Aún no apartas raciones', 'Las cuentas donantes publican alimento en vez de retirar. Tu rol no reserva.', 'Ver publicaciones',
            function () { window.location.href = 'feed.html'; }));
        } else {
          host.appendChild(UI.emptyState('Sin reservas', 'Cuando apartes una ración la verás aquí.', 'Ver raciones cerca',
            function () { window.location.href = 'feed.html'; }));
        }
      } else {
        reservations.forEach(function (r) {
          var listing = STORE.getListing(r.listingId);
          if (!listing) return;
          host.appendChild(h('div', { class: 'mb-2' }, [
            UI.listingCard(listing, { userId: user.id, hideAction: true })
          ]));
        });
      }
    }

    host.appendChild(actionsSection(user));
  }

  function ownerAction(label, iconName, onClick, danger) {
    return h('button', {
      type: 'button',
      class: 'h-9 px-3.5 inline-flex items-center gap-1.5 rounded-full font-label-sm text-label-sm active:scale-95 transition-transform ' +
        (danger ? 'bg-error-container text-on-error-container' : 'bg-surface-container-high text-on-surface'),
      onclick: onClick
    }, [icon(iconName, 16), label]);
  }

  function confirmCancelListing(l) {
    UI.confirmModal({
      title: '¿Eliminar la publicación?', icon: 'delete', tone: 'danger',
      body: '«' + l.title + '» desaparece de Inicio y Mapa. Las reservas pendientes se anulan con aviso.',
      confirmText: 'Sí, eliminar', cancelText: 'No'
    }).then(function (ok) {
      if (!ok) return;
      var res = STORE.cancelListing(l.id, CP.auth.currentUser().id);
      if (res.error) { UI.toast('Solo puedes eliminar tus propias publicaciones.', 'error'); return; }
      UI.toast('Publicación eliminada.', 'success');
      build();
    });
  }

  function actionsSection(user) {
    return h('section', { class: 'px-margin pt-4 pb-6 flex flex-col gap-2' }, [
      h('button', {
        type: 'button',
        class: 'w-full h-12 px-5 inline-flex items-center justify-center gap-2 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md active:scale-[0.98] transition-transform',
        onclick: function () { editProfile(user); }
      }, [icon('edit', 18), 'Editar mis datos']),
      h('a', {
        href: 'acerca.html',
        class: 'w-full h-12 px-5 inline-flex items-center justify-center gap-2 rounded-full bg-surface-container text-on-surface font-label-md text-label-md active:scale-[0.98] transition-transform'
      }, [icon('info', 18), 'Acerca de ComParte']),
      h('button', {
        type: 'button',
        class: 'w-full h-12 px-5 inline-flex items-center justify-center gap-2 rounded-full bg-error-container text-on-error-container font-label-md text-label-md active:scale-[0.98] transition-transform',
        onclick: function () { logout(); }
      }, [icon('logout', 18), 'Cerrar sesión']),
      h('button', {
        type: 'button',
        class: 'w-full h-11 inline-flex items-center justify-center gap-1.5 rounded-full text-on-surface-variant font-label-sm text-label-sm',
        onclick: function () { resetDemo(); }
      }, [icon('restart_alt', 16), 'Restablecer datos de esta sesión'])
    ]);
  }

  /* ---------- Editar datos ---------- */

  function editProfile(user) {
    var overlay = h('div', {
      'data-overlay': 'profile', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Editar mis datos',
      class: 'fixed inset-0 z-[70] bg-inverse-surface/50 backdrop-blur-sm flex items-end sm:items-center justify-center'
    });
    var fields = {};
    function field(id, label, value, maxlength) {
      var input = h('input', {
        id: id, type: 'text', value: value, maxlength: maxlength,
        class: 'w-full h-[52px] bg-surface-container-high rounded-lg px-3 font-body-md text-body-md text-on-surface focus:outline-none'
      });
      fields[id] = input;
      return h('div', { class: 'flex flex-col gap-1' }, [
        h('label', { class: 'font-label-md text-label-md text-on-surface-variant', for: id, text: label }), input
      ]);
    }
    var error = h('p', { class: 'font-body-sm text-body-sm text-error min-h-[16px]', text: ' ' });
    var zoneSelect = h('select', {
      class: 'w-full h-[52px] px-3 bg-surface-container-high rounded-lg font-body-md text-body-md text-on-surface focus:outline-none'
    }, CP.Seed.ZONAS.map(function (z) { return h('option', { value: z.id, text: CP.Zones.label(z) }); }));
    zoneSelect.value = user.zoneId || UI.currentZone().id;

    var panel = h('div', { class: 'w-full max-w-md bg-surface rounded-t-3xl p-5 shadow-2xl flex flex-col gap-3 max-h-[88vh] overflow-y-auto no-scrollbar' }, [
      h('h3', { class: 'font-headline-sm text-headline-sm', text: 'Editar mis datos' }),
      field('p-name', 'Nombre', user.name, '60'),
      STORE.canPublish(user.id) ? field('p-business', 'Nombre del negocio o comercio', user.businessName, '60') : null,
      field('p-phone', 'Teléfono', user.phone, '20'),
      field('p-address', 'Dirección', user.address, '120'),
      h('div', { class: 'flex flex-col gap-1' }, [
        h('label', { class: 'font-label-md text-label-md text-on-surface-variant', text: 'Zona de referencia' }), zoneSelect
      ]),
      error,
      h('div', { class: 'flex items-center gap-3 mt-1' }, [
        h('button', { type: 'button', class: 'flex-1 h-12 rounded-full bg-surface-container-high font-label-lg text-label-lg', text: 'Cancelar', onclick: close }),
        h('button', { type: 'button', class: 'flex-1 h-12 rounded-full bg-primary text-on-primary font-label-lg text-label-lg font-semibold', text: 'Guardar', onclick: save })
      ])
    ]);
    overlay.appendChild(panel);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);

    function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    function save() {
      error.textContent = ' ';
      var name = fields['p-name'].value.trim();
      var address = fields['p-address'].value.trim();
      if (name.length < 3) { error.textContent = 'El nombre necesita al menos 3 caracteres.'; fields['p-name'].focus(); return; }
      if (!address) { error.textContent = 'Necesitamos una dirección para coordinar los retiros.'; fields['p-address'].focus(); return; }
      var zone = CP.Seed.zoneById(zoneSelect.value);
      var res = UI.withQuotaToast(function () {
        return STORE.updateUser(user.id, {
          name: name,
          businessName: fields['p-business'] ? fields['p-business'].value.trim() : '',
          phone: fields['p-phone'].value.trim(),
          address: address,
          zoneId: zone.id,
          lat: zone.lat,
          lng: zone.lng
        });
      });
      if (!res) return;
      close();
      UI.toast('Datos actualizados.', 'success');
      build();
    }
  }

  function logout() {
    UI.confirmModal({
      title: '¿Cerrar sesión?', icon: 'logout', tone: 'danger',
      body: 'Esta demo guarda todo en la memoria del navegador: al salir y volver a entrar con otra cuenta verás los datos desde el inicio.',
      confirmText: 'Sí, salir', cancelText: 'Quedarme'
    }).then(function (ok) {
      if (!ok) return;
      CP.auth.logout();
      window.location.href = 'login.html';
    });
  }

  function resetDemo() {
    UI.confirmModal({
      title: '¿Restablecer los datos?', icon: 'restart_alt', tone: 'danger',
      body: 'Se borra lo que publicaste y reservaste en esta sesión y vuelven las 8 publicaciones demo. Tu cuenta también se reinicia.',
      confirmText: 'Restablecer', cancelText: 'Cancelar'
    }).then(function (ok) {
      if (!ok) return;
      STORE.reset();
      UI.toast('Datos de la sesión restablecidos.', 'success');
      window.location.href = 'login.html';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.ComParte = window.ComParte || {});
