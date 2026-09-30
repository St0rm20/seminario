/* ComParte - Acerca de: marco del proyecto con metricas reales de la sesion. */
(function (CP) {
  'use strict';

  var STORE = CP.store, UI = CP.ui, h = UI.h, icon = UI.icon;
  var ASSETS = CP.Seed.ASSETS;

  function init() {
    UI.renderHeader(UI.$('#app-header'), { screen: 'acerca.html', minimal: true, hideZone: true });
    build();
  }

  function sessionTotals() {
    var listings = STORE.listings();
    var reservations = STORE.reservations();
    var active = listings.filter(function (l) { return l.status === 'active'; });
    var kg = active.reduce(function (a, l) { return a + l.weightKg; }, 0);
    var portions = active.reduce(function (a, l) { return a + l.portionsLeft; }, 0);
    var picked = reservations.filter(function (r) { return r.status === 'picked_up'; })
      .reduce(function (a, r) { return a + r.quantity; }, 0);
    return {
      active: active.length,
      kg: kg,
      portions: portions,
      picked: picked,
      co2: STORE.co2(kg),
      neighbors: STORE.users().length
    };
  }

  function build() {
    var root = UI.$('#acerca-root');
    UI.clear(root);
    var t = sessionTotals();

    root.appendChild(h('section', { class: 'px-margin pt-2 pb-4 flex flex-col gap-2' }, [
      h('div', { class: 'flex items-center gap-2' }, [icon('volunteer_activism', 20, 'text-primary'), h('span', { class: 'font-label-md text-label-md text-primary', text: 'Iniciativa ciudadana' })]),
      h('h1', { class: 'font-headline-sm text-headline-sm text-on-surface', text: 'ComParte Colombia' }),
      h('p', { class: 'font-body-md text-body-md text-on-surface-variant', text: 'Alimento digno, comunidades unidas, cero desperdicio. Conectamos comercios de barrio con vecinos y comedores comunitarios para rescatar excedentes en perfecto estado.' })
    ]));

    root.appendChild(metrics(t));

    root.appendChild(block('Marco jurídico nacional', [
      h('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: 'La Ley 1990 de 2019 (Política Nacional de Prevención de Pérdidas y Desperdicio de Alimentos) da certeza operativa a donantes y receptores.' }),
      bullet('gavel', 'Consumo humano prioritario', 'La ley exige priorizar excedentes óptimos para alimentación humana antes de cualquier uso animal o compostaje.'),
      bullet('verified_user', 'Protección al donante de buena fe', 'Seguridad jurídica para establecimientos que entregan productos inocuos siguiendo protocolos sanitarios.'),
      bullet('receipt_long', 'Incentivos y certificación', 'Posibilidad de acceder a beneficios fiscales y avales de responsabilidad socioambiental en Colombia.')
    ]));

    root.appendChild(block('Nuestros tres pilares comunitarios', [
      bullet('favorite', '1. Dignidad alimentaria', 'El alimento es un derecho humano irrenunciable. Toda entrega se hace con respeto, empaques limpios y trazabilidad digna.'),
      bullet('storefront', '2. Comercio de barrio solidario', 'Redes directas con panaderías, pucketeros, fruteros de plaza y microempresas, reconociendo el papel del comercio popular.'),
      bullet('eco', '3. Huella ecológica positiva', 'Frenamos residuos orgánicos al relleno, evitando metano (CH₄) y CO₂ equivalente antes de su descomposición.')
    ]));

    root.appendChild(h('section', { class: 'px-margin py-3 flex flex-col gap-2' }, [
      h('h2', { class: 'font-title-md text-title-md text-on-surface', text: 'Red colaboradora' }),
      h('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: 'En esta demo los vecinos son las cuentas de prueba. Así funciona la lógica sin depender de datos externos.' }),
      h('div', { class: 'flex flex-col gap-1.5' }, STORE.users().map(function (u) {
        return h('div', { class: 'flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-container-low' }, [
          h('img', { class: 'w-9 h-9 rounded-full', alt: '', src: UI.avatar(u, 36) }),
          h('div', { class: 'flex flex-col min-w-0' }, [
            h('div', { class: 'flex items-center gap-1.5 min-w-0' }, [
              h('span', { class: 'font-title-sm text-title-sm text-on-surface truncate', text: STORE.displayName(u) }),
              h('span', { class: 'shrink-0 inline-flex items-center rounded-full bg-surface-container px-1.5 py-0.5 font-label-sm text-label-sm text-on-surface-variant', text: CP.auth.roleLabel(u.role) })
            ]),
            h('span', { class: 'font-label-sm text-label-sm text-on-surface-variant truncate', text: u.address })
          ])
        ]);
      }))
    ]));

    root.appendChild(h('section', { class: 'px-margin py-4 flex flex-col gap-2' }, [
      h('div', { class: 'p-4 rounded-2xl bg-primary-fixed text-on-primary-fixed-variant flex flex-col gap-2' }, [
        h('h2', { class: 'font-title-md text-title-md', text: '¿Tienes un comercio o quieres participar?' }),
        h('p', { class: 'font-body-sm text-body-sm', text: 'Cada publicación rescatada suma. Demo frontend: todo vive en la sesión de tu navegador.' })
      ]),
      h('div', { class: 'flex flex-col gap-2' }, [
        h('a', { href: 'register.html', class: 'w-full h-12 rounded-full bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center shadow-md active:scale-[0.98] transition-transform', text: 'Crear mi cuenta' }),
        h('a', { href: 'login.html', class: 'w-full h-12 rounded-full bg-surface-container text-on-surface font-label-lg text-label-lg flex items-center justify-center active:scale-[0.98] transition-transform', text: 'Ya tengo cuenta' })
      ]),
      h('img', { class: 'w-full rounded-xl object-cover mt-1 opacity-80', alt: 'Comunidad ComParte', src: ASSETS.onboardingCerca })
    ]));
  }

  function metrics(t) {
    return h('section', { class: 'px-margin py-2' }, [
      h('div', { class: 'p-4 rounded-2xl bg-primary-fixed text-on-primary-fixed-variant flex flex-col gap-3' }, [
        h('div', { class: 'flex items-center gap-2' }, [icon('trending_up', 20), h('h2', { class: 'font-title-md text-title-md', text: 'Impacto de esta sesión' })]),
        h('div', { class: 'grid grid-cols-2 gap-3' }, [
          metric(UI.fmtKg(t.kg), 'comida disponible'),
          metric(String(t.portions), 'raciones por retirar'),
          metric(String(t.picked), 'raciones ya recogidas'),
          metric(UI.fmtKg(t.co2), 'CO₂e si se retira todo')
        ]),
        h('p', { class: 'font-body-sm text-body-sm opacity-90', text: t.neighbors + ' vecinos en la sesión · ' + t.active + ' publicaciones activas. Las cifras se calculan con los datos reales guardados en este navegador.' })
      ])
    ]);
  }

  function metric(value, label) {
    return h('div', { class: 'flex flex-col' }, [
      h('span', { class: 'font-headline-sm text-headline-sm leading-none', text: value }),
      h('span', { class: 'font-label-sm text-label-sm opacity-85 mt-0.5', text: label })
    ]);
  }

  function block(title, children) {
    return h('section', { class: 'px-margin py-3 flex flex-col gap-2' }, [
      h('h2', { class: 'font-title-md text-title-md text-on-surface', text: title })
    ].concat(children));
  }

  function bullet(iconName, title, body) {
    return h('div', { class: 'flex items-start gap-2.5' }, [
      h('div', { class: 'w-9 h-9 rounded-full bg-surface-container flex items-center justify-center shrink-0 text-primary' }, [icon(iconName, 18)]),
      h('div', { class: 'flex flex-col min-w-0' }, [
        h('span', { class: 'font-title-sm text-title-sm text-on-surface', text: title }),
        h('span', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: body })
      ])
    ]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.ComParte = window.ComParte || {});
