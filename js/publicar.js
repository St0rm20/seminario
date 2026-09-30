/* ComParte - Publicar / editar: formulario validado contra store.validateListingDraft. */
(function (CP) {
  'use strict';

  var STORE = CP.store, UI = CP.ui, h = UI.h, icon = UI.icon;

  var editingId = null;
  var refs = {};
  var selectedAllergens = [];

  function init() {
    if (!CP.auth.requireAuth()) return;
    UI.mount({ screen: 'publicar.html', navKey: 'publicar', onExpiry: function () {} });
    UI.storageGuard();
    var user = CP.auth.currentUser();
    if (!STORE.canPublish(user.id)) {
      renderRoleBlocked(user);
      return;
    }
    editingId = new URLSearchParams(window.location.search).get('id');
    if (editingId && !STORE.getListing(editingId)) editingId = null;
    build();
  }

  function renderRoleBlocked(user) {
    var root = UI.$('#publish-root');
    UI.clear(root);
    root.appendChild(UI.stateBox(
      'volunteer_activism',
      'Las cuentas beneficiarias no publican',
      'Tu perfil de ' + CP.auth.roleLabel(user.role).toLowerCase() +
        ' sirve para apartar y retirar raciones. Para compartir alimento, crea una cuenta de donante con tu negocio o comercio.',
      h('a', { href: 'feed.html', class: 'mt-1 h-11 px-5 inline-flex items-center rounded-full bg-primary text-on-primary font-label-md text-label-md', text: 'Ver raciones cerca' })
    ));
  }

  /* ---------- Bloques de formulario ---------- */

  function field(opts) {
    var error = h('p', { class: 'font-body-sm text-body-sm text-error min-h-[16px]', text: ' ' });
    var input = h(opts.tag || 'input', opts.attrs || {});
    if (!opts.attrs) {
      input.type = opts.type;
      input.id = opts.id;
      input.name = opts.name;
      input.placeholder = opts.placeholder || '';
      input.className = opts.className;
      if (opts.maxlength) input.maxLength = opts.maxlength;
    }
    if (opts.attrs && opts.attrs.value !== undefined) input.value = opts.attrs.value;
    var control = h('div', { class: 'relative flex items-center bg-surface-container-high rounded-lg transition-all focus-within:bg-surface-container-lowest focus-within:shadow-md' }, [
      opts.leading ? h('div', { class: 'w-12 h-[52px] flex items-center justify-center text-outline shrink-0' }, [icon(opts.leading, 20)]) : null,
      input,
      opts.trailing ? h('div', { class: 'shrink-0 pr-3' }, [opts.trailing]) : null
    ]);
    var group = h('div', { class: 'flex flex-col gap-1' }, [
      h('label', { class: 'font-label-md text-label-md text-on-surface-variant flex items-center justify-between', for: opts.id }, [
        h('span', { text: opts.label }),
        opts.hint ? h('span', { class: 'font-label-sm text-label-sm text-on-surface-variant font-normal', text: opts.hint }) : null
      ]),
      control,
      error
    ]);
    refs[opts.name] = { input: input, error: error };
    return group;
  }

  function build() {
    var root = UI.$('#publish-root');
    UI.clear(root);
    var user = CP.auth.currentUser();
    var existing = editingId ? STORE.getListing(editingId) : null;
    selectedAllergens = existing ? existing.allergens.slice() : [];

    root.appendChild(h('div', { class: 'px-margin pt-2 pb-1' }, [
      h('h1', { class: 'font-headline-sm text-headline-sm text-on-surface', text: existing ? 'Editar publicación' : 'Publica lo que te sobra' }),
      h('p', {
        class: 'font-body-sm text-body-sm text-on-surface-variant mt-0.5',
        text: existing ? 'Los cambios solo los ve el vecinal que sigue la publicación.'
          : 'Tarda menos de un minuto y suma ' + STORE.POINTS_PUBLISH + ' puntos a tu perfil.'
      })
    ]));

    var form = h('form', { class: 'flex flex-col', novalidate: true });
    form.appendChild(section('1. ¿Qué vas a compartir?', [
      photoPicker(existing),
      field({
        id: 'pub-title', name: 'title', label: 'Título', leading: 'edit_note', type: 'text',
        placeholder: '6 panes y 2 rolls de pan',
        maxlength: '90', hint: 'máx. 90',
        className: 'w-full h-[52px] bg-transparent pr-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none'
      }),
      textareaField('pub-description', 'description', 'Descripción', 'Cómo está el alimento, cómo prepararlo, si tiene olor o sabor raro…', '400'),
      categoryPicker()
    ]));

    form.appendChild(section('2. Cantidad y peso', [
      stepperField('portionsTotal', 'inventory_2', 'Raciones totales', 'raciones', 1, 99),
      stepperField('weightKg', 'scale', 'Peso aproximado', 'kg', 0.5, 500, 0.5),
      stepperField('maxPerPerson', 'person', 'Máximo por persona', 'raciones (0 = sin límite)', 0, 99),
      liveImpact()
    ]));

    form.appendChild(section('3. Cuándo y dónde', [
      datetimeFields(),
      field({
        id: 'pub-address', name: 'pickupAddress', label: 'Dirección de retiro', leading: 'location_on', type: 'text',
        placeholder: user.address || 'Cl. 64 # 8-24', maxlength: '120',
        className: 'w-full h-[52px] bg-transparent pr-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none'
      }),
      textareaField('pub-notes', 'pickupNotes', 'Indicaciones para quien retira (opcional)', 'Timbre 2, preguntar por Ana, código de la portería…', '160')
    ]));

    form.appendChild(section('4. Alérgenos y cuidado', [
      allergenPicker(),
      toggles()
    ]));

    var safetyError = h('p', { class: 'font-body-sm text-body-sm text-error min-h-[16px]', text: ' ' });
    refs.safetyConfirmed = { input: null, error: safetyError };
    var safety = h('label', { class: 'flex items-start gap-2.5 p-3.5 rounded-xl bg-surface-container cursor-pointer' }, [
      h('input', {
        id: 'pub-safety', type: 'checkbox',
        class: 'w-5 h-5 rounded accent-primary mt-0.5 shrink-0',
        onchange: function () { safetyError.textContent = ' '; }
      }),
      h('span', { class: 'font-body-sm text-body-sm text-on-surface', text: 'Confirmo que el alimento se preparó con buenas prácticas de higiene, no está dañado y mi contacto es real. Entiendo que ComParte es una simulación sin garantía sanitaria.' })
    ]);
    form.appendChild(section('5. Confirmación', [safety, safetyError]));

    var submit = h('button', {
      type: 'submit',
      class: 'w-full h-12 px-6 rounded-full bg-primary text-on-primary font-label-lg text-label-lg font-semibold shadow-md active:scale-[0.98] transition-transform disabled:opacity-60',
      text: existing ? 'Guardar cambios' : 'Publicar ahora'
    });
    form.appendChild(h('div', { class: 'px-margin py-4 flex flex-col gap-2' }, [
      submit,
      h('button', {
        type: 'button', class: 'w-full h-11 rounded-full text-on-surface-variant font-label-md text-label-md',
        text: 'Descartar', onclick: discard
      })
    ]));

    form.addEventListener('submit', function (e) { e.preventDefault(); submitForm(submit); });
    root.appendChild(form);

    if (existing) prefill(existing);
  }

  function section(title, children) {
    return h('section', { class: 'px-margin py-3.5 flex flex-col gap-3 border-b border-outline-variant/30' }, [
      h('h2', { class: 'font-title-md text-title-md text-on-surface', text: title })
    ].concat(children));
  }

  function discard() {
    UI.confirmModal({
      title: editingId ? '¿Descartar los cambios?' : '¿Descartar la publicación?',
      icon: 'delete', tone: 'danger',
      body: 'Se pierde todo lo que escribiste.',
      confirmText: 'Sí, descartar', cancelText: 'Seguir editando'
    }).then(function (ok) {
      if (ok) window.location.href = editingId ? 'detalle.html?id=' + encodeURIComponent(editingId) : 'feed.html';
    });
  }

  /* ---------- Foto ---------- */

  function photoPicker(existing) {
    var img = h('img', {
      class: 'w-full h-44 object-cover',
      alt: 'Foto del alimento',
      src: existing && existing.photo ? existing.photo : UI.placeholderPhoto('otros')
    });
    var fileInput = h('input', { type: 'file', accept: 'image/*', class: 'hidden', id: 'pub-photo-file' });
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { UI.toast('Ese archivo no es una imagen.', 'error'); return; }
      if (file.size > 8 * 1024 * 1024) { UI.toast('La imagen supera los 8 MB. Elige una más liviana.', 'error'); return; }
      var pending = UI.toast('Procesando imagen…', 'info');
      UI.compressImage(file, function (dataUrl, err) {
        pending();
        if (err) { UI.toast(err, 'error'); return; }
        refs.photo = { input: { value: dataUrl }, error: h('p') };
        img.src = dataUrl;
        UI.toast('Foto lista.', 'success');
      });
    });

    return h('div', { class: 'flex flex-col gap-1' }, [
      h('div', { class: 'relative w-full rounded-xl overflow-hidden bg-surface-container' }, [
        img,
        h('label', {
          for: 'pub-photo-file',
          class: 'absolute bottom-2 right-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-inverse-surface/85 text-inverse-on-surface font-label-md text-label-md cursor-pointer active:scale-95 transition-transform'
        }, [icon('photo_camera', 18), h('span', { text: 'Cambiar foto' })])
      ]),
      fileInput,
      h('p', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: 'Opcional. Sin foto mostramos un ícono según la categoría. La imagen se reduce en el navegador y se guarda en tu sesión.' })
    ]);
  }

  /* ---------- Descripcion ---------- */

  function textareaField(id, name, label, placeholder, maxlength) {
    var error = h('p', { class: 'font-body-sm text-body-sm text-error min-h-[16px]', text: ' ' });
    var area = h('textarea', {
      id: id, name: name, rows: '3', maxlength: maxlength, placeholder: placeholder,
      class: 'w-full bg-surface-container-high rounded-lg p-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none resize-none'
    });
    var counter = h('span', { class: 'font-label-sm text-label-sm text-on-surface-variant font-normal', text: '0/' + maxlength });
    area.addEventListener('input', function () { counter.textContent = area.value.length + '/' + maxlength; });
    var group = h('div', { class: 'flex flex-col gap-1' }, [
      h('label', { class: 'font-label-md text-label-md text-on-surface-variant flex items-center justify-between', for: id }, [
        h('span', { text: label }), counter
      ]),
      area, error
    ]);
    refs[name] = { input: area, error: error };
    return group;
  }

  /* ---------- Categoria ---------- */

  function categoryPicker() {
    var wrap = h('div', { class: 'flex flex-col gap-1' }, [
      h('span', { class: 'font-label-md text-label-md text-on-surface-variant', text: 'Categoría' })
    ]);
    var grid = h('div', { class: 'grid grid-cols-3 gap-2' });
    STORE.CATEGORIES.forEach(function (c) {
      var btn = h('button', {
        type: 'button', 'data-cat': c.id, 'aria-pressed': 'false',
        class: 'flex flex-col items-center gap-1 p-3 rounded-xl bg-surface-container font-label-sm text-label-sm text-on-surface-variant active:scale-95 transition-transform',
        onclick: function () { selectCategory(c.id); }
      }, [
        icon(c.icon, 22, 'text-on-surface-variant'),
        h('span', { class: 'text-center leading-tight', text: c.label })
      ]);
      grid.appendChild(btn);
    });
    wrap.appendChild(grid);
    wrap.appendChild(h('p', { class: 'font-body-sm text-body-sm text-error min-h-[16px]', id: 'pub-cat-error', text: ' ' }));
    return wrap;
  }

  function selectCategory(id) {
    UI.$$('[data-cat]').forEach(function (b) {
      var on = b.getAttribute('data-cat') === id;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.className = 'flex flex-col items-center gap-1 p-3 rounded-xl font-label-sm text-label-sm active:scale-95 transition-transform ' +
        (on ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant');
      b.firstChild.className = 'material-symbols-outlined ' + (on ? '' : 'text-on-surface-variant');
      b.firstChild.style.fontSize = '22px';
    });
    refs.category = { input: { value: id }, error: h('p') };
    var err = UI.$('#pub-cat-error');
    if (err) err.textContent = ' ';
  }

  function currentCategory() {
    var found = null;
    UI.$$('[data-cat]').forEach(function (b) { if (b.getAttribute('aria-pressed') === 'true') found = b.getAttribute('data-cat'); });
    return found;
  }

  /* ---------- Steppers numericos ---------- */

  function stepperField(name, iconName, label, unit, min, max, step) {
    var increment = step || 1;
    var error = h('p', { class: 'font-body-sm text-body-sm text-error min-h-[16px]', text: ' ' });
    var value = h('span', { class: 'font-title-md text-title-md text-on-surface min-w-[64px] text-center', text: '0' });
    var input = h('input', {
      type: 'number', id: 'pub-' + name, name: name,
      min: min, max: max, step: increment, value: '0',
      class: 'absolute opacity-0 w-0 h-0 pointer-events-none'
    });
    function set(v) {
      var n = Math.round(Number(v) / increment) * increment;
      n = Math.min(max, Math.max(min, isFinite(n) ? n : min));
      n = Math.round(n * 100) / 100;
      value.textContent = trim(n);
      input.value = n;
      error.textContent = ' ';
      updateImpact();
    }
    function trim(n) { return String(n).replace(/\.0+$/, ''); }
    var minus = h('button', {
      type: 'button', 'aria-label': 'Restar ' + increment,
      class: 'w-11 h-11 rounded-full bg-surface-container-high flex items-center justify-center active:scale-90 transition-transform',
      onclick: function () { set(Number(input.value) - increment); }
    }, [icon('remove', 20)]);
    var plus = h('button', {
      type: 'button', 'aria-label': 'Sumar ' + increment,
      class: 'w-11 h-11 rounded-full bg-surface-container-high flex items-center justify-center active:scale-90 transition-transform',
      onclick: function () { set(Number(input.value) + increment); }
    }, [icon('add', 20)]);
    refs[name] = { input: input, error: error, set: set };
    set(min);
    return h('div', { class: 'flex flex-col gap-1' }, [
      h('label', { class: 'font-label-md text-label-md text-on-surface-variant flex items-center gap-1.5', for: 'pub-' + name }, [
        icon(iconName, 16), h('span', { text: label })
      ]),
      h('div', { class: 'flex items-center justify-between gap-2 p-1.5 rounded-xl bg-surface-container-high' }, [
        minus,
        h('div', { class: 'flex flex-col items-center flex-1' }, [value, h('span', { class: 'font-label-sm text-label-sm text-on-surface-variant', text: unit })]),
        plus
      ]),
      input, error
    ]);
  }

  function liveImpact() {
    return h('div', { class: 'p-3.5 rounded-xl bg-primary-fixed text-on-primary-fixed-variant' }, [
      h('div', { class: 'flex items-center gap-2' }, [icon('eco', 18), h('span', { class: 'font-title-sm text-title-sm', text: 'Tu impacto estimado' })]),
      h('p', { id: 'pub-impact', class: 'font-body-sm text-body-sm mt-1' })
    ]);
  }

  function updateImpact() {
    var node = UI.$('#pub-impact');
    if (!node) return;
    var kg = Number(refs.weightKg ? refs.weightKg.input.value : 0) || 0;
    var portions = Number(refs.portionsTotal ? refs.portionsTotal.input.value : 0) || 0;
    node.textContent = UI.fmtKg(kg) + ' de alimento, unos ' + UI.fmtKg(STORE.co2(kg)) + ' de CO₂e y ' + portions +
      ' raciones para tu vecinal. Publicar suma ' + STORE.POINTS_PUBLISH + ' puntos.';
  }

  /* ---------- Fechas ---------- */

  function datetimeFields() {
    var error = h('p', { class: 'font-body-sm text-body-sm text-error min-h-[16px]', text: ' ' });
    var now = Date.now();
    var defaultStart = new Date(now - 5 * 60000);
    var defaultEnd = new Date(now + 3 * 3600000);

    function localValue(d) {
      var pad = function (n) { return n < 10 ? '0' + n : String(n); };
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    var startInput = h('input', {
      type: 'datetime-local', id: 'pub-start', name: 'startTime', value: localValue(defaultStart),
      class: 'w-full h-[52px] bg-transparent pr-3 font-body-md text-body-md text-on-surface focus:outline-none'
    });
    var endInput = h('input', {
      type: 'datetime-local', id: 'pub-end', name: 'endTime', value: localValue(defaultEnd),
      class: 'w-full h-[52px] bg-transparent pr-3 font-body-md text-body-md text-on-surface focus:outline-none'
    });
    [startInput, endInput].forEach(function (i) { i.addEventListener('change', function () { error.textContent = ' '; }); });

    refs.startTime = { input: startInput, error: error };
    refs.endTime = { input: endInput, error: error };

    var presets = h('div', { class: 'flex flex-wrap gap-1.5' }, [
      preset('1 hora', 0, 60), preset('3 horas', 0, 180), preset('6 horas', 0, 360), preset('Mañana', 0, 60 * 24)
    ]);
    function preset(label, fromMin, toMin) {
      return h('button', {
        type: 'button',
        class: 'px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm active:scale-95 transition-transform',
        text: label,
        onclick: function () {
          startInput.value = localValue(new Date(Date.now() + fromMin * 60000));
          endInput.value = localValue(new Date(Date.now() + toMin * 60000));
          error.textContent = ' ';
        }
      });
    }

    return h('div', { class: 'flex flex-col gap-2' }, [
      h('div', { class: 'flex flex-col gap-1' }, [
        h('label', { class: 'font-label-md text-label-md text-on-surface-variant', for: 'pub-start', text: 'Disponible desde' }),
        h('div', { class: 'flex items-center bg-surface-container-high rounded-lg focus-within:bg-surface-container-lowest focus-within:shadow-md' }, [
          h('div', { class: 'w-12 h-[52px] flex items-center justify-center text-outline' }, [icon('play_arrow', 20)]), startInput
        ])
      ]),
      h('div', { class: 'flex flex-col gap-1' }, [
        h('label', { class: 'font-label-md text-label-md text-on-surface-variant', for: 'pub-end', text: 'Cierra el retiro' }),
        h('div', { class: 'flex items-center bg-surface-container-high rounded-lg focus-within:bg-surface-container-lowest focus-within:shadow-md' }, [
          h('div', { class: 'w-12 h-[52px] flex items-center justify-center text-outline' }, [icon('timer_off', 20)]), endInput
        ])
      ]),
      h('div', { class: 'flex flex-col gap-1' }, [
        h('span', { class: 'font-label-sm text-label-sm text-on-surface-variant', text: 'Atajos' }), presets
      ]),
      error
    ]);
  }

  /* ---------- Alergenos y toggles ---------- */

  function allergenPicker() {
    var wrap = h('div', { class: 'flex flex-col gap-1' }, [
      h('span', { class: 'font-label-md text-label-md text-on-surface-variant', text: 'Alérgenos presentes (opcional)' })
    ]);
    var row = h('div', { class: 'flex flex-wrap gap-1.5' });
    STORE.ALLERGENS.forEach(function (a) {
      var btn = h('button', {
        type: 'button', 'data-allergen': a, 'aria-pressed': 'false',
        class: 'px-3 py-2 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm active:scale-95 transition-transform',
        text: a,
        onclick: function () { toggleAllergen(a); }
      });
      row.appendChild(btn);
    });
    wrap.appendChild(row);
    return wrap;
  }

  function toggleAllergen(a) {
    var idx = selectedAllergens.indexOf(a);
    if (idx === -1) selectedAllergens.push(a); else selectedAllergens.splice(idx, 1);
    UI.$$('[data-allergen]').forEach(function (b) {
      var on = b.getAttribute('data-allergen') === a && selectedAllergens.indexOf(a) !== -1;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.className = 'px-3 py-2 rounded-full font-label-sm text-label-sm active:scale-95 transition-transform ' +
        (on ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container-high text-on-surface');
    });
  }

  function toggles() {
    function toggle(name, label, help, checked) {
      var input = h('input', { type: 'checkbox', id: 'pub-' + name, class: 'w-5 h-5 rounded accent-primary mt-0.5 shrink-0' });
      input.checked = !!checked;
      refs[name] = { input: input, error: h('p') };
      return h('label', { class: 'flex items-start gap-2.5 p-3 rounded-xl bg-surface-container cursor-pointer' }, [
        input,
        h('span', { class: 'flex flex-col' }, [
          h('span', { class: 'font-body-md text-body-md text-on-surface', text: label }),
          h('span', { class: 'font-body-sm text-body-sm text-on-surface-variant', text: help })
        ])
      ]);
    }
    return h('div', { class: 'flex flex-col gap-2' }, [
      toggle('needsFridge', 'Requiere refrigeración', 'Leche, quesos, carnes o preparados que no pueden quedar fuera del frío.'),
      toggle('consumeToday', 'Consumir hoy o mañana', 'Desactívalo si el alimento aguanta un par de días más.')
    ]);
  }

  /* ---------- Prefill / submit ---------- */

  function prefill(l) {
    refs.title.input.value = l.title;
    refs.description.input.value = l.description;
    refs.pickupAddress.input.value = l.pickupAddress;
    refs.pickupNotes.input.value = l.pickupNotes;
    selectCategory(l.category);
    refs.portionsTotal.set(l.portionsTotal);
    refs.weightKg.set(l.weightKg);
    refs.maxPerPerson.set(l.maxPerPerson);
    toLocalInput(refs.startTime.input, l.startTime);
    toLocalInput(refs.endTime.input, l.endTime);
    l.allergens.forEach(function (a) { if (selectedAllergens.indexOf(a) === -1) { selectedAllergens.push(a); toggleAllergen(a); } });
    refs.needsFridge.input.checked = !!l.needsFridge;
    refs.consumeToday.input.checked = l.consumeToday !== false;
    if (l.photo) {
      var img = UI.$('#publish-root img[alt="Foto del alimento"]');
      if (img) img.src = l.photo;
      refs.photo = { input: { value: l.photo }, error: h('p') };
    }
    updateImpact();
  }

  function toLocalInput(input, isoStr) {
    var d = new Date(isoStr);
    if (isNaN(d.getTime())) return;
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    input.value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function collect() {
    return {
      title: refs.title.input.value,
      description: refs.description.input.value,
      category: currentCategory(),
      photo: refs.photo ? refs.photo.input.value : '',
      portionsTotal: Number(refs.portionsTotal.input.value),
      weightKg: Number(refs.weightKg.input.value),
      maxPerPerson: Number(refs.maxPerPerson.input.value),
      startTime: refs.startTime.input.value,
      endTime: refs.endTime.input.value,
      allergens: selectedAllergens.slice(),
      needsFridge: refs.needsFridge.input.checked,
      consumeToday: refs.consumeToday.input.checked,
      pickupAddress: refs.pickupAddress.input.value,
      pickupNotes: refs.pickupNotes.input.value,
      safetyConfirmed: UI.$('#pub-safety').checked
    };
  }

  function showErrors(errors) {
    Object.keys(refs).forEach(function (k) { if (refs[k].error) refs[k].error.textContent = ' '; });
    var catError = UI.$('#pub-cat-error');
    if (catError) catError.textContent = ' ';
    errors.forEach(function (err) {
      if (err.field === 'safety' || err.field === 'safetyConfirmed') {
        if (refs.safetyConfirmed) refs.safetyConfirmed.error.textContent = err.message;
        return;
      }
      if (err.field === 'category') { if (catError) catError.textContent = err.message; return; }
      if (refs[err.field]) refs[err.field].error.textContent = err.message;
    });
    var firstKey = errors[0].field;
    var target = refs[firstKey] && refs[firstKey].input;
    if (target && target.focus) target.focus();
    else if (firstKey === 'safety') { var box = UI.$('#pub-safety'); if (box) box.focus(); }
    else if (firstKey === 'category') { var first = UI.$('[data-cat]'); if (first) first.focus(); }
  }

  function submitForm(submit) {
    var user = CP.auth.currentUser();
    var draft = collect();
    var existing = editingId ? STORE.getListing(editingId) : null;

    var errors = STORE.validateListingDraft(draft, user.id, existing);
    if (errors.length) {
      showErrors(errors);
      UI.toast('Revisa los campos marcados en rojo.', 'error');
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Guardando…';
    var user2 = CP.auth.currentUser();
    draft.lat = user2.lat;
    draft.lng = user2.lng;
    draft.zoneId = user2.zoneId;

    if (editingId) {
      var res = UI.withQuotaToast(function () { return STORE.updateListing(editingId, draft, user2.id); });
      if (!res) { submit.disabled = false; submit.textContent = 'Guardar cambios'; return; }
      if (res.error) { UI.toast('Solo puedes editar tus propias publicaciones.', 'error'); submit.disabled = false; submit.textContent = 'Guardar cambios'; return; }
      UI.toast('Cambios guardados.', 'success');
      window.location.href = 'detalle.html?id=' + encodeURIComponent(editingId);
      return;
    }

    var created = UI.withQuotaToast(function () { return STORE.createListing(draft, user2.id); });
    if (!created) { submit.disabled = false; submit.textContent = 'Publicar ahora'; return; }
    UI.toast('¡Publicaste ' + created.title + '! +' + STORE.POINTS_PUBLISH + ' puntos.', 'success');
    window.location.href = 'detalle.html?id=' + encodeURIComponent(created.id);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.ComParte = window.ComParte || {});
