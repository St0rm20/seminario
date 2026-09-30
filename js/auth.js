/* ComParte - sesion simulada y guardas de ruta. */
(function (CP) {
  'use strict';

  var STORE = CP.store;

  function currentUser() {
    return STORE.getUser(STORE.currentUserId());
  }

  function isDonor(user) {
    return !!user && user.role === STORE.ROLES.DONOR;
  }

  function roleLabel(role) {
    return role === STORE.ROLES.BENEFICIARY ? 'Beneficiario' : 'Donante';
  }

  function login(email, password) {
    var user = STORE.findUserByEmail(email);
    if (!user) return { error: 'notfound' };
    if (String(user.password) !== String(password)) return { error: 'badpassword' };
    STORE.setSession(user.id);
    return { user: user };
  }

  function logout() {
    STORE.setSession(null);
  }

  function register(data) {
    var name = String(data.name || '').trim();
    var email = String(data.email || '').trim().toLowerCase();
    var password = String(data.password || '');
    var address = String(data.address || '').trim();
    var role = data.role === STORE.ROLES.DONOR ? STORE.ROLES.DONOR : STORE.ROLES.BENEFICIARY;
    var businessName = String(data.businessName || '').trim();
    var errors = [];
    if (name.length < 3) errors.push({ field: 'name', message: 'Escribe tu nombre (mínimo 3 caracteres).' });
    if (role === STORE.ROLES.DONOR && !businessName) {
      errors.push({ field: 'businessName', message: 'Como donante, escribe el nombre de tu comercio o lugar.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push({ field: 'email', message: 'Ese correo no parece válido.' });
    if (password.length < 4) errors.push({ field: 'password', message: 'La contraseña debe tener al menos 4 caracteres.' });
    if (!address) errors.push({ field: 'address', message: 'Escribe la dirección donde recoges tus pedidos.' });
    if (errors.length === 0 && STORE.findUserByEmail(email)) {
      errors.push({ field: 'email', message: 'Ya existe una cuenta con ese correo.' });
    }
    if (errors.length) return { errors: errors };

    var zone = CP.Seed.zoneById(data.zoneId) || CP.Zones.byId();
    var user = STORE.createUser({
      name: name, email: email, password: password,
      phone: data.phone, address: address,
      businessName: role === STORE.ROLES.DONOR ? businessName : '',
      role: role,
      lat: zone.lat, lng: zone.lng, zoneId: zone.id
    });
    return { user: user };
  }

  /* Paths que exigen sesion. */
  var PROTECTED = ['feed.html', 'map.html', 'publicar.html', 'reservas.html', 'notificacion.html', 'perfil.html', 'detalle.html'];
  var PUBLIC = ['index.html', 'login.html', 'register.html', 'acerca.html'];

  function nextTarget(fallback) {
    return fallback || 'feed.html';
  }

  /* Si la pantalla actual es privada y no hay sesion -> login con ?next=. */
  function requireAuth() {
    var file = currentFile();
    if (PUBLIC.indexOf(file) !== -1) return true;
    if (PROTECTED.indexOf(file) === -1) return true;
    if (currentUser()) return true;
    var next = file + window.location.search + window.location.hash;
    window.location.replace('login.html?next=' + encodeURIComponent(next));
    return false;
  }

  /* Si ya hay sesion, login/register no tienen sentido. */
  function redirectIfAuthenticated() {
    var file = currentFile();
    if (PUBLIC.indexOf(file) === -1) return false;
    if (file !== 'login.html' && file !== 'register.html') return false;
    if (!currentUser()) return false;
    window.location.replace(nextParam() || 'feed.html');
    return true;
  }

  function currentFile() {
    var path = window.location.pathname.split('/').pop();
    return path || 'index.html';
  }

  function nextParam() {
    var m = /[?&]next=([^&]*)/.exec(window.location.search);
    if (!m) return '';
    var value = decodeURIComponent(m[1]);
    /* Solo permitimos rutas internas: nada de URLs absolutas. */
    if (/^https?:/i.test(value) || value.indexOf('//') === 0) return '';
    if (value.charAt(0) !== '/' && value.indexOf('.html') === -1) return '';
    return value.replace(/^\/+/, '');
  }

  function goNext(fallback) {
    window.location.href = nextParam() || nextTarget(fallback);
  }

  CP.auth = {
    currentUser: currentUser,
    login: login,
    logout: logout,
    register: register,
    requireAuth: requireAuth,
    redirectIfAuthenticated: redirectIfAuthenticated,
    nextParam: nextParam,
    goNext: goNext,
    currentFile: currentFile,
    PROTECTED: PROTECTED,
    PUBLIC: PUBLIC
  };
})(window.ComParte = window.ComParte || {});
