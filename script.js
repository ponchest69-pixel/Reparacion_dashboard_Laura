/* ============================================================
   WIP Reparación — Panel de control
   Script principal del dashboard
   Carga los datos desde data/datos.json (ruta relativa)
   ============================================================ */


let DATA = [];

const COLORS = {amber:'#F5A623', teal:'#33C6B0', red:'#E5484D', blue:'#5B8DEF', green:'#3FBF6F', muted:'#5E6674'};
const BUCKET_ORDER = ['0-3','4-7','8-14','15-30','31-60','60+'];
const BUCKET_COLORS = {'0-3':'#3FBF6F','4-7':'#33C6B0','8-14':'#5B8DEF','15-30':'#F5A623','31-60':'#EF7B45','60+':'#E5484D'};

Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#8B93A3';
Chart.defaults.borderColor = '#272E3A';

let state = {wo:'', tipo:'', zone:'', bucket:'', search:''};
let charts = {};
let sortKey = 'totalAging', sortDir = -1;

function unique(arr, key){ return [...new Set(arr.map(d=>d[key]))].filter(Boolean).sort(); }

function populateFilters(){
  const woCounts = {};
  DATA.forEach(d=> woCounts[d.wo] = (woCounts[d.wo]||0)+1);
  const woSorted = Object.entries(woCounts).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
  const fWO = document.getElementById('fWO');
  woSorted.forEach(w=>{
    const o=document.createElement('option'); o.value=w; o.textContent = `${w} (${woCounts[w]})`; fWO.appendChild(o);
  });
  const fTipo = document.getElementById('fTipo');
  unique(DATA,'tipo').forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=t; fTipo.appendChild(o); });
  const fZone = document.getElementById('fZone');
  const zoneCounts = {};
  DATA.forEach(d=> zoneCounts[d.zone] = (zoneCounts[d.zone]||0)+1);
  Object.entries(zoneCounts).sort((a,b)=>b[1]-a[1]).forEach(([z,c])=>{ const o=document.createElement('option'); o.value=z; o.textContent=`${z} (${c})`; fZone.appendChild(o); });
  const fBucket = document.getElementById('fBucket');
  BUCKET_ORDER.forEach(b=>{ const o=document.createElement('option'); o.value=b; o.textContent=`${b} días`; fBucket.appendChild(o); });
}

function applyFilters(){
  return DATA.filter(d=>{
    if(state.wo && d.wo!==state.wo) return false;
    if(state.tipo && d.tipo!==state.tipo) return false;
    if(state.zone && d.zone!==state.zone) return false;
    if(state.bucket && d.bucket!==state.bucket) return false;
    if(state.search && !d.sn.toLowerCase().includes(state.search.toLowerCase())) return false;
    return true;
  });
}

function avg(arr, key){ if(!arr.length) return 0; return arr.reduce((s,d)=>s+(d[key]||0),0)/arr.length; }

function fmt1(n){ return (Math.round(n*10)/10).toLocaleString('es-MX'); }

function renderKPIs(filtered){
  document.getElementById('metaTotal').textContent = DATA.length.toLocaleString('es-MX');
  document.getElementById('metaWO').textContent = unique(DATA,'wo').length;
  document.getElementById('kpiTotal').textContent = filtered.length.toLocaleString('es-MX');
  document.getElementById('kpiTotalSub').textContent = `de ${DATA.length.toLocaleString('es-MX')} totales`;
  document.getElementById('kpiAvg').textContent = fmt1(avg(filtered,'totalAging'));
  const crit = filtered.filter(d=>d.totalAging>30);
  document.getElementById('kpiCrit').textContent = crit.length.toLocaleString('es-MX');
  document.getElementById('kpiCritSub').textContent = filtered.length? `${fmt1(crit.length/filtered.length*100)}% del filtrado` : '—';
  const vcrit = filtered.filter(d=>d.totalAging>60);
  document.getElementById('kpiVCrit').textContent = vcrit.length.toLocaleString('es-MX');
  document.getElementById('kpiWO').textContent = unique(filtered,'wo').length;
  document.getElementById('filterCount').textContent = filtered.length.toLocaleString('es-MX');
}

function renderFlowboard(filtered){
  const tipos = unique(DATA,'tipo');
  const tipoCounts = {};
  tipos.forEach(t=> tipoCounts[t] = filtered.filter(d=>d.tipo===t).length);
  const sortedTipos = tipos.slice().sort((a,b)=>tipoCounts[b]-tipoCounts[a]);
  const rowsEl = document.getElementById('flowRows');
  rowsEl.innerHTML = '';
  sortedTipos.forEach(t=>{
    const sub = filtered.filter(d=>d.tipo===t);
    if(!sub.length) return;
    const row = document.createElement('div'); row.className='flow-row';
    const bar = document.createElement('div'); bar.className='flow-bar';
    BUCKET_ORDER.forEach(b=>{
      const c = sub.filter(d=>d.bucket===b).length;
      if(!c) return;
      const seg = document.createElement('div'); seg.className='flow-seg';
      seg.style.width = (c/sub.length*100)+'%';
      seg.style.background = BUCKET_COLORS[b];
      seg.title = `${b} días: ${c} unidades`;
      bar.appendChild(seg);
    });
    const label = document.createElement('div');
    label.innerHTML = `<div class="flow-label">${t}</div><div class="flow-count">${sub.length.toLocaleString('es-MX')} unidades</div>`;
    const avgEl = document.createElement('div'); avgEl.className='flow-avg';
    const a = avg(sub,'totalAging');
    const color = a>30? COLORS.red : a>15? COLORS.amber : COLORS.teal;
    avgEl.innerHTML = `<span style="color:${color}">${fmt1(a)}d</span>`;
    row.appendChild(label); row.appendChild(bar); row.appendChild(avgEl);
    rowsEl.appendChild(row);
  });
  const legend = document.getElementById('flowLegend');
  legend.innerHTML = BUCKET_ORDER.map(b=>`<div class="item"><div class="sw" style="background:${BUCKET_COLORS[b]}"></div>${b} días</div>`).join('');
}

function destroyChart(id){ if(charts[id]){ charts[id].destroy(); } }

function renderBuckets(filtered){
  destroyChart('buckets');
  const counts = BUCKET_ORDER.map(b=> filtered.filter(d=>d.bucket===b).length);
  charts.buckets = new Chart(document.getElementById('chartBuckets'), {
    type:'bar',
    data:{ labels:BUCKET_ORDER.map(b=>b+'d'), datasets:[{ data:counts, backgroundColor:BUCKET_ORDER.map(b=>BUCKET_COLORS[b]), borderRadius:4, barThickness:36 }]},
    options:{ plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true, grid:{color:'#1C212B'}}, x:{grid:{display:false}} } }
  });
}

function renderTipo(filtered){
  destroyChart('tipo');
  const tipos = unique(DATA,'tipo');
  const counts = tipos.map(t=> filtered.filter(d=>d.tipo===t).length);
  const avgs = tipos.map(t=> avg(filtered.filter(d=>d.tipo===t),'totalAging'));
  const order = tipos.map((t,i)=>i).sort((a,b)=>counts[b]-counts[a]);
  charts.tipo = new Chart(document.getElementById('chartTipo'), {
    data:{ labels:order.map(i=>tipos[i]), datasets:[
      { type:'bar', label:'Unidades', data:order.map(i=>counts[i]), backgroundColor:COLORS.blue, borderRadius:4, order:2, yAxisID:'y' },
      { type:'line', label:'Días promedio', data:order.map(i=>avgs[i]), borderColor:COLORS.amber, backgroundColor:COLORS.amber, tension:.3, yAxisID:'y1', order:1, pointRadius:4 }
    ]},
    options:{ interaction:{mode:'index', intersect:false}, scales:{
      y:{beginAtZero:true, position:'left', grid:{color:'#1C212B'}},
      y1:{beginAtZero:true, position:'right', grid:{display:false}},
      x:{ticks:{autoSkip:false, maxRotation:60, minRotation:30, font:{size:10}}, grid:{display:false}}
    }}
  });
}

function renderDefect(filtered){
  destroyChart('defect');
  const defs = unique(filtered,'defect');
  const counts = defs.map(t=> filtered.filter(d=>d.defect===t).length);
  const top = defs.map((t,i)=>({t,c:counts[i]})).sort((a,b)=>b.c-a.c).slice(0,10);
  const avgs = top.map(o=> avg(filtered.filter(d=>d.defect===o.t),'totalAging'));
  charts.defect = new Chart(document.getElementById('chartDefect'), {
    type:'bar',
    data:{ labels:top.map(o=>o.t), datasets:[{ data:top.map(o=>o.c), backgroundColor: avgs.map(a=> a>30?COLORS.red:a>15?COLORS.amber:COLORS.teal), borderRadius:4 }]},
    options:{ indexAxis:'y', plugins:{legend:{display:false}, tooltip:{callbacks:{afterLabel:(ctx)=>`Promedio: ${fmt1(avgs[ctx.dataIndex])}d`}}}, scales:{ x:{beginAtZero:true, grid:{color:'#1C212B'}}, y:{grid:{display:false}, ticks:{font:{size:10.5}}} } }
  });
}

function renderZone(filtered){
  destroyChart('zone');
  const zones = unique(filtered,'zone');
  const counts = zones.map(z=> filtered.filter(d=>d.zone===z).length);
  const top = zones.map((z,i)=>({z,c:counts[i]})).sort((a,b)=>b.c-a.c).slice(0,10);
  charts.zone = new Chart(document.getElementById('chartZone'), {
    type:'bar',
    data:{ labels:top.map(o=>o.z), datasets:[{ data:top.map(o=>o.c), backgroundColor:COLORS.teal, borderRadius:4 }]},
    options:{ plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true, grid:{color:'#1C212B'}}, x:{grid:{display:false}} } }
  });
}

function renderWO(filtered){
  destroyChart('wo');
  const wos = unique(filtered,'wo');
  const counts = wos.map(w=> filtered.filter(d=>d.wo===w).length);
  const top = wos.map((w,i)=>({w,c:counts[i]})).sort((a,b)=>b.c-a.c).slice(0,10);
  charts.wo = new Chart(document.getElementById('chartWO'), {
    type:'bar',
    data:{ labels:top.map(o=>o.w), datasets:[{ data:top.map(o=>o.c), backgroundColor:COLORS.green, borderRadius:4 }]},
    options:{ indexAxis:'y', plugins:{legend:{display:false}}, scales:{ x:{beginAtZero:true, grid:{color:'#1C212B'}}, y:{grid:{display:false}} } }
  });
}

function renderScatter(filtered){
  destroyChart('scatter');
  const sample = filtered.length>1200 ? filtered.filter((_,i)=>i%2===0) : filtered;
  const points = sample.map(d=>({x:d.lastUpd, y:d.totalAging}));
  charts.scatter = new Chart(document.getElementById('chartScatter'), {
    type:'scatter',
    data:{ datasets:[{ label:'Unidades', data:points, backgroundColor:'rgba(91,141,239,0.45)', pointRadius:3 }]},
    options:{ plugins:{legend:{display:false}}, scales:{
      x:{title:{display:true,text:'Días desde última actualización'}, grid:{color:'#1C212B'}},
      y:{title:{display:true,text:'Antigüedad total (días)'}, beginAtZero:true, grid:{color:'#1C212B'}}
    }}
  });
}

function renderTable(filtered){
  const sorted = filtered.slice().sort((a,b)=>{
    const av=a[sortKey], bv=b[sortKey];
    if(typeof av === 'string') return sortDir*av.localeCompare(bv);
    return sortDir*((av||0)-(bv||0));
  }).slice(0,25);
  const body = document.getElementById('critBody');
  body.innerHTML = sorted.map(d=>{
    const badge = d.totalAging>60?'b-red':d.totalAging>30?'b-amber':d.totalAging>14?'b-teal':'b-green';
    return `<tr>
      <td><span class="badge ${badge}">${fmt1(d.totalAging)}</span></td>
      <td>${fmt1(d.lastUpd)}</td>
      <td>${d.sn}</td>
      <td>${d.wo}</td>
      <td>${d.tipo}</td>
      <td>${d.defect}</td>
      <td>${d.loc}</td>
    </tr>`;
  }).join('');
  document.querySelectorAll('#critTable th').forEach(th=> th.classList.toggle('sorted', th.dataset.key===sortKey));
}

function renderInsights(){
  const cards = [
    {tag:'RIESGO DE AGING', cls:'risk', html:`<b>38.8% de las unidades (642 de 1,656)</b> llevan más de 30 días en WIP, y <b>144 unidades superan los 60 días</b>. Este volumen concentra capital y espacio en piso sin avanzar hacia salida.`},
    {tag:'CUELLO DE BOTELLA POR DEFECTO', cls:'', html:`Los defectos <b>"Excessive voiding"</b> (42.9d promedio) e <b>"Insufficient solder"</b> (42.1d) tienen la antigüedad promedio más alta, muy por encima del promedio general (28.8d) — sugiere retrabajo o insumos limitados para esos procesos específicos.`},
    {tag:'CONCENTRACIÓN DE VOLUMEN', cls:'info', html:`La orden <b>PLG000696 concentra 406 unidades (24.5%)</b> del WIP total, seguida por PLG000651 (228) y PLG000617 (144). Tres órdenes explican ~47% del inventario en proceso.`},
    {tag:'TIPO DE REPARACIÓN MÁS LENTO', cls:'risk', html:`<b>"To AOI Rep"</b> tiene la mayor antigüedad promedio (33.1d), seguida de <b>"No tiene in, no es de reparación"</b> (31.3d) — este último grupo (464 unidades) no está clasificado como reparación real y merece revisión de proceso.`},
    {tag:'CARGA POR ZONA', cls:'', html:`La zona <b>GFC concentra 597 unidades (36%)</b> del WIP, seguida por VPWR (259) y las estaciones "C" (268). Vale la pena verificar capacidad de rework en GFC.`},
    {tag:'UNIDADES ESTANCADAS', cls:'info', html:`La correlación entre antigüedad total y días desde la última actualización es moderada (r=0.51): existen unidades con alta antigüedad pero movimiento reciente, y otras genuinamente <b>detenidas sin actividad</b> — ver dispersión en la sección 2.`},
  ];
  document.getElementById('insightsGrid').innerHTML = cards.map(c=>`
    <div class="insight-card ${c.cls}">
      <div class="itag">${c.tag}</div>
      <p>${c.html}</p>
    </div>`).join('');
}

function renderAll(){
  const filtered = applyFilters();
  renderKPIs(filtered);
  renderFlowboard(filtered);
  renderBuckets(filtered);
  renderTipo(filtered);
  renderDefect(filtered);
  renderZone(filtered);
  renderWO(filtered);
  renderScatter(filtered);
  renderTable(filtered);
}

document.getElementById('fWO').addEventListener('change', e=>{ state.wo=e.target.value; renderAll(); });
document.getElementById('fTipo').addEventListener('change', e=>{ state.tipo=e.target.value; renderAll(); });
document.getElementById('fZone').addEventListener('change', e=>{ state.zone=e.target.value; renderAll(); });
document.getElementById('fBucket').addEventListener('change', e=>{ state.bucket=e.target.value; renderAll(); });
document.getElementById('fSearch').addEventListener('input', e=>{ state.search=e.target.value; renderAll(); });
document.getElementById('btnReset').addEventListener('click', ()=>{
  state={wo:'',tipo:'',zone:'',bucket:'',search:''};
  document.getElementById('fWO').value='';
  document.getElementById('fTipo').value='';
  document.getElementById('fZone').value='';
  document.getElementById('fBucket').value='';
  document.getElementById('fSearch').value='';
  renderAll();
});
document.querySelectorAll('#critTable th').forEach(th=>{
  th.addEventListener('click', ()=>{
    const key = th.dataset.key;
    if(sortKey===key) sortDir*=-1; else { sortKey=key; sortDir=-1; }
    renderTable(applyFilters());
  });
});

async function init(){
  try{
    const res = await fetch('data/datos.json');
    if(!res.ok) throw new Error('HTTP '+res.status);
    DATA = await res.json();
  } catch(err){
    document.body.innerHTML = '<div style="padding:40px;font-family:monospace;color:#E5484D;">Error cargando data/datos.json: '+err.message+'<br>Verifica que el archivo exista y que estés sirviendo el proyecto vía GitHub Pages o un servidor local (no abriendo index.html directo con doble clic).</div>';
    return;
  }
  populateFilters();
  renderInsights();
  renderAll();
}

init();
