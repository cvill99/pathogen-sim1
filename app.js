// ═══════════════════════════════════════════════════════════
// APP.JS — Main application controller
// ═══════════════════════════════════════════════════════════

const App = (() => {
  let simInterval = null;
  let speed = 1; // steps per tick
  let paused = false;
  let running = false;
  let selectedCity = 'BKK';
  let selectedResponse = 'none';
  let population = 8000000000;

  // Slider values store
  const vals = {};

  function init() {
    _buildNavTabs();
    _buildSliders();
    _buildSystemChecks();
    _buildSymptomTags();
    _buildResponses();
    _buildCityList();
    _initPreview();
    Charts.initAll();
    WorldMap.init();
    Biology.init(_getVirusParams());
    _loadPreset('covid'); // default
  }

  function _buildNavTabs() {
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab)?.classList.add('active');
        if (btn.dataset.tab === 'analytics') {
          Charts.refreshAll(Sim.getHistory(), WorldMap.getWatched(), population, getSetupVal('health_capacity'));
          Charts.renderSummary(Sim.getHistory(), _getVirusParams(), _getSetupParams());
        }
        if (btn.dataset.tab === 'body') {
          Biology.updateCharts();
        }
      });
    });
  }

  function _buildSliders() {
    // Build all slider groups
    const groups = [
      ['transmission','sliders-transmission'],
      ['timeline','sliders-timeline'],
      ['severity','sliders-severity'],
      ['immune','sliders-immune'],
      ['init','sliders-init'],
      ['timing','sliders-timing'],
      ['vaccine','sliders-vaccine'],
      ['sim','sliders-sim'],
    ];
    groups.forEach(([key, containerId]) => {
      const el = document.getElementById(containerId);
      if (!el) return;
      const defs = SLIDER_DEFS[key] || [];
      el.innerHTML = defs.map(d => {
        vals[d.id] = d.val;
        return `<div class="sl-row">
          <div class="sl-label">
            <span>${d.label}</span>
            <span class="sv${d.cls?(' '+d.cls(d.val)):''}" id="sv-${d.id}">${d.fmt(d.val)}</span>
          </div>
          <input type="range" id="sl-${d.id}" min="${d.min}" max="${d.max}" step="${d.step}" value="${d.val}"
            oninput="App.onSlider('${d.id}')">
          <div class="sl-ends"><span>${d.fmt(d.min)}</span><span>${d.fmt(d.max)}</span></div>
        </div>`;
      }).join('');
    });
  }

  function onSlider(id) {
    const el = document.getElementById('sl-' + id);
    if (!el) return;
    const val = parseFloat(el.value);
    vals[id] = val;
    // Find def
    let def = null;
    for (const key of Object.keys(SLIDER_DEFS)) {
      def = SLIDER_DEFS[key].find(d => d.id === id);
      if (def) break;
    }
    if (def) {
      const sv = document.getElementById('sv-' + id);
      if (sv) {
        sv.textContent = def.fmt(val);
        sv.className = 'sv' + (def.cls ? (' ' + def.cls(val)) : '');
      }
    }
    _updatePreview();
  }

  function _buildSystemChecks() {
    const el = document.getElementById('systems-checks');
    if (!el) return;
    el.innerHTML = BODY_SYSTEMS.map(s =>
      `<div class="sys-check" id="sys-${s.id}" onclick="App.toggleSystem('${s.id}')">
        <div class="sys-dot" style="background:${s.color}"></div>
        <span class="sys-lbl">${s.icon} ${s.name}</span>
      </div>`
    ).join('');
  }

  function toggleSystem(id) {
    const el = document.getElementById('sys-' + id);
    if (el) el.classList.toggle('on');
    _updatePreview();
  }

  function _getSelectedSystems() {
    return BODY_SYSTEMS.filter(s => document.getElementById('sys-'+s.id)?.classList.contains('on')).map(s => s.id);
  }

  function _buildSymptomTags() {
    const el = document.getElementById('symptoms-tags');
    if (!el) return;
    el.innerHTML = SYMPTOMS.map(s =>
      `<span class="sym-tag" id="sym-${s.replace(/[^a-z0-9]/gi,'_')}" onclick="App.toggleSymptom(this,'${s}')">${s}</span>`
    ).join('');
  }

  function toggleSymptom(el, name) {
    el.classList.toggle('on');
    _updatePreview();
  }

  function _getSelectedSymptoms() {
    return [...document.querySelectorAll('.sym-tag.on')].map(el => el.textContent);
  }

  function _buildResponses() {
    const el = document.getElementById('response-list');
    if (!el) return;
    el.innerHTML = RESPONSES.map(r =>
      `<div class="resp-card${r.id===selectedResponse?' sel':''}" id="resp-${r.id}" onclick="App.selectResponse('${r.id}')">
        <div class="resp-name">${r.name}</div>
        <div class="resp-desc">${r.desc}</div>
        <div class="resp-stats">
          <span>Transmission: ${Math.round(r.trans_mult*100)}%</span>
          <span>Mobility: ${Math.round(r.mob_mult*100)}%</span>
        </div>
      </div>`
    ).join('');
  }

  function selectResponse(id) {
    selectedResponse = id;
    document.querySelectorAll('.resp-card').forEach(el => el.classList.remove('sel'));
    document.getElementById('resp-'+id)?.classList.add('sel');
  }

  function overrideResponse() {
    const val = document.getElementById('live-response')?.value;
    if (val) selectResponse(val);
  }

  function _buildCityList(filter='') {
    const el = document.getElementById('city-list');
    if (!el) return;
    const cities = filter
      ? CITIES.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()) || c.country.toLowerCase().includes(filter.toLowerCase()))
      : CITIES;
    el.innerHTML = cities.slice(0,40).map(c =>
      `<div class="city-row${c.id===selectedCity?' sel':''}" onclick="App.selectCity('${c.id}')">
        <span>${c.name}, ${c.country}${c.hub?' ✈':''}</span>
        <span class="city-rpop">${fmtN(c.pop)}</span>
      </div>`
    ).join('');
  }

  function filterCities() {
    const q = document.getElementById('city-search')?.value || '';
    _buildCityList(q);
  }

  function selectCity(id) {
    selectedCity = id;
    _buildCityList(document.getElementById('city-search')?.value || '');
    const city = CITIES.find(c => c.id === id);
    const el = document.getElementById('seed-display');
    if (el && city) el.textContent = `📍 ${city.name}, ${city.country} — Pop: ${fmtN(city.pop)}`;
  }

  function updatePop() {
    population = parseInt(document.getElementById('pop-slider')?.value || 8e9);
    const el = document.getElementById('pop-display');
    if (el) el.textContent = fmtN(population);
  }

  function setPop(n) {
    population = n;
    const sl = document.getElementById('pop-slider');
    if (sl) sl.value = n;
    const el = document.getElementById('pop-display');
    if (el) el.textContent = fmtN(n);
  }

  function updateSetupSlider(key) {
    const el = document.getElementById(key === 'seedN' ? 'seed-n' : 'sl-' + key);
    if (!el) return;
    vals[key] = parseFloat(el.value);
    const valEl = document.getElementById(key === 'seedN' ? 'seed-n-val' : 'sv-' + key);
    if (valEl) valEl.textContent = Math.round(vals[key]);
  }

  function getSetupVal(key) {
    return vals[key] || 0;
  }

  // ── VIRUS PARAMS ──
  function _getVirusParams() {
    return {
      name: document.getElementById('v-name')?.value || 'Custom Pathogen',
      pathtype: document.getElementById('v-pathtype')?.value || 'rna',
      route: document.getElementById('v-route')?.value || 'airborne',
      origin: document.getElementById('v-origin')?.value || 'zoonotic',
      r0: vals.r0 || 2.5,
      env_survival: vals.env_survival || 24,
      mutation_rate: vals.mutation_rate || 3,
      zoonotic: vals.zoonotic || 5,
      aerosol_range: vals.aerosol_range || 1.5,
      infectious_dose: vals.infectious_dose || 100,
      incubation: vals.incubation || 5,
      presymptomatic: vals.presymptomatic || 2,
      infectious_period: vals.infectious_period || 10,
      illness_duration: vals.illness_duration || 14,
      time_to_death: vals.time_to_death || 14,
      ifr: vals.ifr || 1.8,
      asymp_rate: vals.asymp_rate || 40,
      hosp_rate: vals.hosp_rate || 5,
      icu_rate: vals.icu_rate || 1,
      severity_index: vals.severity_index || 3,
      immune_evasion: vals.immune_evasion || 3,
      reinfection_risk: vals.reinfection_risk || 10,
      crossimmunity: vals.crossimmunity || 0,
      neuro: document.getElementById('v-neuro')?.checked || false,
      immunosupp: document.getElementById('v-immunosupp')?.checked || false,
      cytokine: document.getElementById('v-cytokine')?.checked || false,
      antibiotic: document.getElementById('v-antibiotic')?.checked || false,
      latent: document.getElementById('v-latent')?.checked || false,
      systems: _getSelectedSystems(),
      symptoms: _getSelectedSymptoms(),
      ageIFR: {
        '0': parseFloat(document.getElementById('ifr-0')?.value || .001),
        '10': parseFloat(document.getElementById('ifr-10')?.value || .003),
        '20': parseFloat(document.getElementById('ifr-20')?.value || .01),
        '30': parseFloat(document.getElementById('ifr-30')?.value || .03),
        '40': parseFloat(document.getElementById('ifr-40')?.value || .1),
        '50': parseFloat(document.getElementById('ifr-50')?.value || .3),
        '60': parseFloat(document.getElementById('ifr-60')?.value || 1.2),
        '70': parseFloat(document.getElementById('ifr-70')?.value || 4.0),
        '80': parseFloat(document.getElementById('ifr-80')?.value || 10.0),
      },
    };
  }

  function _getSetupParams() {
    const resp = RESPONSES.find(r => r.id === selectedResponse) || RESPONSES[0];
    return {
      population,
      seedCity: selectedCity,
      seedN: parseInt(document.getElementById('seed-n')?.value || 5),
      init_immunity: vals.init_immunity || 0,
      health_capacity: vals.health_capacity || 3,
      pop_density_mult: vals.pop_density_mult || 1,
      response_day: vals.response_day || 30,
      detect_delay: vals.detect_delay || 14,
      border_close_day: vals.border_close_day || 60,
      response: selectedResponse,
      response_trans_mult: resp.trans_mult,
      response_mob_mult: resp.mob_mult,
      vaccine_day: vals.vaccine_day || 365,
      vaccine_eff: vals.vaccine_eff || 85,
      vaccine_rate: vals.vaccine_rate || .3,
      antiviral_day: vals.antiviral_day || 180,
      antiviral_eff: vals.antiviral_eff || 50,
      sim_days: vals.sim_days || 365,
    };
  }

  // ── PREVIEW UPDATE ──
  function _initPreview() {
    _updatePreview();
  }

  function _updatePreview() {
    const vp = _getVirusParams();
    document.getElementById('p-name').textContent = vp.name;
    document.getElementById('p-sub').textContent =
      (SLIDER_DEFS.transmission ? '' : '') +
      document.getElementById('v-pathtype')?.selectedOptions[0]?.text?.split('(')[0]?.trim() + ' · ' +
      document.getElementById('v-route')?.selectedOptions[0]?.text?.split('(')[0]?.trim();

    // R0
    const r0 = vp.r0;
    document.getElementById('p-r0').textContent = r0.toFixed(1);
    document.getElementById('p-r0-cls').textContent = r0<1?'Contained':r0<2?'Low spread':r0<4?'Moderate':r0<8?'High spread':r0<12?'Very high':'Extreme (measles-level)';

    // IFR
    document.getElementById('p-ifr').textContent = vp.ifr.toFixed(3) + '%';
    document.getElementById('p-ifr-cls').textContent = vp.ifr<.01?'Extremely low':vp.ifr<.1?'Low':vp.ifr<1?'Moderate':vp.ifr<5?'High':vp.ifr<30?'Very high':'Extreme';

    // Doubling time
    const dt = r0 > 1 ? (Math.log(2) / Math.log(r0) * (vp.infectious_period||10)).toFixed(1) : '∞';
    document.getElementById('p-dt').textContent = dt === '∞' ? '∞' : dt + 'd';

    // Serial interval
    const si = ((vp.incubation||5) + (vp.presymptomatic||2)).toFixed(1);
    document.getElementById('p-si').textContent = si + 'd';

    // Threat index (0–100)
    const r0Score = Math.min(25, r0 / 20 * 25);
    const ifrScore = Math.min(40, (vp.ifr/100) * 40);
    const evasScore = vp.immune_evasion / 10 * 15;
    const mutScore = vp.mutation_rate / 10 * 10;
    const neuroBonus = vp.neuro ? 5 : 0;
    const cytoBonus = vp.cytokine ? 5 : 0;
    const threat = Math.min(100, Math.round(r0Score + ifrScore + evasScore + mutScore + neuroBonus + cytoBonus));
    document.getElementById('p-threat').textContent = threat + '/100';
    document.getElementById('p-threat-fill').style.width = threat + '%';

    // Comparable
    const comps = [];
    if (Math.abs(r0-1.4)<.5 && Math.abs(vp.ifr-.1)<.15) comps.push('Similar to: Seasonal flu');
    if (Math.abs(r0-2.9)<1 && Math.abs(vp.ifr-1)<.5) comps.push('Similar to: COVID-19');
    if (r0>12) comps.push('Transmission like: Measles');
    if (vp.ifr>40) comps.push('Lethality like: Ebola');
    if (r0<1) comps.push('⚠️ Self-limiting — R₀ < 1, cannot sustain outbreak');
    document.getElementById('p-compare').textContent = comps.join(' • ') || 'Novel pathogen — no close analog';

    // Projections
    const worldPop = 8e9;
    const herdImmunity = r0 > 0 ? (1 - 1/r0) * 100 : 0;
    const potentialInf = Math.round(worldPop * Math.min(.98, herdImmunity/100 * 1.1));
    const potentialDead = Math.round(potentialInf * vp.ifr / 100);
    document.getElementById('p-proj-inf').textContent = fmtN(potentialInf);
    document.getElementById('p-proj-dead').textContent = fmtN(potentialDead);
    const days1m = r0 > 1 ? Math.round(Math.log(1e6/5) / Math.log(r0) * (vp.infectious_period||10)) : 9999;
    document.getElementById('p-proj-1m').textContent = days1m > 999 ? 'Never' : 'Day ~' + days1m;
    document.getElementById('p-proj-hosp').textContent = fmtN(Math.round(potentialInf * vp.hosp_rate / 100));

    // Active systems pills
    const sysPillEl = document.getElementById('p-systems');
    if (sysPillEl) {
      const activeSys = vp.systems;
      sysPillEl.innerHTML = activeSys.map(id => {
        const s = BODY_SYSTEMS.find(b => b.id === id);
        return s ? `<span class="sys-pill" style="color:${s.color};border-color:${s.color}">${s.icon} ${s.name}</span>` : '';
      }).join('');
    }

    // Symptom pills
    const symPillEl = document.getElementById('p-symptoms');
    if (symPillEl) {
      symPillEl.innerHTML = vp.symptoms.slice(0,10).map(s =>
        `<span class="sym-pill">${s}</span>`
      ).join('');
    }
  }

  // ── PRESETS ──
  function loadPreset(name) {
    const p = PRESETS[name];
    if (!p) return;

    // Set identity fields
    if (document.getElementById('v-name')) document.getElementById('v-name').value = p.name;
    if (document.getElementById('v-pathtype')) document.getElementById('v-pathtype').value = p.pathtype;
    if (document.getElementById('v-route')) document.getElementById('v-route').value = p.route;
    if (document.getElementById('v-origin')) document.getElementById('v-origin').value = p.origin;

    // Set sliders
    const allDefs = Object.values(SLIDER_DEFS).flat();
    allDefs.forEach(d => {
      if (p[d.id] !== undefined) {
        vals[d.id] = p[d.id];
        const sl = document.getElementById('sl-' + d.id);
        if (sl) sl.value = p[d.id];
        const sv = document.getElementById('sv-' + d.id);
        if (sv) sv.textContent = d.fmt(p[d.id]);
      }
    });

    // Set checkboxes
    ['neuro','immunosupp','cytokine','antibiotic','latent'].forEach(key => {
      const el = document.getElementById('v-'+key);
      if (el) el.checked = p[key] || false;
    });

    // Set systems
    document.querySelectorAll('.sys-check').forEach(el => el.classList.remove('on'));
    (p.systems || []).forEach(id => document.getElementById('sys-'+id)?.classList.add('on'));

    // Set symptoms
    document.querySelectorAll('.sym-tag').forEach(el => el.classList.remove('on'));
    (p.symptoms || []).forEach(sym => {
      const sid = sym.replace(/[^a-z0-9]/gi,'_');
      document.getElementById('sym-'+sid)?.classList.add('on');
    });

    // Setup defaults
    if (p.response) selectResponse(p.response);
    if (p.response_day && document.getElementById('sl-response_day')) {
      vals.response_day = p.response_day;
      document.getElementById('sl-response_day').value = p.response_day;
      const sv = document.getElementById('sv-response_day');
      if (sv) sv.textContent = 'Day ' + p.response_day;
    }
    if (p.vaccine_day) {
      vals.vaccine_day = p.vaccine_day;
      const sl = document.getElementById('sl-vaccine_day');
      if (sl) sl.value = p.vaccine_day;
      const sv = document.getElementById('sv-vaccine_day');
      if (sv) sv.textContent = p.vaccine_day + 'd';
    }
    if (p.vaccine_eff) {
      vals.vaccine_eff = p.vaccine_eff;
      const sl = document.getElementById('sl-vaccine_eff');
      if (sl) sl.value = p.vaccine_eff;
      const sv = document.getElementById('sv-vaccine_eff');
      if (sv) sv.textContent = p.vaccine_eff + '%';
    }

    _updatePreview();
    Biology.init(_getVirusParams());
  }

  // ── SIMULATION CONTROL ──
  function run() {
    if (running) return;
    running = true;
    paused = false;

    const vp = _getVirusParams();
    const sp = _getSetupParams();

    Sim.init(vp, sp);
    Biology.init(vp);

    document.getElementById('run-btn')?.classList.add('hidden');
    document.getElementById('world-run-btn')?.classList.add('hidden');
    document.getElementById('pause-btn')?.classList.remove('hidden');
    document.getElementById('world-pause-btn')?.classList.remove('hidden');

    // Navigate to world map
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('.tab[data-tab="world"]')?.classList.add('active');
    document.getElementById('tab-world')?.classList.add('active');

    simInterval = setInterval(_tick, 80);
  }

  function _tick() {
    if (paused) return;
    for (let i = 0; i < speed; i++) {
      if (Sim.isDone()) { _stop(); return; }
      Sim.step();
    }
    _updateUI();
  }

  function _updateUI() {
    const s = Sim.getState();
    if (!s) return;

    // Header ticker
    document.getElementById('t-s').textContent = fmtN(Math.round(s.S));
    document.getElementById('t-e').textContent = fmtN(Math.round(s.E));
    document.getElementById('t-i').textContent = fmtN(Math.round(s.I));
    document.getElementById('t-r').textContent = fmtN(Math.round(s.R));
    document.getElementById('t-d').textContent = fmtN(Math.round(s.D));
    document.getElementById('t-day').textContent = s.day;
    document.getElementById('map-day').textContent = s.day;

    WorldMap.update();
    WorldMap.renderWorldStats();
    WorldMap.renderTopCities();
    WorldMap.renderWatchedList();
  }

  function _stop() {
    clearInterval(simInterval);
    simInterval = null;
    running = false;
    document.getElementById('run-btn')?.classList.remove('hidden');
    document.getElementById('world-run-btn')?.classList.remove('hidden');
    document.getElementById('pause-btn')?.classList.add('hidden');
    document.getElementById('world-pause-btn')?.classList.add('hidden');

    // Refresh analytics
    const vp = _getVirusParams();
    const sp = _getSetupParams();
    Charts.refreshAll(Sim.getHistory(), WorldMap.getWatched(), population, sp.health_capacity);
    Charts.renderSummary(Sim.getHistory(), vp, sp);
  }

  function togglePause() {
    paused = !paused;
    const btns = document.querySelectorAll('.pause-btn');
    btns.forEach(b => {
      b.textContent = paused ? '▶ RESUME' : '⏸';
      b.style.background = paused ? 'var(--success)' : '';
      b.style.color = paused ? '#000' : '';
    });
  }

  function reset() {
    clearInterval(simInterval);
    simInterval = null;
    running = false;
    paused = false;
    document.getElementById('run-btn')?.classList.remove('hidden');
    document.getElementById('world-run-btn')?.classList.remove('hidden');
    document.getElementById('pause-btn')?.classList.add('hidden');
    document.getElementById('world-pause-btn')?.classList.add('hidden');
    document.getElementById('t-s').textContent =
    document.getElementById('t-e').textContent =
    document.getElementById('t-i').textContent =
    document.getElementById('t-r').textContent =
    document.getElementById('t-d').textContent = '—';
    document.getElementById('t-day').textContent = '0';
    document.getElementById('map-day').textContent = '0';
    WorldMap.update();
  }

  function setSpeed(n) {
    speed = n;
    document.querySelectorAll('.spd-btn,[id^=spd-]').forEach(b => b.classList.remove('active'));
    document.getElementById('spd-'+n)?.classList.add('active');
  }

  function setMapView(v) { WorldMap.setMapView(v); }

  return {
    init, run, reset, togglePause, setSpeed,
    loadPreset, onSlider, updatePop, setPop, filterCities, selectCity,
    selectResponse, overrideResponse, setMapView,
    toggleSystem, toggleSymptom,
    updateSetupSlider,
    setBioStage: (s) => Biology.setStage(s),
  };
})();

// ── BOOT ──
window.addEventListener('load', () => {
  App.init();
  // Init default city selection
  App.selectCity('BKK');
});

window.addEventListener('resize', () => {
  // Re-init map on resize
  WorldMap.init();
});
