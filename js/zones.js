/* ComParte - catalogo de zonas del Quindio (Colombia) y helpers de geolocalizacion.
   Fuente unica para municipios, zonas, coordenadas lineales de la proyeccion del mapa. */
(function (CP) {
  'use strict';

  var MUNICIPALITIES = [
    'Armenia', 'Calarcá', 'Montenegro', 'Quimbaya', 'Circasia',
    'Filandia', 'Salento', 'La Tebaida', 'Córdoba', 'Pijao',
    'Buenavista', 'Génova'
  ];

  /* Coordenadas aproximadas de referencia. Las etiquetas de sector son generales. */
  var ZONES = [
    { id: 'armenia-centro', municipality: 'Armenia', name: 'Centro (Parque Sucre / Plaza de Bolívar)', lat: 4.5339, lng: -75.6811 },
    { id: 'armenia-norte', municipality: 'Armenia', name: 'Norte (Av. Bolívar, La Castellana)', lat: 4.5560, lng: -75.6700 },
    { id: 'armenia-sur', municipality: 'Armenia', name: 'Sur (Los Quindos, Av. Centenario)', lat: 4.5150, lng: -75.6830 },
    { id: 'armenia-occidente', municipality: 'Armenia', name: 'Occidente (Calle 50, Bosques de Pinares)', lat: 4.5400, lng: -75.7000 },
    { id: 'calarca-centro', municipality: 'Calarcá', name: 'Centro', lat: 4.5290, lng: -75.6430 },
    { id: 'calarca-sur', municipality: 'Calarcá', name: 'Sur (vía a Boquía / Barcelona)', lat: 4.5050, lng: -75.6350 },
    { id: 'montenegro-centro', municipality: 'Montenegro', name: 'Centro', lat: 4.5667, lng: -75.7500 },
    { id: 'montenegro-cafeto', municipality: 'Montenegro', name: 'Parque del Café (sector)', lat: 4.5350, lng: -75.7750 },
    { id: 'quimbaya-centro', municipality: 'Quimbaya', name: 'Centro', lat: 4.6250, lng: -75.7630 },
    { id: 'quimbaya-panaca', municipality: 'Quimbaya', name: 'Sector PANACA', lat: 4.6100, lng: -75.7900 },
    { id: 'circasia-centro', municipality: 'Circasia', name: 'Centro', lat: 4.6170, lng: -75.6350 },
    { id: 'filandia-centro', municipality: 'Filandia', name: 'Centro', lat: 4.6740, lng: -75.6590 },
    { id: 'salento-centro', municipality: 'Salento', name: 'Centro', lat: 4.6370, lng: -75.5700 },
    { id: 'salento-cocora', municipality: 'Salento', name: 'Valle de Cocora (sector)', lat: 4.6380, lng: -75.4890 },
    { id: 'tebaida-centro', municipality: 'La Tebaida', name: 'Centro', lat: 4.4550, lng: -75.7900 },
    { id: 'cordoba-centro', municipality: 'Córdoba', name: 'Centro', lat: 4.3930, lng: -75.6900 },
    { id: 'pijao-centro', municipality: 'Pijao', name: 'Centro', lat: 4.3340, lng: -75.7040 },
    { id: 'buenavista-centro', municipality: 'Buenavista', name: 'Centro', lat: 4.3600, lng: -75.7350 },
    { id: 'genova-centro', municipality: 'Génova', name: 'Centro', lat: 4.2050, lng: -75.7900 }
  ];

  var DEFAULT_ZONE_ID = 'armenia-centro';

  function label(z) { return z ? z.municipality + ' · ' + z.name.split(' (')[0] : ''; }

  function byId(id) {
    if (!id) return byId(DEFAULT_ZONE_ID);
    for (var i = 0; i < ZONES.length; i++) if (ZONES[i].id === id) return ZONES[i];
    return byId(DEFAULT_ZONE_ID);
  }

  /* Retorna zonas agrupadas por municipio, en el orden del catalogo. */
  function byMunicipality() {
    return MUNICIPALITIES.map(function (municipality) {
      return { municipality: municipality, zones: ZONES.filter(function (z) { return z.municipality === municipality; }) };
    });
  }

  /* Zona mas cercana a unas coordenadas (heuristica de manhattan, suficiente aqui). */
  function byCoords(lat, lng) {
    var best = ZONES[0], bestD = Infinity;
    ZONES.forEach(function (z) {
      var d = Math.abs(z.lat - lat) + Math.abs(z.lng - lng);
      if (d < bestD) { bestD = d; best = z; }
    });
    return best;
  }

  /* Proyeccion lineal sobre el bounding box del Quindio. Devuelve {x, y} en 0..1. */
  var BB = { latMin: 4.15, latMax: 4.75, lngMin: -75.85, lngMax: -75.45 };
  function project(lat, lng) {
    var x = (lng - BB.lngMin) / (BB.lngMax - BB.lngMin);
    var y = 1 - (lat - BB.latMin) / (BB.latMax - BB.latMin);
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  }

  /* Desplazamiento determinista por id para que no se solapen pines de una misma zona. */
  function jitter(id, seed) {
    var h = 2166136261;
    var s = String(id);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    h = (h >>> 0);
    var a = ((h % 100) / 100) * 2 * Math.PI;
    var r = ((h >> 9) % 40) / 100; // radio de hasta 0.4 del tamano del contenedor
    return { dx: Math.cos(a + r) * r, dy: Math.sin(a) * r };
  }

  CP.Zones = { ZONES: ZONES, MUNICIPALITIES: MUNICIPALITIES, DEFAULT_ZONE_ID: DEFAULT_ZONE_ID, label: label, byId: byId, byMunicipality: byMunicipality, byCoords: byCoords, project: project, jitter: jitter, BB: BB };
})(window.ComParte = window.ComParte || {});