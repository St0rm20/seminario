/* ComParte - Detalle de publicacion: info completa, reserva y acciones del propietario. */
(function (CP) {
  'use strict';

  var STORE = CP.store, UI = CP.ui, h = UI.h, icon = UI.icon;

  var listingId = null;
  var quantity = 1;

  function init() {
    if (!CP.auth.requireAuth()) return;
    UI.mount({ screen: 'detalle.html', nav: false, onExpiry: render });
    UI.storageGuard();

    listingId = new URLSearchParams(window.location.search).get('id');
    var listing = STORE.getListing(listingId);
    if (!listing) {
      renderMissing();
      return;
    }
    quantity = 1;
    render();
  }

  function renderMissing() {
    var root = UI.$('#detail-root');
    UI.clear(root);
    root.appendChild(UI.stateBox('search_off', 'Esta publicación ya no está',
      ' Puede que el publicador la cancelara o que el enlace esté equivocado.',
      h('a', { href: 'feed.html', class: 'mt-1 h-11 px-5 inline-flex items-center rounded-full bg-primary text-on-primary font-label-md text-label-md', text: 'Ver otras raciones' })));
    UI.clear(UI.$('#detail-bar'));
  }

  function currentUser() { return CP.auth.currentUser(); }
  function listing() { return STORE.getListing(listingId); }

  function render() {
    var l = listing();
    if (!l) { renderMissing(); return; }
    var user = currentUser();
    var isOwner = l.ownerId === user.id;
    var root = UI.$('#detail-root');
    UI.clear(root);

    root.appendChild(buildMedia(l));
    root.appendChild(buildHead(l));
    root.appendChild(buildFacts(l));
    if (l.description) root.appendChild(buildBlock(' Descripción', h('p', { class: 'font-body-md text-body-md text-on-surface-variant leading-relaxed', text: l.description })));
    if (l.allergens.length) root.appendChild(buildBlock('Alérgenos', h('div', { class: 'flex flex-wrap gap-1.5' },
      l.allergens.map(function (a) {
        return h('span', { class: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm' }, [
          icon('warning', 13), a
        ]);
      }))));
    root.appendChild(buildPickup(l));
    root.appendChild(buildImpact(l));
    if (isOwner) root.appendChild(buildOwnerPanel(l));

    renderBar(l, isOwner);
    document.title = l.title + ' · ComParte';
  }

  function buildMedia(l) {
    return h('div', { class: 'relative w-full' }, [
      h('img', { class: 'w-full h-64 object-cover', alt: l.title, src: UI.photoFor(l) }),
      l.status !== 'active' ? h('div', { class: 'absolute top-3 left-3' }, [UI.statusBadge(l)]) : null,
      h('a', {
        href: 'feed.html', 'aria-label': 'Volver a Inicio',
        class: 'absolute top-3 left-3 w-10 h-10 rounded-full bg-inverse-surface/70 text-inverse-on-surface flex items-center justify-center backdrop-blur-sm active:scale-95 transition-transform'
      }, [icon('arrow_back', 20)])
    ]);
  }

  function buildHead(l) {
    var owner = STORE.ownerOf(l);
    var cat = UI.categoryOf(l.category);
    return h('section', { class: 'px-margin py-3.5 flex flex-col gap-2' }, [
      h('div', { class: 'flex items-center gap-2 flex-wrap' }, [
        h('span', { class: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-on-surface-variant font-label-sm text-label-sm bg-surface-container-high' }, [
          icon(cat.icon, 14), cat.label
        ]),
        h('span', { class: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-on-surface-variant font-label-sm text-label-sm bg-surface-container-high' }, [
          icon('near_me', 14), UI.fmtDistance(UI.distanceTo(l))
        ]),
        h('span', { class: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-on-surface-variant font-label-sm text-label-sm bg-surface-container-high' }, [
          icon('schedule', 14), UI.fmtCountdown(l.endTime)
        ])
      ]),
      h('h1', { class: 'font-headline-sm text-headline-sm text-on-surface leading-tight', text: l.title }),
      h('div', { class: 'flex items-center gap-2 mt-1' }, [
        h('img', { class: 'w-9 h-9 rounded-full', alt: '', src: UI.avatar(owner, 36) }),
        h('div', { class: 'flex flex-col' }, [
          h('span', { class: 'font-title-sm text-title-sm text-on-surface', text: STORE.displayName(owner) }),
          h('span', { class: 'font-label-sm text-label-sm text-on-surface-variant', text: 'Publicado ' + UI.fmtRelative(l.createdAt) })
        ])
      ])
    ]);
  }

  function buildFacts(l) {
    return h('section', { class: 'px-margin pb-1 grid grid-cols-3 gap-2' }, [
      fact('inventory_2', l.portionsLeft + '/' + l.portionsTotal, 'Raciones'),
      fact('scale', UI.fmtKg(l.weightKg), 'Peso'),
      fact('co2', UI.fmtKg(STORE.co2(l.weightKg)), 'CO₂e evit.')
    ]);
  }

  function fact(iconName, value, label) {
    return h('div', { class: 'flex flex-col items-center gap-0.5 p-3 rounded-xl bg-surface-container-low' }, [
      icon(iconName, 20, 'text-primary'),
      h('span', { class: 'font-title-md text-title-md text-on-surface', text: value }),
      h('span', { class: 'font-label-sm text-label-sm text-on-surface-variant text-center', text: label })
    ]);
  }

  function buildBlock(title, body) {
    return h('section', { class: 'px-margin py-3 flex flex-col gap-1.5' }, [
      h('h2', { class: 'font-title-md text-title-md text-on-surface', text: title }),
      body
    ]);
  }

  function buildPickup(l) {
    return h('section', { class: 'px-margin py-3 flex flex-col gap-2' }, [
      h('h2', { class: 'font-title-md text-title-md text-on-surface', text: 'Retiro' }),
      h('div', { class: 'flex flex-col gap-2 p-3.5 rounded-xl bg-surface-container' }, [
        row('schedule', 'Ventana', UI.fmtWindow(l.startTime, l.endTime)),
        row('location_on', 'Dirección', l.pickupAddress || 'Sin dirección indicada'),
        l.pickupNotes ? row('info', 'Indicaciones', l.pickupNotes) : null,
        row('kitchen', 'Consumo', l.consumeToday ? 'Consumir hoy o mañana' : 'Se puede consumir después'),
        l.needsFridge ? row('ac_unit', 'Cadena de frío', 'Mantener refrigerado hasta el retiro') : null,
        l.maxPerPerson > 0 ? row('person', 'Límite por persona', 'Máximo ' + l.maxPerPerson + ' ración(es)') : null
      ])
    ]);
  }

  function row(iconName, label, value) {
    return h('div', { class: 'flex items-start gap-2.5' }, [
      icon(iconName, 18, 'text-on-surface-variant shrink-0 mt-0.5'),
      h('div', { class: 'flex flex-col min-w-0' }, [
        h('span', { class: 'font-label-sm text-label-sm text-on-surface-variant', text: label }),
        h('span', { class: 'font-body-md text-body-md text-on-surface', text: value })
      ])
    ]);
  }

  function buildImpact(l) {
    return h('section', { class: 'px-margin py-3' }, [
      h('div', { class: 'flex items-start gap-3 p-3.5 rounded-xl bg-primary-fixed text-on-primary-fixed-variant' }, [
        icon('eco', 22, 'shrink-0 mt-0.5'),
        h('p', {
          class: 'font-body-sm text-body-sm leading-tight',
          text: 'Si se retira completo, evitamos unos ' + UI.fmtKg(STORE.co2(l.weightKg)) +
            ' de CO₂e y desperdiciamos ' + UI.fmtKg(l.weightKg) + ' menos. En ComParte, publicar suma ' +
            STORE.POINTS_PUBLISH + ' puntos y cada retiro confirmado ' + STORE.POINTS_PICKUP + ' para ambos.'
        })
      ])
    ]);
  }

  /* ---------- Panel del propietario ---------- */

  function buildOwnerPanel(l) {
    var panel = h('section', { class: 'px-margin py-3 flex flex-col gap-2' }, [
      h('h2', { class: 'font-title-md text-title-md text-on-surface', text: 'Gestionar publicación' })
    ]);
    var pending = STORE.activeReservationsOn(l.id);

    var actions = h('div', { class: 'flex flex-wrap gap-2' });
    actions.appendChild(h('a', {
      href: 'publicar.html?id=' + encodeURIComponent(l.id),
      class: 'h-11 px-4 inline-flex items-center gap-1.5 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md'
    }, [icon('edit', 18), 'Editar']));

    if (l.status === 'active' || l.status === 'soldout') {
      if (l.status === 'active') {
        actions.appendChild(h('button', {
          type: 'button', class: 'h-11 px-4 inline-flex items-center gap-1.5 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md',
          onclick: function () {
            UI.confirmModal({
              title: '¿Marcar como agotada?', icon: 'inventory_2',
              body: 'Dejas de recibir reservas. Las ' + pending.length + ' reserva(s) pendientes siguen vigentes.',
              confirmText: 'Sí, agotada'
            }).then(function (ok) {
              if (!ok) return;
              var res = STORE.markSoldout(l.id, currentUser().id);
              if (res.error) { UI.toast('Solo el publicador puede hacer eso.', 'error'); return; }
              UI.toast('Publicación marcada como agotada.', 'success');
              render();
            });
          }
        }, [icon('inventory_2', 18), 'Marcar agotada']));
      } else {
        actions.appendChild(h('button', {
          type: 'button', class: 'h-11 px-4 inline-flex items-center gap-1.5 rounded-full bg-primary text-on-primary font-label-md text-label-md',
          onclick: function () {
            UI.confirmModal({
              title: '¿Liberar raciones?', icon: 'restart_alt',
              body: 'Vuelven a estar disponibles las raciones pendientes de retirar.',
              confirmText: 'Liberar'
            }).then(function (ok) {
              if (!ok) return;
              var res = STORE.reactivate(l.id, currentUser().id, 0);
              if (res.error) { UI.toast('No se pudo reactivar esta publicación.', 'error'); return; }
              UI.toast('Raciones liberadas.', 'success');
              render();
            });
          }
        }, [icon('restart_alt', 18), 'Liberar raciones']));
      }
    }

    actions.appendChild(h('button', {
      type: 'button', class: 'h-11 px-4 inline-flex items-center gap-1.5 rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md',
      onclick: function () {
        UI.confirmModal({
          title: '¿Cerrar la entrega ahora?', icon: 'timer_off', tone: 'danger',
          body: 'La publicación queda vencida y se anulan las ' + pending.length + ' reserva(s) pendientes con aviso automático.',
          confirmText: 'Cerrar entrega', cancelText: 'No'
        }).then(function (ok) {
          if (!ok) return;
          var res = STORE.markExpired(l.id, currentUser().id);
          if (res.error) { UI.toast('Solo el publicador puede hacer eso.', 'error'); return; }
          UI.toast(res.expired + ' reserva(s) anuladas y avisadas.', 'success');
          render();
        });
      }
    }, [icon('timer_off', 18), 'Cerrar entrega']));

    if (l.status !== 'cancelled') {
      actions.appendChild(h('button', {
        type: 'button', class: 'h-11 px-4 inline-flex items-center gap-1.5 rounded-full bg-error-container text-on-error-container font-label-md text-label-md',
        onclick: function () {
          UI.confirmModal({
            title: '¿Cancelar la publicación?', icon: 'cancel', tone: 'danger',
            body: 'Se elimina de Inicio y Mapa. Los que reservaron reciben un aviso.',
            confirmText: 'Sí, cancelar', cancelText: 'No'
          }).then(function (ok) {
            if (!ok) return;
            var res = STORE.cancelListing(l.id, currentUser().id);
            if (res.error) { UI.toast('Solo el publicador puede hacer eso.', 'error'); return; }
            UI.toast('Publicación cancelada.', 'success');
            render();
          });
        }
      }, [icon('cancel', 18), 'Cancelar']));
    }
    panel.appendChild(actions);

    if (pending.length) {
      var list = h('div', { class: 'flex flex-col gap-2 mt-1' });
      list.appendChild(h('p', { class: 'font-label-md text-label-md text-on-surface-variant', text: 'Confirma cada retiro con el código que te muestra la persona:' }));
      pending.forEach(function (r) {
        var reserver = STORE.getUser(r.userId);
        list.appendChild(h('div', { class: 'flex items-center justify-between gap-2 p-3 rounded-xl bg-surface-container' }, [
          h('div', { class: 'flex flex-col min-w-0' }, [
            h('span', { class: 'font-title-sm text-title-sm text-on-surface truncate', text: STORE.displayName(reserver) }),
            h('span', { class: 'font-label-sm text-label-sm text-on-surface-variant', text: r.quantity + ' ración(es) · reservó ' + UI.fmtRelative(r.createdAt) })
          ]),
          h('button', {
            type: 'button', class: 'h-10 px-3 shrink-0 rounded-full bg-primary text-on-primary font-label-md text-label-md',
            text: 'Confirmar',
            onclick: function () { confirmPickup(r); }
          })
        ]));
      });
      panel.appendChild(list);
    }

    var done = STORE.reservationsOfListing(l.id).filter(function (r) { return r.status === 'picked_up'; });
    if (done.length) {
      panel.appendChild(h('div', { class: 'mt-1 p-3.5 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed' }, [
        h('p', { class: 'font-title-sm text-title-sm', text: 'Retiros confirmados' }),
        h('p', { class: 'font-body-sm text-body-sm', text: done.reduce(function (a, r) { return a + r.quantity; }, 0) + ' ración(es) entregadas en ' + done.length + ' visita(s). Cada una sumó ' + STORE.POINTS_PICKUP + ' puntos.' })
      ]));
    }
    return panel;
  }

  function confirmPickup(reservation) {
    var input = h('input', {
      type: 'text', inputmode: 'text', maxlength: '6', autocomplete: 'off', autocapitalize: 'characters',
      'aria-label': 'Código de retiro',
      class: 'w-full h-12 px-4 rounded-xl bg-surface text-on-surface font-title-md text-title-md tracking-[0.3em] uppercase text-center focus:outline-none focus:ring-2 focus:ring-primary'
    });
    var error = h('p', { class: 'font-body-sm text-body-sm text-error min-h-[18px]', text: ' ' });
    var dialog = h('div', { class: 'fixed inset-0 z-[70] bg-inverse-surface/50 backdrop-blur-sm flex items-end sm:items-center justify-center', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Confirmar retiro' }, [
      h('div', { class: 'w-full max-w-md bg-surface rounded-t-3xl p-5 shadow-2xl flex flex-col gap-4' }, [
        h('div', { class: 'flex flex-col' }, [
          h('h3', { class: 'font-headline-sm text-headline-sm', text: 'Confirmar retiro' }),
          h('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: 'Pide el código de 6 caracteres a quien retira y escríbelo aquí.' })
        ]),
        input,
        error,
        h('div', { class: 'flex items-center gap-3' }, [
          h('button', { type: 'button', class: 'flex-1 h-12 rounded-full bg-surface-container-high font-label-lg text-label-lg', text: 'Cancelar', onclick: close }),
          h('button', {
            type: 'button', class: 'flex-1 h-12 rounded-full bg-primary text-on-primary font-label-lg text-label-lg font-semibold',
            text: 'Confirmar', onclick: submit
          })
        ])
      ])
    ]);
    dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
    function close() { if (dialog.parentNode) dialog.parentNode.removeChild(dialog); }
    function submit() {
      error.textContent = ' ';
      var res = STORE.confirmPickup(reservation.listingId, input.value, currentUser().id);
      if (res.error) {
        error.textContent = res.error === 'code' ? 'Ese código no coincide con ninguna reserva pendiente.' : 'No pudimos confirmar el retiro.';
        return;
      }
      close();
      UI.toast('Retiro confirmado. +' + STORE.POINTS_PICKUP + ' puntos para ambos.', 'success');
      render();
    }
    document.body.appendChild(dialog);
    input.focus();
  }

  /* ---------- Barra inferior: reservar o volver ---------- */

  function renderBar(l, isOwner) {
    var bar = UI.$('#detail-bar');
    UI.clear(bar);

    if (isOwner) {
      bar.appendChild(h('div', { class: 'px-margin py-3 flex items-center gap-3' }, [
        h('a', { href: 'perfil.html', class: 'h-12 flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-surface-container-high text-on-surface font-label-lg text-label-lg' }, [
          icon('inventory_2', 20), 'Mis publicaciones'
        ]),
        h('a', { href: 'publicar.html?id=' + encodeURIComponent(l.id), class: 'h-12 flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-on-primary font-label-lg text-label-lg font-semibold shadow-md' }, [
          icon('edit', 20), 'Editar'
        ])
      ]));
      return;
    }

    var check = STORE.canReserve(l, currentUser().id);
    if (!check.ok) {
      bar.appendChild(h('div', { class: 'px-margin py-3 flex flex-col gap-1.5' }, [
        h('p', { class: 'font-body-sm text-body-sm text-on-surface-variant text-center', text: reasonText(l, check.reason) }),
        h('a', { href: 'feed.html', class: 'h-12 w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-surface-container-high text-on-surface font-label-lg text-label-lg' }, [
          icon('arrow_back', 20), 'Ver otras raciones'
        ])
      ]));
      return;
    }

    var max = STORE.maxReservable(l, currentUser().id);
    var value = h('span', { class: 'font-title-md text-title-md text-on-surface w-8 text-center', text: String(quantity) });

    function step(delta) {
      quantity = Math.min(max, Math.max(1, quantity + delta));
      value.textContent = String(quantity);
      minus.disabled = quantity <= 1;
      plus.disabled = quantity >= max;
    }
    var minus = h('button', {
      type: 'button', 'aria-label': 'Quitar una ración', disabled: max <= 1,
      class: 'w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform',
      onclick: function () { step(-1); }
    }, [icon('remove', 20)]);
    var plus = h('button', {
      type: 'button', 'aria-label': 'Añadir una ración', disabled: max <= 1,
      class: 'w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform',
      onclick: function () { step(1); }
    }, [icon('add', 20)]);

    bar.appendChild(h('div', { class: 'px-margin py-3 flex items-center gap-3' }, [
      h('div', { class: 'flex items-center gap-1.5 p-1 rounded-full bg-surface-container' }, [minus, value, plus]),
      h('button', {
        type: 'button',
        class: 'h-12 flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-secondary-container text-on-secondary-container font-label-lg text-label-lg font-semibold shadow-md active:scale-95 transition-transform',
        onclick: reserve
      }, ['Apartar gratis', icon('arrow_forward', 20)])
    ]));
  }

  function reasonText(l, reason) {
    if (reason === 'own') return 'Esta publicación es tuya. Gestiónala desde aquí o compártela con un vecino.';
    if (reason === 'role') return 'Tu cuenta de ' + CP.auth.roleLabel(currentUser().role).toLowerCase() + ' aparta y retira raciones. Para reservar, ingresa con un perfil de beneficiario.';
    if (reason === 'soldout') return 'Ya se agotaron todas las raciones. Revisa otras publicaciones cercanas.';
    if (reason === 'expired') return 'La ventana de retiro ya cerró.';
    if (reason === 'cancelled') return 'El publicador canceló esta entrega.';
    if (reason === 'early') return 'La publicación aún no abre. Vuelve a partir de ' + UI.fmtDayTime(l.startTime) + '.';
    if (reason === 'late') return 'La ventana de retiro ya cerró.';
    if (reason === 'limit') return 'Ya tienes el máximo permitido en esta publicación.';
    return 'No puedes reservar esta publicación.';
  }

  function reserve() {
    var l = listing();
    if (!l) return;
    UI.confirmModal({
      title: '¿Apartar ' + quantity + (quantity === 1 ? ' ración' : ' raciones') + '?',
      icon: 'volunteer_activism',
      body: 'Al retirar en ' + l.pickupAddress + ' entre ' + UI.fmtTime(l.startTime) + ' y ' + UI.fmtTime(l.endTime) +
        ' te damos un código para confirmar el retiro.',
      confirmText: 'Sí, apartar'
    }).then(function (ok) {
      if (!ok) return;
      var res = UI.withQuotaToast(function () { return STORE.createReservation(l.id, currentUser().id, quantity); });
      if (!res) return;
      if (res.error) {
        UI.toast(res.error === 'limit'
          ? 'Solo quedan ' + (res.ceiling - res.already) + ' ración(es) disponibles para ti.'
          : 'No pudimos completar la reserva.', 'error');
        render();
        return;
      }
      quantity = 1;
      UI.toast('Ración apartada. Tu código está en Reservas.', 'success', 'Ver código', function () {
        window.location.href = 'reservas.html';
      });
      render();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.ComParte = window.ComParte || {});
