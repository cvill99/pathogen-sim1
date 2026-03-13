// ═══════════════════════════════════════════════════════════
// BIOLOGY.JS — Human body SVG viewer + stage effects
// ═══════════════════════════════════════════════════════════

const Biology = (() => {
  let currentStage = 0;
  let virusParams = {};
  let viralCtx = null, immuneCtx = null;

  function init(vp) {
    virusParams = vp || {};
    _buildStageBtns();
    _drawBody(0);
    _renderStageInfo(0);
    _renderVitalSigns(0);
    _renderSymptoms(0);
    _renderDamage(0);
    _renderLabs(0);
    _renderSystemStatus(0);
    _renderPathogenActivity(0);
    _renderTreatments();
    _initMiniCharts();
  }

  function setStage(s) {
    currentStage = s;
    document.querySelectorAll('.stage-btn-el').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.stage) === s);
    });
    _drawBody(s);
    _renderStageInfo(s);
    _renderVitalSigns(s);
    _renderSymptoms(s);
    _renderDamage(s);
    _renderLabs(s);
    _renderSystemStatus(s);
    _renderPathogenActivity(s);
  }

  function _buildStageBtns() {
    const el = document.getElementById('stage-btns');
    if (!el) return;
    el.innerHTML = BIO_STAGES.map(s =>
      `<button class="stage-btn-el${s.id===0?' active':''}" data-stage="${s.id}"
        onclick="Biology.setStage(${s.id})">${s.name}</button>`
    ).join('');
  }

  function _drawBody(stage) {
    const svg = document.getElementById('body-svg');
    if (!svg) return;
    const s = BIO_STAGES[stage];
    const dmg = s.damage;
    const sysSel = virusParams.systems || [];

    // Color helpers
    const sysColor = (sysKey, basePct) => {
      const affected = sysSel.some(id => id === sysKey || BODY_SYSTEMS.find(bs=>bs.id===sysKey));
      const pct = dmg[Object.keys(dmg).find(k => k.toLowerCase().includes(sysKey.toLowerCase()))] || basePct;
      if (pct < 10) return '#1a3a1a';
      if (pct < 30) return '#2a3010';
      if (pct < 55) return '#3a1f0a';
      if (pct < 80) return '#4a0a0a';
      return '#660000';
    };

    const lungCol = sysColor('respiratory', dmg['Respiratory'] || 0);
    const heartCol = sysColor('cardiovascular', dmg['Cardiovascular'] || 0);
    const brainCol = sysColor('nervous', dmg['Nervous System'] || 0);
    const liverCol = sysColor('hepatic', dmg['Hepatic'] || 0);
    const kidneyCol = sysColor('renal', dmg['Renal'] || 0);
    const gutCol = sysColor('digestive', dmg['Digestive'] || 0);
    const bloodCol = sysColor('hematologic', dmg['Hematologic'] || 0);
    const skinAlpha = Math.min(.7, (dmg['Hematologic'] || 0) / 100 * .5 + .1);

    const ifrStage = stage / 5;
    const skinCol = stage < 1 ? '#c8956a' : stage < 3 ? '#b8856a' : stage < 4 ? '#a07060' : '#886050';

    svg.innerHTML = `
    <!-- Skin / body outline -->
    <ellipse cx="140" cy="60" rx="38" ry="44" fill="${skinCol}" stroke="#5a3a2a" stroke-width="1.5"/>
    <!-- Neck -->
    <rect x="122" y="100" width="36" height="28" rx="8" fill="${skinCol}" stroke="#5a3a2a" stroke-width="1"/>
    <!-- Torso -->
    <path d="M70 128 Q68 160 65 220 Q63 270 68 320 L212 320 Q217 270 215 220 Q212 160 210 128 Z"
      fill="${skinCol}" stroke="#5a3a2a" stroke-width="1.5"/>
    <!-- Arms -->
    <path d="M70 130 Q50 160 44 210 Q41 240 46 270 Q50 280 58 275 Q62 270 64 250 Q66 220 70 190 L75 140Z"
      fill="${skinCol}" stroke="#5a3a2a" stroke-width="1"/>
    <path d="M210 130 Q230 160 236 210 Q239 240 234 270 Q230 280 222 275 Q218 270 216 250 Q214 220 210 190 L205 140Z"
      fill="${skinCol}" stroke="#5a3a2a" stroke-width="1"/>
    <!-- Legs -->
    <path d="M100 318 Q95 370 93 420 Q91 470 94 520 Q98 540 108 540 Q118 540 120 520 Q122 470 122 420 L130 318Z"
      fill="${skinCol}" stroke="#5a3a2a" stroke-width="1"/>
    <path d="M160 318 Q165 370 167 420 Q169 470 166 520 Q162 540 152 540 Q142 540 140 520 Q138 470 138 420 L150 318Z"
      fill="${skinCol}" stroke="#5a3a2a" stroke-width="1"/>

    <!-- BRAIN -->
    <g class="organ-brain">
      <ellipse cx="140" cy="50" rx="28" ry="24" fill="${brainCol}" stroke="#6a4a8a" stroke-width="1.2" opacity=".9"/>
      <path d="M120 48 Q128 38 140 40 Q152 38 160 48" fill="none" stroke="#8a6aaa" stroke-width="1" opacity=".6"/>
      <path d="M125 56 Q135 50 145 56" fill="none" stroke="#8a6aaa" stroke-width="1" opacity=".5"/>
      <text x="140" y="53" text-anchor="middle" fill="#b090d0" font-size="7" opacity=".8">BRAIN</text>
    </g>

    <!-- EYES -->
    <ellipse cx="122" cy="58" rx="6" ry="5" fill="#fff" stroke="#333" stroke-width=".8"/>
    <circle cx="122" cy="58" r="3" fill="${stage>3?'#ff1744':'#3a3a8a'}"/>
    <ellipse cx="158" cy="58" rx="6" ry="5" fill="#fff" stroke="#333" stroke-width=".8"/>
    <circle cx="158" cy="58" r="3" fill="${stage>3?'#ff1744':'#3a3a8a'}"/>
    <!-- Mouth -->
    <path d="M128 84 Q140 ${stage>3?'78':'90'} 152 84" fill="none" stroke="#5a3a2a" stroke-width="1.5"/>
    ${stage>3?'<path d="M130 80 Q140 76 150 80" fill="none" stroke="#8a4a4a" stroke-width="1" opacity=".7"/>':''}

    <!-- TRACHEA -->
    <rect x="134" y="104" width="12" height="30" rx="3" fill="#2a4a6a" stroke="#3a6a9a" stroke-width="1" opacity=".7"/>

    <!-- LUNGS -->
    <g class="organ-lungs">
      <path d="M80 148 Q72 155 70 180 Q68 205 75 225 Q82 240 95 238 Q108 235 112 215 Q115 195 112 170 Q109 152 100 148 Z"
        fill="${lungCol}" stroke="#2a6aaa" stroke-width="1.2"/>
      <path d="M200 148 Q208 155 210 180 Q212 205 205 225 Q198 240 185 238 Q172 235 168 215 Q165 195 168 170 Q171 152 180 148 Z"
        fill="${lungCol}" stroke="#2a6aaa" stroke-width="1.2"/>
      <!-- Bronchi -->
      <path d="M134 134 Q110 140 100 150" fill="none" stroke="#3a8ada" stroke-width="1.5" opacity=".7"/>
      <path d="M146 134 Q170 140 180 150" fill="none" stroke="#3a8ada" stroke-width="1.5" opacity=".7"/>
      <text x="82" y="192" fill="#5a8aba" font-size="6" opacity=".7">L</text>
      <text x="194" y="192" fill="#5a8aba" font-size="6" opacity=".7">R</text>
    </g>

    <!-- HEART -->
    <g class="organ-heart">
      <path d="M140 175 Q128 160 122 168 Q116 176 122 186 Q128 196 140 205 Q152 196 158 186 Q164 176 158 168 Q152 160 140 175 Z"
        fill="${heartCol}" stroke="#aa2244" stroke-width="1.2">
        ${stage < 4 ? '<animateTransform attributeName="transform" type="scale" values="1;1.04;1" dur="'+(stage<2?'.9':stage<4?'.6':'.4')+'s" repeatCount="indefinite" additive="sum" origin="140 188"/>':''}
      </path>
      <text x="140" y="190" text-anchor="middle" fill="#ff4466" font-size="6" opacity=".8">♥</text>
    </g>

    <!-- LIVER -->
    <g class="organ-liver">
      <path d="M148 245 Q162 240 175 248 Q182 258 178 270 Q172 282 158 284 Q144 282 140 270 Q138 258 148 245 Z"
        fill="${liverCol}" stroke="#8a6a1a" stroke-width="1.2"/>
      <text x="160" y="266" text-anchor="middle" fill="#c8a030" font-size="6" opacity=".7">LIVER</text>
    </g>

    <!-- STOMACH -->
    <g class="organ-stomach">
      <path d="M110 244 Q98 250 96 265 Q96 278 108 282 Q120 286 126 274 Q130 262 124 250 Z"
        fill="${gutCol}" stroke="#6a4a2a" stroke-width="1"/>
    </g>

    <!-- INTESTINES -->
    <g class="organ-gut">
      <path d="M88 290 Q80 310 85 340 Q90 360 110 365 Q140 368 165 362 Q185 355 188 335 Q190 315 182 298 Q172 288 155 290 Q140 292 125 290 Z"
        fill="${gutCol}" stroke="#7a5a3a" stroke-width="1" opacity=".85"/>
      <path d="M100 305 Q120 310 140 305 Q160 300 175 310 Q175 325 155 330 Q135 335 115 330 Q98 325 100 305" fill="none" stroke="#9a7a5a" stroke-width="1" opacity=".5"/>
      <text x="140" y="335" text-anchor="middle" fill="#9a7a5a" font-size="6" opacity=".6">GUT</text>
    </g>

    <!-- KIDNEYS -->
    <g class="organ-kidneys">
      <ellipse cx="100" cy="252" rx="12" ry="18" fill="${kidneyCol}" stroke="#2a6a8a" stroke-width="1"/>
      <ellipse cx="180" cy="252" rx="12" ry="18" fill="${kidneyCol}" stroke="#2a6a8a" stroke-width="1"/>
      <text x="100" y="255" text-anchor="middle" fill="#4a9aba" font-size="5" opacity=".7">K</text>
      <text x="180" y="255" text-anchor="middle" fill="#4a9aba" font-size="5" opacity=".7">K</text>
    </g>

    <!-- SPINAL CORD -->
    <rect x="136" y="136" width="8" height="165" rx="3" fill="#4a3a7a" stroke="#6a5a9a" stroke-width=".8" opacity=".5"/>

    <!-- BLOOD VESSELS (aorta) -->
    <path d="M140 200 Q140 210 138 230 Q136 260 134 310" fill="none" stroke="${bloodCol||'#8a1a2a'}" stroke-width="3" opacity=".6"/>

    <!-- LYMPH nodes -->
    ${stage > 1 ? `
    <circle cx="108" cy="138" r="4" fill="#6a3a8a" opacity=".7"/>
    <circle cx="172" cy="138" r="4" fill="#6a3a8a" opacity=".7"/>
    <circle cx="140" cy="220" r="${3+stage}" fill="#8a3aaa" opacity=".6"/>
    ` : ''}

    <!-- SKIN LESIONS / HEMORRHAGE -->
    ${stage >= 3 && virusParams.symptoms?.includes('Hemorrhagic rash') ? `
    <circle cx="90" cy="165" r="5" fill="#8a1a1a" opacity=".5"/>
    <circle cx="195" cy="195" r="4" fill="#8a1a1a" opacity=".4"/>
    <circle cx="85" cy="225" r="6" fill="#8a1a1a" opacity=".5"/>
    ` : ''}

    <!-- FEVER GLOW -->
    ${stage >= 2 ? `<ellipse cx="140" cy="290" rx="80" ry="120" fill="rgba(255,60,0,${Math.min(.15, stage*.03)})" style="pointer-events:none"/>` : ''}

    <!-- VIRAL PARTICLES (visible in stages 2+) -->
    ${stage >= 2 ? Array.from({length:Math.min(stage*6,20)},(_,i)=>{
      const px = 70 + Math.random()*140;
      const py = 130 + Math.random()*180;
      const r = 2 + Math.random()*2;
      return `<circle cx="${px.toFixed(0)}" cy="${py.toFixed(0)}" r="${r.toFixed(1)}" fill="#ff1744" opacity="${(.3+Math.random()*.4).toFixed(2)}">
        <animate attributeName="opacity" values=".2;.8;.2" dur="${(1+Math.random()*2).toFixed(1)}s" repeatCount="indefinite"/>
      </circle>`;
    }).join('') : ''}

    <!-- COMA indicator -->
    ${stage === 5 ? '<text x="140" y="42" text-anchor="middle" fill="#ff1744" font-size="8" font-weight="bold">COMA</text>' : ''}
    `;

    // Legend
    const legend = document.getElementById('body-legend');
    if (legend) {
      const items = [
        {color: brainCol, label:'Brain'},
        {color: lungCol, label:'Lungs'},
        {color: heartCol, label:'Heart'},
        {color: liverCol, label:'Liver'},
        {color: kidneyCol, label:'Kidneys'},
        {color: gutCol, label:'GI Tract'},
      ];
      legend.innerHTML = items.map(i =>
        `<div class="bl-item"><div class="bl-dot" style="background:${i.color}"></div>${i.label}</div>`
      ).join('');
    }
  }

  function _renderStageInfo(stage) {
    const s = BIO_STAGES[stage];
    const el = document.getElementById('stage-desc');
    if (el) el.innerHTML = s.desc;
  }

  function _renderVitalSigns(stage) {
    const s = BIO_STAGES[stage];
    const el = document.getElementById('vitals-list');
    if (!el) return;
    el.innerHTML = Object.entries(s.vitals).map(([k, v]) => {
      let cls = 'ok';
      if (stage >= 4 && (k.includes('Rate') || k.includes('Temp') || k.includes('O₂') || k.includes('Conscious'))) cls = 'crit';
      else if (stage >= 3) cls = 'bad';
      else if (stage >= 1) cls = 'mild';
      return `<div class="vital-row">
        <span class="vital-name">${k}</span>
        <span class="vital-val ${cls}">${v}</span>
      </div>`;
    }).join('');
  }

  function _renderSymptoms(stage) {
    const s = BIO_STAGES[stage];
    // Merge virus symptoms with stage symptoms
    const virusSymps = virusParams.symptoms || [];
    const stageSymps = s.symptoms || [];
    // Stage-appropriate virus symptoms
    const show = stage === 0 ? [] :
      stage === 1 ? stageSymps :
      stage === 2 ? [...stageSymps, ...virusSymps.slice(0,4)] :
      stage >= 3 ? [...new Set([...stageSymps, ...virusSymps])] :
      stageSymps;

    const el = document.getElementById('symptoms-list');
    if (!el) return;
    if (!show.length) { el.innerHTML = '<div style="color:var(--success);font-size:12px;">No symptoms — patient healthy</div>'; return; }
    el.innerHTML = show.map(sym => {
      const severe = stage >= 4;
      const mild = stage <= 2;
      const color = severe ? 'var(--danger)' : mild ? 'var(--warn)' : 'var(--orange)';
      return `<div class="sym-row">
        <div class="sym-sev-dot" style="background:${color}"></div>
        ${sym}
      </div>`;
    }).join('');
  }

  function _renderDamage(stage) {
    const s = BIO_STAGES[stage];
    const el = document.getElementById('damage-list');
    if (!el) return;
    el.innerHTML = Object.entries(s.damage).map(([sys, pct]) => {
      const color = pct < 20 ? '#00e676' : pct < 45 ? '#ffea00' : pct < 70 ? '#ff6d00' : '#ff1744';
      return `<div class="dmg-row">
        <span class="dmg-name">${sys}</span>
        <div class="dmg-bg"><div class="dmg-fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="dmg-pct">${pct}%</span>
      </div>`;
    }).join('');
  }

  function _renderLabs(stage) {
    const s = BIO_STAGES[stage];
    const el = document.getElementById('labs-list');
    if (!el) return;
    el.innerHTML = Object.entries(s.labs).map(([test, val]) => {
      const abnormal = val.includes('↑') || val.includes('↓') || val.includes('critical');
      const cls = val.includes('↑↑↑') || val.includes('critical') ? 'crit' :
                  val.includes('↑↑') || val.includes('↓↓') ? 'bad' :
                  val.includes('↑') || val.includes('↓') ? 'mild' : 'ok';
      return `<div class="lab-row">
        <span class="lab-name">${test}</span>
        <span class="lab-val ${cls}">${val}</span>
      </div>`;
    }).join('');
  }

  function _renderSystemStatus(stage) {
    const s = BIO_STAGES[stage];
    const el = document.getElementById('system-status-list');
    if (!el) return;
    el.innerHTML = Object.entries(s.systems_status).map(([sys, status]) => {
      const labels = {ok:'NORMAL',warn:'STRESSED',bad:'IMPAIRED',crit:'CRITICAL',fail:'FAILING'};
      const cls = `ss-${status}`;
      return `<div class="sys-status-row">
        <span class="ss-name">${sys}</span>
        <span class="ss-badge ${cls}">${labels[status]||status.toUpperCase()}</span>
      </div>`;
    }).join('');
  }

  function _renderPathogenActivity(stage) {
    const el = document.getElementById('pathogen-activity');
    if (!el) return;
    const activities = [
      {name:'Viral replication rate', pct: stage===0?0:stage===1?15:stage===2?55:stage===3?85:stage===4?70:30},
      {name:'Cell entry / infection', pct: stage===0?0:stage===1?10:stage===2?40:stage===3?80:stage===4?90:95},
      {name:'Immune system battle', pct: stage===0?5:stage===1?30:stage===2?65:stage===3?90:stage===4?95:60},
      {name:'Tissue damage rate', pct: stage===0?0:stage===1?5:stage===2?20:stage===3?60:stage===4?85:98},
      {name:'Shedding / transmission', pct: stage===0?0:stage===1?20:stage===2?75:stage===3?85:stage===4?50:10},
    ];
    el.innerHTML = activities.map(a => `
      <div class="pathogen-act">
        <div style="display:flex;justify-content:space-between">
          <span>${a.name}</span>
          <span style="color:var(--danger);font-weight:700">${a.pct}%</span>
        </div>
        <div class="pa-bar"><div class="pa-fill" style="width:${a.pct}%"></div></div>
      </div>
    `).join('');
  }

  function _renderTreatments() {
    const el = document.getElementById('treatment-options');
    if (!el) return;
    el.innerHTML = TREATMENTS.map(t => `
      <div class="treat-opt">
        <div class="treat-name">${t.name}</div>
        <div class="treat-desc">${t.desc}</div>
        <div class="treat-eff">✓ ${t.eff}</div>
      </div>
    `).join('');
  }

  function _initMiniCharts() {
    // Viral load curve
    const vCanvas = document.getElementById('viral-canvas');
    if (vCanvas) {
      viralCtx = vCanvas.getContext('2d');
      _drawViralLoad(viralCtx);
    }
    // Immune response
    const iCanvas = document.getElementById('immune-canvas');
    if (iCanvas) {
      immuneCtx = iCanvas.getContext('2d');
      _drawImmuneResponse(immuneCtx);
    }
  }

  function _drawViralLoad(ctx) {
    if (!ctx) return;
    ctx.clearRect(0, 0, 260, 140);
    ctx.fillStyle = '#101323';
    ctx.fillRect(0, 0, 260, 140);

    // Viral load curve — rises fast, peaks, then drops
    const days = 30;
    const data = Array.from({length:days}, (_,i) => {
      if (i < 2) return 0;
      if (i < 8) return Math.pow(i-1, 2.5) * 2;
      if (i < 14) return 800 - (i-8)*40;
      return Math.max(0, 560 - (i-14)*55);
    });
    const max = Math.max(...data);

    // Grid
    ctx.strokeStyle = '#1e2338';
    ctx.lineWidth = .5;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(30, 20 + i*24);
      ctx.lineTo(255, 20 + i*24);
      ctx.stroke();
    }

    // Line
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = 30 + (i/(days-1))*225;
      const y = 116 - (v/max)*90;
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.stroke();

    // Fill
    ctx.fillStyle = 'rgba(255,23,68,.12)';
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = 30 + (i/(days-1))*225;
      const y = 116 - (v/max)*90;
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.lineTo(255, 116); ctx.lineTo(30, 116);
    ctx.closePath(); ctx.fill();

    // Stage indicator
    if (currentStage > 0) {
      const stageX = 30 + ((currentStage*5)/days)*225;
      ctx.strokeStyle = 'rgba(255,234,0,.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3,3]);
      ctx.beginPath();
      ctx.moveTo(stageX, 20); ctx.lineTo(stageX, 116);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Labels
    ctx.fillStyle = '#6a7290';
    ctx.font = '9px Courier New';
    ctx.fillText('Viral Load', 32, 14);
    ctx.fillText('Day 30', 230, 128);
  }

  function _drawImmuneResponse(ctx) {
    if (!ctx) return;
    ctx.clearRect(0, 0, 260, 140);
    ctx.fillStyle = '#101323';
    ctx.fillRect(0, 0, 260, 140);

    const days = 30;
    // Innate response (fast, early)
    const innate = Array.from({length:days}, (_,i) => {
      if (i<1) return 0;
      if (i<4) return i*20;
      if (i<9) return Math.max(0, 80-(i-4)*12);
      return 0;
    });
    // Adaptive response (slower, sustained)
    const adaptive = Array.from({length:days}, (_,i) => {
      if (i<4) return 0;
      if (i<12) return (i-4)*9;
      if (i<20) return Math.min(100,72+(i-12)*3);
      return Math.max(30, 100-(i-20)*8);
    });
    // Antibodies
    const antibody = Array.from({length:days}, (_,i) => {
      if (i<7) return 0;
      if (i<15) return (i-7)*8;
      return Math.min(90, 64+(i-15)*3);
    });

    ctx.strokeStyle = '#1e2338';
    ctx.lineWidth = .5;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(30, 15 + i*24);
      ctx.lineTo(255, 15 + i*24);
      ctx.stroke();
    }

    const drawLine = (data, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      data.forEach((v,i) => {
        const x = 30 + (i/(days-1))*225;
        const y = 112 - (v/100)*90;
        i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      });
      ctx.stroke();
    };

    drawLine(innate, '#ff6d00');
    drawLine(adaptive, '#00e676');
    drawLine(antibody, '#00e5ff');

    // Legend
    ctx.font = '8px Courier New';
    ctx.fillStyle = '#ff6d00'; ctx.fillText('Innate', 32, 13);
    ctx.fillStyle = '#00e676'; ctx.fillText('Adaptive', 80, 13);
    ctx.fillStyle = '#00e5ff'; ctx.fillText('Antibodies', 138, 13);

    // Stage line
    if (currentStage > 0) {
      const stageX = 30 + ((currentStage*5)/days)*225;
      ctx.strokeStyle = 'rgba(255,234,0,.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3,3]);
      ctx.beginPath();
      ctx.moveTo(stageX, 15); ctx.lineTo(stageX, 112);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function updateCharts() {
    _drawViralLoad(viralCtx);
    _drawImmuneResponse(immuneCtx);
  }

  return { init, setStage, updateCharts };
})();
