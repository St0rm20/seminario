/* ComParte - Mapa: marcadores reales de Leaflet con lista sincronizada y fallback sin CDN. */
(function (CP) {
  'use strict';

  var STORE = CP.store, UI = CP.ui, h = UI.h, icon = UI.icon;

  var map = null;
  var markers = {};      // listingId -> { marker, el }
  var selectedId = null;
  var showUnavailable = false;
  var layer = null;

  function init() {
    if (!CP.auth.requireAuth()) return;
    UI.mount({ screen: 'map.html', navKey: 'mapa', onExpiry: refreshMarkers });
    UI.storageGuard();
    buildOverlay();

    if (typeof window.L === 'undefined') {
      renderFallback('No pudimos cargar el mapa', 'El servicio de mapas no está disponible. Revisa tu conexión o usa el listado.');
      return;
    }
    setupMap();
    refreshMarkers();
    document.addEventListener('comparte:zonechange', function () {
      if (!map) return;
      map.setView([UI.currentZone().lat, UI.currentZone().lng], 14);
      refreshMarkers();
    });
  }

  function setupMap() {
    var zone = UI.currentZone();
    map = window.L.map('cp-map', { zoomControl: false, attributionControl: true })
      .setView([zone.lat, zone.lng], 14);
    window.L.control.zoom({ position: 'bottomright' }).addTo(map);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 11,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    layer = window.L.layerGroup().addTo(map);

    /* Centrar de nuevo cuando el layout cambia de tamaño (rotación, barra del navegador). */
    window.setTimeout(function () { if (map) map.invalidateSize(); }, 250);
    window.addEventListener('resize', function () { if (map) map.invalidateSize(); });
  }

  function buildOverlay() {
    var host = UI.$('#map-overlay');
    UI.clear(host);
    var total = visibleListings().length;
    host.appendChild(h('div', { class: 'px-margin pt-2 flex items-start justify-between gap-2' }, [
      h('div', { class: 'inline-flex items-center gap-2 px-3 py-2 rounded-full bg-surface/95 backdrop-blur-sm shadow-md pointer-events-auto' }, [
        icon('near_me', 16, 'text-secondary'),
        h('button', {
          type: 'button',
          class: 'font-label-md text-label-md flex items-center gap-1',
          onclick: UI.openZonePicker
        }, [h('span', { id: 'cp-zone-label', text: UI.currentZone().label })]),
        h('span', { class: 'text-outline', text: '·' }),
        h('span', { class: 'font-label-md text-label-md text-primary font-semibold', text: total + (total === 1 ? ' cerca' : ' cerca') })
      ]),
      h('label', {
        class: 'inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface/95 backdrop-blur-sm shadow-md pointer-events-auto cursor-pointer'
      }, [
        h('input', {
          id: 'map-show-unavailable', type: 'checkbox', class: 'w-4 h-4 rounded accent-primary',
          onchange: function (e) { showUnavailable = e.target.checked; refreshMarkers(); }
        }),
        h('span', { class: 'font-label-sm text-label-sm text-on-surface', text: 'No disp.' })
      ])
    ]));
  }

  function visibleListings() {
    var user = CP.auth.currentUser();
    return STORE.listings().filter(function (l) {
      if (l.status === 'active') return true;
      if (l.status === 'soldout') return showUnavailable;
      if (l.ownerId === user.id) return true; // el dueno siempre ve las suyas
      return false;
    });
  }

  function refreshMarkers() {
    if (!map) return;
    layer.clearLayers();
    markers = {};
    selectedId = null;
    var items = visibleListings();
    var user = CP.auth.currentUser();
    var bounds = [];

    items.forEach(function (l) {
      var isMine = l.ownerId === user.id;
      var variant = isMine ? 'mine' : (l.status === 'active' ? 'active' : 'soldout');
      var cat = UI.categoryOf(l.category);
      var pin = h('div', {
        class: 'cp-pin cp-pin--' + variant,
        title: l.title
      }, [h('span', { 'aria-hidden': 'true', text: cat.icon })]);
      // Leaflet exige un icono con tamaño fijo: reutilizamos el nodo del popup como icono.
      var marker = window.L.marker([l.lat, l.lng], {
        icon: window.L.divIcon({ className: 'cp-marker', html: pin.outerHTML, iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -34] }),
        title: l.title,
        alt: l.title + ', ' + l.portionsLeft + ' raciones'
      });
      marker.on('click', function () { select(l.id, false); });
      marker.addTo(layer);
      markers[l.id] = { marker: marker, el: pin };
      bounds.push([l.lat, l.lng]);
    });

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
    var count = UI.$('#map-overlay .text-primary');
    if (count) count.textContent = items.length + (items.length === 1 ? ' cerca' : ' cerca');
    renderSheet(items[0] && items[0].id);
  }

  function select(listingId, pan) {
    selectedId = listingId;
    Object.keys(markers).forEach(function (id) {
      if (markers[id].el) markers[id].el.classList.toggle('is-selected', id === listingId);
    });
    var listing = STORE.getListing(listingId);
    if (pan && map && listing) map.panTo([listing.lat, listing.lng]);
    if (map && markers[listingId]) {
      markers[listingId].marker.openPopup();
    }
    renderSheet(listingId);
  }

  function renderSheet(listingId) {
    var host = UI.$('#map-sheet');
    if (!host) return;
    UI.clear(host);
    if (!listingId) {
      host.appendChild(h('p', {
        class: 'mx-margin p-3 rounded-xl bg-surface/95 backdrop-blur-sm shadow-md text-center font-body-sm text-body-sm text-on-surface-variant',
        text: 'Toca un marcador para ver el detalle.'
      }));
      return;
    }
    var listing = STORE.getListing(listingId);
    if (!listing) { host.appendChild(h('p', { class: 'mx-margin p-3 rounded-xl bg-surface/95 shadow-md text-center font-body-sm text-body-sm text-on-surface-variant', text: 'Esta publicación ya no está.' })); return; }

    var user = CP.auth.currentUser();
    var canReserve = STORE.canReserve(listing, user.id).ok;
    var action = listing.ownerId === user.id
      ? h('a', {
          href: 'detalle.html?id=' + encodeURIComponent(listing.id),
          class: 'h-10 px-4 inline-flex items-center rounded-full bg-surface-container-high text-on-surface font-label-md text-label-md shrink-0'
        }, 'Gestionar')
      : h('a', {
          href: 'detalle.html?id=' + encodeURIComponent(listing.id),
          class: 'h-10 px-4 inline-flex items-center rounded-full font-label-md text-label-md shrink-0 ' +
            (canReserve ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-highest text-on-surface-variant')
        }, canReserve ? 'Apartar gratis' : 'Ver detalle');

    host.appendChild(h('div', { class: 'mx-margin p-3 rounded-2xl bg-surface shadow-lg flex gap-3 items-center' }, [
      h('img', { class: 'w-14 h-14 rounded-lg object-cover shrink-0 bg-surface-container', alt: listing.title, src: UI.photoFor(listing) }),
      h('div', { class: 'flex flex-col min-w-0 flex-1' }, [
        h('span', { class: 'font-title-sm text-title-sm text-on-surface line-clamp-2', text: listing.title }),
        h('span', {
          class: 'font-body-sm text-body-sm text-on-surface-variant truncate',
          text: listing.portionsLeft + ' ración(es) · ' + UI.fmtDistance(UI.distanceTo(listing)) + ' · ' + UI.fmtCountdown(listing.endTime)
        })
      ]),
      action
    ]));
  }

  /* ---------- Fallback sin Leaflet ---------- */

  function renderFallback(title, body) {
    var host = UI.$('#map-fallback');
    host.classList.remove('hidden');
    host.classList.add('flex');
    UI.clear(host);
    host.appendChild(UI.stateBox('map', title, body,
      h('a', {
        href: 'feed.html',
        class: 'mt-1 h-11 px-5 inline-flex items-center rounded-full bg-primary text-on-primary font-label-md text-label-md',
        text: 'Ver en lista'
      })));
    UI.clear(UI.$('#map-overlay'));
    UI.clear(UI.$('#map-sheet'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.ComParte = window.ComParte || {});
