// ═══════════════════════════════════════════════════════════
// WORLDMAP.JS — D3 world map with city outbreak visualization
// ═══════════════════════════════════════════════════════════

const WorldMap = (() => {
  let svg = null, g = null;
  let projection = null, path = null;
  let width = 0, height = 0;
  let worldData = null;
  let cityElements = {};
  let watchedCities = new Set();
  let mapView = 'circles';
  let initialized = false;

  // Embedded simplified world path data — we'll use D3's built-in sphere + graticule
  // and fetch a minimal topojson
  async function init() {
    svg = d3.select('#world-svg');
    const wrap = document.getElementById('map-wrap');
    width = wrap.clientWidth;
    height = wrap.clientHeight;

    svg.attr('width', width).attr('height', height);

    projection = d3.geoNaturalEarth1()
      .scale(width / 6.5)
      .translate([width / 2, height / 2]);
    path = d3.geoPath().projection(projection);

    // Background
    svg.append('rect')
      .attr('width', width).attr('height', height)
      .attr('fill', '#03050c');

    // Graticule
    const graticule = d3.geoGraticule();
    svg.append('path')
      .datum(graticule())
      .attr('class', 'graticule')
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', '#0a0f1e')
      .attr('stroke-width', .5);

    g = svg.append('g').attr('class', 'map-g');

    // Load world topo
    try {
      const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
      worldData = await res.json();
      const countries = topojson.feature(worldData, worldData.objects.countries);
      g.selectAll('.country')
        .data(countries.features)
        .enter().append('path')
        .attr('class', 'country')
        .attr('d', path);
    } catch(e) {
      // Fallback: just sphere
      svg.insert('path', '.graticule')
        .datum({type:'Sphere'})
        .attr('d', path)
        .attr('fill', '#0a0d18');
    }

    // City circles layer (SVG)
    const cityG = svg.append('g').attr('class', 'cities-g');

    CITIES.forEach(city => {
      const [x, y] = projection([city.lng, city.lat]);
      if (x < 0 || x > width || y < 0 || y > height) return;

      const grp = cityG.append('g')
        .attr('class', 'city-grp')
        .attr('data-id', city.id)
        .style('cursor', 'pointer')
        .on('click', () => toggleWatch(city.id))
        .on('mouseover', (e) => showTooltip(e, city.id))
        .on('mousemove', (e) => moveTooltip(e))
        .on('mouseout', hideTooltip);

      grp.append('circle')
        .attr('class', 'city-circle')
        .attr('cx', x).attr('cy', y)
        .attr('r', 3)
        .attr('fill', '#00e676')
        .attr('opacity', .7)
        .attr('stroke', 'none');

      if (city.hub) {
        grp.append('text')
          .attr('class', 'city-label-svg')
          .attr('x', x + 5).attr('y', y + 3)
          .text(city.name);
      }

      cityElements[city.id] = grp;
    });

    initialized = true;
  }

  function update() {
    if (!initialized) return;
    const cityData = Sim.getCityStates();
    if (!cityData) return;

    const maxI = Math.max(1, ...Object.values(cityData).map(c => c.I));

    Object.entries(cityElements).forEach(([id, grp]) => {
      const c = cityData[id];
      if (!c) return;
      const total = c.S + c.E + c.I + c.R + c.D;
      if (total === 0) return;

      const infFrac = c.I / total;
      const expFrac = (c.I + c.E) / total;
      const deadFrac = c.D / total;

      // Color
      let color, opacity;
      if (c.I > 0) {
        if (infFrac > .3) { color = '#ff1744'; opacity = .9; }
        else if (infFrac > .1) { color = '#ff6d00'; opacity = .85; }
        else if (infFrac > .01) { color = '#ffea00'; opacity = .8; }
        else { color = '#ffff00'; opacity = .7; }
      } else if (c.E > 0) {
        color = '#ffea00'; opacity = .75;
      } else if (c.D / total > .1) {
        color = '#444'; opacity = .7;
      } else if (c.R / total > .5) {
        color = '#00e676'; opacity = .6;
      } else {
        color = '#00e676'; opacity = .5;
      }

      // Radius — scale with infected count, min 3
      const r = watchedCities.has(id)
        ? Math.max(5, Math.min(25, 3 + Math.sqrt(c.I) / 50))
        : Math.max(3, Math.min(20, 3 + Math.sqrt(c.I) / 60));

      grp.select('circle')
        .attr('r', r)
        .attr('fill', color)
        .attr('opacity', opacity);

      // Pulse ring for high outbreak
      if (c.I > 1000) {
        let ring = grp.select('.pulse-ring');
        if (ring.empty()) {
          const [cx] = grp.select('circle').attr('cx');
          ring = grp.insert('circle', '.city-circle')
            .attr('class', 'pulse-ring')
            .attr('cx', grp.select('circle').attr('cx'))
            .attr('cy', grp.select('circle').attr('cy'))
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 1.5)
            .attr('opacity', .6);
        }
        ring.attr('r', r + 4).attr('stroke', color);
      }

      // Watch indicator
      if (watchedCities.has(id)) {
        let ring2 = grp.select('.watch-ring');
        if (ring2.empty()) {
          ring2 = grp.append('circle')
            .attr('class', 'watch-ring')
            .attr('cx', grp.select('circle').attr('cx'))
            .attr('cy', grp.select('circle').attr('cy'))
            .attr('fill', 'none')
            .attr('stroke', '#00e5ff')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '4,2');
        }
        ring2.attr('r', r + 7);
      }
    });
  }

  function toggleWatch(cityId) {
    if (watchedCities.has(cityId)) {
      watchedCities.delete(cityId);
      const grp = cityElements[cityId];
      if (grp) grp.select('.watch-ring').remove();
    } else {
      watchedCities.add(cityId);
    }
    renderWatchedList();
  }

  function renderWatchedList() {
    const el = document.getElementById('watched-list');
    if (!el) return;
    const cityData = Sim.getCityStates();
    if (!watchedCities.size) { el.innerHTML = '<div class="hint">No cities watched yet.</div>'; return; }
    el.innerHTML = [...watchedCities].map(id => {
      const city = CITIES.find(c => c.id === id);
      const data = cityData ? cityData[id] : null;
      return `<div class="watched-row">
        <span style="color:var(--acc2)">${city?.name || id}</span>
        <span style="color:var(--danger);font-weight:700">${data ? fmtN(Math.round(data.I)) : '—'}</span>
        <span class="w-rm" onclick="WorldMap.removeWatch('${id}')">×</span>
      </div>`;
    }).join('');
  }

  function removeWatch(cityId) {
    watchedCities.delete(cityId);
    const grp = cityElements[cityId];
    if (grp) grp.select('.watch-ring').remove();
    renderWatchedList();
  }

  function renderTopCities() {
    const el = document.getElementById('top-outbreak-list');
    if (!el) return;
    const top = Sim.getTopCities(8);
    if (!top.length) { el.innerHTML = '<div class="hint">No outbreaks yet.</div>'; return; }
    const maxI = Math.max(1, top[0].I);
    el.innerHTML = top.map((c, i) => {
      const pct = Math.round(c.I / maxI * 100);
      return `<div class="top-city-entry">
        <div style="display:flex;justify-content:space-between">
          <span style="color:var(--txt2)">${i+1}. ${c.name}</span>
          <span style="color:var(--danger);font-weight:700">${fmtN(Math.round(c.I))}</span>
        </div>
        <div class="tc-bar" style="width:${pct}%"></div>
      </div>`;
    }).join('');
  }

  function renderWorldStats() {
    const el = document.getElementById('world-stats-list');
    if (!el) return;
    const s = Sim.getState();
    if (!s) return;
    const rows = [
      ['Susceptible', fmtN(Math.round(s.S)), ''],
      ['Exposed', fmtN(Math.round(s.E)), 'warn'],
      ['Infected', fmtN(Math.round(s.I)), 'danger'],
      ['Recovered', fmtN(Math.round(s.R)), 'success'],
      ['Dead', fmtN(Math.round(s.D)), 'muted'],
      ['Cities hit', s.citiesInfected + '/' + CITIES.length, ''],
      ['R(t)', s.rt.toFixed(2), s.rt > 1 ? 'danger' : 'success'],
      ['New cases/day', fmtN(Math.round(s.newCasesDay)), 'warn'],
    ];
    el.innerHTML = rows.map(([k,v,cls]) =>
      `<div class="world-stat-row"><span>${k}</span><span class="${cls}">${v}</span></div>`
    ).join('');
  }

  function showTooltip(e, cityId) {
    const city = CITIES.find(c => c.id === cityId);
    const data = Sim.getCityStates()?.[cityId];
    if (!city || !data) return;
    const tip = document.getElementById('tooltip');
    tip.classList.remove('hidden');
    const total = data.pop;
    tip.innerHTML = `<b>${city.name}, ${city.country}</b><br>
      Population: ${fmtN(total)}<br>
      Infected: <span style="color:#ff1744">${fmtN(Math.round(data.I))}</span><br>
      Exposed: <span style="color:#ffea00">${fmtN(Math.round(data.E))}</span><br>
      Recovered: <span style="color:#00e676">${fmtN(Math.round(data.R))}</span><br>
      Dead: <span style="color:#666">${fmtN(Math.round(data.D))}</span><br>
      Hospitalized: ${fmtN(data.hospit)}<br>
      ${data.firstInfected >= 0 ? 'First case: Day '+data.firstInfected : 'Not yet affected'}`;
    tip.style.left = (e.clientX + 12) + 'px';
    tip.style.top = (e.clientY - 10) + 'px';
  }

  function moveTooltip(e) {
    const tip = document.getElementById('tooltip');
    tip.style.left = (e.clientX + 12) + 'px';
    tip.style.top = (e.clientY - 10) + 'px';
  }

  function hideTooltip() {
    document.getElementById('tooltip').classList.add('hidden');
  }

  function setMapView(v) {
    mapView = v;
    document.querySelectorAll('.mv-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('mv-'+v)?.classList.add('active');
  }

  function getWatched() { return [...watchedCities]; }

  return { init, update, toggleWatch, removeWatch, renderWatchedList, renderTopCities, renderWorldStats, setMapView, getWatched };
})();

function fmtN(n) {
  if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return n.toString();
}
