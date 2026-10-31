const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const demoPath = path.join(__dirname, '..', 'docs', 'prototypes', 'painel-gerencial-demo.html');
const demoBuffer = fs.readFileSync(demoPath);
const demo = demoBuffer.toString('utf8');

function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, 'function ' + name + ' exists in the demo');
  const open = source.indexOf('{', start);
  let depth = 0, quote = null, escaped = false, lineComment = false, blockComment = false;
  for (let i = open; i < source.length; i++) {
    const char = source[i], next = source[i + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; i++; continue; }
    if (char === '/' && next === '*') { blockComment = true; i++; continue; }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth++;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unclosed function ' + name);
}

function extractClickHandler(source, id) {
  const marker = "$('" + id + "').addEventListener('click',()=>{";
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, 'click handler for ' + id + ' exists');
  const expressionStart = start + marker.indexOf('()=>{');
  const open = source.indexOf('{', expressionStart);
  let depth = 0, quote = null, escaped = false;
  for (let i = open; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth++;
    if (char === '}' && --depth === 0) return source.slice(expressionStart, i + 1);
  }
  throw new Error('Unclosed click handler for ' + id);
}

function extractEventHandler(source, type) {
  const marker = "callPanel.addEventListener('" + type + "',event=>{";
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, type + ' handler exists');
  const expressionStart = start + marker.indexOf('event=>{');
  const open = source.indexOf('{', expressionStart);
  let depth = 0, quote = null, escaped = false;
  for (let i = open; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth++;
    if (char === '}' && --depth === 0) return source.slice(expressionStart, i + 1);
  }
  throw new Error('Unclosed ' + type + ' handler');
}

function workflowContext() {
  const context = vm.createContext({});
  const setup = `
    let callIndex=0, profile='operacional', rendered=0, view='alertsView';
    const tickets=[{id:'a',submitted:false,closed:false,status:'Aberto'},{id:'b',submitted:true,closed:false,status:'Aguardando chefia'}];
    const callDrafts=new Map();
    const elements={demoProfile:{get value(){return profile}},closeReason:{value:'',focused:false,focus(){this.focused=true}},chiefReason:{value:'',focused:false,focus(){this.focused=true}},chiefDecision:{value:'recebimento'},closeFeedback:{textContent:''}};
    function $(id){return elements[id]}
    function selectedCall(){return tickets[callIndex]||null}
    function hasOpenCalls(){return tickets.some(ticket=>!ticket.closed)}
    function render(){rendered++}
    function scheduleAutoTimer(){}
    function clearAlertTimer(){}
    function setView(next){view=next}
    function updateDraftStatus(){}
    ${extractFunction(demo,'saveCallDraft')}
    const closeHandler=${extractClickHandler(demo,'closeDemoCall')};
    const approveHandler=${extractClickHandler(demo,'approveDemoCall')};
    globalThis.flow={tickets,callDrafts,elements,closeHandler,approveHandler,saveCallDraft,
      setProfile(value){profile=value},setCallIndex(value){callIndex=value},getIndex(){return callIndex},getRendered(){return rendered},getView(){return view}};
  `;
  vm.runInContext(setup, context);
  return context.flow;
}

function touchContext() {
  const context = vm.createContext({});
  const setup = `
    let mobile=true,callTouchStart=null;
    const moved=[],handlers={};
    const document={body:{classList:{contains(name){return mobile&&name==='mobile-mode'}}}};
    const callPanel={addEventListener(name,handler){handlers[name]=handler}};
    function moveCall(direction){moved.push(direction)}
    handlers.touchstart=${extractEventHandler(demo,'touchstart')};
    handlers.touchend=${extractEventHandler(demo,'touchend')};
    globalThis.harness={moved,handlers,setMobile(value){mobile=value}};
  `;
  vm.runInContext(setup, context);
  return context.harness;
}

function carouselContext() {
  const context = vm.createContext({});
  const setup = `
    let timerScheduleId = null, timerEnabled = true, callIndex = 0;
    let activeView = 'alertsView', mobileMode = true, activeElement = null;
    const tickets = [{id:'a',closed:false},{id:'b',closed:false},{id:'c',closed:false}];
    const elements = {repeatInterval:{value:'30'},closeReason:{value:''},chiefReason:{value:''},closeFeedback:{textContent:''}};
    const scheduled = [], cancelled = [], renders = [];
    const document = {get activeElement(){return activeElement},querySelector(){return {dataset:{view:activeView}}}};
    function $(id){return elements[id]}
    function hasOpenCalls(){return tickets.some(ticket=>!ticket.closed)}
    function openCalls(){return tickets.filter(ticket=>!ticket.closed)}
    function selectedCall(){return openCalls()[callIndex]||null}
    function saveCallDraft(){return true}
    function renderTickets(highlight){renders.push({highlight,callIndex})}
    function setTimeout(fn,delay){const timer={id:scheduled.length+1,fn,delay};scheduled.push(timer);return timer.id}
    function clearTimeout(id){cancelled.push(id)}
    ${extractFunction(demo, 'clearAlertTimer')}
    ${extractFunction(demo, 'currentView')}
    ${extractFunction(demo, 'scheduleAutoTimer')}
    ${extractFunction(demo, 'moveCall')}
    globalThis.harness={
      scheduleAutoTimer,moveCall,scheduled,cancelled,renders,tickets,elements,
      setView(view){activeView=view},setMobile(value){mobileMode=value},setFocus(value){activeElement=value},
      setTimerEnabled(value){timerEnabled=value},getCallIndex(){return callIndex},getSelected(){return selectedCall()?.id},
      getView(){return activeView},getMobile(){return mobileMode}
    };
  `;
  vm.runInContext(setup, context);
  return context.harness;
}

test('temporizador avança circularmente apenas o chamado dentro da guia Alertas', () => {
  const h = carouselContext();
  h.scheduleAutoTimer();
  assert.equal(h.scheduled.length, 1);
  assert.equal(h.scheduled[0].delay, 30000);
  h.scheduled[0].fn();
  assert.equal(h.getCallIndex(), 1);
  assert.equal(h.renders[0].highlight, true);
  assert.equal(h.getView(), 'alertsView');
  assert.equal(h.getMobile(), true);
  h.scheduled[1].fn();
  h.scheduled[2].fn();
  assert.equal(h.getCallIndex(), 0);
  assert.equal(h.scheduled[3].delay, 30000);
});

test('temporizador não agenda fora de Alertas, durante edição ou com texto pendente', () => {
  const h = carouselContext();
  h.setView('overviewView');
  h.scheduleAutoTimer();
  assert.equal(h.scheduled.length, 0);
  h.setView('alertsView');
  h.setFocus(h.elements.closeReason);
  h.scheduleAutoTimer();
  assert.equal(h.scheduled.length, 0);
  h.setFocus(null);
  h.elements.closeReason.value = 'rascunho local';
  h.scheduleAutoTimer();
  assert.equal(h.scheduled.length, 0);
  h.elements.closeReason.value = '';
  h.setTimerEnabled(false);
  h.scheduleAutoTimer();
  assert.equal(h.scheduled.length, 0);
});

test('navegação manual tem retorno circular nos dois sentidos', () => {
  const h = carouselContext();
  h.moveCall(-1);
  assert.equal(h.getCallIndex(), 2);
  assert.equal(h.getSelected(), 'c');
  h.moveCall(1);
  assert.equal(h.getCallIndex(), 0);
  assert.equal(h.getSelected(), 'a');
});

test('contrato touch exige modo mobile e swipe horizontal de pelo menos 55 px', () => {
  assert.match(demo, /Math\.abs\(deltaX\)\s*>=\s*55/);
  assert.match(demo, /Math\.abs\(deltaX\)\s*>\s*Math\.abs\(deltaY\)/);
  assert.match(demo, /mobile-mode/);
  const timer = extractFunction(demo, 'scheduleAutoTimer');
  assert.doesNotMatch(timer, /setView\s*\(|mobile-mode|modeToggle/);
});

test('o protótipo incluido é o artefato v0.9.0 aprovado pela revisão de produto', () => {
  assert.match(demo, /Protótipo de produto · versão 0\.9\.0 · identidade visual CGU/);
  assert.equal(crypto.createHash('sha256').update(demoBuffer).digest('hex'), '1e0d47fa20a1dc1444773ea67f8106978dbabd3af5d354e18c0b1d955deb7952');
});

test('o carrossel expõe nomes acessíveis e anuncia a posição dinâmica', () => {
  assert.match(demo, /id="previousCall"[^>]*aria-label="Exibir chamado anterior"/);
  assert.match(demo, /id="nextCall"[^>]*aria-label="Exibir próximo chamado"/);
  assert.match(demo, /id="callPosition" role="status" aria-live="polite"/);
  assert.match(extractFunction(demo, 'renderTickets'), /callPosition'\)\.setAttribute\('aria-label'/);
  assert.match(demo, /id="draftStatus" role="status" aria-live="polite"/);
});

test('rascunhos operacionais e da chefia permanecem separados por chamado', () => {
  const h = workflowContext();
  h.elements.closeReason.value = 'Baixa do chamado A';
  h.saveCallDraft();
  h.setCallIndex(1);
  h.setProfile('chefia');
  h.elements.chiefReason.value = 'Recebimento conferido';
  h.elements.chiefDecision.value = 'aprovacao';
  h.saveCallDraft();
  assert.equal(h.callDrafts.get('a').closeReason, 'Baixa do chamado A');
  assert.equal(h.callDrafts.get('b').chiefReason, 'Recebimento conferido');
  assert.equal(h.callDrafts.get('b').chiefDecision, 'aprovacao');
  assert.equal(h.callDrafts.get('a').chiefReason, undefined);
  assert.equal(h.callDrafts.get('b').closeReason, undefined);
});

test('somente a Operacional submete a baixa e o chamado fica aberto até a Chefia homologar', () => {
  const h = workflowContext();
  h.elements.closeReason.value = 'Ação e evidência registradas';
  h.setProfile('gestao');
  h.closeHandler();
  assert.equal(h.tickets[0].submitted, false);
  h.setProfile('operacional');
  h.elements.closeReason.value = '';
  h.closeHandler();
  assert.equal(h.tickets[0].submitted, false);
  assert.equal(h.elements.closeReason.focused, true);
  h.elements.closeReason.value = 'Ação executada; evidência E-01';
  h.closeHandler();
  assert.equal(h.tickets[0].submitted, true);
  assert.equal(h.tickets[0].closed, false);
  assert.match(h.tickets[0].status, /aguardando recebimento\/aprovação do chefe/);
  assert.equal(h.callDrafts.has('a'), false);
});

test('somente a Chefia encerra após receber justificativa; Gestão não homologa', () => {
  const h = workflowContext();
  const ticket = h.tickets[0];
  ticket.submitted = true;
  h.elements.chiefReason.value = 'Conferência aprovada';
  h.setProfile('gestao');
  h.approveHandler();
  assert.equal(ticket.closed, false);
  h.setProfile('chefia');
  h.elements.chiefReason.value = '';
  h.approveHandler();
  assert.equal(ticket.closed, false);
  assert.equal(h.elements.chiefReason.focused, true);
  h.elements.chiefReason.value = 'Evidência conferida';
  h.elements.chiefDecision.value = 'aprovacao';
  h.approveHandler();
  assert.equal(ticket.closed, true);
  assert.equal(ticket.chiefReason, 'Evidência conferida');
  assert.equal(ticket.chiefDecision, 'aprovacao');
  assert.match(ticket.status, /Encerrado · aprovado pelo chefe de serviço/);
});

test('swipe só avança no modo mobile com deslocamento horizontal de pelo menos 55 px', () => {
  const h = touchContext();
  const start = (x,y=0) => h.handlers.touchstart({touches:[{clientX:x,clientY:y}],target:{closest(){return null}}});
  const end = (x,y=0) => h.handlers.touchend({changedTouches:[{clientX:x,clientY:y}]});
  h.setMobile(false); start(100); end(20);
  assert.equal(h.moved.length,0);
  h.setMobile(true); start(100); end(46);
  assert.equal(h.moved.length,0);
  start(100); end(45,2);
  assert.deepEqual(Array.from(h.moved),[1]);
  start(100); end(155,3);
  assert.deepEqual(Array.from(h.moved),[1,-1]);
  start(100); end(40,100);
  assert.deepEqual(Array.from(h.moved),[1,-1]);
});
