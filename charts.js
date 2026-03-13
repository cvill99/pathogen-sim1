// ═══════════════════════════════════════════════════════════
// CHARTS.JS — All Chart.js visualizations
// ═══════════════════════════════════════════════════════════

const Charts = (() => {
  let charts = {};

  const DARK = {
    bg: '#101323',
    grid: '#1e2338',
    text: '#6a7290',
  };

  const defaults = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: {
        labels: { color: DARK.text, font: { family: 'Courier New', size: 10 }, boxWidth: 12 }
      },
      tooltip: {
        backgroundColor: 'rgba(6,8,16,.95)',
        titleColor: '#00e5ff',
        bodyColor: '#c0c6e0',
        borderColor: '#252a3f',
        borderWidth: 1,
      }
    },
    scales: {
      x: {
        ticks: { color: DARK.text, font: { size: 9, family: 'Courier New' }, maxTicksLimit: 10 },
        grid: { color: DARK.grid }
      },
      y: {
        ticks: { color: DARK.text, font: { size: 9, family: 'Courier New' }, maxTicksLimit: 6,
          callback: v => v >= 1e9 ? (v/1e9).toFixed(1)+'B' : v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : v },
        grid: { color: DARK.grid }
      }
    }
  };

  function deepMerge(base, over) {
    const out = {...base};
    for (const k in over) {
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k])) {
        out[k] = deepMerge(base[k] || {}, over[k]);
      } else {
        out[k] = over[k];
      }
    }
    return out;
  }

  function make(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    if (charts[id]) { charts[id].destroy(); }
    charts[id] = new Chart(canvas, config);
    return charts[id];
  }

  function update(id, labels, datasets) {
    const c = charts[id];
    if (!c) return;
    c.data.labels = labels;
    c.data.datasets = datasets;
    c.update('none');
  }

  function initAll() {
    const cfg = deepMerge(defaults, {});

    make('chart-epidemic', {
      type: 'line',
      data: { labels: [], datasets: [
        {label:'Susceptible', data:[], borderColor:'#00e676', backgroundColor:'rgba(0,230,118,.08)', fill:true, tension:.3, pointRadius:0, borderWidth:2},
        {label:'Exposed', data:[], borderColor:'#ffea00', backgroundColor:'rgba(255,234,0,.06)', fill:true, tension:.3, pointRadius:0, borderWidth:1.5},
        {label:'Infected', data:[], borderColor:'#ff1744', backgroundColor:'rgba(255,23,68,.12)', fill:true, tension:.3, pointRadius:0, borderWidth:2},
        {label:'Recovered', data:[], borderColor:'#00e5ff', backgroundColor:'rgba(0,229,255,.06)', fill:true, tension:.3, pointRadius:0, borderWidth:1.5},
        {label:'Dead', data:[], borderColor:'#555', backgroundColor:'rgba(85,85,85,.08)', fill:true, tension:.3, pointRadius:0, borderWidth:1.5},
      ]},
      options: deepMerge(cfg, { plugins:{ legend:{ display:true } } }),
    });

    make('chart-rt', {
      type: 'line',
      data: { labels: [], datasets: [
        {label:'R(t)', data:[], borderColor:'#2979ff', backgroundColor:'rgba(41,121,255,.1)', fill:true, tension:.3, pointRadius:0, borderWidth:2},
        {label:'R=1 (threshold)', data:[], borderColor:'rgba(255,234,0,.4)', borderDash:[5,5], pointRadius:0, borderWidth:1},
      ]},
      options: deepMerge(cfg, {
        scales:{ y:{ min:0, max:5, ticks:{ callback: v=>v.toFixed(1) } } }
      }),
    });

    make('chart-daily', {
      type: 'bar',
      data: { labels: [], datasets: [
        {label:'Daily Cases', data:[], backgroundColor:'rgba(255,110,0,.7)', borderColor:'#ff6d00', borderWidth:1},
        {label:'Daily Deaths', data:[], backgroundColor:'rgba(255,23,68,.7)', borderColor:'#ff1744', borderWidth:1},
      ]},
      options: deepMerge(cfg, {}),
    });

    make('chart-health', {
      type: 'line',
      data: { labels: [], datasets: [
        {label:'Hospitalized', data:[], borderColor:'#ff6d00', backgroundColor:'rgba(255,109,0,.1)', fill:true, tension:.3, pointRadius:0, borderWidth:2},
        {label:'ICU', data:[], borderColor:'#ff1744', backgroundColor:'rgba(255,23,68,.1)', fill:true, tension:.3, pointRadius:0, borderWidth:2},
        {label:'Capacity (beds)', data:[], borderColor:'rgba(0,229,255,.4)', borderDash:[5,5], pointRadius:0, borderWidth:1.5},
      ]},
      options: deepMerge(cfg, {}),
    });

    make('chart-spread', {
      type: 'line',
      data: { labels: [], datasets: [
        {label:'Cities with active outbreak', data:[], borderColor:'#d500f9', backgroundColor:'rgba(213,0,249,.1)', fill:true, tension:.3, pointRadius:0, borderWidth:2},
      ]},
      options: deepMerge(cfg, { scales:{ y:{ min:0, max: CITIES.length } } }),
    });

    make('chart-cities', {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: deepMerge(cfg, { plugins:{ legend:{ display:true } } }),
    });

    make('chart-age', {
      type: 'bar',
      data: {
        labels: ['0-9','10-19','20-29','30-39','40-49','50-59','60-69','70-79','80+'],
        datasets: [{
          label:'Deaths by age group',
          data: [0,0,0,0,0,0,0,0,0],
          backgroundColor: [
            'rgba(0,230,118,.7)','rgba(0,230,118,.7)','rgba(41,121,255,.7)',
            'rgba(255,110,0,.5)','rgba(255,110,0,.7)','rgba(255,110,0,.9)',
            'rgba(255,23,68,.7)','rgba(255,23,68,.9)','rgba(255,23,68,1)',
          ],
        }]
      },
      options: deepMerge(cfg, {}),
    });

    make('chart-intervention', {
      type: 'line',
      data: { labels: [], datasets: [
        {label:'No response (projected)', data:[], borderColor:'rgba(255,23,68,.5)', borderDash:[6,3], pointRadius:0, borderWidth:1.5},
        {label:'With intervention', data:[], borderColor:'#00e676', backgroundColor:'rgba(0,230,118,.07)', fill:true, tension:.3, pointRadius:0, borderWidth:2},
      ]},
      options: deepMerge(cfg, {}),
    });
  }

  function refreshAll(history, watchedCityIds, totalPop, healthCapBeds) {
    if (!history || history.length === 0) return;
    const labels = history.map(h => 'Day ' + h.day);
    const every = Math.max(1, Math.floor(history.length / 200)); // downsample for perf
    const h = history.filter((_,i) => i % every === 0);
    const lbl = h.map(x => 'D'+x.day);

    // Epidemic curve
    update('chart-epidemic', lbl, [
      {label:'Susceptible', data:h.map(x=>x.S), borderColor:'#00e676', backgroundColor:'rgba(0,230,118,.08)', fill:true, tension:.3, pointRadius:0, borderWidth:2},
      {label:'Exposed', data:h.map(x=>x.E), borderColor:'#ffea00', backgroundColor:'rgba(255,234,0,.06)', fill:true, tension:.3, pointRadius:0, borderWidth:1.5},
      {label:'Infected', data:h.map(x=>x.I), borderColor:'#ff1744', backgroundColor:'rgba(255,23,68,.12)', fill:true, tension:.3, pointRadius:0, borderWidth:2},
      {label:'Recovered', data:h.map(x=>x.R), borderColor:'#00e5ff', backgroundColor:'rgba(0,229,255,.06)', fill:true, tension:.3, pointRadius:0, borderWidth:1.5},
      {label:'Dead', data:h.map(x=>x.D), borderColor:'#555', backgroundColor:'rgba(85,85,85,.08)', fill:true, tension:.3, pointRadius:0, borderWidth:1.5},
    ]);

    // R(t)
    update('chart-rt', lbl, [
      {label:'R(t)', data:h.map(x=>Math.min(6,x.rt.toFixed(2))), borderColor:'#2979ff', backgroundColor:'rgba(41,121,255,.1)', fill:true, tension:.3, pointRadius:0, borderWidth:2},
      {label:'R=1', data:h.map(()=>1), borderColor:'rgba(255,234,0,.4)', borderDash:[5,5], pointRadius:0, borderWidth:1},
    ]);

    // Daily
    const stride = Math.max(1, Math.floor(h.length/80));
    const hD = h.filter((_,i)=>i%stride===0);
    update('chart-daily', hD.map(x=>'D'+x.day), [
      {label:'Daily Cases', data:hD.map(x=>Math.round(x.newCases)), backgroundColor:'rgba(255,110,0,.7)', borderColor:'#ff6d00', borderWidth:1},
      {label:'Daily Deaths', data:hD.map(x=>Math.round(x.newDeaths)), backgroundColor:'rgba(255,23,68,.7)', borderColor:'#ff1744', borderWidth:1},
    ]);

    // Healthcare
    const bedCap = Math.round(totalPop * (healthCapBeds||3) / 1000);
    update('chart-health', lbl, [
      {label:'Hospitalized', data:h.map(x=>x.hospit||0), borderColor:'#ff6d00', backgroundColor:'rgba(255,109,0,.1)', fill:true, tension:.3, pointRadius:0, borderWidth:2},
      {label:'ICU', data:h.map(x=>x.icu||0), borderColor:'#ff1744', backgroundColor:'rgba(255,23,68,.1)', fill:true, tension:.3, pointRadius:0, borderWidth:2},
      {label:'Capacity', data:h.map(()=>bedCap), borderColor:'rgba(0,229,255,.4)', borderDash:[5,5], pointRadius:0, borderWidth:1.5},
    ]);

    // Spread
    update('chart-spread', lbl, [
      {label:'Cities infected', data:h.map(x=>x.citiesInfected), borderColor:'#d500f9', backgroundColor:'rgba(213,0,249,.1)', fill:true, tension:.3, pointRadius:0, borderWidth:2},
    ]);

    // City comparison
    const cityData = Sim.getCityStates();
    if (watchedCityIds && watchedCityIds.length > 0) {
      const cityColors = ['#ff1744','#2979ff','#00e676','#ffea00','#d500f9','#ff6d00','#00e5ff','#69f0ae'];
      const datasets = watchedCityIds.slice(0,8).map((id, i) => {
        const city = CITIES.find(c=>c.id===id);
        const cData = cityData?.[id];
        const cHist = cData?.history || [];
        const cLbl = cHist.filter((_,j)=>j%every===0).map(x=>x.I);
        return {
          label: city?.name || id,
          data: cLbl,
          borderColor: cityColors[i],
          pointRadius: 0, borderWidth: 2, tension: .3,
        };
      });
      const cityLbls = (cityData?.[watchedCityIds[0]]?.history || []).filter((_,i)=>i%every===0).map(x=>'D'+x.day);
      update('chart-cities', cityLbls, datasets);
    }

    // Age
    const totalDead = history[history.length-1]?.D || 0;
    const ageWeights = [.001,.003,.01,.03,.1,.3,1.2,4.0,10.0];
    const ageSum = ageWeights.reduce((a,b)=>a+b,0);
    const ageDeaths = ageWeights.map(w => Math.round(totalDead * w / ageSum));
    if (charts['chart-age']) {
      charts['chart-age'].data.datasets[0].data = ageDeaths;
      charts['chart-age'].update('none');
    }

    // Intervention comparison (crude)
    const noResp = h.map(x => Math.round(x.I * 1.8)); // counterfactual
    update('chart-intervention', lbl, [
      {label:'No response (projected)', data:noResp, borderColor:'rgba(255,23,68,.5)', borderDash:[6,3], pointRadius:0, borderWidth:1.5},
      {label:'With intervention', data:h.map(x=>x.I), borderColor:'#00e676', backgroundColor:'rgba(0,230,118,.07)', fill:true, tension:.3, pointRadius:0, borderWidth:2},
    ]);
  }

  function renderSummary(history, virusParams, setupParams) {
    const el = document.getElementById('summary-body');
    if (!el || !history.length) return;

    const last = history[history.length-1];
    const peak = history.reduce((m,h)=>h.I>m.I?h:m, {I:0,day:0});
    const totalPop = last.S + last.E + last.I + last.R + last.D;
    const infRate = ((totalPop - last.S) / totalPop * 100).toFixed(1);
    const deathRate = (last.D / Math.max(1, totalPop) * 100).toFixed(3);
    const cfr = (last.D / Math.max(1, totalPop - last.S - last.E) * 100).toFixed(2);
    const day1m = history.find(h=>(h.I+h.R+h.D)>=1000000)?.day || '—';
    const hosOverflow = history.filter(h=>{
      const cap = Math.round(totalPop*(setupParams?.health_capacity||3)/1000);
      return (h.hospit||0) > cap;
    }).length;

    el.innerHTML = `
      <div class="sum-grid">
        <div class="sum-box"><div class="sum-lbl">Total Infected</div><div class="sum-val warn">${fmtN(Math.round(totalPop - last.S))}</div></div>
        <div class="sum-box"><div class="sum-lbl">Total Deaths</div><div class="sum-val danger">${fmtN(Math.round(last.D))}</div></div>
        <div class="sum-box"><div class="sum-lbl">Attack Rate</div><div class="sum-val warn">${infRate}%</div></div>
        <div class="sum-box"><div class="sum-lbl">Case Fatality Rate</div><div class="sum-val danger">${cfr}%</div></div>
        <div class="sum-box"><div class="sum-lbl">Peak Infected</div><div class="sum-val">${fmtN(Math.round(peak.I))}</div></div>
        <div class="sum-box"><div class="sum-lbl">Peak Day</div><div class="sum-val">Day ${peak.day}</div></div>
        <div class="sum-box"><div class="sum-lbl">Days to 1M</div><div class="sum-val">${day1m === '—'?'—':'Day '+day1m}</div></div>
        <div class="sum-box"><div class="sum-lbl">Hospital Overflow Days</div><div class="sum-val ${hosOverflow>30?'danger':'warn'}">${hosOverflow}d</div></div>
      </div>
      <div style="margin-top:12px; font-size:12px; color:var(--txt2); line-height:1.7;">
        The simulation ran for <b style="color:var(--acc2)">${last.day} days</b>. 
        <b style="color:var(--warn)">${fmtN(Math.round(totalPop-last.S))}</b> people were infected 
        (<b>${infRate}%</b> of the global population). 
        The pathogen peaked on <b>Day ${peak.day}</b> with <b>${fmtN(Math.round(peak.I))}</b> simultaneous active infections. 
        Total deaths reached <b style="color:var(--danger)">${fmtN(Math.round(last.D))}</b>.
        Healthcare systems were overwhelmed for <b>${hosOverflow}</b> days.
        ${virusParams.neuro ? '⚠️ Neurotropic pathogen caused significant CNS damage across the infected population.' : ''}
        ${virusParams.cytokine ? '⚠️ Cytokine storm induced in severe cases, substantially increasing mortality.' : ''}
      </div>
    `;
  }

  return { initAll, refreshAll, renderSummary };
})();
