(function () {
"use strict";
function boot() {
  const root = document.getElementById("pageRoot");
  const catalog = window.CENTRAL_CATALOG;
  if (!root || !Array.isArray(catalog) || document.getElementById("learningWorkspace")) return;
  const KEY = "central-estudos-learning-v1";
  const stages = [
    ["theory", "Teoria"], ["practice", "Exercícios"], ["correction", "Correção"],
    ["review", "Revisão"], ["consolidation", "Consolidação"]
  ];
  const types = [
    ["E1", "Conceitual"], ["E2", "Interpretação"], ["E3", "Procedimento"],
    ["E4", "Atenção/cálculo"], ["E5", "Estratégia"], ["E6", "Acima do nível atual"]
  ];
  const subjects = catalog.map(a => ({id:a[0], name:a[1], area:a[2], priority:a[3], focus:a[5], groups:a[7] || []}));
  const seed = {version:1, topics:{}, sessions:[], errors:[], reviews:[], plans:[], settings:{weeklyHours:10, dailyMinutes:120}};
  let db = load(), view = "home", activeSubject = subjects[0] && subjects[0].id, activeTopic = "";
  let timer = null, timerStarted = 0, timerElapsed = 0;
  function load() {
    try { const x = JSON.parse(localStorage.getItem(KEY) || "null"); return Object.assign({}, JSON.parse(JSON.stringify(seed)), x || {}); }
    catch(e) { return JSON.parse(JSON.stringify(seed)); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
    catch(e) { toast("Não foi possível salvar. Exporte um backup e libere espaço no navegador."); return false; }
  }
  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function id() { return "r-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,7); }
  function today() { const d = new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
  function plusDays(date, n) { const d = new Date(date+"T12:00:00"); d.setDate(d.getDate()+n); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
  function dateLabel(s) { return s ? new Date(s+"T12:00:00").toLocaleDateString("pt-BR") : "—"; }
  function toast(s) { const el=document.getElementById("toastArea"); if(!el)return; const n=document.createElement("div"); n.className="toast"; n.textContent=s; el.appendChild(n); setTimeout(()=>n.remove(),2800); }
  function flat(s) {
    const out=[];
    (s.groups||[]).forEach((g,gi)=>(g[1]||[]).forEach((e,ei)=>{
      if(typeof e==="string") out.push({id:s.id+"-"+gi+"-"+ei,title:e,unit:g[0],parent:""});
      else if((e[1]||[]).length) (e[1]||[]).forEach((t,ti)=>out.push({id:s.id+"-"+gi+"-"+ei+"-"+ti,title:t,unit:g[0],parent:e[0]}));
      else out.push({id:s.id+"-"+gi+"-"+ei,title:e[0],unit:g[0],parent:""});
    }));
    return out;
  }
  const allTopics = subjects.flatMap(s=>flat(s).map(t=>Object.assign({},t,{subjectId:s.id,subjectName:s.name})));
  const subjectById = x=>subjects.find(s=>s.id===x);
  const topicById = x=>allTopics.find(t=>t.id===x);
  function record(tid) {
    if(!db.topics[tid]) db.topics[tid]={stages:{}, mastered:false, updatedAt:null};
    return db.topics[tid];
  }
  function stageCount(tid) { const r=record(tid); return stages.filter(s=>r.stages[s[0]]).length; }
  function dueReviews() { return db.reviews.filter(r=>!r.done).sort((a,b)=>a.due.localeCompare(b.due)); }
  function openErrors() { return db.errors.filter(e=>!e.resolved); }
  function nav() {
    const n=document.querySelector(".navigation");
    if(!n || document.getElementById("learningWorkspace")) return;
    const sep=document.createElement("div"); sep.className="sidebar-caption"; sep.textContent="SISTEMA DE APRENDIZAGEM";
    const b=document.createElement("button"); b.className="nav-item"; b.id="learningWorkspace"; b.innerHTML='<span class="nav-icon">◈</span><span>Central 2.0</span>';
    b.addEventListener("click",()=>render("home"));
    n.append(sep,b);
  }
  function heading(k,t,p,actions) {
    return '<div class="page-header"><div><div class="eyebrow">'+esc(k)+'</div><h1>'+esc(t)+'</h1><p>'+esc(p)+'</p></div><div class="header-actions">'+(actions||"")+'</div></div>';
  }
  function bar(n,d) { return '<div class="progress-track"><span style="width:'+(d?Math.min(100,n/d*100):0)+'%"></span></div>'; }
  function button(action,label,kind) { return '<button class="button button-'+(kind||"secondary")+'" data-lx="'+action+'">'+label+'</button>'; }
  function shell(k,t,p,body,actions) {
    root.innerHTML='<div class="lx-shell">'+heading(k,t,p,actions)+'<div class="lx-tabs">'+
      [["home","Painel"],["map","Conteúdos"],["sessions","Sessões"],["errors","Erros"],["reviews","Revisões"],["history","Histórico"],["settings","Dados"]].map(x=>'<button data-lnav="'+x[0]+'" class="'+(view===x[0]?"active":"")+'">'+x[1]+'</button>').join("")+
      '</div>'+body+'</div>';
    root.querySelectorAll("[data-lnav]").forEach(b=>b.addEventListener("click",()=>render(b.dataset.lnav)));
    document.getElementById("breadcrumbTitle").textContent="Central 2.0";
    document.querySelectorAll(".navigation .nav-item").forEach(b=>b.classList.toggle("active",b.id==="learningWorkspace"));
  }
  function renderHome() {
    view="home";
    const total=allTopics.length, mastered=allTopics.filter(t=>record(t.id).mastered).length;
    const due=dueReviews(), overdue=due.filter(r=>r.due<today()), errors=openErrors();
    const mins=db.sessions.reduce((a,s)=>a+(+s.duration||0),0);
    const recent=db.sessions.slice(-5).reverse();
    const recurring=types.map(t=>({code:t[0],name:t[1],count:errors.filter(e=>e.type===t[0]).length})).filter(x=>x.count).sort((a,b)=>b.count-a.count);
    let body='<div class="lx-metrics"><article><small>Conteúdos dominados</small><strong>'+mastered+'/'+total.toLocaleString("pt-BR")+'</strong><span>'+Math.round(mastered/Math.max(1,total)*100)+'% do catálogo</span></article><article><small>Tempo registrado</small><strong>'+Math.floor(mins/60)+'h '+mins%60+'min</strong><span>'+db.sessions.length+' sessões</span></article><article><small>Revisões pendentes</small><strong>'+due.length+'</strong><span>'+overdue.length+' atrasadas</span></article><article><small>Erros em aberto</small><strong>'+errors.length+'</strong><span>Registros ainda não superados</span></article></div>';
    body+='<div class="lx-columns"><section class="lx-panel"><div class="lx-panel-head"><div><h2>O que exige atenção agora</h2><p>Prioridade baseada em prazo e dificuldades registradas.</p></div></div>';
    if(overdue.length) body+='<div class="lx-task urgent"><b>Revisões atrasadas</b><span>'+overdue.length+' revisão(ões) aguardando recuperação ativa</span>'+button("go-reviews","Abrir revisões","primary")+'</div>';
    else if(due.length) body+='<div class="lx-task"><b>Revisões previstas</b><span>'+due.length+' revisão(ões) programadas</span>'+button("go-reviews","Ver agenda","primary")+'</div>';
    else body+='<div class="lx-task"><b>Nenhuma revisão pendente</b><span>Registre uma sessão vinculada a um conteúdo para criar a agenda.</span></div>';
    if(recurring.length) body+='<div class="lx-task"><b>Categoria mais frequente: '+recurring[0].code+' · '+esc(recurring[0].name)+'</b><span>'+recurring[0].count+' ocorrência(s) em erros ainda abertos. Isso é um sinal para investigar, não um diagnóstico automático.</span>'+button("go-errors","Analisar erros")+'</div>';
    else body+='<div class="lx-task"><b>Sem padrão de erro identificado</b><span>Registre erros de exercícios para que o painel encontre recorrências.</span></div>';
    body+='</section><section class="lx-panel"><div class="lx-panel-head"><div><h2>Registrar estudo</h2><p>Inicie pelo conteúdo e pela etapa trabalhada.</p></div></div><p class="lx-muted">O registro rápido aceita tempo manual ou cronômetro, questões e acertos. Os erros específicos podem ser detalhados separadamente.</p>'+button("new-session","＋ Nova sessão","primary")+' '+button("new-error","＋ Registrar erro")+'</section></div>';
    body+='<div class="lx-section-head"><div><h2>Atividade recente</h2><p>Registros mais recentes da execução real.</p></div>'+button("go-history","Ver histórico")+'</div>';
    body+=recent.length?'<div class="lx-records">'+recent.map(s=>'<article><div><b>'+esc(s.subjectName)+' · '+esc(s.topicTitle||"Estudo geral")+'</b><small>'+dateLabel(s.date)+' · '+esc(s.stageLabel)+' · '+s.duration+' min</small></div><strong>'+(s.questions?Math.round(s.correct/s.questions*100)+'%':'—')+'</strong></article>').join("")+'</div>':'<div class="lx-empty">Ainda não há sessões registradas.</div>';
    shell("PAINEL DE APRENDIZAGEM","Sua execução, medida por evidências","Acompanhe conteúdo, prática, erros e retenção em um único fluxo.",body,button("new-session","＋ Registrar estudo","primary"));
  }
  function topicCard(t) {
    const r=record(t.id),done=stageCount(t.id),pct=Math.round(done/5*100);
    return '<article class="lx-topic"><div class="lx-topic-head"><div><small>'+esc(t.unit)+(t.parent?" · "+esc(t.parent):"")+'</small><b>'+esc(t.title)+'</b></div><span>'+pct+'%</span></div>'+bar(done,5)+'<div class="lx-stage-list">'+stages.map(s=>'<label><input type="checkbox" data-stage="'+s[0]+'" data-topic="'+t.id+'" '+(r.stages[s[0]]?"checked":"")+'><span>'+s[1]+'</span></label>').join("")+'</div><div class="lx-topic-foot"><span class="'+(r.mastered?"lx-done":"")+'">'+(r.mastered?"Dominado":"Etapas: "+done+"/5")+'</span><button data-topic-detail="'+t.id+'">Detalhes e registro →</button></div></article>';
  }
  function renderMap() {
    view="map";
    const s=subjectById(activeSubject)||subjects[0], list=s?flat(s):[];
    const body='<div class="lx-toolbar"><select id="lxSubject">'+subjects.map(x=>'<option value="'+x.id+'" '+(s&&x.id===s.id?"selected":"")+'>'+esc(x.name)+'</option>').join("")+'</select><input id="lxTopicSearch" placeholder="Buscar conteúdo nesta matéria..." type="search"></div><div class="lx-topic-grid" id="lxTopicGrid">'+list.map(topicCard).join("")+'</div>';
    shell("MAPA CURRICULAR","Conteúdos e etapas","A sequência recomendada é teoria → exercícios → correção → revisão → consolidação, mas você pode marcar as etapas em qualquer ordem.",body,button("new-session","＋ Registrar sessão","primary"));
    document.getElementById("lxSubject").addEventListener("change",e=>{activeSubject=e.target.value;renderMap();});
    document.getElementById("lxTopicSearch").addEventListener("input",e=>{const q=e.target.value.toLocaleLowerCase("pt-BR");document.getElementById("lxTopicGrid").innerHTML=list.filter(t=>t.title.toLocaleLowerCase("pt-BR").includes(q)||t.unit.toLocaleLowerCase("pt-BR").includes(q)).map(topicCard).join("")||'<div class="lx-empty">Nenhum conteúdo encontrado.</div>';});
  }
  function topicDetail(tid) {
    const t=topicById(tid); if(!t)return;
    activeTopic=tid; activeSubject=t.subjectId;
    const r=record(tid), errs=db.errors.filter(e=>e.topicId===tid), sessions=db.sessions.filter(s=>s.topicId===tid);
    const html='<div class="lx-detail"><div class="lx-detail-title"><small>'+esc(t.subjectName)+' · '+esc(t.unit)+'</small><h2>'+esc(t.title)+'</h2></div><p>Etapas flexíveis: marque apenas o que realmente executou. A consolidação deve refletir recuperação e aplicação sem consulta.</p><div class="lx-stage-detail">'+stages.map(s=>'<label><input type="checkbox" data-stage="'+s[0]+'" data-topic="'+tid+'" '+(r.stages[s[0]]?"checked":"")+'><span><b>'+s[1]+'</b><small>'+({theory:"Compreensão e explicação do conteúdo.",practice:"Aplicação em questões.",correction:"Análise do raciocínio e causa dos erros.",review:"Recuperação ativa em outro momento.",consolidation:"Aplicação autônoma e transferência."})[s[0]]+'</small></span></label>').join("")+'</div><label class="lx-master"><input type="checkbox" data-master="'+tid+'" '+(r.mastered?"checked":"")+'> Marcar como dominado (decisão sua; o sistema exibirá evidências e alertas)</label><div class="lx-evidence"><b>Evidências registradas</b><span>'+sessions.length+' sessões · '+errs.length+' erros associados</span><span>'+sessions.reduce((a,x)=>a+(+x.duration||0),0)+' minutos estudados</span></div><div class="lx-actions">'+button("session-topic","＋ Registrar sessão","primary")+' '+button("error-topic","＋ Registrar erro")+'</div></div>';
    openModal(t.title,html);
  }
  function openModal(title,html) {
    const layer=document.getElementById("modalLayer");
    document.getElementById("modalKicker").textContent="CENTRAL 2.0";
    document.getElementById("modalTitle").textContent=title;
    document.getElementById("modalContent").innerHTML=html;
    layer.hidden=false;
  }
  function closeModal() { document.getElementById("modalLayer").hidden=true; stopTimer(false); }
  function topicSelect(sid,selected) {
    return flat(subjectById(sid)).map(t=>'<option value="'+t.id+'" '+(t.id===selected?"selected":"")+'>'+esc((t.parent?t.parent+" · ":"")+t.title)+'</option>').join("");
  }
  function sessionForm(sid,tid) {
    const s=subjectById(sid)||subjects[0], t=topicById(tid);
    const html='<form id="lxSessionForm"><div class="lx-form-grid"><label>Matéria<select name="subject" id="lxSessionSubject">'+subjects.map(x=>'<option value="'+x.id+'" '+(x.id===s.id?"selected":"")+'>'+esc(x.name)+'</option>').join("")+'</select></label><label>Conteúdo<select name="topic" id="lxSessionTopic"><option value="">Estudo geral</option>'+topicSelect(s.id,tid)+'</select></label><label>Etapa<select name="stage">'+stages.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join("")+'</select></label><label>Data<input name="date" type="date" value="'+today()+'" required></label><label>Tempo (min)<input name="duration" id="lxDuration" type="number" min="1" max="1000" value="40" required></label><label>Questões resolvidas<input name="questions" type="number" min="0" value="0"></label><label>Acertos<input name="correct" type="number" min="0" value="0"></label><label>Segurança ao resolver<select name="confidence"><option value="low">Baixa</option><option value="medium" selected>Moderada</option><option value="high">Alta</option></select></label></div><label class="lx-field">Observação opcional<textarea name="notes" rows="2" placeholder="O que conseguiu fazer? O que ainda ficou inseguro?"></textarea></label><div class="lx-timer"><div><small>CRONÔMETRO</small><strong id="lxTimerDisplay">00:00:00</strong></div><button type="button" class="button button-secondary" id="lxTimerStart">Iniciar</button><button type="button" class="button button-secondary" id="lxTimerStop">Parar e usar tempo</button></div><div class="lx-form-actions"><button type="button" class="button button-secondary" data-close>Cancelar</button><button class="button button-primary">Salvar sessão</button></div></form>';
    openModal("Registrar sessão",html);
    const form=document.getElementById("lxSessionForm"), subj=document.getElementById("lxSessionSubject"), topic=document.getElementById("lxSessionTopic");
    subj.addEventListener("change",()=>{topic.innerHTML='<option value="">Estudo geral</option>'+topicSelect(subj.value,"");});
    document.getElementById("lxTimerStart").onclick=startTimer;
    document.getElementById("lxTimerStop").onclick=()=>{stopTimer(true);document.getElementById("lxDuration").value=Math.max(1,Math.round(timerElapsed/60));};
    form.addEventListener("submit",e=>{
      e.preventDefault(); const f=new FormData(form),questions=+(f.get("questions")||0),correct=+(f.get("correct")||0);
      if(correct>questions){toast("Acertos não podem superar o número de questões.");return;}
      const topicId=String(f.get("topic")||""), stage=String(f.get("stage")), subjObj=subjectById(String(f.get("subject")));
      const item={id:id(),subjectId:subjObj.id,subjectName:subjObj.name,topicId,topicTitle:topicById(topicId)?.title||"",stage,stageLabel:stages.find(x=>x[0]===stage)[1],date:String(f.get("date")),duration:+f.get("duration"),questions,correct,confidence:String(f.get("confidence")),notes:String(f.get("notes")||"")};
      db.sessions.push(item);
      if(topicId){const r=record(topicId);r.stages[stage]=true;r.updatedAt=new Date().toISOString();scheduleReviews(item);}
      save();closeModal();render("sessions");toast("Sessão registrada e revisões programadas.");
    });
  }
  function startTimer() {
    if(timer)return; timerStarted=Date.now(); timerElapsed=0;
    timer=setInterval(()=>{timerElapsed=Date.now()-timerStarted;const el=document.getElementById("lxTimerDisplay");if(el)el.textContent=new Date(timerElapsed).toISOString().slice(11,19);},500);
  }
  function stopTimer(use) { if(timer){clearInterval(timer);timer=null;} if(use)timerElapsed=Date.now()-timerStarted; }
  function scheduleReviews(s) {
    const existing=db.reviews.filter(r=>r.topicId===s.topicId&&!r.done);
    const doneLabels=existing.map(r=>r.label);
    [1,7,14].forEach((n,i)=>{const label=["D+1","D+7","D+14"][i];if(!doneLabels.includes(label))db.reviews.push({id:id(),topicId:s.topicId,topicTitle:s.topicTitle,subjectId:s.subjectId,subjectName:s.subjectName,sourceSession:s.id,label,due:plusDays(s.date,n),done:false,attempts:0});});
  }
  function errorForm(sid,tid) {
    const s=subjectById(sid)||subjects[0];
    const html='<form id="lxErrorForm"><div class="lx-form-grid"><label>Matéria<select name="subject" id="lxErrorSubject">'+subjects.map(x=>'<option value="'+x.id+'" '+(x.id===s.id?"selected":"")+'>'+esc(x.name)+'</option>').join("")+'</select></label><label>Conteúdo<select name="topic" id="lxErrorTopic"><option value="">Não especificado</option>'+topicSelect(s.id,tid)+'</select></label><label>Tipo de erro<select name="type" required>'+types.map(x=>'<option value="'+x[0]+'">'+x[0]+' — '+x[1]+'</option>').join("")+'</select></label><label>Data<input name="date" type="date" value="'+today()+'" required></label></div><label class="lx-field">Nota curta (opcional)<textarea name="note" rows="2" placeholder="Qual foi a falha? Ex.: confundi o que a questão pedia com o conceito usado."></textarea></label><div class="lx-form-actions"><button type="button" class="button button-secondary" data-close>Cancelar</button><button class="button button-primary">Salvar erro</button></div></form>';
    openModal("Registro rápido de erro",html);
    const form=document.getElementById("lxErrorForm"),subj=document.getElementById("lxErrorSubject"),topic=document.getElementById("lxErrorTopic");
    subj.addEventListener("change",()=>{topic.innerHTML='<option value="">Não especificado</option>'+topicSelect(subj.value,"");});
    form.addEventListener("submit",e=>{e.preventDefault();const f=new FormData(form),t=topicById(String(f.get("topic")||""));db.errors.push({id:id(),subjectId:String(f.get("subject")),subjectName:subjectById(String(f.get("subject"))).name,topicId:String(f.get("topic")||""),topicTitle:t?t.title:"",type:String(f.get("type")),date:String(f.get("date")),note:String(f.get("note")||""),resolved:false});save();closeModal();render("errors");toast("Erro registrado.");});
  }
  function renderErrors() {
    view="errors"; const errs=db.errors.slice().reverse(),counts=types.map(t=>({code:t[0],label:t[1],n:openErrors().filter(e=>e.type===t[0]).length})),max=Math.max(1,...counts.map(x=>x.n));
    const body='<div class="lx-filters"><select id="lxErrSubject"><option value="">Todas as matérias</option>'+subjects.map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join("")+'</select><select id="lxErrType"><option value="">Todos os tipos</option>'+types.map(t=>'<option value="'+t[0]+'">'+t[0]+' — '+t[1]+'</option>').join("")+'</select><select id="lxErrPeriod"><option value="all">Todo o período</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></div><div class="lx-type-bars">'+counts.map(x=>'<div><span>'+x.code+' · '+x.label+'</span><div>'+bar(x.n,max)+'</div><b>'+x.n+'</b></div>').join("")+'</div><div id="lxErrorList" class="lx-records">'+errorRows(errs)+'</div>';
    shell("ANÁLISE DE ERROS","Onde o raciocínio falha","O painel cruza matéria, conteúdo, tipo e período. Frequência isolada não basta para concluir que existe uma lacuna.",body,button("new-error","＋ Registrar erro","primary"));
    ["lxErrSubject","lxErrType","lxErrPeriod"].forEach(id=>document.getElementById(id).addEventListener("change",filterErrors));
  }
  function errorRows(arr) {
    return arr.length?arr.map(e=>'<article><div><b>'+esc(e.subjectName)+' · '+esc(e.topicTitle||"Conteúdo não especificado")+'</b><small>'+dateLabel(e.date)+' · '+e.type+' — '+esc((types.find(t=>t[0]===e.type)||[])[1]||"")+'</small><p>'+esc(e.note||"Sem observação adicional.")+'</p></div><div class="lx-row-actions">'+(e.resolved?'<span class="lx-done">Superado</span>':'<button data-resolve="'+e.id+'">Marcar superado</button>')+'</div></article>').join(""):'<div class="lx-empty">Nenhum erro corresponde aos filtros.</div>';
  }
  function filterErrors() {
    const s=document.getElementById("lxErrSubject").value,t=document.getElementById("lxErrType").value,p=document.getElementById("lxErrPeriod").value,cut=p==="all"?"0000-00-00":plusDays(today(),-Number(p));
    document.getElementById("lxErrorList").innerHTML=errorRows(db.errors.slice().reverse().filter(e=>(!s||e.subjectId===s)&&(!t||e.type===t)&&e.date>=cut));
  }
  function renderReviews() {
    view="reviews"; const list=dueReviews();
    const body=list.length?'<div class="lx-records">'+list.map(r=>'<article><div><small>'+esc(r.label)+' · '+dateLabel(r.due)+(r.due<today()?' · <b class="lx-overdue">Atrasada</b>':'')+'</small><b>'+esc(r.subjectName)+' · '+esc(r.topicTitle)+'</b><p>Recupere o conteúdo sem consultar antes de abrir o material.</p></div><div class="lx-row-actions"><button data-review="'+r.id+'">Registrar resultado</button></div></article>').join("")+'</div>':'<div class="lx-empty">Nenhuma revisão pendente. As próximas são criadas quando você registra uma sessão vinculada a um conteúdo.</div>';
    shell("RETENÇÃO","Agenda de revisões","Padrão inicial D+1, D+7 e D+14. O resultado da recuperação pode antecipar ou espaçar a próxima revisão.",body);
  }
  function reviewResult(rid) {
    const r=db.reviews.find(x=>x.id===rid);if(!r)return;
    const html='<form id="lxReviewForm"><p>Faça a recuperação antes de consultar. Registre o resultado real.</p><label>Resultado<select name="result"><option value="good">Recuperei e apliquei sem ajuda</option><option value="partial">Lembrei parcialmente / precisei de pista</option><option value="poor">Não consegui recuperar ou aplicar</option></select></label><label class="lx-field">Observação opcional<textarea name="note" rows="2"></textarea></label><div class="lx-form-actions"><button type="button" class="button button-secondary" data-close>Cancelar</button><button class="button button-primary">Salvar revisão</button></div></form>';
    openModal("Resultado da revisão",html);
    document.getElementById("lxReviewForm").addEventListener("submit",e=>{e.preventDefault();const f=new FormData(e.currentTarget),v=String(f.get("result"));r.done=true;r.result=v;r.note=String(f.get("note")||"");r.completedAt=today();r.attempts=(r.attempts||0)+1;
      const next=v==="good"?14:v==="partial"?3:1;
      db.reviews.push({id:id(),topicId:r.topicId,topicTitle:r.topicTitle,subjectId:r.subjectId,subjectName:r.subjectName,label:v==="good"?"Reforço +14d":v==="partial"?"Reforço +3d":"Reforço +1d",due:plusDays(today(),next),done:false,attempts:0});
      save();closeModal();render("reviews");toast("Revisão registrada. Próximo intervalo: "+next+" dia(s).");
    });
  }
  function renderSessions() {
    view="sessions";const list=db.sessions.slice().reverse();
    const body=list.length?'<div class="lx-records">'+list.map(s=>'<article><div><b>'+esc(s.subjectName)+' · '+esc(s.topicTitle||"Estudo geral")+'</b><small>'+dateLabel(s.date)+' · '+esc(s.stageLabel)+' · '+s.duration+' min · '+s.questions+' questões / '+s.correct+' acertos</small><p>'+esc(s.notes||"Sem observação.")+'</p></div></article>').join("")+'</div>':'<div class="lx-empty">Nenhuma sessão registrada.</div>';
    shell("EXECUÇÃO","Sessões de estudo","Histórico de tempo, etapas realizadas e desempenho em exercícios.",body,button("new-session","＋ Nova sessão","primary"));
  }
  function renderHistory() {
    view="history";
    const body='<div class="lx-filters"><select id="lxHistSubject"><option value="">Todas as matérias</option>'+subjects.map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join("")+'</select><select id="lxHistKind"><option value="all">Todos os registros</option><option value="sessions">Sessões</option><option value="errors">Erros</option><option value="reviews">Revisões</option></select><select id="lxHistPeriod"><option value="all">Todo o período</option><option value="30">30 dias</option><option value="90">90 dias</option></select></div><div id="lxHistoryList" class="lx-records">'+historyRows(db.sessions,db.errors,db.reviews)+'</div>';
    shell("RASTREABILIDADE","Histórico completo","Os registros não são apagados ao mudar filtros. Compare períodos e acompanhe a evolução.",body);
    ["lxHistSubject","lxHistKind","lxHistPeriod"].forEach(x=>document.getElementById(x).addEventListener("change",filterHistory));
  }
  function historyRows(sessions,errors,reviews) {
    const rows=sessions.map(x=>({date:x.date,html:'<article><div><b>Sessão · '+esc(x.subjectName)+' · '+esc(x.topicTitle||"Estudo geral")+'</b><small>'+dateLabel(x.date)+' · '+x.duration+' min · '+x.correct+'/'+x.questions+' questões</small></div><span>Sessão</span></article>'}))
      .concat(errors.map(x=>({date:x.date,html:'<article><div><b>Erro '+x.type+' · '+esc(x.subjectName)+' · '+esc(x.topicTitle)+'</b><small>'+dateLabel(x.date)+' · '+esc(x.note)+'</small></div><span>Erro</span></article>'})))
      .concat(reviews.filter(x=>x.done).map(x=>({date:x.completedAt||x.due,html:'<article><div><b>Revisão · '+esc(x.subjectName)+' · '+esc(x.topicTitle)+'</b><small>'+dateLabel(x.completedAt||x.due)+' · '+esc(x.result||"")+'</small></div><span>Revisão</span></article>'})));
    rows.sort((a,b)=>b.date.localeCompare(a.date));return rows.map(x=>x.html).join("")||'<div class="lx-empty">Nenhum registro para exibir.</div>';
  }
  function filterHistory() {
    const s=document.getElementById("lxHistSubject").value,k=document.getElementById("lxHistKind").value,p=document.getElementById("lxHistPeriod").value,cut=p==="all"?"0000-00-00":plusDays(today(),-Number(p));
    const ss=db.sessions.filter(x=>(!s||x.subjectId===s)&&x.date>=cut),ee=db.errors.filter(x=>(!s||x.subjectId===s)&&x.date>=cut),rr=db.reviews.filter(x=>(!s||x.subjectId===s)&&x.done&&(x.completedAt||x.due)>=cut);
    document.getElementById("lxHistoryList").innerHTML=historyRows(k==="errors"?[]:ss,k==="sessions"?[]:ee,k==="sessions"||k==="errors"?[]:rr);
  }
  function renderSettings() {
    view="settings";
    const body='<div class="lx-columns"><section class="lx-panel"><h2>Backup dos dados da Central 2.0</h2><p>Exporte os registros desta nova área em JSON. Guarde o arquivo fora do navegador.</p>'+button("export","Exportar backup","primary")+' <label class="button button-secondary lx-import">Importar backup<input id="lxImport" type="file" accept="application/json" hidden></label></section><section class="lx-panel"><h2>Armazenamento</h2><p>Dados salvos localmente neste navegador. A estrutura mantém identificadores e registros separados para permitir sincronização futura.</p><p class="lx-muted">O backup desta área não substitui o backup legado da Central original. Até a migração completa, exporte os dois.</p></section></div><div class="lx-panel"><h2>Critério de domínio</h2><p>O sistema apresenta evidências: etapas concluídas, sessões, acertos, revisões e erros recorrentes. A decisão final de marcar como dominado permanece sua. Um percentual alto não prova domínio por si só.</p></div>';
    shell("PREFERÊNCIAS E PROTEÇÃO","Dados e backup","Armazenamento local com exportação manual; preparado para sincronização futura.",body);
    document.getElementById("lxImport").addEventListener("change",e=>{if(e.target.files[0])importBackup(e.target.files[0]);});
  }
  function exportBackup() {
    const blob=new Blob([JSON.stringify({app:"Central de Estudos 2.0",version:1,exportedAt:new Date().toISOString(),data:db},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="central-estudos-2-backup-"+today()+".json";a.click();URL.revokeObjectURL(url);toast("Backup da Central 2.0 exportado.");
  }
  function importBackup(file) {
    const reader=new FileReader();reader.onload=()=>{try{const x=JSON.parse(reader.result),d=x.data||x;if(!d.topics||!Array.isArray(d.sessions)||!Array.isArray(d.errors)||!Array.isArray(d.reviews))throw Error("invalid");if(!confirm("Mesclar os registros do arquivo com os dados atuais? Registros com o mesmo ID serão preservados uma única vez."))return;
      db.topics=Object.assign({},db.topics,d.topics);["sessions","errors","reviews","plans"].forEach(k=>{const map=new Map((db[k]||[]).map(v=>[v.id,v]));(d[k]||[]).forEach(v=>map.set(v.id,v));db[k]=Array.from(map.values());});save();render("home");toast("Backup mesclado sem substituir os registros atuais.");
    }catch(e){toast("Arquivo inválido ou incompatível.");}};reader.readAsText(file);
  }
  function render(v) {
    if(v==="home")renderHome();else if(v==="map")renderMap();else if(v==="sessions")renderSessions();else if(v==="errors")renderErrors();else if(v==="reviews")renderReviews();else if(v==="history")renderHistory();else if(v==="settings")renderSettings();
  }
  document.addEventListener("change",e=>{
    const c=e.target.closest("[data-stage]");if(c){const r=record(c.dataset.topic);r.stages[c.dataset.stage]=c.checked;r.updatedAt=new Date().toISOString();save();if(view==="map")renderMap();else if(activeTopic)topicDetail(activeTopic);}
    const m=e.target.closest("[data-master]");if(m){const r=record(m.dataset.master);r.mastered=m.checked;r.updatedAt=new Date().toISOString();save();toast(m.checked?"Conteúdo marcado como dominado.":"Marcação de domínio removida.");}
  });
  document.addEventListener("click",e=>{
    const d=e.target.closest("[data-topic-detail]");if(d){topicDetail(d.dataset.topicDetail);return;}
    const l=e.target.closest("[data-lx]");if(l){const a=l.dataset.lx;
      if(a==="new-session")sessionForm(activeSubject,activeTopic);
      if(a==="new-error")errorForm(activeSubject,activeTopic);
      if(a==="session-topic")sessionForm(activeSubject,activeTopic);
      if(a==="error-topic")errorForm(activeSubject,activeTopic);
      if(a==="go-reviews")render("reviews");if(a==="go-errors")render("errors");if(a==="go-history")render("history");if(a==="export")exportBackup();
      return;
    }
    const r=e.target.closest("[data-review]");if(r){reviewResult(r.dataset.review);return;}
    const z=e.target.closest("[data-resolve]");if(z){const item=db.errors.find(x=>x.id===z.dataset.resolve);if(item){item.resolved=true;item.resolvedAt=today();save();renderErrors();toast("Erro marcado como superado. Registre evidências em sessões e revisões.");}return;}
    if(e.target.closest("[data-close]"))closeModal();
  });
  document.getElementById("modalClose").addEventListener("click",closeModal);
  document.getElementById("modalLayer").addEventListener("click",e=>{if(e.target.id==="modalLayer")closeModal();});
  const style=document.createElement("style");
  style.textContent = \`
  .lx-shell{color:var(--text)}.lx-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:-7px 0 20px;padding:7px;border:1px solid var(--border);border-radius:10px;background:var(--surface)}.lx-tabs button{padding:8px 12px;border:0;border-radius:7px;background:transparent;color:var(--muted);font-size:11px}.lx-tabs button.active{background:var(--surface2);color:var(--gold)}.lx-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:15px}.lx-metrics article,.lx-panel,.lx-topic{padding:17px;border:1px solid var(--border);border-radius:11px;background:var(--surface)}.lx-metrics small,.lx-metrics span{display:block;color:var(--muted);font-size:10px}.lx-metrics strong{display:block;margin:6px 0;font-size:25px}.lx-columns{display:grid;grid-template-columns:1fr 1fr;gap:13px}.lx-panel h2{margin:0 0 6px;font-size:16px}.lx-panel p,.lx-muted{color:var(--muted);font-size:11px;line-height:1.6}.lx-panel-head{margin-bottom:12px}.lx-panel-head p{margin:3px 0}.lx-task{display:grid;gap:5px;padding:12px 0;border-top:1px solid var(--border)}.lx-task b{font-size:12px}.lx-task span{color:var(--muted);font-size:11px}.lx-task.urgent b,.lx-overdue{color:#e6a18d}.lx-section-head{display:flex;align-items:center;justify-content:space-between;margin:24px 0 12px}.lx-section-head h2{margin:0;font-size:17px}.lx-section-head p{margin:3px 0;color:var(--muted);font-size:11px}.lx-records{display:grid;gap:8px}.lx-records article{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 15px;border:1px solid var(--border);border-radius:9px;background:var(--surface)}.lx-records article>div{min-width:0}.lx-records b,.lx-records small,.lx-records p{display:block}.lx-records b{font-size:12px}.lx-records small,.lx-records p{margin:4px 0 0;color:var(--muted);font-size:10px}.lx-records article>strong{color:var(--gold)}.lx-empty{padding:25px;border:1px dashed var(--border);border-radius:10px;text-align:center;color:var(--muted);font-size:12px}.lx-toolbar,.lx-filters{display:flex;gap:9px;margin-bottom:14px}.lx-toolbar select,.lx-toolbar input,.lx-filters select,.lx-form-grid input,.lx-form-grid select,.lx-field textarea,.lx-detail select{min-width:0;width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;background:#0c1726;color:var(--text);font-size:12px}.lx-topic-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.lx-topic-head{display:flex;justify-content:space-between;gap:10px;margin-bottom:9px}.lx-topic-head small,.lx-topic-head b{display:block}.lx-topic-head small{margin-bottom:4px;color:var(--muted);font-size:9px}.lx-topic-head b{font-size:12px}.lx-topic-head>span{color:var(--gold);font-size:11px}.lx-stage-list{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.lx-stage-list label{display:flex;align-items:center;gap:4px;color:var(--muted);font-size:9px}.lx-stage-list input,.lx-stage-detail input,.lx-master input{accent-color:var(--gold)}.lx-topic-foot{display:flex;justify-content:space-between;align-items:center;margin-top:12px}.lx-topic-foot button,.lx-row-actions button{border:0;background:transparent;color:var(--gold);font-size:10px}.lx-topic-foot span{color:var(--muted);font-size:10px}.lx-done{color:#8dc5a4!important}.lx-detail-title small{color:var(--gold);font-size:10px}.lx-detail-title h2{margin:6px 0;font-size:20px}.lx-detail>p{color:var(--muted);font-size:11px}.lx-stage-detail{display:grid;gap:8px;margin:15px 0}.lx-stage-detail label{display:flex;align-items:flex-start;gap:9px;padding:10px;border:1px solid var(--border);border-radius:8px}.lx-stage-detail b,.lx-stage-detail small{display:block}.lx-stage-detail b{font-size:11px}.lx-stage-detail small{margin-top:3px;color:var(--muted);font-size:10px}.lx-master{display:flex;gap:8px;align-items:center;padding:11px;border:1px solid #786443;border-radius:8px;color:var(--gold);font-size:11px}.lx-evidence{display:grid;gap:5px;margin:14px 0;padding:12px;background:var(--surface2);border-radius:8px;font-size:10px}.lx-evidence span{color:var(--muted)}.lx-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.lx-form-grid label,.lx-field,.lx-detail form label{display:grid;gap:5px;color:var(--muted);font-size:10px}.lx-field{margin-top:11px}.lx-field textarea{resize:vertical}.lx-timer{display:flex;align-items:center;gap:8px;margin:14px 0;padding:12px;border:1px solid var(--border);border-radius:8px}.lx-timer div{margin-right:auto}.lx-timer small,.lx-timer strong{display:block}.lx-timer small{color:var(--muted);font-size:8px}.lx-timer strong{font-size:18px;font-variant-numeric:tabular-nums}.lx-form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}.lx-type-bars{display:grid;gap:8px;margin:16px 0}.lx-type-bars>div{display:grid;grid-template-columns:160px 1fr 25px;align-items:center;gap:9px;font-size:10px}.lx-type-bars .progress-track{height:7px}.lx-row-actions{flex-shrink:0}.lx-filters select{max-width:240px}.lx-import{position:relative;overflow:hidden}.lx-import input{position:absolute;inset:0;opacity:0;cursor:pointer}.lx-detail{max-width:100%}.lx-actions{margin-top:14px}@media(max-width:850px){.lx-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.lx-columns{grid-template-columns:1fr}.lx-topic-grid{grid-template-columns:1fr}}@media(max-width:560px){.lx-toolbar,.lx-filters{flex-direction:column}.lx-form-grid{grid-template-columns:1fr}.lx-type-bars>div{grid-template-columns:110px 1fr 20px}.lx-timer{flex-wrap:wrap}.lx-records article{align-items:flex-start}.lx-metrics strong{font-size:21px}}
  \`;
  document.head.appendChild(style);
  nav(); render("home");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
