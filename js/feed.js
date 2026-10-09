/* ComParte - Inicio (feed): busqueda, filtros, orden y listado real. */
(function (CP) {
  'use strict';

  var STORE = CP.store, UI = CP.ui, h = UI.h, icon = UI.icon;

  var state = { query: '', category: 'all', sort: 'distance', showUnavailable: false };

  function init() {
    if (!CP.auth.requireAuth()) return;
    UI.mount({ screen: 'feed.html', navKey: 'inicio', onExpiry: render });
    UI.storageGuard();
    var root = UI.$('#feed-root');
    UI.clear(root);
    root.appendChild(buildGreeting());
    root.appendChild(buildSearchBar());
    root.appendChild(buildCategoryChips());
    root.appendChild(buildBanner());
    root.appendChild(buildList());
    root.appendChild(buildImpact());
    render();
    document.addEventListener('comparte:zonechange', render);
  }

  function buildGreeting() {
    var user = CP.auth.currentUser();
    var active = STORE.activeListings();
    var zone = UI.currentZone();
    var near = active.filter(function (l) {
      var km = UI.distanceTo(l);
      return km !== null && km <= 2;
    }).length;
    return h('section', { class: 'px-margin pt-2 pb-3 flex flex-col gap-space-xs' }, [
      h('div', { class: 'flex items-center justify-between' }, [
        h('div', { class: 'flex flex-col min-w-0' }, [
          h('div', { class: 'flex items-center gap-space-xs' }, [
            h('h1', { class: 'font-headline-sm text-headline-sm text-on-surface', text: '¡Hola, ' + firstName(user) + '!' }),
            h('span', { 'aria-hidden': 'true', class: 'text-xl select-none', text: '👋' })
          ]),
          h('p', { class: 'font-body-sm text-body-sm text-on-surface-variant mt-0.5 truncate', text: (user.businessName || user.name) + ' · ' + (user.address || 'Sin dirección') })
        ]),
        STORE.canPublish(user.id)
          ? h('a', {
              href: 'publicar.html',
              'aria-label': 'Publicar un excedente',
              class: 'w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center shadow-sm'
            }, [icon('add', 20)])
          : h('span', {
              class: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm'
            }, [icon('volunteer_activism', 16), CP.auth.roleLabel(user.role)])
      ]),
      h('div', { class: 'mt-1' }, [
        h('button', {
          type: 'button',
          class: 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant font-label-md text-label-md shadow-sm active:bg-surface-container-high transition-colors',
          onclick: UI.openZonePicker
        }, [
          icon('near_me', 16, 'text-secondary'),
          h('span', { id: 'cp-zone-label', text: zone.label + ', Bogotá' }),
          h('span', { class: 'text-outline font-normal', text: '·' }),
          h('span', { class: 'text-primary font-semibold', text: near + ' a menos de 2 km' }),
          icon('tune', 14, 'text-outline')
        ])
      ])
    ]);
  }

  function firstName(user) {
    if (!user) return 'vecino';
    return (user.name || 'vecino').split(/\s+/)[0];
  }

  function buildSearchBar() {
    var input = h('input', {
      id: 'feed-search', type: 'search',
      class: 'w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none',
      placeholder: 'Buscar pan, almuerzos, frutas…', 'aria-label': 'Buscar publicaciones'
    });
    input.addEventListener('input', function () {
      state.query = input.value;
      var clearBtn = UI.$('#feed-search-clear');
      if (clearBtn) clearBtn.classList.toggle('hidden', !state.query);
      renderList();
    });

    var sortSelect = h('select', {
      id: 'feed-sort', 'aria-label': 'Ordenar publicaciones',
      class: 'bg-surface-container-high text-on-surface font-label-md text-label-md rounded-lg px-2 py-1.5 border-0 focus:outline-none'
    }, [
      h('option', { value: 'distance', text: 'Más cercanas' }),
      h('option', { value: 'expiry', text: 'Vencen primero' })
    ]);
    sortSelect.value = state.sort;
    sortSelect.addEventListener('change', function () { state.sort = sortSelect.value; renderList(); });

    return h('section', { class: 'px-margin py-2 flex flex-col gap-space-sm' }, [
      h('div', { class: 'flex items-center gap-space-xs' }, [
        h('div', { class: 'flex-1 flex items-center h-[52px] px-4 rounded-xl bg-surface-container-high shadow-sm' }, [
          icon('search', 22, 'text-on-surface-variant mr-2.5'),
          input,
          h('button', {
            id: 'feed-search-clear', type: 'button', 'aria-label': 'Limpiar búsqueda',
            class: 'hidden w-8 h-8 rounded-full text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all items-center justify-center',
            onclick: function () { input.value = ''; state.query = ''; renderList(); }
          }, [icon('close', 18)])
        ])
      ]),
      h('div', { class: 'flex items-center justify-between mt-1 gap-2' }, [
        h('div', { class: 'inline-flex p-1 rounded-full bg-surface-container-high shadow-sm', role: 'group', 'aria-label': 'Cambiar de vista' }, [
          h('a', {
            href: 'feed.html', 'aria-current': 'page',
            class: 'flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-surface-container-lowest text-primary shadow-sm font-label-md text-label-md'
          }, [icon('view_agenda', 18), 'Lista']),
          h('a', {
            href: 'map.html',
            class: 'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-on-surface-variant font-label-md text-label-md'
          }, [icon('explore', 18), 'Mapa'])
        ]),
        sortSelect
      ])
    ]);
  }

  function buildCategoryChips() {
    return h('section', { id: 'feed-categories', class: 'py-2.5' }, [chipRow()]);
  }

  function chipRow() {
    var all = STORE.listings().filter(function (l) { return l.status === 'active'; });
    var counts = {};
    all.forEach(function (l) { counts[l.category] = (counts[l.category] || 0) + 1; });
    var row = h('div', { class: 'flex items-center gap-2 overflow-x-auto px-margin no-scrollbar' });

    row.appendChild(h('button', {
      type: 'button',
      'aria-pressed': state.category === 'all' ? 'true' : 'false',
      class: 'flex items-center gap-1.5 px-4 py-2 rounded-full font-label-md text-label-md shrink-0 shadow-sm active:scale-95 transition-transform ' +
        (state.category === 'all' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'),
      onclick: function () { state.category = 'all'; renderChips(); renderList(); }
    }, [
      state.category === 'all' ? icon('done', 16) : icon('apps', 16),
      h('span', { text: 'Todos (' + all.length + ')' })
    ]));

    STORE.CATEGORIES.forEach(function (c) {
      row.appendChild(h('button', {
        type: 'button',
        'aria-pressed': state.category === c.id ? 'true' : 'false',
        class: 'flex items-center gap-1.5 px-3.5 py-2 rounded-full font-label-md text-label-md shrink-0 shadow-sm active:scale-95 transition-transform ' +
          (state.category === c.id ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'),
        onclick: function () { state.category = c.id; renderChips(); renderList(); }
      }, [
        state.category === c.id ? icon('done', 16) : icon(c.icon, 16),
        h('span', { text: c.label + (counts[c.id] ? ' (' + counts[c.id] + ')' : '') })
      ]));
    });
    return row;
  }

  function renderChips() {
    var host = UI.$('#feed-categories');
    if (!host) return;
    UI.clear(host);
    host.appendChild(chipRow());
  }

  function buildBanner() {
    return h('div', { class: 'px-margin my-1', id: 'feed-banner' });
  }

  function renderBanner() {
    var host = UI.$('#feed-banner');
    if (!host) return;
    UI.clear(host);
    var soon = STORE.activeListings().filter(function (l) {
      var left = new Date(l.endTime).getTime() - Date.now();
      return left > 0 && left <= 90 * 60000;
    });
    if (!soon.length) return;
    host.appendChild(h('div', { class: 'flex items-start gap-3 p-3.5 rounded-xl bg-secondary-fixed text-on-secondary-fixed shadow-sm' }, [
      h('div', { class: 'flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-on-secondary shrink-0 mt-0.5' }, [icon('bolt', 18)]),
      h('div', { class: 'flex-1 min-w-0' }, [
        h('div', { class: 'flex items-center gap-1 font-label-md text-label-md font-bold text-on-secondary-fixed' }, [
          h('span', { text: soon.length + (soon.length === 1 ? ' publicación' : ' publicaciones') + ' por vencer' })
        ]),
        h('p', {
          class: 'font-body-sm text-body-sm text-on-secondary-fixed-variant leading-tight mt-0.5',
          text: 'Cierra su ventana de retiro dentro de la próxima hora y hora y media. Quien reserve primero se lleva las raciones.'
        })
      ])
    ]));
  }

  function buildList() {
    return h('section', { class: 'px-margin py-3 flex flex-col gap-4' }, [
      h('div', { class: 'flex items-center justify-between' }, [
        h('h2', { class: 'font-title-lg text-title-lg text-on-surface flex items-center gap-2' }, [
          h('span', { id: 'feed-list-title', text: 'Raciones cerca de ti' }),
          h('span', { class: 'w-2 h-2 rounded-full bg-primary inline-block animate-pulse' })
        ]),
        h('label', { class: 'inline-flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm cursor-pointer' }, [
          h('input', {
            id: 'feed-show-unavailable', type: 'checkbox',
            class: 'w-4 h-4 rounded accent-primary',
            onchange: function (e) { state.showUnavailable = e.target.checked; renderList(); }
          }),
          h('span', { text: 'Ver no disponibles' })
        ])
      ]),
      h('div', { id: 'feed-list', class: 'flex flex-col gap-4' })
    ]);
  }

  function matches(listing) {
    if (state.category !== 'all' && listing.category !== state.category) return false;
    var q = state.query.trim().toLowerCase();
    if (!q) return true;
    var owner = STORE.ownerOf(listing);
    var haystack = [listing.title, listing.description, listing.pickupAddress, STORE.displayName(owner), UI.categoryOf(listing.category).label]
      .join(' ').toLowerCase();
    return q.split(/\s+/).every(function (token) { return haystack.indexOf(token) !== -1; });
  }

  function renderList() {
    var host = UI.$('#feed-list');
    if (!host) return;
    var user = CP.auth.currentUser();
    UI.clear(host);

    var all = STORE.listings().filter(matches);
    var available = all.filter(function (l) { return l.status === 'active'; });
    var others = all.filter(function (l) { return l.status !== 'active'; });

    var zone = UI.currentZone();
    function sortFn(a, b) {
      if (state.sort === 'expiry') return new Date(a.endTime) - new Date(b.endTime);
      var da = UI.haversine(zone.lat, zone.lng, a.lat, a.lng);
      var db = UI.haversine(zone.lat, zone.lng, b.lat, b.lng);
      if (da === null) da = Infinity;
      if (db === null) db = Infinity;
      return da - db;
    }
    available.sort(sortFn);
    others.sort(function (a, b) { return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt); });

    var shown = available.concat(state.showUnavailable ? others : []);

    var titleNode = UI.$('#feed-list-title');
    if (titleNode) titleNode.textContent = available.length + (available.length === 1 ? ' publicación disponible' : ' publicaciones disponibles');

    if (!shown.length) {
      var hasFilter = state.query || state.category !== 'all';
      host.appendChild(hasFilter
        ? UI.emptyState('Sin coincidencias', 'Prueba con otra palabra o quita los filtros.', 'Quitar filtros', function () {
            state.query = ''; state.category = 'all';
            var s = UI.$('#feed-search'); if (s) s.value = '';
            var clearBtn = UI.$('#feed-search-clear'); if (clearBtn) clearBtn.classList.add('hidden');
            renderChips(); renderList();
          })
        : UI.emptyState('Ahora mismo no hay raciones aquí', 'Vuelve en un rato: tus vecinos publican lo que les sobra.'));
      return;
    }
    shown.forEach(function (l) { host.appendChild(UI.listingCard(l, { userId: user.id })); });
    if (!state.showUnavailable && others.length) {
      host.appendChild(h('p', {
        class: 'font-body-sm text-body-sm text-on-surface-variant text-center pt-1',
        text: others.length + (others.length === 1 ? ' publicación no disponible' : ' publicaciones no disponibles') + ' ocultas. Activa “Ver no disponibles” para verlas.'
      }));
    }
  }

  function buildImpact() {
    return h('footer', { class: 'px-margin pt-2 pb-6' }, [h('div', { id: 'feed-impact' })]);
  }

  function renderImpact() {
    var host = UI.$('#feed-impact');
    if (!host) return;
    UI.clear(host);
    var active = STORE.activeListings();
    var kg = 0, portions = 0, owners = {};
    active.forEach(function (l) { kg += l.weightKg; portions += l.portionsLeft; owners[l.ownerId] = true; });
    var co2 = STORE.co2(kg);
    var neighbors = Object.keys(owners).length;
    host.appendChild(h('div', { class: 'flex flex-col items-center text-center p-4 rounded-2xl bg-surface-container-low shadow-sm' }, [
      h('div', { class: 'flex items-center justify-center w-12 h-12 rounded-full bg-primary-fixed text-on-primary-fixed mb-2' }, [icon('compost', 26)]),
      h('p', { class: 'font-headline-sm text-headline-sm text-primary font-bold', text: UI.fmtKg(kg) + ' disponibles ahora' }),
      h('p', {
        class: 'font-body-md text-body-md text-on-surface-variant mt-1 max-w-[280px]',
        text: 'Son ' + portions + ' raciones de ' + neighbors + (neighbors === 1 ? ' vecino' : ' vecinos') + ' en ' +
          CP.Zones.label(UI.currentZone()) + '. Cada kilogramo equivale a unos ' + UI.fmtNumber(STORE.CO2_PER_KG) + ' kg de CO₂e evitados.'
      }),
      h('div', { class: 'mt-3 flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm opacity-80' }, [
        h('span', { text: 'ComParte · Datos de esta sesión, no acumulados reales' })
      ])
    ]));
  }

  function render() {
    renderBanner();
    renderList();
    renderImpact();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.ComParte = window.ComParte || {});
