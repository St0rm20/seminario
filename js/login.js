/* ComParte - Login: correo + contrasena, validacion en vivo y acceso demo de 1 toque. */
(function (CP) {
  'use strict';

  var STORE = CP.store, UI = CP.ui, h = UI.h, icon = UI.icon;
  var ASSETS = CP.Seed.ASSETS;

  function init() {
    if (CP.auth.redirectIfAuthenticated()) return;
    UI.renderHeader(UI.$('#app-header'), { screen: 'login.html', minimal: true });
    UI.storageGuard();
    build();
  }

  function field(opts) {
    var error = h('p', { class: 'font-body-sm text-body-sm text-error min-h-[16px]', text: ' ' });
    var input = h('input', {
      type: opts.type, name: opts.name, id: opts.id,
      autocomplete: opts.autocomplete, placeholder: opts.placeholder,
      maxlength: opts.maxlength, inputmode: opts.inputmode || null,
      class: 'w-full h-[52px] bg-transparent pr-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none'
    });
    var wrap = h('div', { class: 'relative flex items-center bg-surface-container-high rounded-lg transition-all duration-200 focus-within:bg-surface-container-lowest focus-within:shadow-md' }, [
      h('div', { class: 'w-12 h-[52px] flex items-center justify-center text-outline' }, [icon(opts.icon, 20)]),
      input
    ]);
    var group = h('div', { class: 'flex flex-col gap-1' }, [
      h('label', { class: 'font-label-md text-label-md text-on-surface-variant', for: opts.id, text: opts.label }),
      wrap,
      error
    ]);
    return { group: group, input: input, error: error };
  }

  function build() {
    var root = UI.$('#login-root');
    UI.clear(root);

    var email = field({
      id: 'login-email', name: 'email', label: 'Correo electrónico', icon: 'mail', type: 'email',
      autocomplete: 'email', placeholder: 'ejemplo@correo.co'
    });
    var password = field({
      id: 'login-password', name: 'password', label: 'Contraseña', icon: 'lock', type: 'password',
      autocomplete: 'current-password', placeholder: 'Tu contraseña'
    });

    var showBtn = h('button', {
      type: 'button', 'aria-label': 'Mostrar contraseña', 'aria-pressed': 'false',
      class: 'absolute right-0 w-12 h-[52px] flex items-center justify-center text-outline hover:text-on-surface active:scale-95 transition-transform',
      onclick: function () {
        var visible = password.input.type === 'text';
        password.input.type = visible ? 'password' : 'text';
        showBtn.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
        showBtn.setAttribute('aria-pressed', visible ? 'false' : 'true');
        showBtn.textContent = '';
        showBtn.appendChild(icon(visible ? 'visibility' : 'visibility_off', 20));
        password.input.focus();
      }
    }, [icon('visibility_off', 20)]);
    password.input.className = 'w-full h-[52px] bg-transparent pr-12 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none';
    password.input.parentNode.appendChild(showBtn);

    var formError = h('p', { class: 'font-body-sm text-body-sm text-error text-center min-h-[18px]', role: 'alert', text: ' ' });
    var submit = h('button', {
      type: 'submit',
      class: 'w-full h-[52px] mt-space-xs bg-primary text-on-primary font-label-lg text-label-lg rounded-xl flex items-center justify-center gap-space-sm shadow-md active:scale-[0.98] transition-transform disabled:opacity-60',
      text: 'Ingresar'
    });

    var form = h('form', { class: 'flex flex-col gap-space-md', novalidate: true }, [
      email.group, password.group, formError, submit
    ]);
    form.addEventListener('submit', onSubmit);

    function onSubmit(e) {
      e.preventDefault();
      email.error.textContent = ' ';
      password.error.textContent = ' ';
      formError.textContent = ' ';

      var mail = email.input.value.trim();
      var pass = password.input.value;
      var bad = false;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) {
        email.error.textContent = 'Escribe un correo válido.';
        bad = true;
      }
      if (!pass) {
        password.error.textContent = 'Escribe tu contraseña.';
        bad = true;
      }
      if (bad) return;

      submit.disabled = true;
      submit.textContent = 'Entrando…';
      var res;
      try {
        res = CP.auth.login(mail, pass);
      } catch (err) {
        submit.disabled = false;
        submit.textContent = 'Ingresar';
        formError.textContent = 'No pudimos iniciar sesión. Intenta de nuevo.';
        return;
      }
      if (res.error) {
        submit.disabled = false;
        submit.textContent = 'Ingresar';
        if (res.error === 'notfound') {
          formError.textContent = 'No encontramos una cuenta con ese correo.';
        } else {
          formError.textContent = 'Esa contraseña no coincide.';
          password.error.textContent = 'Revisa tu contraseña.';
        }
        return;
      }
      submit.textContent = 'Listo';
      UI.toast('¡Hola de nuevo, ' + firstName(res.user) + '!', 'success');
      CP.auth.goNext('feed.html');
    }

    root.appendChild(hero());
    root.appendChild(h('div', { class: 'bg-surface-container-lowest rounded-xl p-space-md shadow-sm' }, [form]));
    root.appendChild(h('div', { class: 'mt-space-lg bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm shadow-sm' }, [
      h('div', { class: 'flex items-center justify-between' }, [
        h('div', { class: 'flex items-center gap-space-xs' }, [
          icon('science', 18, 'text-primary'),
          h('span', { class: 'font-title-sm text-title-sm text-on-surface', text: 'Cuentas de prueba' })
        ]),
        h('span', { class: 'px-space-sm py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm', text: '1 toque' })
      ]),
      h('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: 'Los datos viven solo en esta sesión del navegador. Contraseña de las tres cuentas demo: 1234' }),
      h('div', { class: 'flex flex-col gap-space-xs mt-space-xs' }, CP.Seed.users().map(function (u) {
        return h('button', {
          type: 'button',
          class: 'w-full bg-surface-container-lowest rounded-lg p-space-sm flex items-center justify-between text-left transition-all active:scale-[0.98] shadow-sm hover:bg-surface-container',
          onclick: function () { quickLogin(u.email); }
        }, [
          h('div', { class: 'flex items-center gap-space-sm min-w-0' }, [
            h('img', { class: 'w-10 h-10 rounded-full shrink-0', alt: '', src: UI.avatar(u, 40) }),
            h('div', { class: 'flex flex-col min-w-0' }, [
              h('span', { class: 'font-title-sm text-title-sm text-on-surface truncate', text: STORE.displayName(u) }),
              h('span', { class: 'font-body-sm text-body-sm text-on-surface-variant truncate', text: u.email })
            ])
          ]),
          icon('arrow_forward', 20, 'text-outline shrink-0')
        ]);
      }))
    ]));
    root.appendChild(h('p', { class: 'text-center font-body-md text-body-md text-on-surface-variant mt-space-lg' }, [
      '¿Aún no tienes cuenta? ',
      h('a', { href: 'register.html', class: 'font-label-lg text-label-lg text-primary hover:underline ml-1 inline-block py-1', text: 'Regístrate' })
    ]));
    root.appendChild(h('p', { class: 'text-center font-body-sm text-body-sm text-on-surface-variant mt-space-sm' }, [
      h('a', { href: 'acerca.html', class: 'hover:text-primary', text: 'Conoce el proyecto' })
    ]));
  }

  function quickLogin(mail) {
    var res = CP.auth.login(mail, '1234');
    if (res.error) { UI.toast('Esa cuenta demo no está disponible.', 'error'); return; }
    UI.toast('Sesión iniciada como ' + STORE.displayName(res.user), 'success');
    CP.auth.goNext('feed.html');
  }

  function firstName(user) {
    return (user.name || 'vecino').split(/\s+/)[0];
  }

  function hero() {
    return h('div', { class: 'flex flex-col items-center text-center mt-space-md mb-space-lg' }, [
      h('div', { class: 'relative w-16 h-16 mb-space-sm flex items-center justify-center bg-surface-container rounded-full p-space-xs shadow-sm' }, [
        h('img', { alt: 'ComParte', class: 'w-14 h-14 object-contain rounded-full', src: ASSETS.logo }),
        h('span', { class: 'absolute -bottom-1 -right-1 bg-secondary-container text-on-secondary-container w-6 h-6 rounded-full flex items-center justify-center shadow-sm' }, [icon('favorite', 14)])
      ]),
      h('span', { class: 'inline-flex items-center gap-space-xs px-3 py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm mb-space-xs' }, [
        h('span', { class: 'w-2 h-2 rounded-full bg-primary animate-pulse' }),
        'Comunidad solidaria de Colombia'
      ]),
      h('h1', { class: 'font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight', text: '¡Hola de nuevo!' }),
      h('p', { class: 'font-body-md text-body-md text-on-surface-variant max-w-[280px] mt-1', text: 'Ingresa para compartir o rescatar alimentos hoy en tu barrio.' })
    ]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.ComParte = window.ComParte || {});
