/* ComParte - datos demo y datos de referencia.
   Todo lo que el prototipo tenia hardcodeado (negocios, fotos, metricas inventadas)
   vive aqui y unicamente aqui. El resto de pantallas lo lee de store.js.
   Las zonas viven en js/zones.js y las imagenes en js/images.js: aqui solo se usan. */
(function (CP) {
  'use strict';

  var STORE = CP.store;
  var ZONES = CP.Zones.ZONES;
  var IMAGES = CP.Images.IMAGES;

  function zoneById(id) { return CP.Zones.byId(id); }
  function zoneByCoords(lat, lng) { return CP.Zones.byCoords(lat, lng); }

  /* Imagenes de marca y de ejemplo. Rutas estables en assets/img/. */
  var ASSETS = {
    logo: IMAGES.logo,
    splash: IMAGES.logo,
    registerComunidad: IMAGES.comunidad,
    panSweet: IMAGES.mogollas,
    frutas: IMAGES.canasta,
    ajiaco: IMAGES.ajiaco,
    lentejas: IMAGES.lentejas,
    lacteos: IMAGES.lacteos,
    bebidas: IMAGES.bebidas,
    arepas: IMAGES.arepas,
    panela: IMAGES.panela
  };

  function at(minutesFromNow) {
    return new Date(Date.now() + minutesFromNow * 60000).toISOString();
  }
  function ago(minutes) { return new Date(Date.now() - minutes * 60000).toISOString(); }

  var DEMO_PASSWORD = '1234';

  function build() {
    var data = STORE.emptyData();
    var now = new Date().toISOString();

    var ana = {
      id: 'usr_ana', name: 'Ana Ramírez', email: 'ana@demo.com', password: DEMO_PASSWORD,
      role: 'donor', phone: '310 555 0142', address: 'Cra. 14 # 20-30, Armenia, Quindío',
      lat: 4.5339, lng: -75.6811, zoneId: 'armenia-centro',
      businessName: 'Panadería La Candelaria', points: 200, createdAt: ago(60 * 24 * 40)
    };
    var carlos = {
      id: 'usr_carlos', name: 'Carlos Mendoza', email: 'carlos@demo.com', password: DEMO_PASSWORD,
      role: 'beneficiary', phone: '320 555 0198', address: 'Cra. 12 # 6N-40, Armenia, Quindío',
      lat: 4.5560, lng: -75.6700, zoneId: 'armenia-norte',
      businessName: '', points: 0, createdAt: ago(60 * 24 * 25)
    };
    var lucia = {
      id: 'usr_lucia', name: 'Lucía Restrepo', email: 'lucia@demo.com', password: DEMO_PASSWORD,
      role: 'donor', phone: '301 555 0177', address: 'Cll. 7 # 9-05, Calarcá, Quindío',
      lat: 4.5290, lng: -75.6430, zoneId: 'calarca-centro',
      businessName: 'Comedor Comunitario Manos Amigas', points: 200, createdAt: ago(60 * 24 * 90)
    };
    data.users = [ana, carlos, lucia];

    function listing(o) {
      var l = {
        id: o.id, ownerId: o.ownerId, title: o.title, description: o.description,
        category: o.category, photo: o.photo || '',
        portionsTotal: o.portionsTotal, portionsLeft: o.portionsLeft === undefined ? o.portionsTotal : o.portionsLeft,
        weightKg: o.weightKg, maxPerPerson: o.maxPerPerson || 0,
        startTime: o.start, endTime: o.end,
        allergens: o.allergens || [], needsFridge: !!o.needsFridge, consumeToday: o.consumeToday !== false,
        pickupAddress: o.pickupAddress, pickupNotes: o.pickupNotes || '',
        lat: o.lat, lng: o.lng, zoneId: o.zoneId,
        status: o.status || 'active',
        createdAt: o.createdAt || now, updatedAt: o.createdAt || now
      };
      return l;
    }

    /* Zonas de referencia para cada municipio del Quindio. */
    var z = {
      armeniaCentro: CP.Zones.byId('armenia-centro'),
      armeniaNorte: CP.Zones.byId('armenia-norte'),
      calarcaCentro: CP.Zones.byId('calarca-centro'),
      calarcaSur: CP.Zones.byId('calarca-sur'),
      montenegroCentro: CP.Zones.byId('montenegro-centro'),
      quimbayaCentro: CP.Zones.byId('quimbaya-centro'),
      circasiaCentro: CP.Zones.byId('circasia-centro'),
      salentoCocora: CP.Zones.byId('salento-cocora')
    };

    data.listings = [
      listing({
        id: 'lst_mogollas', ownerId: ana.id, category: 'panaderia', photo: ASSETS.panSweet,
        title: 'Mogollas y trenzas dulces de la tarde',
        description: 'Mogollas con guayaba y trenzas de brioche que quedaron del turno de la tarde. Cierra con el último turno del día.',
        portionsTotal: 5, portionsLeft: 4, weightKg: 3, maxPerPerson: 3,
        start: ago(60), end: at(50),
        allergens: ['Gluten', 'Lácteos'], needsFridge: false, consumeToday: true,
        pickupAddress: ana.address,
        pickupNotes: 'El último turno sale a las 6 p. m.; después no se guarda nada. Pregunta por Ana en el mostrador.',
        lat: 4.5345, lng: -75.6810, zoneId: z.armeniaCentro.id, createdAt: ago(70)
      }),
      listing({
        id: 'lst_frutas', ownerId: ana.id, category: 'frutas-verduras', photo: ASSETS.frutas,
        title: 'Canasta de frutas y verduras del día',
        description: 'Banano, manzana, tomate, cebolla y papa del puesto de la plaza. Todo firme, nada pasado de maduro.',
        portionsTotal: 6, weightKg: 12, maxPerPerson: 1,
        start: ago(40), end: at(300),
        allergens: [], needsFridge: true, consumeToday: true,
        pickupAddress: 'Cra. 12 # 6N-40, Armenia, Quindío',
        pickupNotes: 'Cada canasta va en bolsa; trae una propia si puedes. Se entrega en la portería del conjunto.',
        lat: 4.5560, lng: -75.6700, zoneId: z.armeniaNorte.id, createdAt: ago(45)
      }),
      listing({
        id: 'lst_ajiaco', ownerId: lucia.id, category: 'platos-calientes', photo: ASSETS.ajiaco,
        title: 'Ajiaco comunitario de olla grande',
        description: 'Ajiaco de olla con pollo, papa criolla y mazorca, del almuerzo del comedor. Se reparte por orden de llegada hasta que se acaba.',
        portionsTotal: 10, weightKg: 18, maxPerPerson: 4,
        start: ago(120), end: at(180),
        allergens: ['Gluten'], needsFridge: true, consumeToday: true,
        pickupAddress: lucia.address,
        pickupNotes: 'Toca el timbre del comedor y menciona que vienes por ComParte. Trae vasija si puedes.',
        lat: 4.5290, lng: -75.6430, zoneId: z.calarcaCentro.id, createdAt: ago(130)
      }),
      listing({
        id: 'lst_lentejas', ownerId: lucia.id, category: 'platos-calientes', photo: ASSETS.lentejas,
        title: 'Lentejas guisadas con verduras',
        description: 'Porción de lentejas con zanahoria y papa de la olla comunitaria. Rinde para dos buenas raciones.',
        portionsTotal: 6, portionsLeft: 4, weightKg: 9, maxPerPerson: 2,
        start: ago(30), end: at(240),
        allergens: [], needsFridge: true, consumeToday: true,
        pickupAddress: 'Vía a Boquía, Calarcá, Quindío',
        pickupNotes: 'Se entrega en la sede del comedor frente al parquecito de Boquía.',
        lat: 4.5050, lng: -75.6350, zoneId: z.calarcaSur.id, createdAt: ago(35)
      }),
      listing({
        id: 'lst_lacteos', ownerId: lucia.id, category: 'lacteos', photo: ASSETS.lacteos,
        title: 'Yogurt y queso campesino de la finca',
        description: 'Yogurt bebible y un cuarto de queso de una finca vecina que donó el excedente del día.',
        portionsTotal: 8, weightKg: 6, maxPerPerson: 2,
        start: ago(60), end: at(90),
        allergens: ['Lácteos'], needsFridge: true, consumeToday: true,
        pickupAddress: 'Cll. 5 # 8-12, Montenegro, Quindío',
        pickupNotes: 'Va frío: se entrega en bolsa térmica. En la esquina del parque principal.',
        lat: 4.5667, lng: -75.7500, zoneId: z.montenegroCentro.id, createdAt: ago(70)
      }),
      listing({
        id: 'lst_bebidas', ownerId: ana.id, category: 'bebidas', photo: ASSETS.bebidas,
        title: 'Jugos naturales de la plaza',
        description: 'Sobrante de jugos de mora y guayaba de la frutería. Se acabaron antes de la hora de cierre.',
        portionsTotal: 7, portionsLeft: 0, weightKg: 9, maxPerPerson: 2,
        start: ago(60), end: at(120),
        allergens: [], needsFridge: true, consumeToday: true,
        pickupAddress: 'Cll. 6 # 12-08, Quimbaya, Quindío',
        pickupNotes: 'Publicación de ejemplo ya agotada.',
        lat: 4.6250, lng: -75.7630, zoneId: z.quimbayaCentro.id,
        status: 'soldout', createdAt: ago(90)
      }),
      listing({
        id: 'lst_arepas', ownerId: ana.id, category: 'platos-calientes', photo: ASSETS.arepas,
        title: 'Arepas de choclo con huevo',
        description: 'Arepas de choclo recién hechas del puesto de la esquina. Se sirven calientes hasta las 4 p. m.',
        portionsTotal: 9, weightKg: 5.5, maxPerPerson: 3,
        start: ago(20), end: at(200),
        allergens: ['Gluten', 'Huevo'], needsFridge: true, consumeToday: true,
        pickupAddress: 'Cra. 5 # 4-22, Circasia, Quindío',
        pickupNotes: 'Pregunta por doña Rosa, junto a la plazoleta de Circasia.',
        lat: 4.6170, lng: -75.6350, zoneId: z.circasiaCentro.id, createdAt: ago(25)
      }),
      listing({
        id: 'lst_panela', ownerId: lucia.id, category: 'otros', photo: ASSETS.panela,
        title: 'Panela y galletas de la finca',
        description: 'Panela artesanal y galletas de avena. La ventana de retiro ya se cumplió; queda visible por transparencia.',
        portionsTotal: 6, weightKg: 4, maxPerPerson: 2,
        start: ago(150), end: ago(30),
        allergens: ['Gluten', 'Frutos secos'], needsFridge: false, consumeToday: false,
        pickupAddress: 'Camino al Valle de Cocora, Salento, Quindío',
        pickupNotes: 'Publicación de ejemplo ya vencida.',
        lat: 4.6380, lng: -75.4890, zoneId: z.salentoCocora.id,
        status: 'expired', createdAt: ago(160)
      })
    ];

    data.reservations = [
      { id: 'rsv_carlos_mogollas', listingId: 'lst_mogollas', userId: carlos.id, quantity: 1, code: 'K7QM2P', status: 'reserved', createdAt: ago(15) },
      { id: 'rsv_carlos_lentejas', listingId: 'lst_lentejas', userId: carlos.id, quantity: 2, code: 'R3XW9D', status: 'reserved', createdAt: ago(8) }
    ];

    data.notifications = [
      {
        id: 'ntf_seed_1', userId: ana.id, type: 'reservation_created',
        title: 'Nueva reserva en Mogollas y trenzas dulces de la tarde',
        body: 'Carlos Mendoza reservó 1 ración(es). Código K7QM2P. Quedan 4.',
        listingId: 'lst_mogollas', reservationId: 'rsv_carlos_mogollas', read: false, createdAt: ago(15)
      },
      {
        id: 'ntf_seed_2', userId: lucia.id, type: 'reservation_created',
        title: 'Nueva reserva en Lentejas guisadas con verduras',
        body: 'Carlos Mendoza reservó 2 ración(es). Código R3XW9D. Quedan 4.',
        listingId: 'lst_lentejas', reservationId: 'rsv_carlos_lentejas', read: true, createdAt: ago(8)
      },
      {
        id: 'ntf_seed_3', userId: lucia.id, type: 'listing_published',
        title: 'Publicaste Ajiaco comunitario de olla grande',
        body: 'Tus 10 raciones ya están visibles en Inicio y en el mapa.',
        listingId: 'lst_ajiaco', reservationId: null, read: false, createdAt: ago(130)
      }
    ];

    data.session.currentUserId = null;
    data.selectedZone = CP.Zones.DEFAULT_ZONE_ID;

    STORE.write(data);
    return data;
  }

  /* Las tres cuentas demo, tal como quedaron sembradas. Se usan en el login de 1 toque. */
  function users() { return ensure().users; }

  function ensure() {
    var data = STORE.read();
    if (!data) { STORE.reset(); data = STORE.read(); }
    return data || STORE.emptyData();
  }

  CP.Seed = { build: build, users: users, ZONAS: ZONES, zoneById: zoneById, zoneByCoords: zoneByCoords, ASSETS: ASSETS, DEMO_PASSWORD: DEMO_PASSWORD, at: at, ago: ago };
})(window.ComParte = window.ComParte || {});