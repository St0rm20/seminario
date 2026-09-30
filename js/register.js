/* ComParte - Registro: elige el tipo de cuenta. Donante publica; beneficiario aparta. */
(function (CP) {
  'use strict';

  var STORE = CP.store, UI = CP.ui, h = UI.h, icon = UI.icon;
  var ASSETS = CP.Seed.ASSETS;

  var refs = {};
  var chosenRole = STORE.ROLES.DONOR;

  function init() {
    if (CP.auth.redirectIfAuthenticated()) return;
    UI.renderHeader(UI.$('#app-header'), { screen: 'register.html', minimal: true });
    UI.storageGuard();
    build();
  }

  function field(opts) {
    var error = h('p', { class: 'font-body-sm text-body-sm text-error min-h-[16px]', text: ' ' });
    var input = h('input', {
      type: opts.type, name: opts.name, id: opts.id, autocomplete: opts.autocomplete,
      placeholder: opts.placeholder, maxlength: opts.maxlength || null,
      inputmode: opts.inputmode || null,
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
    refs[opts.name] = { input: input, error: error };
    return group;
  }

  function build() {
    var root = UI.$('#register-root');
    UI.clear(root);

    root.appendChild(h('div', { class: 'flex flex-col items-center text-center mt-space-md mb-space-lg' }, [
      h('div', { class: 'w-16 h-16 mb-space-sm flex items-center justify-center bg-surface-container rounded-full p-space-xs shadow-sm' }, [
        h('img', { alt: 'ComParte', class: 'w-14 h-14 object-contain rounded-full', src: ASSETS.splash })
      ]),
      h('h1', { class: 'font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight', text: 'Únete a ComParte' }),
      h('p', { class: 'font-body-md text-body-md text-on-surface-variant max-w-[300px] mt-1', text: 'Elige tu tipo de cuenta: quien dona publica, y quien lo necesita aparta y retira en su barrio.' })
    ]));

    root.appendChild(h('div', { class: 'flex flex-col items-center text-center py-3' }, [
      h('img', { class: 'w-full rounded-xl object-cover shadow-sm', alt: 'Vecinos de ComParte', src: ASSETS.registerComunidad })
    ]));

    var roleGroup = rolePicker();
    var name = field({ id: 'reg-name', name: 'name', label: 'Tu nombre', icon: 'person', type: 'text', autocomplete: 'name', placeholder: 'Ana Ramírez', maxlength: '60' });
    var businessGroup = field({ id: 'reg-business', name: 'businessName', label: 'Nombre del negocio o comercio', icon: 'storefront', type: 'text', autocomplete: 'organization', placeholder: 'Panadería La Candelaria', maxlength: '60' });
    var email = field({ id: 'reg-email', name: 'email', label: 'Correo electrónico', icon: 'mail', type: 'email', autocomplete: 'email', placeholder: 'ejemplo@correo.co' });
    var phone = field({ id: 'reg-phone', name: 'phone', label: 'Teléfono (opcional)', icon: 'call', type: 'tel', autocomplete: 'tel', placeholder: '310 555 0000', maxlength: '20' });
    var password = field({ id: 'reg-password', name: 'password', label: 'Contraseña', icon: 'lock', type: 'password', autocomplete: 'new-password', placeholder: 'Mínimo 4 caracteres', maxlength: '40' });
    var address = field({ id: 'reg-address', name: 'address', label: 'Dirección donde recoges tus pedidos', icon: 'location_on', type: 'text', autocomplete: 'street-address', placeholder: 'Cl. 64 # 8-24', maxlength: '120' });

    var zoneSelect = h('select', {
      id: 'reg-zone', name: 'zoneId',
      class: 'w-full h-[52px] px-3 bg-surface-container-high rounded-lg font-body-md text-body-md text-on-surface focus:outline-none'
    }, CP.Seed.ZONAS.map(function (z) {
      return h('option', { value: z.id, text: z.label + ' · Bogotá D.C.' });
    }));
    zoneSelect.value = UI.currentZone().id;
    refs.zoneId = { input: zoneSelect, error: h('p', { class: 'font-body-sm text-body-sm text-error min-h-[16px]', text: ' ' }) };

    var showBtn = h('button', {
      type: 'button', 'aria-label': 'Mostrar contraseña', 'aria-pressed': 'false',
      class: 'absolute right-0 w-12 h-[52px] flex items-center justify-center text-outline hover:text-on-surface active:scale-95 transition-transform',
      onclick: function () {
        var visible = refs.password.input.type === 'text';
        refs.password.input.type = visible ? 'password' : 'text';
        showBtn.setAttribute('aria-pressed', visible ? 'false' : 'true');
        showBtn.textContent = '';
        showBtn.appendChild(icon(visible ? 'visibility' : 'visibility_off', 20));
        refs.password.input.focus();
      }
    }, [icon('visibility_off', 20)]);
    refs.password.input.className = 'w-full h-[52px] bg-transparent pr-12 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none';
    refs.password.input.parentNode.appendChild(showBtn);

    var formError = h('p', { class: 'font-body-sm text-body-sm text-error text-center min-h-[18px]', role: 'alert', text: ' ' });
    var submit = h('button', {
      type: 'submit',
      class: 'w-full h-[52px] mt-space-xs bg-primary text-on-primary font-label-lg text-label-lg rounded-xl flex items-center justify-center gap-space-sm shadow-md active:scale-[0.98] transition-transform disabled:opacity-60',
      text: 'Crear cuenta'
    });

    var form = h('form', { class: 'flex flex-col gap-space-md', novalidate: true }, [
      roleGroup, name, businessGroup, email, phone, password, address,
      h('div', { class: 'flex flex-col gap-1' }, [
        h('label', { class: 'font-label-md text-label-md text-on-surface-variant', for: 'reg-zone', text: 'Tu zona de referencia' }),
        zoneSelect,
        refs.zoneId.error
      ]),
      formError,
      submit
    ]);
    form.addEventListener('submit', onSubmit);

    root.appendChild(h('div', { class: 'bg-surface-container-lowest rounded-xl p-space-md shadow-sm' }, [form]));
    root.appendChild(h('p', { class: 'font-body-sm text-body-sm text-on-surface-variant text-center mt-space-md', text: 'Al crear la cuenta entras directo a Inicio. Tus datos quedan solo en este navegador.' }));
    root.appendChild(h('p', { class: 'text-center font-body-md text-body-md text-on-surface-variant mt-space-sm' }, [
      '¿Ya tienes cuenta? ',
      h('a', { href: 'login.html', class: 'font-label-lg text-label-lg text-primary hover:underline ml-1 inline-block py-1', text: 'Ingresa' })
    ]));

    function onSubmit(e) {
      e.preventDefault();
      Object.keys(refs).forEach(function (k) { refs[k].error.textContent = ' '; });
      formError.textContent = ' ';

      var res = UI.withQuotaToast(function () {
        return CP.auth.register({
          name: refs.name.input.value,
          businessName: refs.businessName.input.value,
          email: refs.email.input.value,
          phone: refs.phone.input.value,
          password: refs.password.input.value,
          address: refs.address.input.value,
          zoneId: refs.zoneId.input.value,
          role: chosenRole
        });
      });
      if (!res) return;
      if (res.errors) {
        res.errors.forEach(function (err) { if (refs[err.field]) refs[err.field].error.textContent = err.message; });
        var first = res.errors[0];
        if (refs[first.field]) refs[first.field].input.focus();
        return;
      }
      STORE.setSelectedZone(refs.zoneId.input.value);
      submit.disabled = true;
      submit.textContent = 'Cuenta creada';
      UI.toast('¡Bienvenido a ComParte, ' + firstName(res.user) + '!', 'success');
      CP.auth.goNext('feed.html');
    }
  }

  function firstName(user) {
    return (user.name || 'vecino').split(/\s+/)[0];
  }

  /* ---------- Seleccion de rol ---------- */

  function rolePicker() {
    var error = h('p', { class: 'font-body-sm text-body-sm text-error min-h-[20px]', text: ' ' });
    var cards = h('div', { class: 'grid grid-cols-2 gap-2' });
    var opts = [
      { value: STORE.ROLES.DONOR, icon: 'storefront', title: 'Soy donante', help: 'Publico los excedentes de mi negocio o casa.' },
      { value: STORE.ROLES.BENEFICIARY, icon: 'volunteer_activism', title: 'Soy beneficiario', help: 'Aparto y retiro raciones cerca de mí.' }
    ];

    function render(selected) {
      UI.clear(cards);
      opts.forEach(function (o) {
        var on = selected === o.value;
        cards.appendChild(h('button', {
          type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', 'data-role': o.value,
          class: 'flex flex-col items-start gap-1 p-3.5 rounded-xl text-left transition-all active:scale-[0.98] ' +
            (on ? 'bg-primary text-on-primary shadow-md' : 'bg-surface-container-high text-on-surface'),
          onclick: function () { select(o.value); }
        }, [
          icon(o.icon, 22),
          h('span', { class: 'font-label-lg text-label-lg', text: o.title }),
          h('span', { class: 'font-body-sm text-body-sm leading-tight ' + (on ? 'opacity-90' : 'text-on-surface-variant'), text: o.help })
        ]));
      });
    }

    function select(value) {
      chosenRole = value;
      error.textContent = ' ';
      render(value);
      var isDonor = value === STORE.ROLES.DONOR;
      businessGroup.style.display = isDonor ? '' : 'none';
      if (!isDonor) refs.businessName.error.textContent = ' ';
    }

    render(chosenRole);
    refs.role = { input: { value: chosenRole }, error: error };
    return h('div', { class: 'flex flex-col gap-1' }, [
      h('span', { class: 'font-label-md text-label-md text-on-surface-variant', text: '¿Cómo entrarás a ComParte?' }),
      cards,
      error
    ]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.ComParte = window.ComParte || {});
