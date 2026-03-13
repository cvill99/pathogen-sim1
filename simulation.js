// ═══════════════════════════════════════════════════════════
// SIMULATION.JS — Core epidemic engine (SEIRD + per-city)
// ═══════════════════════════════════════════════════════════

const Sim = (() => {
  let state = null;
  let history = [];
  let cityStates = {};
  let params = {};

  function init(virusParams, setupParams) {
    params = { ...virusParams, ...setupParams };
    const totalPop = setupParams.population;
    const seedCity = setupParams.seedCity;
    const seedN = setupParams.seedN || 5;
    const initImmunity = (setupParams.init_immunity || 0) / 100;

    // Build per-city populations proportional to real city populations
    const totalCityPop = CITIES.reduce((s, c) => s + c.pop, 0);
    cityStates = {};
    CITIES.forEach(city => {
      const cityPop = Math.round((city.pop / totalCityPop) * totalPop);
      const immune = Math.round(cityPop * initImmunity);
      const S = cityPop - immune;
      cityStates[city.id] = {
        id: city.id, name: city.name, lat: city.lat, lng: city.lng,
        pop: cityPop,
        S, E: 0, I: 0, R: immune, D: 0,
        newCases: 0, newDeaths: 0,
        daysActive: 0, firstInfected: -1,
        hospit: 0, icu: 0,
        history: [],
      };
    });

    // Seed origin city
    if (seedCity && cityStates[seedCity]) {
      const c = cityStates[seedCity];
      const n = Math.min(seedN, c.S);
      c.I = n; c.S -= n;
      c.firstInfected = 0;
      c.daysActive = 1;
    }

    state = {
      day: 0,
      totalPop,
      S: 0, E: 0, I: 0, R: 0, D: 0,
      newCasesDay: 0, newDeathsDay: 0,
      rt: virusParams.r0,
      citiesInfected: seedCity ? 1 : 0,
      responseActive: false,
      vaccineActive: false,
      antiviralActive: false,
      done: false,
    };
    history = [];
    _recalcGlobal();
  }

  function _recalcGlobal() {
    let S=0, E=0, I=0, R=0, D=0;
    Object.values(cityStates).forEach(c => { S+=c.S; E+=c.E; I+=c.I; R+=c.R; D+=c.D; });
    state.S = S; state.E = E; state.I = I; state.R = R; state.D = D;
    state.citiesInfected = Object.values(cityStates).filter(c => c.I + c.E > 0).length;
  }

  function step() {
    if (state.done) return;
    state.day++;

    const d = state.day;
    const respDay = params.response_day || 30;
    const borderDay = params.border_close_day || 60;
    const vaccDay = params.vaccine_day || 365;
    const antiDay = params.antiviral_day || 180;

    // Activate interventions
    if (d >= respDay && !state.responseActive) state.responseActive = true;
    if (d >= vaccDay && !state.vaccineActive) state.vaccineActive = true;
    if (d >= antiDay && !state.antiviralActive) state.antiviralActive = true;

    // Transmission modifier
    let transMult = 1.0;
    if (state.responseActive) transMult *= (params.response_trans_mult || 1.0);
    if (state.antiviralActive) transMult *= (1 - (params.antiviral_eff || 0) / 100 * 0.4);

    // IFR modifier
    let ifrMult = 1.0;
    if (state.antiviralActive) ifrMult *= (1 - (params.antiviral_eff || 0) / 100 * 0.5);
    if (state.responseActive) ifrMult *= 0.9; // better healthcare when response active

    const baseR0 = params.r0 || 2.5;
    const infPeriod = params.infectious_period || 10;
    const incPeriod = Math.max(0.5, params.incubation || 5);
    const presymp = params.presymptomatic || 2;
    const baseIFR = (params.ifr || 1.8) / 100;
    const hospRate = (params.hosp_rate || 5) / 100;
    const icuRate = (params.icu_rate || 1) / 100;
    const timeToDeath = Math.max(1, params.time_to_death || 14);
    const asympRate = (params.asymp_rate || 40) / 100;
    const reinfRate = (params.reinfection_risk || 10) / 100;
    const vaccEff = (params.vaccine_eff || 85) / 100;
    const vaccRate = (params.vaccine_rate || 0.3) / 100;

    const beta = (baseR0 * transMult) / infPeriod;
    const sigma = 1 / incPeriod;
    const gamma = 1 / infPeriod;
    const mu = baseIFR * ifrMult / timeToDeath;
    const wane = reinfRate / 365;

    let totalNewCases = 0, totalNewDeaths = 0;
    const mobMult = state.responseActive ? (params.response_mob_mult || 1.0) : 1.0;
    const borderOpen = d < borderDay;

    // Air travel seeding — spread from infected cities to hubs
    if (borderOpen && d % 2 === 0) {
      _airTravelSeed(mobMult);
    }

    // Per-city SEIRD step
    Object.values(cityStates).forEach(city => {
      const N = city.pop;
      if (N <= 0) return;

      const { S, E, I, R } = city;
      if (S + E + I === 0) return; // dead city

      // Force of infection
      const forceOfInf = beta * I / N;

      // Compartment flows
      const dSE = Math.min(S, S * forceOfInf);
      const dEI = Math.min(E, E * sigma);
      const dIR = Math.min(I * (1 - mu), I * gamma * (1 - asympRate * 0));
      const dID = Math.min(I, I * mu);
      const dRwane = R * wane;

      // Vaccine
      let vaccinated = 0;
      if (state.vaccineActive) {
        vaccinated = Math.min(city.S, Math.round(N * vaccRate * vaccEff));
      }

      city.S = Math.max(0, S - dSE - vaccinated + dRwane);
      city.E = Math.max(0, E + dSE - dEI);
      city.I = Math.max(0, I + dEI - dIR - dID);
      city.R = Math.max(0, R + dIR + vaccinated - dRwane);
      city.D = city.D + dID;

      const newC = dSE;
      const newD = dID;
      city.newCases = newC;
      city.newDeaths = newD;
      totalNewCases += newC;
      totalNewDeaths += newD;

      if (city.I + city.E > 0) {
        if (city.firstInfected < 0) city.firstInfected = d;
        city.daysActive++;
        city.hospit = Math.round(city.I * hospRate);
        city.icu = Math.round(city.I * icuRate);
      }

      city.history.push({ day: d, S: city.S, E: city.E, I: city.I, R: city.R, D: city.D });
      if (city.history.length > 400) city.history.shift();
    });

    _recalcGlobal();

    // Compute R(t)
    const prevI = history.length > 0 ? history[history.length-1].I : 1;
    state.rt = prevI > 0 ? Math.max(0, (state.I / Math.max(1, prevI)) * (infPeriod / Math.max(1, params.presymptomatic || 2))) : baseR0;
    state.rt = Math.min(20, state.rt);

    state.newCasesDay = totalNewCases;
    state.newDeathsDay = totalNewDeaths;

    // Snapshot
    history.push({
      day: d,
      S: state.S, E: state.E, I: state.I, R: state.R, D: state.D,
      newCases: totalNewCases, newDeaths: totalNewDeaths,
      rt: state.rt,
      citiesInfected: state.citiesInfected,
      hospit: Object.values(cityStates).reduce((s,c)=>s+c.hospit,0),
      icu: Object.values(cityStates).reduce((s,c)=>s+c.icu,0),
    });

    // Done check
    if (state.I < 1 && state.E < 1 && d > 10) state.done = true;
    if (d >= (params.sim_days || 365)) state.done = true;
  }

  function _airTravelSeed(mobMult) {
    // Find cities with active infections
    const sources = Object.values(cityStates).filter(c => c.I > 10);
    if (sources.length === 0) return;

    const hubCities = CITIES.filter(c => c.hub).map(c => c.id);

    sources.forEach(src => {
      // Each infected city seeds ~1 traveler per 100K infected to hub cities
      const travelers = Math.floor(src.I / 100000 * mobMult);
      if (travelers < 1) return;

      // Pick random hub targets
      const targets = shuffleArr([...hubCities]).slice(0, Math.min(3, hubCities.length));
      targets.forEach(tid => {
        if (tid === src.id) return;
        const dest = cityStates[tid];
        if (!dest || dest.S < 1) return;
        const seeds = Math.min(dest.S, travelers);
        dest.S -= seeds;
        dest.E += seeds;
        if (dest.firstInfected < 0 && seeds > 0) dest.firstInfected = state.day;
      });
    });
  }

  function shuffleArr(arr) {
    for (let i = arr.length-1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getState() { return state; }
  function getHistory() { return history; }
  function getCityStates() { return cityStates; }
  function getCity(id) { return cityStates[id]; }
  function isDone() { return state && state.done; }

  function getTopCities(n=10) {
    return Object.values(cityStates)
      .filter(c => c.I + c.D > 0)
      .sort((a,b) => (b.I+b.E) - (a.I+a.E))
      .slice(0, n);
  }

  return { init, step, getState, getHistory, getCityStates, getCity, isDone, getTopCities };
})();
