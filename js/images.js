/* ComParte - rutas centralizadas de todas las imagenes del proyecto.
   Un solo lugar controla los nombres de archivo: para sustituir una ilustracion
   por una foto real basta con dejar la foto con el mismo nombre en assets/img/
   (p. ej. feed-mogollas.jpg) y cambiar aqui la extension. */
(function (CP) {
  'use strict';

  var IMAGES = {
    /* Marca */
    logo: 'logo.png',
    avatarDefault: 'assets/img/avatar-default.svg',

    /* Onboarding de index.html (1:1) */
    publica: 'assets/img/index-publica.svg',
    buscando: 'assets/img/index-buscando.svg',
    recoge: 'assets/img/index-recogiendo.svg',

    /* Comunidad (register.html y acerca.html) */
    comunidad: 'assets/img/comunidad.svg',

    /* Fotos de publicaciones demo (16:10) */
    mogollas: 'assets/img/feed-mogollas.svg',
    canasta: 'assets/img/feed-canasta.svg',
    ajiaco: 'assets/img/feed-ajiaco.svg',
    lentejas: 'assets/img/feed-lentejas.svg',
    lacteos: 'assets/img/feed-lacteos.svg',
    bebidas: 'assets/img/feed-bebidas.svg',
    arepas: 'assets/img/feed-arepas.svg',
    panela: 'assets/img/feed-panela.svg',

    /* Placeholders por categoria (16:10) */
    catPanaderia: 'assets/img/cat-panaderia.svg',
    catPlatos: 'assets/img/cat-platos-calientes.svg',
    catFrutas: 'assets/img/cat-frutas-verduras.svg',
    catLacteos: 'assets/img/cat-lacteos.svg',
    catBebidas: 'assets/img/cat-bebidas.svg',
    catOtros: 'assets/img/cat-otros.svg'
  };

  var PLACEHOLDER_BY_CATEGORY = {
    'panaderia': IMAGES.catPanaderia,
    'platos-calientes': IMAGES.catPlatos,
    'frutas-verduras': IMAGES.catFrutas,
    'lacteos': IMAGES.catLacteos,
    'bebidas': IMAGES.catBebidas
  };

  function categoryPlaceholder(categoryId) {
    return PLACEHOLDER_BY_CATEGORY[categoryId] || IMAGES.catOtros;
  }

  CP.Images = { IMAGES: IMAGES, categoryPlaceholder: categoryPlaceholder };
})(window.ComParte = window.ComParte || {});