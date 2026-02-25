import { useState, useMemo, useCallback } from "react";

const C = {
  bg: "#06090f", surface: "#0d1117", card: "#161b22",
  border: "#21262d", borderLight: "#30363d",
  accent: "#00d4aa", accentBg: "#00d4aa15",
  blue: "#58a6ff", blueBg: "#58a6ff15",
  orange: "#d29922", orangeBg: "#d2992215",
  red: "#f85149", redBg: "#f8514915",
  purple: "#bc8cff", purpleBg: "#bc8cff15",
  green: "#3fb950", greenBg: "#3fb95015",
  text: "#e6edf3", dim: "#8b949e", muted: "#484f58",
};

const RESOURCES = [
  { id: "bandsaw", name: "Ленточная пила", short: "Пила", stages: ["cutting_profile"], hours: 8, color: C.blue, icon: "🪚" },
  { id: "plasma", name: "Плазморез", short: "Плазма", stages: ["cutting_sheet"], hours: 8, color: C.purple, icon: "⚡" },
  { id: "weld_lg1", name: "Крупногаб. пост №1", short: "Кр.1", stages: ["weld_assembly"], hours: 8, color: C.orange, icon: "🔥", isLarge: true },
  { id: "weld_lg2", name: "Крупногаб. пост №2", short: "Кр.2", stages: ["weld_assembly"], hours: 8, color: C.orange, icon: "🔥", isLarge: true },
  { id: "weld_st1", name: "Станд. пост №3", short: "Ст.3", stages: ["weld_assembly"], hours: 8, color: C.orange, icon: "🔥" },
  { id: "weld_st2", name: "Станд. пост №4", short: "Ст.4", stages: ["weld_assembly"], hours: 8, color: C.orange, icon: "🔥" },
  { id: "fitters", name: "Слесари (4 чел.)", short: "Слес.", stages: ["fitting"], hours: 32, color: C.green, icon: "🔧" },
  { id: "paint", name: "Покрасочная камера", short: "Краска", stages: ["painting"], hours: 8, color: C.red, icon: "🎨" },
];

// Size → coefficients
const SIZE = {
  small:  { crane: false, largePost: false, moveK: 0.05, dryH: 2, paintNote: "Партия в камере" },
  medium: { crane: true,  largePost: false, moveK: 0.15, dryH: 2, paintNote: "Несколько шт. в камере" },
  large:  { crane: true,  largePost: true,  moveK: 0.30, dryH: 4, paintNote: "1-2 шт., +сушка" },
  xlarge: { crane: true,  largePost: true,  moveK: 0.50, dryH: 8, paintNote: "По частям, многодневная" },
};

// Norms: hours per ton (base values — user will calibrate later)
const NORMS = {
  cut_profile: 2.0,   // base; ×1.4 if crane needed
  cut_sheet: 1.5,
  weld_assembly: { simple: 8, medium: 13, complex: 20 },
  fitting_clean: { simple: 1.0, medium: 1.5, complex: 2.0 },
  fitting_pack:  { simple: 0.5, medium: 1.0, complex: 2.0 },
  paint: { simple: 1.5, medium: 2.5, complex: 3.5 },
};

const PROJECTS = [
  { id:"p1", name:"Склад Магнит Екб", tonnage:8.5, deadline:"2026-03-28", priority:1, marks:[
    { id:"К-01", type:"column", weight:320, qty:8, cx:"simple", sz:"medium" },
    { id:"Б-01", type:"beam", weight:450, qty:12, cx:"medium", sz:"large" },
    { id:"Б-02", type:"beam", weight:280, qty:6, cx:"simple", sz:"medium" },
    { id:"Ф-01", type:"truss", weight:680, qty:4, cx:"complex", sz:"xlarge" },
    { id:"Св-01", type:"brace", weight:85, qty:16, cx:"simple", sz:"small" },
    { id:"П-01", type:"plate", weight:120, qty:10, cx:"medium", sz:"small" },
  ]},
  { id:"p2", name:"АЗС Лукойл навес", tonnage:3.2, deadline:"2026-03-20", priority:2, marks:[
    { id:"К-01", type:"column", weight:250, qty:6, cx:"simple", sz:"medium" },
    { id:"Р-01", type:"beam", weight:380, qty:4, cx:"medium", sz:"large" },
    { id:"Пр-01", type:"brace", weight:65, qty:8, cx:"simple", sz:"small" },
  ]},
  { id:"p3", name:"Площадка обслуж.", tonnage:5.1, deadline:"2026-04-05", priority:3, marks:[
    { id:"Л-01", type:"stair", weight:420, qty:2, cx:"complex", sz:"large" },
    { id:"Пл-01", type:"platform", weight:350, qty:4, cx:"medium", sz:"large" },
    { id:"Ог-01", type:"railing", weight:45, qty:20, cx:"simple", sz:"medium" },
    { id:"К-01", type:"column", weight:280, qty:6, cx:"medium", sz:"medium" },
  ]},
  { id:"p4", name:"Каркас котельной", tonnage:7.8, deadline:"2026-04-15", priority:2, marks:[
    { id:"К-01", type:"column", weight:520, qty:8, cx:"medium", sz:"large" },
    { id:"Б-01", type:"beam", weight:610, qty:6, cx:"medium", sz:"large" },
    { id:"Св-01", type:"brace", weight:95, qty:12, cx:"simple", sz:"medium" },
    { id:"П-01", type:"plate", weight:180, qty:8, cx:"complex", sz:"medium" },
  ]},
  { id:"p5", name:"Ангар 12×30", tonnage:9.2, deadline:"2026-04-25", priority:3, marks:[
    { id:"Ф-01", type:"truss", weight:850, qty:6, cx:"complex", sz:"xlarge" },
    { id:"К-01", type:"column", weight:380, qty:12, cx:"simple", sz:"medium" },
    { id:"Пр-01", type:"purlin", weight:65, qty:30, cx:"simple", sz:"medium" },
  ]},
];

function rnd(n) { return Math.max(0.5, Math.round(n * 10) / 10); }

function genOps(proj) {
  const ops = [];
  for (const m of proj.marks) {
    const t = (m.weight * m.qty) / 1000;
    const s = SIZE[m.sz] || SIZE.medium;
    const isSheet = ["plate","platform","panel"].includes(m.type);

    // 1 — Cutting
    let cutH = isSheet ? NORMS.cut_sheet * t : NORMS.cut_profile * t * (s.crane ? 1.4 : 1);
    ops.push({ id:`${proj.id}|${m.id}|cut`, pid:proj.id, pname:proj.name, mid:m.id,
      stage: isSheet?"cutting_sheet":"cutting_profile", label: isSheet?"Плазма":"Пила",
      seq:1, hours:rnd(cutH), pr:proj.priority, dl:proj.deadline, lg:false, sz:m.sz });

    // 2 — Weld+Assembly
    let waH = (NORMS.weld_assembly[m.cx]||13) * t;
    ops.push({ id:`${proj.id}|${m.id}|wa`, pid:proj.id, pname:proj.name, mid:m.id,
      stage:"weld_assembly", label:"Сб+Св",
      seq:2, hours:rnd(waH), pr:proj.priority, dl:proj.deadline, lg:s.largePost, sz:m.sz });

    // 3 — Fitting (clean + move + pack)
    let cH = (NORMS.fitting_clean[m.cx]||1.5) * t;
    let mH = cH * s.moveK;
    let pH = (NORMS.fitting_pack[m.cx]||1) * t;
    ops.push({ id:`${proj.id}|${m.id}|fit`, pid:proj.id, pname:proj.name, mid:m.id,
      stage:"fitting", label:"Слес.",
      seq:3, hours:rnd(cH+mH+pH), pr:proj.priority, dl:proj.deadline, lg:false, sz:m.sz,
      breakdown:{clean:rnd(cH),move:rnd(mH),pack:rnd(pH)} });

    // 4 — Painting + drying
    let paH = (NORMS.paint[m.cx]||2.5) * t;
    ops.push({ id:`${proj.id}|${m.id}|pnt`, pid:proj.id, pname:proj.name, mid:m.id,
      stage:"painting", label:"Краска",
      seq:4, hours:rnd(paH), pr:proj.priority, dl:proj.deadline, lg:false, sz:m.sz,
      dryH: s.dryH, paintNote: s.paintNote });
  }
  return ops;
}

function runSchedule(allOps) {
  const sorted = [...allOps].sort((a,b) => {
    if(a.pr!==b.pr) return a.pr-b.pr;
    if(a.dl!==b.dl) return a.dl.localeCompare(b.dl);
    return a.seq-b.seq;
  });
  const load={}, result=[];
  const base = new Date("2026-02-24");
  const isWorkday = (day) => { const d=new Date(base); d.setDate(d.getDate()+day); const w=d.getDay(); return w!==0&&w!==6; };

  for (const op of sorted) {
    // find predecessor
    const prev = result.find(r => r.pid===op.pid && r.mid===op.mid && r.seq===op.seq-1);
    let earliest = 0;
    if (prev) {
      earliest = prev.endDay + 1;
      if (prev.dryH) earliest += Math.ceil(prev.dryH / 8);
    }

    // eligible resources
    let elig;
    if (op.stage==="cutting_profile") elig = RESOURCES.filter(r=>r.id==="bandsaw");
    else if (op.stage==="cutting_sheet") elig = RESOURCES.filter(r=>r.id==="plasma");
    else if (op.stage==="weld_assembly") {
      elig = op.lg ? RESOURCES.filter(r=>r.isLarge) : RESOURCES.filter(r=>r.stages?.includes("weld_assembly"));
    }
    else if (op.stage==="fitting") elig = RESOURCES.filter(r=>r.id==="fitters");
    else elig = RESOURCES.filter(r=>r.id==="paint");

    // find best resource (earliest finish)
    let bestRes=elig[0], bestEnd=9999;
    for (const res of elig) {
      let d=earliest, rem=op.hours;
      while(rem>0) { if(!isWorkday(d)){d++;continue;} if(!load[res.id])load[res.id]={}; const u=load[res.id][d]||0; const a=res.hours-u; if(a>0)rem-=a; if(rem>0)d++; else break; }
      if(d<bestEnd){bestEnd=d;bestRes=res;}
    }

    // assign
    let d=earliest, rem=op.hours, startD=-1, endD=0;
    while(rem>0) {
      if(!isWorkday(d)){d++;continue;}
      if(!load[bestRes.id])load[bestRes.id]={};
      const u=load[bestRes.id][d]||0;
      const a=bestRes.hours-u;
      if(a>0){const take=Math.min(a,rem); load[bestRes.id][d]=u+take; rem-=take; if(startD<0)startD=d; endD=d;}
      if(rem>0)d++;
    }

    // block paint for drying
    if(op.stage==="painting"&&op.dryH){
      let dr=op.dryH, dd=endD+1;
      while(dr>0){if(!isWorkday(dd)){dd++;continue;} if(!load[bestRes.id])load[bestRes.id]={}; load[bestRes.id][dd]=(load[bestRes.id][dd]||0)+4; dr-=4; dd++;}
    }

    const ds=new Date(base); ds.setDate(ds.getDate()+startD);
    const de=new Date(base); de.setDate(de.getDate()+endD);
    result.push({...op, resId:bestRes.id, resName:bestRes.short, resColor:bestRes.color, startDay:startD, endDay:endD, dateStart:ds.toISOString().slice(0,10), dateEnd:de.toISOString().slice(0,10)});
  }
  return {scheduled:result, load};
}

function fmtD(d){const dt=new Date(d);return `${dt.getDate()} ${["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"][dt.getMonth()]}`;}
function dBetw(a,b){return Math.round((new Date(b)-new Date(a))/864e5);}

// ═══ HEATMAP ═══
function Heatmap({load}) {
  const base="2026-02-24", days=35;
  return (
    <div style={{overflowX:"auto"}}>
      <div style={{minWidth:780}}>
        <div style={{display:"flex",mb:2}}>
          <div style={{width:85,flexShrink:0}}/>
          {Array.from({length:days},(_,i)=>{const d=new Date(base);d.setDate(d.getDate()+i);const we=d.getDay()===0||d.getDay()===6;
            return <div key={i} style={{width:20,flexShrink:0,textAlign:"center",fontSize:8,color:we?C.muted:C.dim,padding:"1px 0"}}>{d.getDate()}</div>;
          })}
        </div>
        {RESOURCES.map(res=>(
          <div key={res.id} style={{display:"flex",alignItems:"center",marginBottom:1}}>
            <div style={{width:85,flexShrink:0,fontSize:10,color:res.color,fontWeight:600,textAlign:"right",paddingRight:6,whiteSpace:"nowrap"}}>{res.icon} {res.short}</div>
            {Array.from({length:days},(_,i)=>{
              const d=new Date(base);d.setDate(d.getDate()+i);const we=d.getDay()===0||d.getDay()===6;
              const l=load[res.id]?.[i]||0;const pct=we?0:(l/res.hours)*100;
              let bg=C.surface;
              if(we)bg="#080b10";
              else if(pct>=95)bg="#f8514977";
              else if(pct>=75)bg="#d2992255";
              else if(pct>=40)bg="#00d4aa44";
              else if(pct>0)bg="#00d4aa20";
              return <div key={i} title={`${res.name}: ${l.toFixed(1)}/${res.hours}ч (${Math.round(pct)}%)`} style={{width:20,height:18,flexShrink:0,background:bg,borderRadius:2,margin:"0 0.5px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,color:pct>=75?C.text:C.muted,cursor:"default"}}>{!we&&pct>0?Math.round(pct):""}</div>;
            })}
          </div>
        ))}
        <div style={{display:"flex",gap:10,marginTop:8,paddingLeft:85}}>
          {[{l:"0%",bg:C.surface},{l:"<40",bg:"#00d4aa20"},{l:"40-75",bg:"#00d4aa44"},{l:"75-95",bg:"#d2992255"},{l:">95",bg:"#f8514977"}].map((x,i)=>
            <div key={i} style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:C.dim}}><div style={{width:10,height:10,borderRadius:2,background:x.bg}}/>{x.l}%</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══ BOTTLENECK ═══
function Bottleneck({load}) {
  const days=35;
  const analysis = RESOURCES.map(res=>{
    let tLoad=0,tCap=0,peak=0,overD=0;
    for(let d=0;d<days;d++){
      const dt=new Date("2026-02-24");dt.setDate(dt.getDate()+d);if(dt.getDay()===0||dt.getDay()===6)continue;
      const l=load[res.id]?.[d]||0;tLoad+=l;tCap+=res.hours;if(l>peak)peak=l;if(l>res.hours*0.9)overD++;
    }
    return {...res,avg:tCap?tLoad/tCap*100:0,peak:peak/res.hours*100,overD};
  }).sort((a,b)=>b.avg-a.avg);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {analysis.map((r,i)=>{
        const bc=r.avg>85?C.red:r.avg>65?C.orange:C.accent;
        return (
          <div key={i} style={{background:C.card,border:`1px solid ${r.avg>75?C.red+"44":C.border}`,borderRadius:8,padding:"10px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:15}}>{r.icon}</span>
                <span style={{fontSize:12,fontWeight:600,color:r.color}}>{r.name}</span>
                {r.avg>75&&<span style={{fontSize:9,background:C.redBg,color:C.red,padding:"1px 5px",borderRadius:3,fontWeight:600}}>УЗКОЕ МЕСТО</span>}
              </div>
              <span style={{fontSize:18,fontWeight:800,color:bc}}>{Math.round(r.avg)}%</span>
            </div>
            <div style={{height:5,background:C.surface,borderRadius:3,overflow:"hidden"}}>
              <div style={{width:`${Math.min(100,r.avg)}%`,height:"100%",background:bc,borderRadius:3}}/>
            </div>
            <div style={{fontSize:10,color:C.dim,marginTop:4}}>Пик: {Math.round(r.peak)}% • Перегруз &gt;90%: {r.overD} дн.</div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ PROJECT GANTT ═══
function Gantt({scheduled, projects}) {
  const base="2026-02-24",totalDays=50;
  const stageColor={cutting_profile:C.blue,cutting_sheet:C.purple,weld_assembly:C.orange,fitting:C.green,painting:C.red};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {projects.map(p=>{
        const ops=scheduled.filter(o=>o.pid===p.id);
        const maxD=Math.max(0,...ops.map(o=>o.endDay));
        const dlD=dBetw(base,p.deadline);
        const late=maxD>dlD;
        const marks={};ops.forEach(o=>{if(!marks[o.mid])marks[o.mid]=[];marks[o.mid].push(o);});
        return (
          <div key={p.id} style={{background:C.card,border:`1px solid ${late?C.red+"44":C.border}`,borderRadius:8,overflow:"hidden"}}>
            <div style={{padding:"8px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.border}`}}>
              <div><span style={{fontWeight:700,fontSize:13,color:C.text}}>{p.name}</span><span style={{fontSize:11,color:C.dim,marginLeft:8}}>{p.tonnage}т</span></div>
              <span style={{fontSize:11,fontWeight:600,color:late?C.red:C.green,background:late?C.redBg:C.greenBg,padding:"2px 8px",borderRadius:4}}>
                {late?`⚠ +${maxD-dlD} дн.`:`✓ ${fmtD(p.deadline)}`}
              </span>
            </div>
            <div style={{padding:"6px 14px",overflowX:"auto"}}>
              <div style={{minWidth:600}}>
                {Object.entries(marks).slice(0,8).map(([mid,mops])=>(
                  <div key={mid} style={{display:"flex",alignItems:"center",height:20,marginBottom:1}}>
                    <div style={{width:45,fontSize:9,color:C.dim,flexShrink:0}}>{mid}</div>
                    <div style={{flex:1,position:"relative",height:14}}>
                      {mops.map((op,i)=>{
                        const left=(op.startDay/totalDays)*100;
                        const w=Math.max(1.5,((op.endDay-op.startDay+1)/totalDays)*100);
                        return <div key={i} title={`${op.label}: ${op.hours}ч → ${op.resName}`} style={{position:"absolute",left:`${left}%`,width:`${w}%`,height:12,borderRadius:2,top:1,background:`${stageColor[op.stage]||C.accent}77`,border:`1px solid ${stageColor[op.stage]||C.accent}`,fontSize:7,display:"flex",alignItems:"center",justifyContent:"center",color:C.text,overflow:"hidden",whiteSpace:"nowrap"}}>{w>3.5?op.resName:""}</div>;
                      })}
                      <div style={{position:"absolute",left:`${(dlD/totalDays)*100}%`,top:-1,height:16,width:1.5,background:late?C.red:C.green,opacity:.5}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══ WHAT-IF ═══
function WhatIf({projects,scheduled}) {
  const [nw,setNw]=useState({name:"",tons:5,dl:"2026-04-10",marks:15,cx:"medium",sz:"medium"});
  const [res,setRes]=useState(null);

  const sim=useCallback(()=>{
    const fake={id:"sim",name:nw.name||"НОВЫЙ ЗАКАЗ",tonnage:nw.tons,deadline:nw.dl,priority:3,
      marks:Array.from({length:nw.marks},(_,i)=>({id:`Н-${i+1}`,type:i%3===0?"column":i%3===1?"beam":"brace",weight:Math.round(nw.tons*1000/nw.marks),qty:Math.max(1,Math.round(2+Math.random()*4)),cx:nw.cx,sz:nw.sz}))};
    const allP=[...projects,fake];
    const allOps=allP.flatMap(p=>genOps(p));
    const {scheduled:newSch}=runSchedule(allOps);
    const diffs=projects.map(p=>{
      const oldEnd=Math.max(0,...scheduled.filter(o=>o.pid===p.id).map(o=>o.endDay));
      const newEnd=Math.max(0,...newSch.filter(o=>o.pid===p.id).map(o=>o.endDay));
      const dlD=dBetw("2026-02-24",p.deadline);
      return {name:p.name,shift:newEnd-oldEnd,wasLate:oldEnd>dlD,isLate:newEnd>dlD};
    });
    const simEnd=Math.max(0,...newSch.filter(o=>o.pid==="sim").map(o=>o.endDay));
    const dlD=dBetw("2026-02-24",nw.dl);
    setRes({diffs,ok:simEnd<=dlD,fin:fmtD(new Date(new Date("2026-02-24").getTime()+simEnd*864e5)),gap:simEnd-dlD});
  },[nw,projects,scheduled]);

  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:16}}>
      <div style={{fontSize:14,fontWeight:700,color:C.accent,marginBottom:12}}>🔮 Что если взять новый заказ?</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
        {[
          {l:"Тоннаж",v:nw.tons,k:"tons",t:"number"},
          {l:"Дедлайн",v:nw.dl,k:"dl",t:"date"},
          {l:"Кол-во марок",v:nw.marks,k:"marks",t:"number"},
        ].map((f,i)=>(
          <div key={i}>
            <div style={{fontSize:10,color:C.dim,marginBottom:3}}>{f.l}</div>
            <input type={f.t} value={f.v} onChange={e=>setNw({...nw,[f.k]:f.t==="number"?+e.target.value:e.target.value})}
              style={{width:"100%",padding:"5px 7px",fontSize:12,background:C.surface,border:`1px solid ${C.border}`,borderRadius:5,color:C.text,outline:"none",boxSizing:"border-box"}}/>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <div>
          <div style={{fontSize:10,color:C.dim,marginBottom:3}}>Сложность</div>
          <select value={nw.cx} onChange={e=>setNw({...nw,cx:e.target.value})} style={{padding:"5px 7px",fontSize:12,background:C.surface,border:`1px solid ${C.border}`,borderRadius:5,color:C.text}}>
            <option value="simple">Простая</option><option value="medium">Средняя</option><option value="complex">Сложная</option>
          </select>
        </div>
        <div>
          <div style={{fontSize:10,color:C.dim,marginBottom:3}}>Габариты</div>
          <select value={nw.sz} onChange={e=>setNw({...nw,sz:e.target.value})} style={{padding:"5px 7px",fontSize:12,background:C.surface,border:`1px solid ${C.border}`,borderRadius:5,color:C.text}}>
            <option value="small">Малый (&lt;1.5м)</option><option value="medium">Средний (1.5-3м)</option><option value="large">Крупный (3-6м)</option><option value="xlarge">Негабарит (&gt;6м)</option>
          </select>
        </div>
      </div>
      <button onClick={sim} style={{padding:"7px 18px",borderRadius:6,border:"none",cursor:"pointer",background:C.accent,color:C.bg,fontWeight:700,fontSize:12}}>⚡ Рассчитать</button>
      {res&&(
        <div style={{marginTop:12,padding:12,background:C.surface,borderRadius:8,border:`1px solid ${C.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:res.ok?C.green:C.red,marginBottom:8}}>
            {res.ok?`✅ Успеете! Завершение: ${res.fin} (запас ${-res.gap} дн.)`:`⚠️ Не успеете на ${res.gap} дн. Завершение: ${res.fin}`}
          </div>
          <div style={{fontSize:11,color:C.dim,marginBottom:4}}>Влияние на текущие проекты:</div>
          {res.diffs.map((d,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"3px 6px",fontSize:11,background:i%2?C.card:"transparent",borderRadius:3}}>
              <span style={{color:C.text}}>{d.name}</span>
              <span style={{color:d.shift>0?C.red:d.shift<0?C.green:C.dim,fontWeight:600}}>
                {d.shift>0?`+${d.shift} дн.`:d.shift<0?`${d.shift} дн.`:"—"}{d.isLate&&!d.wasLate?" ⚠ ПРОСРОЧКА":""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ DATA CHECKLIST ═══
function Checklist() {
  const [ch,setCh]=useState({});
  const tog=k=>setCh(p=>({...p,[k]:!p[k]}));
  const secs=[
    {t:"🪚 Пила",c:C.blue,items:[
      {k:"s1",q:"Сколько профилей за 8ч? (мелкие — ? шт, крупные с краном — ? шт)"},
      {k:"s2",q:"Сколько минут добавляет кран на каждый рез крупного профиля?"},
      {k:"s3",q:"Макс. размер профиля для пилы?"},
    ]},
    {t:"⚡ Плазма",c:C.purple,items:[
      {k:"p1",q:"Макс. толщина листа?"},
      {k:"p2",q:"Сколько м² реза или деталей (фасонки 300×300) за смену?"},
      {k:"p3",q:"При каком типе заказов плазма — бутылочное горлышко?"},
    ]},
    {t:"🔥 Сварка",c:C.orange,items:[
      {k:"w1",q:"Типовая балка ~400кг → часов на сборку+сварку?"},
      {k:"w2",q:"Типовая колонна ~300кг → часов?"},
      {k:"w3",q:"Ферма 10м ~700кг → часов?"},
      {k:"w4",q:"При какой загрузке разделяете сборщиков и сварщиков?"},
      {k:"w5",q:"Чем отличаются крупногабаритные посты? (кран, кантователь?)"},
    ]},
    {t:"🔧 Слесари",c:C.green,items:[
      {k:"f1",q:"Зачистка типовой балки → минут/часов?"},
      {k:"f2",q:"Перемещение: ферма 10м = 20мин. А мелкая деталь?"},
      {k:"f3",q:"Упаковка крупногабарита (1 ферма) → часов?"},
      {k:"f4",q:"Упаковка мелочи → сколько шт/час?"},
    ]},
    {t:"🎨 Покраска",c:C.red,items:[
      {k:"c1",q:"Размер камеры (Д×Ш×В)?"},
      {k:"c2",q:"Сколько мелких деталей за раз?"},
      {k:"c3",q:"Сушка: лето vs зима — разница?"},
      {k:"c4",q:"Грунт+эмаль? 1 слой? 2 слоя?"},
      {k:"c5",q:"Негабарит — красите в цеху?"},
    ]},
    {t:"📋 Общее",c:C.accent,items:[
      {k:"g1",q:"Средний проект от КМД до отгрузки → недель?"},
      {k:"g2",q:"Как часто меняются приоритеты?"},
      {k:"g3",q:"Как часто простой из-за нехватки металла?"},
      {k:"g4",q:"Есть ОТК как отдельный этап?"},
    ]},
  ];
  const total=secs.reduce((s,x)=>s+x.items.length,0);
  const done=Object.values(ch).filter(Boolean).length;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{padding:"10px 14px",background:C.accentBg,borderLeft:`3px solid ${C.accent}`,borderRadius:8,fontSize:12,color:C.text,lineHeight:1.5}}>
        <strong>Задание на цех:</strong> пройдитесь по списку, запишите примерные значения. «Примерно 3-4 часа» — отлично. AI откалибрует по факту.
      </div>
      <div style={{padding:"6px 14px",background:C.card,borderRadius:6,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:100,height:6,background:C.surface,borderRadius:3,overflow:"hidden"}}>
          <div style={{width:`${done/total*100}%`,height:"100%",background:C.accent,borderRadius:3}}/>
        </div>
        <span style={{fontSize:11,color:C.dim}}>{done}/{total}</span>
      </div>
      {secs.map((sec,si)=>(
        <div key={si} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
          <div style={{padding:"8px 14px",borderBottom:`1px solid ${C.border}`,fontSize:13,fontWeight:700,color:sec.c}}>{sec.t}</div>
          {sec.items.map((item,ii)=>(
            <div key={ii} onClick={()=>tog(item.k)} style={{display:"flex",gap:8,padding:"6px 14px",cursor:"pointer",alignItems:"flex-start",background:ii%2?C.surface:"transparent",opacity:ch[item.k]?.5:1}}>
              <span style={{width:16,height:16,borderRadius:3,flexShrink:0,marginTop:1,border:`2px solid ${ch[item.k]?C.accent:C.borderLight}`,background:ch[item.k]?C.accentBg:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.accent}}>{ch[item.k]?"✓":""}</span>
              <span style={{fontSize:12,color:C.text,lineHeight:1.4,textDecoration:ch[item.k]?"line-through":"none"}}>{item.q}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ═══ MAIN ═══
export default function App() {
  const [view,setView]=useState("heatmap");
  const projects=PROJECTS;
  const {scheduled,load}=useMemo(()=>{const ops=projects.flatMap(p=>genOps(p));return runSchedule(ops);},[]);

  const totalH=Math.round(scheduled.reduce((s,o)=>s+o.hours,0));
  const maxD=Math.max(0,...scheduled.map(o=>o.endDay));
  const lateN=projects.filter(p=>{const e=Math.max(0,...scheduled.filter(o=>o.pid===p.id).map(o=>o.endDay));return e>dBetw("2026-02-24",p.deadline);}).length;

  const views=[
    {id:"heatmap",l:"📊 Загрузка",},
    {id:"bottleneck",l:"🔍 Узкие места"},
    {id:"gantt",l:"📅 Ганtt"},
    {id:"whatif",l:"🔮 Что если?"},
    {id:"checklist",l:"📝 Данные для сбора"},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <div style={{maxWidth:880,margin:"0 auto",padding:"16px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontSize:10,color:C.accent,letterSpacing:2,fontWeight:600}}>ФЕРРУМ AI v2</div>
            <div style={{fontSize:20,fontWeight:800}}>Планировщик производства</div>
          </div>
          <div style={{textAlign:"right",fontSize:11,color:C.dim}}>
            {projects.length} проектов • {totalH} н-ч • {maxD} раб.дн.
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:12}}>
          {[
            {l:"Проектов",v:projects.length,c:C.accent},
            {l:"Просрочки",v:lateN>0?`${lateN} ⚠`:"Нет ✓",c:lateN>0?C.red:C.green},
            {l:"Горизонт",v:`${maxD} дн.`,c:C.blue},
          ].map((s,i)=>(
            <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:6,padding:"8px 10px"}}>
              <div style={{fontSize:9,color:C.dim}}>{s.l}</div>
              <div style={{fontSize:14,fontWeight:700,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",gap:2,marginBottom:14,background:C.card,borderRadius:7,padding:3,border:`1px solid ${C.border}`,overflowX:"auto"}}>
          {views.map(v=>(
            <button key={v.id} onClick={()=>setView(v.id)} style={{flex:"0 0 auto",padding:"6px 10px",border:"none",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:view===v.id?700:400,background:view===v.id?C.accentBg:"transparent",color:view===v.id?C.accent:C.muted,whiteSpace:"nowrap"}}>
              {v.l}
            </button>
          ))}
        </div>

        {view==="heatmap"&&<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Загрузка ресурсов (% от мощности/день)</div>
          <Heatmap load={load}/>
        </div>}
        {view==="bottleneck"&&<Bottleneck load={load}/>}
        {view==="gantt"&&<Gantt scheduled={scheduled} projects={projects}/>}
        {view==="whatif"&&<WhatIf projects={projects} scheduled={scheduled}/>}
        {view==="checklist"&&<Checklist/>}

        <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap",padding:"8px 12px",background:C.card,borderRadius:6,border:`1px solid ${C.border}`}}>
          <span style={{fontSize:9,color:C.muted}}>Стадии:</span>
          {[{l:"Пила",c:C.blue},{l:"Плазма",c:C.purple},{l:"Сб+Св",c:C.orange},{l:"Слес.",c:C.green},{l:"Краска",c:C.red}].map((s,i)=>
            <div key={i} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:s.c}}>
              <div style={{width:8,height:8,borderRadius:2,background:`${s.c}77`,border:`1px solid ${s.c}`}}/>{s.l}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
