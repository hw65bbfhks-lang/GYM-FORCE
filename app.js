"use strict";
const KEY='gymtracker_v2';
const $=s=>document.querySelector(s);
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=x=>{const v=parseFloat(String(x).replace(',','.'));return isNaN(v)?0:v};
const todayStr=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const fmtD=s=>{if(!s)return 'без даты';const d=new Date(s);if(isNaN(d))return s;return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear()};
const fmtT=sec=>{sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(s).padStart(2,'0')};
const fmtDur=sec=>{if(!sec)return '—';const h=Math.floor(sec/3600),m=Math.round(sec%3600/60);return h?h+' ч '+m+' мин':m+' мин'};
const fmtKg=v=>Math.round(v).toLocaleString('ru-RU')+' кг';

/* ---------- Программа пользователя (из файла backup) ---------- */
const SEED=[
['День 1 — Грудь / плечи',[
 ['Жим гантелей на наклонной',3,'12',[22,26,26],'30° (первый подход 26 на 12, остальные на 8)'],
 ['Жим в тренажёре',3,'12',[55,55,55]],
 ['Брусья',3,'12',[0,0,0]],
 ['Подъёмы в стороны',4,'12-15',[35,37,37,37]]]],
['День 2 — Спина / задняя дельта / бицепс бедра',[
 ['Тяга верхнего блока широким хватом',3,'10-12',[50,60,60]],
 ['Тяга нижнего блока',3,'12',[50,55,60]],
 ['Подтягивания широким хватом',3,'макс',[0,0,0]],
 ['Задняя дельта в тяге',3,'12-15',[40,40,40]],
 ['Сгибание ног',3,'10-12',[80,90,90]],
 ['Пресс',3,'25',[0,0,0]]]],
['День 3 — Руки / ноги / пресс',[
 ['Жим ногами / разгибание ног',3,'12-15',[50,55,60]],
 ['Штанга на бицепс',3,'8-10',[35,40,40],'40 кг: 8 и 6 повторов'],
 ['Трицепс на блоке вниз',3,'10-12',[50,50,50],'В старой записи: «50 / 50 / 19 (первые два на 8)» — проверь вес'],
 ['Молотки',3,'10-12',[16,16,16]],
 ['Пресс',3,'15-20',[0,0,0]],
 ['Трицепс над головой',3,'10-12',[12,14,14]]]]
];
const lastInt=s=>{const m=String(s||'').match(/\d+/g);return m?m[m.length-1]:''};
function mkSets(ws,reps){return ws.map(w=>({w:w,r:lastInt(reps),c:'',done:false}))}
function mkEx(name,reps,sets,note){return {id:uid(),name:name,reps:reps||'',note:note||'',sets:sets}}
function seedState(){
 const days=SEED.map(d=>({id:uid(),name:d[0],done:false,date:'',feeling:'',note:'',duration:0,volume:0,
  exercises:d[1].map(e=>mkEx(e[0],e[2],mkSets(e[3],e[2]),e[4]))}));
 const names=[];days.forEach(d=>d.exercises.forEach(e=>{if(!names.includes(e.name))names.push(e.name)}));
 return {v:2,bank:names.map(n=>({id:uid(),name:n,group:''})),week:{id:uid(),num:1,startedAt:new Date().toISOString(),days:days},weeks:[],settings:{rest:90},session:null};
}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.v===2)return s}catch(e){}return seedState()}
let S=load();
const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
let ui={tab:'week',dayId:null,histId:null,progEx:null,modal:null};

/* ---------- Импорт старого формата ---------- */
function parseWeights(str,n){
 const t=String(str||'').split('/').map(x=>x.trim()).filter(x=>x!=='');
 let a=t.map(x=>{const m=x.match(/^\d+(?:[.,]\d+)?/);return m?num(m[0]):0});
 if(!a.length)a=[0];n=n||a.length;
 while(a.length<n)a.push(a[a.length-1]);return a.slice(0,n);
}
function convDay(d){
 return {id:uid(),name:d.name,done:!!d.done,date:d.date||'',feeling:d.feeling||'',note:d.note||'',duration:0,volume:0,
  exercises:(d.exercises||[]).map(e=>{const n=Number(e.sets)||0;const ws=parseWeights(e.weight,n||undefined);
   return mkEx(e.name,String(e.reps||''),ws.map(w=>({w:w,r:lastInt(e.reps),c:'',done:!!d.done})),e.note)})};
}
function convWeek(w,num,fin){return {id:uid(),num:num,startedAt:w.createdAt||new Date().toISOString(),finishedAt:fin||w.savedAt,days:(w.days||[]).map(convDay)}}
function importData(obj){
 if(obj&&obj.v===2){S=obj;S.session=null;return}
 if(obj&&obj.currentWeek){
  const hist=(obj.history||[]).map((w,i)=>convWeek(w,i+1));
  const cw=convWeek(obj.currentWeek,hist.length+1);delete cw.finishedAt;
  const names=[];[...hist,cw].forEach(w=>w.days.forEach(d=>d.exercises.forEach(e=>{if(!names.includes(e.name))names.push(e.name)})));
  S={v:2,bank:names.map(n=>({id:uid(),name:n,group:''})),week:cw,weeks:hist,settings:{rest:90},session:null};return}
 throw new Error('Неизвестный формат');
}

/* ---------- Расчёты ---------- */
const exVol=e=>e.sets.reduce((a,s)=>a+(s.done?num(s.w)*num(s.r):0),0);
const dayVol=d=>d.exercises.reduce((a,e)=>a+exVol(e),0);
const allWeeks=()=>[...S.weeks,S.week];
function aggWeek(w){
 const m={};
 w.days.forEach(d=>d.exercises.forEach(e=>{
  const ds=e.sets.filter(s=>s.done);if(!ds.length)return;
  const a=m[e.name]||(m[e.name]={vol:0,max:0,reps:0,sets:0,date:d.date});
  ds.forEach(s=>{a.vol+=num(s.w)*num(s.r);a.max=Math.max(a.max,num(s.w));a.reps+=num(s.r);a.sets++});
 }));return m;
}
function findPrev(name,excl){
 const cand=[];
 [...S.week.days].forEach(d=>cand.push({d,w:S.week}));
 for(let i=S.weeks.length-1;i>=0;i--)S.weeks[i].days.forEach(d=>cand.push({d,w:S.weeks[i]}));
 const ok=(c,strict)=>c.d!==excl&&c.d.exercises.some(e=>e.name===name&&(strict?e.sets.some(s=>s.done):true));
 const sorted=c=>c.sort((a,b)=>(b.d.date||'').localeCompare(a.d.date||''));
 let list=cand.filter(c=>ok(c,true));
 if(S.week.days.includes(excl)){list=list.filter(c=>c.w!==S.week||c.d.date<=(excl.date||todayStr()))}
 if(!list.length)list=cand.filter(c=>c.w!==S.week&&ok(c,false));
 if(!list.length)return null;
 const first=S.weeks.length?list:list;
 const cur=list.filter(c=>c.w===S.week);const old=list.filter(c=>c.w!==S.week);
 const pick=cur.length?sorted(cur.slice())[0]:old[0];
 return {day:pick.d,week:pick.w,ex:pick.d.exercises.find(e=>e.name===name)};
}
const setStr=e=>e.sets.map(s=>(num(s.w)?s.w:'св.')+'×'+(s.r||'?')).join(' · ');

/* ---------- Звук ---------- */
let AC=null;
function beep(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();[0,0.25,0.5].forEach(t=>{const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=880;g.gain.value=.25;o.connect(g);g.connect(AC.destination);o.start(AC.currentTime+t);o.stop(AC.currentTime+t+.15)});navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}}
let wake=null;
async function lockScreen(){try{if(navigator.wakeLock)wake=await navigator.wakeLock.request('screen')}catch(e){}}
function unlockScreen(){try{wake&&wake.release();wake=null}catch(e){}}

/* ---------- Графики ---------- */
function lineChart(pts,unit){
 if(!pts.length)return '<div class="mut">Пока нет данных (отмечай подходы галочкой ✓)</div>';
 const W=320,H=150,p=28;const ys=pts.map(q=>q.y);let mn=Math.min(...ys),mx=Math.max(...ys);if(mn===mx){mn-=1;mx+=1}
 const X=i=>pts.length===1?W/2:p+i*(W-2*p)/(pts.length-1),Y=v=>H-p-(v-mn)/(mx-mn)*(H-2*p);
 const path=pts.map((q,i)=>(i?'L':'M')+X(i)+','+Y(q.y)).join(' ');
 return `<svg viewBox="0 0 ${W} ${H}"><path d="${path}" fill="none" stroke="#5b8cff" stroke-width="2.5"/>`+
 pts.map((q,i)=>`<circle cx="${X(i)}" cy="${Y(q.y)}" r="4" fill="#5b8cff"/><text x="${X(i)}" y="${Y(q.y)-8}" fill="#f2f3f7" font-size="10" text-anchor="middle">${Math.round(q.y)}</text><text x="${X(i)}" y="${H-8}" fill="#8b8fa0" font-size="9" text-anchor="middle">${esc(q.x)}</text>`).join('')+`</svg><div class="mut">${unit}</div>`;
}
function statsHTML(w){
 const idx=allWeeks().indexOf(w);const prev=idx>0?allWeeks()[idx-1]:null;
 const cur=aggWeek(w),pv=prev?aggWeek(prev):{};
 const names=Object.keys(cur);
 const doneDays=w.days.filter(d=>d.done);
 const tv=Object.values(cur).reduce((a,x)=>a+x.vol,0),tt=doneDays.reduce((a,d)=>a+(d.duration||0),0);
 const pvTot=Object.values(pv).reduce((a,x)=>a+x.vol,0);
 let h=`<div class="kpi"><div><b>${doneDays.length}/${w.days.length}</b><span class="mut">тренировок</span></div><div><b>${Math.round(tv).toLocaleString('ru-RU')}</b><span class="mut">кг поднято</span></div><div><b>${fmtDur(tt)}</b><span class="mut">время</span></div></div>`;
 if(prev)h+=`<div class="mut">Прошлая неделя: ${fmtKg(pvTot)} ${pvTot?`(${tv>=pvTot?'+':''}${Math.round((tv-pvTot)/pvTot*100)}%)`:''}</div>`;
 if(!names.length)return h+'<p class="mut">Нет отмеченных подходов. Отмечай подходы галочкой ✓ во время тренировки.</p>';
 const mx=Math.max(...names.map(n=>Math.max(cur[n].vol,(pv[n]||{vol:0}).vol)))||1;
 h+='<h3>По упражнениям (объём, кг)</h3>';
 names.forEach(n=>{const c=cur[n],p=pv[n];
  const dv=p&&p.vol?Math.round((c.vol-p.vol)/p.vol*100):null;
  h+=`<div class="cmp"><div class="row sp"><b>${esc(n)}</b><span class="${dv==null?'mut':dv>=0?'up':'dn'}">${dv==null?'нет данных за прошлую':(dv>=0?'+':'')+dv+'%'}</span></div>
  <div class="mut">Сейчас: макс ${c.max||'своё'} кг · ${c.sets} подх. · ${c.reps} повт. · ${Math.round(c.vol)} кг</div>
  <div class="bars b1" style="width:${Math.max(2,c.vol/mx*100)}%"></div>
  ${p?`<div class="mut">Прошлая: макс ${p.max||'своё'} кг · ${p.sets} подх. · ${p.reps} повт. · ${Math.round(p.vol)} кг</div><div class="bars b0" style="width:${Math.max(2,p.vol/mx*100)}%"></div>`:''}</div>`});
 return h;
}

/* ---------- Рендер ---------- */
const curDay=()=>S.week.days.find(d=>d.id===ui.dayId);
function render(){
 const sy=window.scrollY;let h='',t='';
 if(ui.tab==='week'){ if(ui.dayId&&curDay()){t=curDay().name;h=dayView(curDay())}else{t='Неделя №'+S.week.num;h=weekView()} }
 else if(ui.tab==='history'){ if(ui.histId){const w=allWeeks().find(x=>x.id===ui.histId);t='Неделя №'+w.num;h=histDetail(w)}else{t='История';h=histView()} }
 else if(ui.tab==='bank'){t='Банк упражнений';h=bankView()}
 else if(ui.tab==='progress'){t='Прогресс';h=progView()}
 else {t='Ещё';h=settingsView()}
 $('#title').textContent=t;$('#app').innerHTML=h;
 document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.t===ui.tab));
 $('#modal').innerHTML=ui.modal?ui.modal():'';
 window.scrollTo(0,sy);tick();
}
function weekView(){
 let h=`<div class="mut" style="margin-bottom:10px">Начата ${fmtD(S.week.startedAt)}</div>`;
 S.week.days.forEach(d=>{h+=`<div class="card day" data-a="openDay" data-d="${d.id}"><div><b>${esc(d.name)}</b><div class="mut">${d.exercises.length} упр. · ${fmtD(d.date)}${d.done?` · ${fmtKg(d.volume||dayVol(d))} · ${fmtDur(d.duration)}`:''}</div></div><span class="badge ${d.done?'ok':''}">${d.done?'Выполнено':'Не выполнено'}</span></div>`});
 h+=`<button class="btn" data-a="addDay">+ Добавить день</button><button class="btn p" data-a="weekStats">📊 Посмотреть статистику недели</button><button class="btn g" data-a="nextWeek">Перейти к следующей неделе →</button>`;
 return h;
}
function dayView(d){
 const act=S.session&&S.session.dayId===d.id,other=S.session&&!act;
 let h=`<div class="row sp" style="margin-bottom:10px"><button class="btn s" data-a="back">‹ Назад</button><button class="btn s" data-a="renameDay">Переименовать</button></div>`;
 if(act){h+=`<div class="bar"><div class="row sp"><div><div class="mut">Время тренировки</div><div class="big" id="sw">0:00</div></div><div style="text-align:right"><div class="mut">Отдых</div><div class="rest" id="rest">—</div></div></div>
 <div class="chips">${[45,60,90,120,180].map(s=>`<button class="chip ${S.settings.rest===s?'on':''}" data-a="setRest" data-s="${s}">${s} с</button>`).join('')}<button class="chip" data-a="customRest">своё</button><button class="chip" data-a="skipRest">Пропустить</button></div>
 <button class="btn g" style="margin:10px 0 0" data-a="finish">✓ Завершить тренировку</button></div>`}
 else if(other)h+=`<div class="card mut">Сейчас идёт другая тренировка.</div>`;
 else h+=`<button class="btn p" data-a="start" data-d="${d.id}">▶ Начать тренировку</button>`;
 if(d.done&&!act)h+=`<div class="card"><b class="up">✓ Выполнено</b><div class="mut">Поднято ${fmtKg(d.volume||dayVol(d))} · время ${fmtDur(d.duration)}</div></div>`;
 h+=`<div class="card"><label>Дата</label><input type="date" data-f="date" data-d="${d.id}" value="${esc(d.date)}"><label>Самочувствие</label><select data-f="feeling" data-d="${d.id}">${[['','—'],['bad','Плохо'],['ok','Нормально'],['good','Хорошо'],['great','Отлично']].map(o=>`<option value="${o[0]}" ${d.feeling===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select><label>Заметка по тренировке</label><textarea data-f="note" data-d="${d.id}" placeholder="Как прошла тренировка…">${esc(d.note)}</textarea></div>`;
 d.exercises.forEach(e=>{
  const pv=findPrev(e.name,d);
  h+=`<div class="card"><div class="row sp"><b>${esc(e.name)}</b><div class="row"><button class="ib" data-a="exUp" data-d="${d.id}" data-e="${e.id}">↑</button><button class="ib" data-a="exDown" data-d="${d.id}" data-e="${e.id}">↓</button><button class="ib" data-a="exDel" data-d="${d.id}" data-e="${e.id}">🗑</button></div></div>
  <div class="row"><span class="mut">Цель повторов:</span><input style="width:90px;padding:6px" data-f="reps" data-d="${d.id}" data-e="${e.id}" value="${esc(e.reps)}"></div>
  ${pv?`<div class="prev" data-a="prevInfo" data-d="${d.id}" data-e="${e.id}">⏮ Прошлый раз (${fmtD(pv.day.date||pv.week.startedAt)}): ${esc(setStr(pv.ex))} <u>подробнее</u></div>`:''}
  <div class="hdr"><span>#</span><span>кг</span><span>повт.</span><span>комментарий</span><span>✓</span></div>`;
  e.sets.forEach((s,i)=>{h+=`<div class="set"><span class="n">${i+1}</span><input inputmode="decimal" data-f="sw" data-d="${d.id}" data-e="${e.id}" data-s="${i}" value="${esc(s.w)}" placeholder="вес"><input inputmode="numeric" data-f="sr" data-d="${d.id}" data-e="${e.id}" data-s="${i}" value="${esc(s.r)}" placeholder="повт"><input class="c" data-f="sc" data-d="${d.id}" data-e="${e.id}" data-s="${i}" value="${esc(s.c)}" placeholder="коммент."><button class="chk ${s.done?'on':''}" data-a="toggleSet" data-d="${d.id}" data-e="${e.id}" data-s="${i}">✓</button></div>`});
  h+=`<div class="row" style="margin-top:8px"><button class="btn s" data-a="addSet" data-d="${d.id}" data-e="${e.id}">+ подход</button><button class="btn s" data-a="delSet" data-d="${d.id}" data-e="${e.id}">− подход</button></div>
  <label>Заметка к упражнению</label><input data-f="enote" data-d="${d.id}" data-e="${e.id}" value="${esc(e.note)}" placeholder="например: угол 30°"></div>`});
 h+=`<button class="btn p" data-a="pickEx" data-d="${d.id}">+ Упражнение из банка</button><button class="btn r" data-a="delDay" data-d="${d.id}">Удалить день</button>`;
 return h;
}
function histView(){
 const ws=S.weeks.slice().reverse();
 if(!ws.length)return '<p class="mut">Завершённых недель пока нет. Нажми «Перейти к следующей неделе» на вкладке «Неделя».</p>';
 return ws.map(w=>{const dn=w.days.filter(d=>d.done).length;const v=Object.values(aggWeek(w)).reduce((a,x)=>a+x.vol,0);
  return `<div class="card" data-a="openHist" data-w="${w.id}"><b>Неделя №${w.num} · с ${fmtD(w.startedAt)}</b><div class="mut">выполнено ${dn} из ${w.days.length} · ${fmtKg(v)}</div></div>`}).join('');
}
function histDetail(w){
 let h=`<div class="row sp" style="margin-bottom:10px"><button class="btn s" data-a="histBack">‹ Назад</button><button class="btn s p" data-a="histStats" data-w="${w.id}">📊 Статистика</button></div>`;
 w.days.forEach(d=>{h+=`<div class="card"><b>${esc(d.name)}</b><div class="mut">${fmtD(d.date)} · ${d.done?'выполнено · '+fmtKg(d.volume||dayVol(d))+' · '+fmtDur(d.duration):'не выполнено'}${d.feeling?' · самочувствие: '+esc(d.feeling):''}</div>${d.note?`<div class="prev">📝 ${esc(d.note)}</div>`:''}`;
  d.exercises.forEach(e=>{h+=`<div style="margin-top:10px"><b style="font-size:15px">${esc(e.name)}</b><div class="mut">${esc(setStr(e))}</div>${e.sets.filter(s=>s.c).map((s,i)=>`<div class="prev">💬 ${esc(s.c)}</div>`).join('')}${e.note?`<div class="prev">📝 ${esc(e.note)}</div>`:''}</div>`});
  h+='</div>'});
 return h;
}
function bankView(){
 let h=`<div class="card"><label>Новое упражнение</label><input id="bnName" placeholder="Название"><label>Группа мышц (необязательно)</label><input id="bnGroup" placeholder="Грудь, спина…"><button class="btn p" style="margin-top:10px" data-a="bankAdd">Добавить в банк</button></div>`;
 const sorted=S.bank.slice().sort((a,b)=>a.name.localeCompare(b.name,'ru'));
 sorted.forEach(b=>{h+=`<div class="card row sp"><div><b>${esc(b.name)}</b><div class="mut">${esc(b.group)}</div></div><button class="ib" data-a="bankDel" data-b="${b.id}">🗑</button></div>`});
 return h;
}
function progView(){
 const names=new Set();allWeeks().forEach(w=>w.days.forEach(d=>d.exercises.forEach(e=>names.add(e.name))));
 const list=[...names].sort((a,b)=>a.localeCompare(b,'ru'));if(!list.length)return '<p class="mut">Нет данных</p>';
 if(!ui.progEx||!names.has(ui.progEx))ui.progEx=list[0];
 const pts1=[],pts2=[];allWeeks().forEach(w=>{const a=aggWeek(w)[ui.progEx];if(a){const l='№'+w.num;pts1.push({x:l,y:a.max});pts2.push({x:l,y:a.vol})}});
 return `<div class="card"><label>Упражнение</label><select data-f="progEx">${list.map(n=>`<option ${n===ui.progEx?'selected':''}>${esc(n)}</option>`).join('')}</select></div>
 <div class="card"><b>Максимальный вес по неделям</b>${lineChart(pts1,'кг')}</div><div class="card"><b>Объём по неделям</b>${lineChart(pts2,'кг (вес × повторы, только отмеченные подходы)')}</div>`;
}
function settingsView(){
 return `<div class="card"><b>Отдых по умолчанию</b><label>Секунд</label><input type="number" data-f="restDef" value="${S.settings.rest}"></div>
 <div class="card"><b>Данные</b><div class="mut" style="margin:6px 0 10px">Всё хранится локально на этом устройстве. Делай экспорт перед очисткой Safari. Импорт понимает и новый, и старый формат (gym-tracker-backup).</div>
 <button class="btn p" data-a="export">Экспорт данных (JSON)</button><button class="btn" data-a="import">Импорт данных (JSON)</button><input type="file" id="file" accept=".json,application/json" style="display:none"><button class="btn r" data-a="reset">Сбросить все данные</button></div>
 <div class="card"><b>О приложении</b><div class="mut">Gym Tracker — локальный PWA-трекер тренировок. Версия 2.0</div></div>`;
}
function sheet(inner){return `<div class="sheet" onclick="event.stopPropagation()">${inner}<button class="btn" data-a="closeModal" style="margin-top:12px">Закрыть</button></div>`}
const openModal=fn=>{ui.modal=fn;render()};

/* ---------- Действия ---------- */
function findEx(d,e){const day=S.week.days.find(x=>x.id===d);return {day,ex:day&&day.exercises.find(x=>x.id===e)}}
function startRest(){if(S.session){S.session.restEnd=Date.now()+S.settings.rest*1000}}
function finishWorkout(){
 const d=S.week.days.find(x=>x.id===S.session.dayId);
 d.duration=Math.round((Date.now()-S.session.start)/1000);d.volume=dayVol(d);d.done=true;if(!d.date)d.date=todayStr();
 S.session=null;unlockScreen();save();
 openModal(()=>sheet(`<h2>🎉 Тренировка выполнена</h2><div class="kpi" style="grid-template-columns:1fr 1fr"><div><b>${fmtKg(d.volume)}</b><span class="mut">поднято</span></div><div><b>${fmtDur(d.duration)}</b><span class="mut">затрачено</span></div></div><div class="mut">Считаются только подходы, отмеченные галочкой ✓. Подходы с собственным весом дают 0 кг.</div>`));
}
function nextWeek(){
 const old=S.week;old.finishedAt=new Date().toISOString();S.weeks.push(old);
 S.week={id:uid(),num:old.num+1,startedAt:new Date().toISOString(),days:old.days.map(d=>({id:uid(),name:d.name,done:false,date:'',feeling:'',note:d.note,duration:0,volume:0,
  exercises:d.exercises.map(e=>({id:uid(),name:e.name,reps:e.reps,note:e.note,sets:e.sets.map(s=>({w:s.w,r:s.r,c:s.c,done:false}))}))}))};
 ui.dayId=null;save();
}
document.addEventListener('click',ev=>{
 if(ev.target.id==='modal'&&ui.modal){ui.modal=null;render();return}
 const el=ev.target.closest('[data-a]');if(!el)return;
 const a=el.dataset.a,d=el.dataset.d,e=el.dataset.e,i=+el.dataset.s;
 switch(a){
 case 'tab':ui.tab=el.dataset.t;ui.dayId=null;ui.histId=null;ui.modal=null;break;
 case 'openDay':ui.dayId=d;break;
 case 'back':ui.dayId=null;break;
 case 'closeModal':ui.modal=null;break;
 case 'start':try{AC=AC||new (window.AudioContext||window.webkitAudioContext)()}catch(x){};S.session={dayId:d,start:Date.now(),restEnd:null};lockScreen();break;
 case 'finish':if(confirm('Завершить тренировку?'))finishWorkout();break;
 case 'setRest':S.settings.rest=+el.dataset.s;break;
 case 'customRest':{const v=prompt('Секунд отдыха:',S.settings.rest);if(v&&num(v)>0)S.settings.rest=Math.round(num(v));break}
 case 'skipRest':if(S.session)S.session.restEnd=null;break;
 case 'toggleSet':{const {ex}=findEx(d,e);const s=ex.sets[i];s.done=!s.done;if(s.done)startRest();else if(S.session)S.session.restEnd=null;break}
 case 'addSet':{const {ex}=findEx(d,e);const l=ex.sets[ex.sets.length-1]||{w:'',r:'',c:''};ex.sets.push({w:l.w,r:l.r,c:'',done:false});break}
 case 'delSet':{const {ex}=findEx(d,e);if(ex.sets.length>1)ex.sets.pop();break}
 case 'exUp':case 'exDown':{const {day}=findEx(d,e);const k=day.exercises.findIndex(x=>x.id===e),j=a==='exUp'?k-1:k+1;if(j>=0&&j<day.exercises.length){const t=day.exercises[k];day.exercises[k]=day.exercises[j];day.exercises[j]=t}break}
 case 'exDel':if(confirm('Удалить упражнение из дня?')){const {day}=findEx(d,e);day.exercises=day.exercises.filter(x=>x.id!==e)}break;
 case 'renameDay':{const day=curDay();const v=prompt('Название дня:',day.name);if(v)day.name=v;break}
 case 'addDay':{const v=prompt('Название дня:','День '+(S.week.days.length+1));if(v)S.week.days.push({id:uid(),name:v,done:false,date:'',feeling:'',note:'',duration:0,volume:0,exercises:[]});break}
 case 'delDay':if(confirm('Удалить день?')){S.week.days=S.week.days.filter(x=>x.id!==d);if(S.session&&S.session.dayId===d){S.session=null;unlockScreen()}ui.dayId=null}break;
 case 'prevInfo':{const day=S.week.days.find(x=>x.id===d);const ex=day.exercises.find(x=>x.id===e);const pv=findPrev(ex.name,day);
  ui.modal=()=>sheet(`<h3>${esc(ex.name)}</h3><div class="mut">${esc(pv.day.name)} · ${fmtD(pv.day.date||pv.week.startedAt)} · неделя №${pv.week.num}</div>`+
   pv.ex.sets.map((s,k)=>`<div class="card"><b>Подход ${k+1}:</b> ${num(s.w)?esc(s.w)+' кг':'свой вес'} × ${esc(s.r||'?')}${s.c?`<div class="prev">💬 ${esc(s.c)}</div>`:''}</div>`).join('')+(pv.ex.note?`<div class="prev">📝 ${esc(pv.ex.note)}</div>`:'')+(pv.day.note?`<div class="prev">Заметка тренировки: ${esc(pv.day.note)}</div>`:''));break}
 case 'pickEx':ui.modal=()=>sheet(`<h3>Добавить из банка</h3><input id="srch" placeholder="Поиск…" oninput="filterBank(this.value)"><div id="bl">${bankList(d,'')}</div><button class="btn p" style="margin-top:10px" data-a="newEx" data-d="${d}">+ Создать новое упражнение</button>`);break;
 case 'addFromBank':{const b=S.bank.find(x=>x.id===el.dataset.b);const day=S.week.days.find(x=>x.id===d);
  const pv=findPrev(b.name,day);let sets=[{w:'',r:'',c:'',done:false},{w:'',r:'',c:'',done:false},{w:'',r:'',c:'',done:false}],reps='';
  if(pv){sets=pv.ex.sets.map(s=>({w:s.w,r:s.r,c:'',done:false}));reps=pv.ex.reps}
  day.exercises.push(mkEx(b.name,reps,sets));ui.modal=null;break}
 case 'newEx':{const n=prompt('Название упражнения:');if(n){if(!S.bank.some(b=>b.name===n))S.bank.push({id:uid(),name:n,group:''});
  S.week.days.find(x=>x.id===d).exercises.push(mkEx(n,'',[{w:'',r:'',c:'',done:false},{w:'',r:'',c:'',done:false},{w:'',r:'',c:'',done:false}]))}ui.modal=null;break}
 case 'bankAdd':{const n=$('#bnName').value.trim();if(n&&!S.bank.some(b=>b.name===n))S.bank.push({id:uid(),name:n,group:$('#bnGroup').value.trim()});break}
 case 'bankDel':if(confirm('Удалить из банка? (в тренировках останется)'))S.bank=S.bank.filter(b=>b.id!==el.dataset.b);break;
 case 'weekStats':ui.modal=()=>sheet(`<h2>Статистика недели №${S.week.num}</h2>`+statsHTML(S.week));break;
 case 'histStats':{const w=allWeeks().find(x=>x.id===el.dataset.w);ui.modal=()=>sheet(`<h2>Статистика недели №${w.num}</h2>`+statsHTML(w));break}
 case 'nextWeek':if(confirm('Сохранить эту неделю в историю и создать новую с теми же весами, повторами и комментариями?'))nextWeek();break;
 case 'openHist':ui.histId=el.dataset.w;break;
 case 'histBack':ui.histId=null;break;
 case 'export':{const b=new Blob([JSON.stringify(S,null,1)],{type:'application/json'});const u=URL.createObjectURL(b);const l=document.createElement('a');l.href=u;l.download='gym-tracker-backup-'+todayStr()+'.json';l.click();return}
 case 'import':$('#file').click();return;
 case 'reset':if(confirm('Удалить ВСЕ данные?')){localStorage.removeItem(KEY);S=seedState()}break;
 default:return;
 }
 save();render();
});
function bankList(d,q){return S.bank.filter(b=>b.name.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name,'ru')).map(b=>`<div class="card day" data-a="addFromBank" data-b="${b.id}" data-d="${d}"><b>${esc(b.name)}</b><span class="mut">${esc(b.group)}</span></div>`).join('')}
window.filterBank=q=>{const d=document.querySelector('[data-a=newEx]').dataset.d;$('#bl').innerHTML=bankList(d,q)};
document.addEventListener('change',ev=>{
 const el=ev.target;
 if(el.id==='file'){const f=el.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{importData(JSON.parse(r.result));save();ui={tab:'week',dayId:null,histId:null,progEx:null,modal:null};render();alert('Импорт выполнен')}catch(x){alert('Ошибка импорта: '+x.message)}};r.readAsText(f);return}
 const f=el.dataset.f;if(!f)return;
 if(f==='progEx'){ui.progEx=el.value;render();return}
 if(f==='restDef'){S.settings.rest=Math.max(5,Math.round(num(el.value))||90);save();return}
 const day=S.week.days.find(x=>x.id===el.dataset.d);if(!day)return;
 const ex=day.exercises.find(x=>x.id===el.dataset.e),s=ex&&ex.sets[+el.dataset.s];
 if(f==='date'||f==='feeling'||f==='note')day[f]=el.value;
 else if(f==='reps')ex.reps=el.value;else if(f==='enote')ex.note=el.value;
 else if(f==='sw')s.w=el.value;else if(f==='sr')s.r=el.value;else if(f==='sc')s.c=el.value;
 save();
});
function tick(){
 if(!S.session)return;
 const sw=$('#sw');if(sw)sw.textContent=fmtT((Date.now()-S.session.start)/1000);
 const r=$('#rest');
 if(S.session.restEnd){const left=(S.session.restEnd-Date.now())/1000;
  if(left<=0){S.session.restEnd=null;save();beep();if(r)r.textContent='Готово!'}else if(r)r.textContent=fmtT(Math.ceil(left))}
 else if(r&&r.textContent!=='Готово!')r.textContent='—';
}
setInterval(tick,500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.session)lockScreen()});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
render();
