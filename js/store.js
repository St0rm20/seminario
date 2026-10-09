/* ComParte - capa de datos sobre sessionStorage.
   Namespace global: window.ComParte. Sin modulos ES (file:// no los soporta).
   Clave unica: "comparte_v1". Al cerrar la pestaña se pierde y se vuelve a sembrar. */
(function (CP) {
  'use strict';

  var KEY = 'comparte_v1';
  var SCHEMA_VERSION = 2;
  var CO2_PER_KG = 2.5;
  var POINTS_PUBLISH = 50;
  var POINTS_PICKUP = 10;

  var ROLES = { DONOR: 'donor', BENEFICIARY: 'beneficiary' };

  var STATUS_LISTING = { ACTIVE: 'active', SOLDOUT: 'soldout', EXPIRED: 'expired', CANCELLED: 'cancelled' };
  var STATUS_RESERVATION = { RESERVED: 'reserved', PICKED_UP: 'picked_up', CANCELLED: 'cancelled', EXPIRED: 'expired' };

  var CATEGORIES = [
    { id: 'panaderia', label: 'Panadería', icon: 'bakery_dining', color: '#ff9244' },
    { id: 'platos-calientes', label: 'Platos calientes', icon: 'soup_kitchen', color: '#026a37' },
    { id: 'frutas-verduras', label: 'Frutas y verduras', icon: 'nutrition', color: '#2c844e' },
    { id: 'lacteos', label: 'Lácteos', icon: 'egg', color: '#8df9ac' },
    { id: 'bebidas', label: 'Bebidas', icon: 'local_cafe', color: '#984800' },
    { id: 'otros', label: 'Otros', icon: 'inventory_2', color: '#6e7a6f' }
  ];

  var ALLERGENS = ['Gluten', 'Lácteos', 'Huevo', 'Frutos secos', 'Soy', 'Sin gluten'];

  function StoreError(code, message) {
    this.name = 'StoreError';
    this.code = code;
    this.message = message;
  }
  StoreError.prototype = Object.create(Error.prototype);

  var memoryFallback = null; // cache en memoria para continuar si el almacenamiento falla
  var degraded = false;

  function backend() {
    if (degraded) return null;
    try {
      var probe = '__cp_probe__';
      window.sessionStorage.setItem(probe, '1');
      window.sessionStorage.removeItem(probe);
      return window.sessionStorage;
    } catch (err) {
      degraded = true;
      return null;
    }
  }

  function rawGet() {
    var s = backend();
    if (!s) return memoryFallback;
    try {
      var value = s.getItem(KEY);
      if (value !== null) memoryFallback = value;
      return value;
    } catch (err) {
      degraded = true;
      return memoryFallback;
    }
  }

  function rawSet(value) {
    var s = backend();
    if (!s) { memoryFallback = value; return; }
    try {
      s.setItem(KEY, value);
      memoryFallback = value;
    } catch (err) {
      degraded = true;
      memoryFallback = value;
    }
  }

  function rawRemove() {
    memoryFallback = null;
    try { window.sessionStorage.removeItem(KEY); } catch (err) { degraded = true; }
  }

  function emptyData() {
    return { schema: SCHEMA_VERSION, users: [], listings: [], reservations: [], notifications: [], session: { currentUserId: null }, selectedZone: null };
  }

  /* Migraciones simples: toleran datos escritos por una version anterior del MVP
     y reparan registros corruptos o manipulados a mano en sessionStorage. */
  function migrate(data) {
    if (!data || typeof data !== 'object') return null;
    var out = emptyData();
    out.schema = SCHEMA_VERSION;
    ['users', 'listings', 'reservations', 'notifications'].forEach(function (k) {
      out[k] = Array.isArray(data[k]) ? data[k] : [];
    });
    if (data.session && typeof data.session === 'object') out.session.currentUserId = str(data.session.currentUserId) || null;
    if (typeof data.selectedZone === 'string') out.selectedZone = data.selectedZone;
    if (typeof data.schema === 'number' && data.schema > SCHEMA_VERSION) return null; // written by a newer build
    out.users.forEach(function (u) {
      u.id = str(u.id) || uid('usr');
      u.name = str(u.name) || 'Vecino ComParte';
      u.email = str(u.email);
      u.phone = str(u.phone);
      u.address = str(u.address);
      u.businessName = str(u.businessName);
      u.password = str(u.password);
      u.zoneId = str(u.zoneId) || null;
      u.points = num(u.points);
      u.lat = num(u.lat);
      u.lng = num(u.lng);
      u.createdAt = iso(u.createdAt);
      /* Rol faltante o invalido: se conserva el rol explicito o se asume donante
         para no romper cuentas de la version sin roles. */
      u.role = (u.role === ROLES.DONOR || u.role === ROLES.BENEFICIARY) ? u.role : ROLES.DONOR;
    });
    out.listings.forEach(function (l) {
      l.id = str(l.id) || uid('lst');
      l.ownerId = str(l.ownerId) || '';
      l.title = str(l.title) || 'Publicación sin título';
      l.description = str(l.description);
      l.category = str(l.category);
      l.photo = str(l.photo);
      l.pickupAddress = str(l.pickupAddress);
      l.pickupNotes = str(l.pickupNotes);
      l.zoneId = str(l.zoneId) || null;
      l.allergens = (Array.isArray(l.allergens) ? l.allergens : []).map(str).filter(Boolean);
      l.portionsTotal = Math.floor(num(l.portionsTotal));
      l.portionsLeft = Math.floor(num(l.portionsLeft));
      l.weightKg = num(l.weightKg);
      l.maxPerPerson = Math.floor(num(l.maxPerPerson));
      l.status = STATUS_LISTING.hasOwnProperty(String(l.status).toUpperCase()) ? String(l.status) : STATUS_LISTING.ACTIVE;
      l.startTime = iso(l.startTime);
      l.endTime = iso(l.endTime) || l.startTime;
      l.needsFridge = !!l.needsFridge;
      l.consumeToday = l.consumeToday !== false;
      l.lat = num(l.lat);
      l.lng = num(l.lng);
      l.createdAt = iso(l.createdAt);
      l.updatedAt = iso(l.updatedAt) || l.createdAt;
    });
    out.reservations.forEach(function (r) {
      r.id = str(r.id) || uid('rsv');
      r.listingId = str(r.listingId) || '';
      r.userId = str(r.userId) || '';
      r.quantity = Math.max(1, Math.floor(num(r.quantity) || 1));
      r.code = str(r.code) || makeCode();
      r.status = STATUS_RESERVATION.hasOwnProperty(String(r.status).toUpperCase()) ? String(r.status) : STATUS_RESERVATION.RESERVED;
      r.createdAt = iso(r.createdAt);
    });
    out.notifications.forEach(function (n) {
      n.id = str(n.id) || uid('ntf');
      n.userId = str(n.userId) || '';
      n.type = str(n.type) || 'info';
      n.title = str(n.title);
      n.body = str(n.body);
      n.listingId = str(n.listingId) || null;
      n.reservationId = str(n.reservationId) || null;
      n.read = !!n.read;
      n.createdAt = iso(n.createdAt);
    });
    return out;
  }

  /* Helpers de saneamiento: null/NaN/boolean nunca llegan a la interfaz como texto o numero. */
  function str(v) { return typeof v === 'string' ? v : (v === null || v === undefined ? '' : String(v)); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function iso(v) {
    var d = new Date(v);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  var CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I,O,0,1 para evitar confusiones
  function makeCode() {
    var out = '';
    for (var i = 0; i < 6; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    return out;
  }

  function read() {
    var raw = rawGet();
    if (!raw) return null;
    var parsed;
    try { parsed = JSON.parse(raw); } catch (err) { return null; }
    return migrate(parsed);
  }

  function write(data) {
    rawSet(JSON.stringify(data));
    return data;
  }

  /* Reinicia el store completo con los datos demo del seed. */
  function reset() {
    rawRemove();
    if (CP.Seed && typeof CP.Seed.build === 'function') return CP.Seed.build();
    var data = emptyData();
    write(data);
    return data;
  }

  /* Lector con re-siembra automatica: nunca devuelve null tras el primer uso. */
  function ensure() {
    var data = read();
    if (!data) return reset();
    return data;
  }

  /* Lectura + escritura atomica: relee justo antes de escribir para evitar
     condiciones de carrera entre clics rapidos o pestanas distintas. */
  function mutate(fn) {
    var data = ensure();
    var result = fn(data);
    write(data);
    return result;
  }

  function listUsers() { return ensure().users; }
  function getUser(id) {
    if (!id) return null;
    var found = null;
    ensure().users.forEach(function (u) { if (u.id === id) found = u; });
    return found;
  }
  function findUserByEmail(email) {
    var needle = String(email || '').trim().toLowerCase();
    var found = null;
    ensure().users.forEach(function (u) { if (String(u.email).toLowerCase() === needle) found = u; });
    return found;
  }
  function createUser(data) {
    return mutate(function (state) {
      var user = {
        id: uid('usr'),
        name: String(data.name || '').trim(),
        email: String(data.email || '').trim().toLowerCase(),
        password: String(data.password || ''),
        phone: String(data.phone || '').trim(),
        address: String(data.address || '').trim(),
        lat: Number(data.lat) || 0,
        lng: Number(data.lng) || 0,
        zoneId: data.zoneId || null,
        businessName: data.businessName ? String(data.businessName).trim() : '',
        role: data.role === ROLES.BENEFICIARY ? ROLES.BENEFICIARY : ROLES.DONOR,
        points: 0,
        createdAt: new Date().toISOString()
      };
      state.users.push(user);
      state.session.currentUserId = user.id;
      return user;
    });
  }
  function updateUser(id, patch) {
    return mutate(function (state) {
      var user = null;
      state.users.forEach(function (u) { if (u.id === id) user = u; });
      if (!user) return null;
      Object.keys(patch).forEach(function (k) { user[k] = patch[k]; });
      return user;
    });
  }
  function addPoints(userId, delta) {
    if (!userId || !delta) return;
    mutate(function (state) {
      state.users.forEach(function (u) { if (u.id === userId) u.points = Math.max(0, (Number(u.points) || 0) + delta); });
    });
  }

  function listListings() { return ensure().listings; }
  function getListing(id) {
    if (!id) return null;
    var found = null;
    ensure().listings.forEach(function (l) { if (l.id === id) found = l; });
    return found;
  }
  function listingsByOwner(ownerId) {
    return ensure().listings.filter(function (l) { return l.ownerId === ownerId; })
      .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  }
  function activeListings() {
    return listListings().filter(function (l) { return l.status === STATUS_LISTING.ACTIVE; });
  }
  function isReservedNow(listing) {
    var now = Date.now();
    return new Date(listing.startTime).getTime() <= now && new Date(listing.endTime).getTime() > now;
  }
  function ownerOf(listing) { return getUser(listing ? listing.ownerId : null); }
  function displayName(user) {
    if (!user) return 'Comunidad ComParte';
    return user.businessName || user.name || 'Comunidad ComParte';
  }

  function listReservations() { return ensure().reservations; }
  function getReservation(id) {
    if (!id) return null;
    var found = null;
    ensure().reservations.forEach(function (r) { if (r.id === id) found = r; });
    return found;
  }
  function reservationsOfUser(userId) { return listReservations().filter(function (r) { return r.userId === userId; }); }
  function reservationsOfListing(listingId) { return listReservations().filter(function (r) { return r.listingId === listingId; }); }
  function reservedByUserOn(listingId, userId) {
    return reservedByUserOnFiltered(listingId, userId, function () { return true; });
  }
  function reservedByUserOnFiltered(listingId, userId, filter) {
    return reservationsOfListing(listingId)
      .filter(function (r) { return r.userId === userId && filter(r); })
      .reduce(function (acc, r) { return acc + r.quantity; }, 0);
  }
  function activeQuantityOn(listingId, userId) {
    return reservedByUserOnFiltered(listingId, userId, function (r) {
      return r.status === STATUS_RESERVATION.RESERVED;
    });
  }
  function activeReservationsOn(listingId) {
    return reservationsOfListing(listingId).filter(function (r) { return r.status === STATUS_RESERVATION.RESERVED; });
  }
  /* Maximo de raciones que este usuario puede pedir todavia en esta publicacion. */
  function maxReservable(listing, userId) {
    if (!listing) return 0;
    if (!isBeneficiary(userId)) return 0;
    var already = activeQuantityOn(listing.id, userId);
    var byStock = listing.portionsLeft;
    var byCap = listing.maxPerPerson > 0 ? Math.max(0, listing.maxPerPerson - already) : Infinity;
    return Math.max(0, Math.min(byStock, byCap, 99));
  }

  function notify(userId, type, title, body, refs) {
    if (!userId) return null;
    return mutate(function (state) {
      var n = {
        id: uid('ntf'),
        userId: userId,
        type: type,
        title: String(title || ''),
        body: String(body || ''),
        listingId: (refs && refs.listingId) || null,
        reservationId: (refs && refs.reservationId) || null,
        read: false,
        createdAt: new Date().toISOString()
      };
      state.notifications.push(n);
      return n;
    });
  }

  function listNotifications(userId) {
    if (!userId) return [];
    return ensure().notifications
      .filter(function (n) { return n.userId === userId; })
      .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  }
  function unreadCount(userId) {
    if (!userId) return 0;
    return ensure().notifications.filter(function (n) { return n.userId === userId && !n.read; }).length;
  }
  function markRead(id, userId) {
    return mutate(function (state) {
      var hit = null;
      state.notifications.forEach(function (n) {
        if (n.id === id && (!userId || n.userId === userId)) { n.read = true; hit = n; }
      });
      return hit;
    });
  }
  function markAllRead(userId) {
    return mutate(function (state) {
      var count = 0;
      state.notifications.forEach(function (n) { if (n.userId === userId && !n.read) { n.read = true; count++; } });
      return count;
    });
  }

  /* ---------- Reglas de negocio: publicar / editar ---------- */

  function canEdit(listing, userId) { return !!listing && !!userId && listing.ownerId === userId; }

  /* Solo las cuentas donantes publican, editan o gestionan publicaciones.
     Se valida en la logica, no solo ocultando botones: lanza un StoreError. */
  function requireDonor(userId) {
    var user = null;
    ensure().users.forEach(function (u) { if (u.id === userId) user = u; });
    if (!user) throw new StoreError('auth', 'Inicia sesión para publicar.');
    if (user.role !== ROLES.DONOR) {
      throw new StoreError('role', 'Solo las cuentas donantes pueden publicar.');
    }
    return user;
  }

  /* Solo las cuentas beneficiarias reservan, retiran y cancelan reservas. */
  function isBeneficiary(userId) {
    var user = null;
    ensure().users.forEach(function (u) { if (u.id === userId) user = u; });
    return !!(user && user.role === ROLES.BENEFICIARY);
  }

  function requireBeneficiary(userId) {
    if (!isBeneficiary(userId)) throw new StoreError('role', 'Solo las cuentas beneficiarias reservan.');
    return true;
  }

  function validateListingDraft(draft, userId, existing) {
    var errors = [];
    var title = String(draft.title || '').trim();
    if (title.length < 3) errors.push({ field: 'title', message: 'Ponle un titulo de al menos 3 caracteres.' });
    if (title.length > 90) errors.push({ field: 'title', message: 'El titulo no puede pasar de 90 caracteres.' });
    if (!CATEGORIES.some(function (c) { return c.id === draft.category; })) {
      errors.push({ field: 'category', message: 'Elige una categoria.' });
    }
    var portions = Number(draft.portionsTotal);
    if (!isFinite(portions) || Math.floor(portions) !== portions || portions < 1 || portions > 99) {
      errors.push({ field: 'portionsTotal', message: 'Las raciones deben ser un numero entre 1 y 99.' });
    }
    var weight = Number(draft.weightKg);
    if (!isFinite(weight) || weight <= 0 || weight > 500) {
      errors.push({ field: 'weightKg', message: 'Escribe el peso en kg (entre 0.1 y 500).' });
    }
    var maxPer = Number(draft.maxPerPerson) || 0;
    if (maxPer < 0 || maxPer > portions) {
      errors.push({ field: 'maxPerPerson', message: 'El maximo por persona debe estar entre 1 y el total de raciones (o 0 = sin limite).' });
    }
    var start = new Date(draft.startTime).getTime();
    var end = new Date(draft.endTime).getTime();
    if (!isFinite(start) || !isFinite(end)) {
      errors.push({ field: 'endTime', message: 'Revisa la hora de inicio y de cierre.' });
    } else {
      if (end <= start) errors.push({ field: 'endTime', message: 'La hora de cierre debe ser posterior a la de inicio.' });
      if (end <= Date.now()) errors.push({ field: 'endTime', message: 'La hora de cierre ya paso. Elige un momento futuro.' });
      if (end - start > 1000 * 60 * 60 * 24) errors.push({ field: 'endTime', message: 'La ventana de retiro no puede superar 24 horas.' });
    }
    if (!draft.safetyConfirmed) errors.push({ field: 'safety', message: 'Confirma el compromiso de inocuidad para publicar.' });
    if (!String(draft.pickupAddress || '').trim()) errors.push({ field: 'pickupAddress', message: 'Indica donde se recoge el alimento.' });

    if (existing && !canEdit(existing, userId)) {
      errors.push({ field: 'ownership', message: 'Solo puedes editar tus propias publicaciones.' });
    }
    if (existing && errors.length === 0) {
      var reserved = activeReservationsOn(existing.id).reduce(function (a, r) { return a + r.quantity; }, 0);
      if (portions < reserved) {
        errors.push({ field: 'portionsTotal', message: 'Hay ' + reserved + ' raciones ya reservadas: no puedes bajar de ese numero.' });
      }
    }
    return errors;
  }

  function normalizeListingDraft(draft, user) {
    var start = new Date(draft.startTime).getTime();
    var end = new Date(draft.endTime).getTime();
    return {
      title: String(draft.title || '').trim(),
      description: String(draft.description || '').trim(),
      category: draft.category,
      photo: draft.photo || '',
      portionsTotal: Math.floor(Number(draft.portionsTotal)),
      weightKg: Math.round(Number(draft.weightKg) * 10) / 10,
      maxPerPerson: Math.floor(Number(draft.maxPerPerson) || 0),
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      allergens: Array.isArray(draft.allergens) ? draft.allergens.slice() : [],
      needsFridge: !!draft.needsFridge,
      consumeToday: draft.consumeToday !== false,
      pickupAddress: String(draft.pickupAddress || '').trim(),
      pickupNotes: String(draft.pickupNotes || '').trim(),
      lat: Number(draft.lat) || (user ? Number(user.lat) : 0) || 0,
      lng: Number(draft.lng) || (user ? Number(user.lng) : 0) || 0,
      zoneId: draft.zoneId || (user ? user.zoneId : null) || null
    };
  }

  function createListing(draft, userId) {
    requireDonor(userId);
    return mutate(function (state) {
      var user = null;
      state.users.forEach(function (u) { if (u.id === userId) user = u; });
      if (!user || user.role !== ROLES.DONOR) {
        throw new StoreError('role', 'Solo las cuentas donantes pueden publicar.');
      }
      var now = new Date().toISOString();
      var base = normalizeListingDraft(draft, user);
      var listing = {
        id: uid('lst'),
        ownerId: userId,
        title: base.title,
        description: base.description,
        category: base.category,
        photo: base.photo,
        portionsTotal: base.portionsTotal,
        portionsLeft: base.portionsTotal,
        weightKg: base.weightKg,
        maxPerPerson: base.maxPerPerson,
        startTime: base.startTime,
        endTime: base.endTime,
        allergens: base.allergens,
        needsFridge: base.needsFridge,
        consumeToday: base.consumeToday,
        pickupAddress: base.pickupAddress,
        pickupNotes: base.pickupNotes,
        lat: base.lat,
        lng: base.lng,
        zoneId: base.zoneId,
        status: STATUS_LISTING.ACTIVE,
        createdAt: now,
        updatedAt: now
      };
      state.listings.push(listing);
      state.users.forEach(function (u) { if (u.id === userId) u.points = (Number(u.points) || 0) + POINTS_PUBLISH; });
      state.notifications.push({
        id: uid('ntf'), userId: userId, type: 'listing_published',
        title: 'Publicaste ' + base.title,
        body: 'Tus raciones ya estan visibles en Inicio y en el mapa. Te avisamos cuando alguien reserve.',
        listingId: listing.id, reservationId: null, read: false, createdAt: now
      });
      return listing;
    });
  }

  function updateListing(id, draft, userId) {
    requireDonor(userId);
    return mutate(function (state) {
      var listing = null;
      state.listings.forEach(function (l) { if (l.id === id) listing = l; });
      if (!listing || listing.ownerId !== userId) return { error: 'forbidden' };
      var user = null;
      state.users.forEach(function (u) { if (u.id === userId) user = u; });
      var base = normalizeListingDraft(draft, user);
      var reserved = 0;
      state.reservations.forEach(function (r) {
        if (r.listingId === id && r.status === STATUS_RESERVATION.RESERVED) reserved += r.quantity;
      });
      listing.title = base.title;
      listing.description = base.description;
      listing.category = base.category;
      if (base.photo) listing.photo = base.photo;
      listing.portionsTotal = base.portionsTotal;
      listing.portionsLeft = Math.max(0, base.portionsTotal - reserved);
      listing.weightKg = base.weightKg;
      listing.maxPerPerson = base.maxPerPerson;
      listing.startTime = base.startTime;
      listing.endTime = base.endTime;
      listing.allergens = base.allergens;
      listing.needsFridge = base.needsFridge;
      listing.consumeToday = base.consumeToday;
      listing.pickupAddress = base.pickupAddress;
      listing.pickupNotes = base.pickupNotes;
      listing.lat = base.lat;
      listing.lng = base.lng;
      listing.zoneId = base.zoneId;
      if (listing.portionsLeft > 0 && listing.status === STATUS_LISTING.SOLDOUT) listing.status = STATUS_LISTING.ACTIVE;
      listing.updatedAt = new Date().toISOString();
      return { listing: listing };
    });
  }

  /* ---------- Acciones del propietario ---------- */

  function markSoldout(id, userId) {
    requireDonor(userId);
    return mutate(function (state) {
      var listing = null;
      var pending = 0;
      state.listings.forEach(function (l) { if (l.id === id) listing = l; });
      if (!listing || listing.ownerId !== userId) return { error: 'forbidden' };
      listing.status = STATUS_LISTING.SOLDOUT;
      listing.portionsLeft = 0;
      listing.updatedAt = new Date().toISOString();
      state.reservations.forEach(function (r) {
        if (r.listingId === id && r.status === STATUS_RESERVATION.RESERVED) pending++;
      });
      return { listing: listing, pending: pending };
    });
  }

  function markExpired(id, userId) {
    requireDonor(userId);
    return mutate(function (state) {
      var listing = null;
      state.listings.forEach(function (l) { if (l.id === id) listing = l; });
      if (!listing || listing.ownerId !== userId) return { error: 'forbidden' };
      listing.status = STATUS_LISTING.EXPIRED;
      listing.updatedAt = new Date().toISOString();
      var affected = [];
      state.reservations.forEach(function (r) {
        if (r.listingId === id && r.status === STATUS_RESERVATION.RESERVED) {
          r.status = STATUS_RESERVATION.EXPIRED;
          affected.push(r);
        }
      });
      affected.forEach(function (r) {
        state.notifications.push({
          id: uid('ntf'), userId: r.userId, type: 'reservation_expired',
          title: 'Ya no puedes retirar ' + listing.title,
          body: 'El publicador cerro esta entrega antes de tiempo. Tu reserva quedo anulada.',
          listingId: listing.id, reservationId: r.id, read: false, createdAt: new Date().toISOString()
        });
      });
      return { listing: listing, expired: affected.length };
    });
  }

  function reactivate(id, userId, extraPortions) {
    requireDonor(userId);
    return mutate(function (state) {
      var listing = null;
      state.listings.forEach(function (l) { if (l.id === id) listing = l; });
      if (!listing || listing.ownerId !== userId) return { error: 'forbidden' };
      if (new Date(listing.endTime).getTime() <= Date.now()) {
        return { error: 'past' };
      }
      if (listing.status === STATUS_LISTING.CANCELLED) return { error: 'cancelled' };
      var reserved = 0;
      state.reservations.forEach(function (r) { if (r.listingId === id && r.status === STATUS_RESERVATION.RESERVED) reserved += r.quantity; });
      var add = Math.max(0, Math.floor(Number(extraPortions) || 0));
      listing.portionsTotal = reserved + add;
      listing.portionsLeft = add;
      listing.status = add > 0 ? STATUS_LISTING.ACTIVE : listing.status;
      listing.updatedAt = new Date().toISOString();
      return { listing: listing, added: add };
    });
  }

  function cancelListing(id, userId) {
    requireDonor(userId);
    return mutate(function (state) {
      var listing = null;
      state.listings.forEach(function (l) { if (l.id === id) listing = l; });
      if (!listing || listing.ownerId !== userId) return { error: 'forbidden' };
      listing.status = STATUS_LISTING.CANCELLED;
      listing.portionsLeft = 0;
      listing.updatedAt = new Date().toISOString();
      var affected = [];
      state.reservations.forEach(function (r) {
        if (r.listingId === id && r.status === STATUS_RESERVATION.RESERVED) {
          r.status = STATUS_RESERVATION.CANCELLED;
          affected.push(r);
        }
      });
      affected.forEach(function (r) {
        state.notifications.push({
          id: uid('ntf'), userId: r.userId, type: 'reservation_cancelled',
          title: 'Se cancelo ' + listing.title,
          body: 'El publicador cancelo esta entrega. Ya no tienes que retirarla.',
          listingId: listing.id, reservationId: r.id, read: false, createdAt: new Date().toISOString()
        });
      });
      return { listing: listing, cancelled: affected.length };
    });
  }

  /* Confirma el retiro con el codigo que muestra el receptor. */
  function confirmPickup(listingId, code, ownerId) {
    requireDonor(ownerId);
    var needle = String(code || '').trim().toUpperCase();
    if (needle.length !== 6) return { error: 'code' };
    return mutate(function (state) {
      var listing = null;
      state.listings.forEach(function (l) { if (l.id === listingId) listing = l; });
      if (!listing || listing.ownerId !== ownerId) return { error: 'forbidden' };
      var match = null;
      state.reservations.forEach(function (r) {
        if (r.listingId === listingId && r.status === STATUS_RESERVATION.RESERVED && String(r.code).toUpperCase() === needle) match = r;
      });
      if (!match) return { error: 'code' };
      match.status = STATUS_RESERVATION.PICKED_UP;
      var now = new Date().toISOString();
      match.pickedUpAt = now;
      state.users.forEach(function (u) {
        if (u.id === match.userId || u.id === ownerId) u.points = (Number(u.points) || 0) + POINTS_PICKUP;
      });
      state.notifications.push({
        id: uid('ntf'), userId: match.userId, type: 'pickup_confirmed',
        title: 'Retiro confirmado',
        body: 'Entregaste ' + match.quantity + ' racion(es) de ' + listing.title + '. Sumaste ' + POINTS_PICKUP + ' puntos.',
        listingId: listing.id, reservationId: match.id, read: false, createdAt: now
      });
      if (listing.portionsLeft <= 0 && listing.status === STATUS_LISTING.ACTIVE) {
        listing.status = STATUS_LISTING.SOLDOUT;
      }
      return { listing: listing, reservation: match };
    });
  }

  /* ---------- Reservas ---------- */

  function canReserve(listing, userId) {
    if (!listing) return { ok: false, reason: 'missing' };
    if (!userId) return { ok: false, reason: 'auth' };
    if (listing.ownerId === userId) return { ok: false, reason: 'own' };
    if (!isBeneficiary(userId)) return { ok: false, reason: 'role' };
    if (listing.status !== STATUS_LISTING.ACTIVE) return { ok: false, reason: listing.status };
    var now = Date.now();
    if (now < new Date(listing.startTime).getTime()) return { ok: false, reason: 'early' };
    if (now >= new Date(listing.endTime).getTime()) return { ok: false, reason: 'late' };
    if (maxReservable(listing, userId) < 1) return { ok: false, reason: 'limit' };
    return { ok: true };
  }

  function createReservation(listingId, userId, quantity) {
    var qty = Math.floor(Number(quantity) || 0);
    if (!isBeneficiary(userId)) return { error: 'role' };
    return mutate(function (state) {
      var listing = null;
      state.listings.forEach(function (l) { if (l.id === listingId) listing = l; });
      if (!listing) return { error: 'missing' };
      if (listing.ownerId === userId) return { error: 'own' };
      if (listing.status !== STATUS_LISTING.ACTIVE) return { error: listing.status };
      var now = Date.now();
      if (now < new Date(listing.startTime).getTime()) return { error: 'early' };
      if (now >= new Date(listing.endTime).getTime()) return { error: 'late' };
      var already = 0;
      state.reservations.forEach(function (r) {
        if (r.listingId === listingId && r.userId === userId && r.status === STATUS_RESERVATION.RESERVED) already += r.quantity;
      });
      var ceiling = Math.min(
        listing.portionsLeft,
        listing.maxPerPerson > 0 ? listing.maxPerPerson - already : Infinity,
        99
      );
      if (qty < 1 || qty > ceiling) return { error: 'limit', ceiling: Math.max(0, ceiling), already: already };
      listing.portionsLeft -= qty;
      var reservation = {
        id: uid('rsv'),
        listingId: listingId,
        userId: userId,
        quantity: qty,
        code: makeCode(),
        status: STATUS_RESERVATION.RESERVED,
        createdAt: new Date().toISOString()
      };
      state.reservations.push(reservation);
      state.notifications.push({
        id: uid('ntf'), userId: listing.ownerId, type: 'reservation_created',
        title: 'Nueva reserva en ' + listing.title,
        body: 'Reservaron ' + qty + ' racion(es). Codigo ' + reservation.code + '. Quedan ' + listing.portionsLeft + '.',
        listingId: listingId, reservationId: reservation.id, read: false, createdAt: reservation.createdAt
      });
      if (listing.portionsLeft <= 0) {
        listing.status = STATUS_LISTING.SOLDOUT;
        state.listings.forEach(function (l) {
          if (l.id === listingId) l.updatedAt = reservation.createdAt;
        });
      }
      return { reservation: reservation, listing: listing, soldOut: listing.status === STATUS_LISTING.SOLDOUT };
    });
  }

  function cancelReservation(reservationId, userId) {
    if (!isBeneficiary(userId)) return { error: 'role' };
    return mutate(function (state) {
      var reservation = null;
      state.reservations.forEach(function (r) { if (r.id === reservationId) reservation = r; });
      if (!reservation) return { error: 'missing' };
      if (reservation.userId !== userId) return { error: 'forbidden' };
      if (reservation.status !== STATUS_RESERVATION.RESERVED) return { error: reservation.status };
      reservation.status = STATUS_RESERVATION.CANCELLED;
      var listing = null;
      state.listings.forEach(function (l) { if (l.id === reservation.listingId) listing = l; });
      if (listing) {
        listing.portionsLeft = Math.min(listing.portionsTotal, listing.portionsLeft + reservation.quantity);
        if (listing.status === STATUS_LISTING.SOLDOUT && listing.portionsLeft > 0 && new Date(listing.endTime).getTime() > Date.now()) {
          listing.status = STATUS_LISTING.ACTIVE;
        }
        listing.updatedAt = new Date().toISOString();
        state.notifications.push({
          id: uid('ntf'), userId: listing.ownerId, type: 'reservation_cancelled',
          title: 'Liberaron raciones en ' + listing.title,
          body: reservation.quantity + ' racion(es) volvieron al stock. Ya quedan ' + listing.portionsLeft + ' disponibles.',
          listingId: listing.id, reservationId: reservation.id, read: false, createdAt: new Date().toISOString()
        });
      }
      return { reservation: reservation, listing: listing };
    });
  }

  /* ---------- Vencimiento automatico ---------- */

  /* Se ejecuta al cargar cada pantalla y cada 30 s.
     Devuelve el numero de publicaciones y reservas que cambiaron de estado. */
  function runExpiry() {
    var changes = { listings: 0, reservations: 0 };
    try {
      var data = read();
      if (!data) return changes;
      var now = Date.now();
      var nowIso = new Date().toISOString();
      data.listings.forEach(function (listing) {
        if (listing.status === STATUS_LISTING.ACTIVE) {
          if (new Date(listing.endTime).getTime() < now) {
            listing.status = STATUS_LISTING.EXPIRED;
            listing.updatedAt = nowIso;
            changes.listings++;
          } else if (listing.portionsLeft <= 0) {
            listing.status = STATUS_LISTING.SOLDOUT;
            listing.updatedAt = nowIso;
            changes.listings++;
          }
        }
        if (listing.status === STATUS_LISTING.SOLDOUT && listing.portionsLeft > 0 && new Date(listing.endTime).getTime() > now) {
          listing.status = STATUS_LISTING.ACTIVE;
          listing.updatedAt = nowIso;
        }
        data.reservations.forEach(function (r) {
          if (r.listingId === listing.id && r.status === STATUS_RESERVATION.RESERVED) {
            if (listing.status === STATUS_LISTING.EXPIRED) {
              r.status = STATUS_RESERVATION.EXPIRED;
              changes.reservations++;
              data.notifications.push({
                id: uid('ntf'), userId: r.userId, type: 'reservation_expired',
                title: 'Se te paso la hora de ' + listing.title,
                body: 'La ventana de retiro cerro. Tu reserva quedo anulada.',
                listingId: listing.id, reservationId: r.id, read: false, createdAt: nowIso
              });
            } else if (listing.status === STATUS_LISTING.CANCELLED) {
              r.status = STATUS_RESERVATION.CANCELLED;
              changes.reservations++;
            }
          }
        });
      });
      if (changes.listings || changes.reservations) write(data);
    } catch (err) {
      // Si el store esta corrupto o lleno, runExpiry no debe romper la pantalla.
      if (err && err.code === 'quota') rawRemove();
    }
    return changes;
  }

  /* ---------- Sesion y zona seleccionada ---------- */

  function currentUserId() {
    var data = ensure();
    return data.session.currentUserId || null;
  }
  function setSession(userId) {
    mutate(function (state) { state.session.currentUserId = userId || null; });
  }
  function selectedZone() { return ensure().selectedZone || null; }
  function setSelectedZone(zoneId) {
    mutate(function (state) { state.selectedZone = zoneId || null; });
  }

  /* ---------- Metricas de impacto ---------- */
  function co2(weightKg) { return Math.round((Number(weightKg) || 0) * CO2_PER_KG * 10) / 10; }
  function userStats(userId) {
    var published = listingsByOwner(userId);
    var received = reservationsOfUser(userId);
    var mine = 0;
    published.forEach(function (l) { mine += l.weightKg; });
    var picked = 0;
    received.forEach(function (r) { if (r.status === STATUS_RESERVATION.PICKED_UP) picked += r.quantity; });
    var given = 0;
    published.forEach(function (l) {
      reservationsOfListing(l.id).forEach(function (r) { if (r.status === STATUS_RESERVATION.PICKED_UP) given += r.quantity; });
    });
    return {
      publishedCount: published.length,
      activeCount: published.filter(function (l) { return l.status === STATUS_LISTING.ACTIVE; }).length,
      kgShared: Math.round(mine * 10) / 10,
      kgReceived: Math.round((received.filter(function (r) { return r.status === STATUS_RESERVATION.PICKED_UP; })
        .reduce(function (a, r) { return a + r.quantity; }, 0)) * 0.3 * 10) / 10,
      portionsGiven: given,
      portionsReceived: picked,
      co2: co2(mine)
    };
  }

  function canPublish(userId) {
    var user = null;
    ensure().users.forEach(function (u) { if (u.id === userId) user = u; });
    return !!(user && user.role === ROLES.DONOR);
  }

  CP.store = {
    KEY: KEY,
    CO2_PER_KG: CO2_PER_KG,
    POINTS_PUBLISH: POINTS_PUBLISH,
    POINTS_PICKUP: POINTS_PICKUP,
    StoreError: StoreError,
    STATUS_LISTING: STATUS_LISTING,
    STATUS_RESERVATION: STATUS_RESERVATION,
    ROLES: ROLES,
    CATEGORIES: CATEGORIES,
    ALLERGENS: ALLERGENS,
    isDegraded: function () { return degraded; },
    emptyData: emptyData,
    ensure: ensure,
    read: read,
    write: write,
    reset: reset,
    mutate: mutate,
    uid: uid,
    makeCode: makeCode,
    co2: co2,
    canPublish: canPublish,
    users: listUsers,
    getUser: getUser,
    findUserByEmail: findUserByEmail,
    createUser: createUser,
    updateUser: updateUser,
    addPoints: addPoints,
    userStats: userStats,
    listings: listListings,
    getListing: getListing,
    listingsByOwner: listingsByOwner,
    activeListings: activeListings,
    isReservedNow: isReservedNow,
    ownerOf: ownerOf,
    displayName: displayName,
    validateListingDraft: validateListingDraft,
    canEdit: canEdit,
    createListing: createListing,
    updateListing: updateListing,
    markSoldout: markSoldout,
    markExpired: markExpired,
    reactivate: reactivate,
    cancelListing: cancelListing,
    confirmPickup: confirmPickup,
    reservations: listReservations,
    getReservation: getReservation,
    reservationsOfUser: reservationsOfUser,
    reservationsOfListing: reservationsOfListing,
    activeReservationsOn: activeReservationsOn,
    activeQuantityOn: activeQuantityOn,
    reservedByUserOn: reservedByUserOn,
    maxReservable: maxReservable,
    canReserve: canReserve,
    createReservation: createReservation,
    cancelReservation: cancelReservation,
    notifications: listNotifications,
    unreadCount: unreadCount,
    markRead: markRead,
    markAllRead: markAllRead,
    notify: notify,
    runExpiry: runExpiry,
    currentUserId: currentUserId,
    setSession: setSession,
    selectedZone: selectedZone,
    setSelectedZone: setSelectedZone
  };
})(window.ComParte = window.ComParte || {});
