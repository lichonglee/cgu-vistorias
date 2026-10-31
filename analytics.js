/* Agregações locais, sem transportar conteúdo de relatórios ou evidências.
   “Verificado” significa consistência do snapshot no IndexedDB deste aparelho,
   não autoria nem validação central. */
(function (root, factory) {
  const registry = typeof module === 'object' && module.exports ? require('./indicator-registry.js') : root.IndicatorRegistry;
  const lib = factory(registry);
  if (typeof module === 'object' && module.exports) module.exports = lib;
  else root.Analytics = lib;
})(typeof self !== 'undefined' ? self : this, function (IndicatorRegistry) {
  if (!IndicatorRegistry) throw new Error('IndicatorRegistry deve carregar antes de Analytics.');
  const GRAVIDADES = ['Informativa', 'Baixa', 'Média', 'Alta', 'Crítica'];
  const oneDecimal = n => Number(n).toFixed(1).replace('.', ',');
  const formatRatio = k => k.denominator ? `${k.numerator} / ${k.denominator} (${oneDecimal(k.numerator * 100 / k.denominator)}%)` : `${k.numerator} / 0 (sem base local)`;
  const formatDensity = k => k.denominator ? `${oneDecimal(k.numerator / k.denominator)} constatações por vistoria (${k.numerator} / ${k.denominator})` : `${k.numerator} / 0 (sem base local)`;
  const arr = v => Array.isArray(v) ? v : [];
  const formatDimensions = rows => {
    const normalized = arr(rows).map(x => { const available=Number.isSafeInteger(x?.count)&&x.count>=0; return { label: typeof x?.label === 'string' ? x.label : 'Sem classificação', count: available ? x.count : null, available }; });
    const maximum = Math.max(1, ...normalized.filter(x=>x.available).map(x => x.count));
    return normalized.map(x => ({ ...x, maximum, widthPct: x.available ? Math.round(x.count * 100 / maximum) : 0 }));
  };
  const keyOf = v => typeof v === 'string' ? v : '';
  const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const countBy = (items, key) => {
    const out = new Map();
    for (const item of items) {
      const k = key(item) || 'Sem classificação';
      out.set(k, (out.get(k) || 0) + 1);
    }
    return [...out].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || compareText(a.label, b.label));
  };
  const toEpoch = v => {
    if (Number.isFinite(v)) return v;
    if (typeof v === 'string') { const n = Date.parse(v); return Number.isFinite(n) ? n : 0; }
    return 0;
  };
  const validDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const d = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value ? value : null;
  };
  const periodFor = (asOf, janelaMeses) => {
    const now = new Date(), localToday = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const end = validDate(asOf) || localToday;
    const months = janelaMeses === null || janelaMeses === undefined ? null : Number(janelaMeses);
    if (months !== null && ![12, 24].includes(months)) throw new RangeError('A janela deve ser 12, 24 ou null.');
    const date = new Date(`${end}T00:00:00Z`);
    let from = null;
    if (months !== null) {
      const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months + 1, 1));
      from = first.toISOString().slice(0, 10);
    }
    return { asOf: end, windowMonths: months, from, to: end, label: months === null ? `Todo o histórico até ${end}` : `${months} meses (${from} a ${end})` };
  };
  const hasGps = gps => gps && Number.isFinite(gps.lat) && gps.lat >= -90 && gps.lat <= 90 && Number.isFinite(gps.lon) && gps.lon >= -180 && gps.lon <= 180;

  const findingKey = (vistoriaId, constatacaoId) => JSON.stringify([vistoriaId, constatacaoId]);
  function selectedFindings(migrationRecords = [], snapshots = []) {
    const snapshotById = new Map(arr(snapshots).filter(s => s?.id).map(s => [s.id, s]));
    const eligible = new Map(), recordsByInspection = new Map(), ambiguousInspections = new Set();
    for (const record of arr(migrationRecords)) {
      if (!record?.vistoriaId || !record?.snapshotId) continue;
      const previous = recordsByInspection.get(record.vistoriaId);
      if (previous) {
        if (previous.snapshotId !== record.snapshotId) ambiguousInspections.add(record.vistoriaId);
        continue;
      }
      recordsByInspection.set(record.vistoriaId, record);
    }
    for (const [vistoriaId, record] of recordsByInspection) {
      if (ambiguousInspections.has(vistoriaId)) continue;
      const snapshot = snapshotById.get(record.snapshotId);
      if (!snapshot?.conteudo) continue;
      const work = snapshot.conteudo.obra || {};
      for (const finding of arr(snapshot.conteudo.constatacoes)) {
        if (typeof finding?.id !== 'string' || !finding.id) continue;
        eligible.set(findingKey(record.vistoriaId, finding.id), { record, snapshot, work, finding });
      }
    }
    return eligible;
  }
  function summarizeActions(migrationRecords = [], snapshots = [], actions = [], { asOf, now = Date.now() } = {}) {
    const eligible = selectedFindings(migrationRecords, snapshots), scoped = arr(actions).filter(a => eligible.has(findingKey(a?.vistoriaId, a?.constatacaoId)));
    const active = scoped.filter(a => a.estado === 'aberta' || a.estado === 'em-execucao'), completed = scoped.filter(a => a.estado === 'concluida'), declared = scoped.filter(a => a.estado !== 'cancelada');
    const highCritical = [...eligible].filter(([, item]) => item.finding?.gravidade === 'Alta' || item.finding?.gravidade === 'Crítica');
    const actionsByFinding = new Map();
    for (const action of scoped) {
      const key = findingKey(action.vistoriaId, action.constatacaoId);
      if (!actionsByFinding.has(key)) actionsByFinding.set(key, []);
      actionsByFinding.get(key).push(action);
    }
    const highCriticalWithoutAction = highCritical.filter(([key]) => !(actionsByFinding.get(key) || []).some(a => a.estado !== 'cancelada')).length;
    const today = validDate(asOf) || periodFor(null, null).asOf;
    const overdue = action => Boolean(validDate(action.prazo) && action.prazo < today);
    const aging = action => Number.isFinite(action.criadoEm) && now - action.criadoEm > 30 * 86400000;
    return {
      ruleVersion: IndicatorRegistry.RULE_VERSION,
      indicatorIds: {
        completed: IndicatorRegistry.idForKey('action.completion'), declared: IndicatorRegistry.idForKey('action.completion'),
        active: IndicatorRegistry.idForKey('action.active'), cancelled: IndicatorRegistry.idForKey('action.cancelled'),
        overdue: IndicatorRegistry.idForKey('action.overdue'), aging30: IndicatorRegistry.idForKey('action.aging30'),
        highCriticalWithoutAction: IndicatorRegistry.idForKey('action.highCriticalWithoutAction'), highCriticalTotal: IndicatorRegistry.idForKey('action.highCriticalWithoutAction')
      },
      completed: completed.length, declared: declared.length, active: active.length, cancelled: scoped.filter(a => a.estado === 'cancelada').length, overdue: active.filter(overdue).length, aging30: active.filter(aging).length, highCriticalWithoutAction, highCriticalTotal: highCritical.length
    };
  }
  function listFollowUp(migrationRecords = [], snapshots = [], actions = [], { asOf, now = Date.now() } = {}) {
    const eligible = selectedFindings(migrationRecords, snapshots), today = validDate(asOf) || periodFor(null, null).asOf;
    const actionsByFinding = new Map();
    for (const action of arr(actions)) {
      const key = findingKey(action?.vistoriaId, action?.constatacaoId);
      if (!eligible.has(key)) continue;
      if (!actionsByFinding.has(key)) actionsByFinding.set(key, []);
      actionsByFinding.get(key).push(action);
    }
    const output = [];
    for (const [key, item] of eligible) {
      const { record, snapshot, work, finding } = item, linked = actionsByFinding.get(key) || [];
      const base = { constatacaoId: finding.id, vistoriaId: record.vistoriaId, snapshotId: record.snapshotId, edificio: String(work.nome || ''), titulo: String(finding.titulo || 'Sem título'), gravidade: GRAVIDADES.includes(finding.gravidade) ? finding.gravidade : 'Sem classificação' };
      if ((finding.gravidade === 'Alta' || finding.gravidade === 'Crítica') && !linked.some(a => a.estado !== 'cancelada')) output.push({ ...base, actionId: '', motivo: 'sem_acao', indicatorId: IndicatorRegistry.idForKey('followup.sem_acao'), prazo: '' });
      for (const action of linked) {
        if (action.estado !== 'aberta' && action.estado !== 'em-execucao') continue;
        const common = { ...base, actionId: String(action.id || ''), prazo: validDate(action.prazo) || '' };
        if (common.prazo && common.prazo < today) output.push({ ...common, motivo: 'vencida', indicatorId: IndicatorRegistry.idForKey('followup.vencida') });
        if (Number.isFinite(action.criadoEm) && now - action.criadoEm > 30 * 86400000) output.push({ ...common, motivo: 'aberta_30d', indicatorId: IndicatorRegistry.idForKey('followup.aberta_30d') });
      }
    }
    const reasonOrder = { vencida: 0, aberta_30d: 1, sem_acao: 2 }, severityOrder = new Map([['Crítica', 0], ['Alta', 1], ['Média', 2], ['Baixa', 3], ['Informativa', 4], ['Sem classificação', 5]]);
    return output.sort((a, b) => reasonOrder[a.motivo] - reasonOrder[b.motivo] || severityOrder.get(a.gravidade) - severityOrder.get(b.gravidade) || compareText(a.prazo || '9999-12-31', b.prazo || '9999-12-31') || compareText(a.vistoriaId, b.vistoriaId) || compareText(a.constatacaoId, b.constatacaoId) || compareText(a.actionId, b.actionId));
  }
  function pageFollowUp(items = [], motivo = '', page = 0, pageSize = 50) {
    const size = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : 50;
    const filtered = arr(items).filter(item => !motivo || item?.motivo === motivo);
    const pages = Math.max(1, Math.ceil(filtered.length / size));
    const currentPage = Math.max(0, Math.min(Number.isSafeInteger(page) ? page : 0, pages - 1));
    return { items: filtered.slice(currentPage * size, (currentPage + 1) * size), total: filtered.length, page: currentPage, pageSize: size, pages };
  }

  async function resumir({ obras = [], vistorias = [], emissoes = [], snapshots = [], snapshotLib, sistemaPorTipo = {}, grupoPorAmbiente = {}, taxonomia, asOf, janelaMeses = null } = {}) {
    if (!snapshotLib || typeof snapshotLib.verificarEmissao !== 'function') throw new TypeError('SnapshotLib.verificarEmissao é obrigatório.');
    const O = arr(obras), V = arr(vistorias), E = arr(emissoes), S = arr(snapshots);
    const obraIds = new Set(O.map(o => o?.id).filter(Boolean));
    const vistoriaIds = new Set(V.map(v => v?.id).filter(Boolean));
    const inspectionById = new Map(V.filter(v => v?.id).map(v => [v.id, v]));
    const snapshotById = new Map(S.filter(s => s?.id).map(s => [s.id, s]));
    const emissionsByInspection = new Map();
    for (const e of E) {
      if (!e?.vistoriaId || !vistoriaIds.has(e.vistoriaId)) continue;
      if (!emissionsByInspection.has(e.vistoriaId)) emissionsByInspection.set(e.vistoriaId, []);
      emissionsByInspection.get(e.vistoriaId).push(e);
    }

    const verifiedLatest = [], semSnapshotVerificavel = [];
    for (const [vistoriaId, candidates] of emissionsByInspection) {
      // Rev is the first ordering key; the device-local clock only breaks ties.
      candidates.sort((a, b) => (Number(b.rev) || 0) - (Number(a.rev) || 0) || toEpoch(b.data) - toEpoch(a.data) || compareText(String(a.tipo),String(b.tipo)) || compareText(String(a.formato),String(b.formato)) || compareText(String(a.id),String(b.id)));
      const latest = candidates[0], rev = Number(latest.rev) || 0, emittedAt = toEpoch(latest.data);
      const tied = candidates.filter(e => (Number(e.rev) || 0) === rev && toEpoch(e.data) === emittedAt);
      const checked = [];
      for (const emission of tied) {
        const snapshot = snapshotById.get(emission.snapshotId);
        let result;
        try { result = await snapshotLib.verificarEmissao(emission, snapshot); }
        catch { result = { estado: 'divergente' }; }
        checked.push({ emission, snapshot, result });
      }
      const allVerified = checked.every(x => x.result?.estado === 'verificado' && x.snapshot?.conteudo);
      const projection = x => snapshotLib.canonicalize({ obra: x.snapshot.conteudo.obra, vistoria: x.snapshot.conteudo.vistoria, constatacoes: x.snapshot.conteudo.constatacoes, evidencias: x.snapshot.conteudo.evidencias });
      const sameContent = allVerified && checked.every(x => projection(x) === projection(checked[0]));
      const current = inspectionById.get(vistoriaId);
      if (sameContent) {
        verifiedLatest.push({ vistoriaId, emission: latest, snapshot: checked[0].snapshot, editedAfterEmission: toEpoch(current?.updatedAt) > emittedAt });
      } else {
        const bad = checked.find(x => x.result?.estado !== 'verificado' || !x.snapshot?.conteudo);
        semSnapshotVerificavel.push({ vistoriaId, estado: !allVerified ? (bad?.result?.estado || 'divergente') : 'ambiguo' });
      }
    }

    const period = periodFor(asOf, janelaMeses);
    const inPeriod = date => {
      const normalized = validDate(date);
      return period.windowMonths === null ? true : Boolean(normalized && normalized >= period.from && normalized <= period.to);
    };
    const frozenDateById = new Map(verifiedLatest.map(r => [r.vistoriaId, r.snapshot.conteudo.vistoria?.data]));
    const periodDateFor = v => frozenDateById.has(v?.id) ? frozenDateById.get(v.id) : v?.data;
    const scopedInspections = V.filter(v => inPeriod(periodDateFor(v)));
    const scopedIds = new Set(scopedInspections.map(v => v?.id).filter(Boolean));
    const scopedEmissions = new Set(E.filter(e => scopedIds.has(e?.vistoriaId)).map(e => e.vistoriaId));
    const scopedVerified = verifiedLatest.filter(r => scopedIds.has(r.vistoriaId));
    const scopedUnverified = semSnapshotVerificavel.filter(r => scopedIds.has(r.vistoriaId));
    const findings = scopedVerified.flatMap(r => arr(r.snapshot.conteudo.constatacoes));
    const severe = findings.filter(c => c?.gravidade === 'Alta' || c?.gravidade === 'Crítica').length;
    const inspectionsWithEmission = scopedEmissions;
    const inspectionsWithVerified = new Set(scopedVerified.map(r => r.vistoriaId));
    // Cobertura usa o vínculo atual da vistoria com o inventário local.
    const inspectedBuildings = new Set(scopedVerified.map(r => inspectionById.get(r.vistoriaId)?.obraId).filter(id => id && obraIds.has(id)));
    const linkedFindings = scopedVerified.reduce((total, record) => {
      const evidenceIds = new Set(arr(record.snapshot.conteudo.evidencias).map(ev => ev?.id).filter(Boolean));
      return total + arr(record.snapshot.conteudo.constatacoes).filter(c => arr(c?.fotoIds).some(id => evidenceIds.has(id))).length;
    }, 0);
    const gpsAvailable = scopedVerified.filter(r => hasGps(r.snapshot.conteudo.vistoria?.gps)).length;
    const editedAfterEmission = scopedVerified.filter(r => r.editedAfterEmission).length;
    const months = countBy(scopedVerified, r => {
      const date = r.snapshot.conteudo.vistoria?.data;
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Data ausente';
      const parsed = new Date(date + 'T00:00:00Z');
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date.slice(0, 7) : 'Data ausente';
    });
    const systems = countBy(findings, c => Object.hasOwn(sistemaPorTipo, keyOf(c?.tipo)) ? sistemaPorTipo[keyOf(c.tipo)] : 'Tipo sem correspondência no catálogo da interface');
    const environments = countBy(findings, c => Object.hasOwn(grupoPorAmbiente, keyOf(c?.ambiente)) ? grupoPorAmbiente[keyOf(c.ambiente)] : 'Ambiente sem correspondência no catálogo da interface');
    const systemCodes = taxonomia?.codigoDeTipo ? countBy(findings, c => taxonomia.codigoDeTipo(keyOf(c?.tipo)) || 'Tipo sem correspondência') : [];
    const environmentCodes = taxonomia?.codigoDeAmbiente ? countBy(findings, c => taxonomia.codigoDeAmbiente(keyOf(c?.ambiente)) || 'Ambiente sem correspondência') : [];
    const duplicateBuckets = new Map(); let duplicateCandidatesAvailable = typeof crypto !== 'undefined' && Boolean(crypto.subtle);
    for (const r of scopedVerified) {
      const content = arr(r.snapshot.conteudo.constatacoes).map(c => ({ titulo: keyOf(c?.titulo), tipo: keyOf(c?.tipo), gravidade: keyOf(c?.gravidade), ambiente: keyOf(c?.ambiente), local: keyOf(c?.local), descricao: keyOf(c?.descricao), recomendacao: keyOf(c?.recomendacao), fotoCount: arr(c?.fotoIds).length })).sort((a, b) => compareText(snapshotLib.canonicalize(a), snapshotLib.canonicalize(b)));
      if (!content.length || !duplicateCandidatesAvailable) continue;
      const v = r.snapshot.conteudo.vistoria || {}, obraId = inspectionById.get(r.vistoriaId)?.obraId, inspectionDate = validDate(v.data);
      if (!obraId || !obraIds.has(obraId) || !inspectionDate) continue;
      const canonical = snapshotLib.canonicalize({ obraId, data: inspectionDate, constatacoes: content });
      let digestBytes;
      try { digestBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical)); }
      catch { duplicateCandidatesAvailable = false; duplicateBuckets.clear(); break; }
      const digest = [...new Uint8Array(digestBytes)].map(x => x.toString(16).padStart(2, '0')).join('');
      const key = `${obraId}|${inspectionDate}|${digest}`;
      if (!duplicateBuckets.has(key)) duplicateBuckets.set(key, []);
      duplicateBuckets.get(key).push(r.vistoriaId);
    }
    const duplicateCandidates = []; let duplicateCandidatesTotal = 0;
    for (const [,bucket] of [...duplicateBuckets].sort(([a],[b])=>compareText(a,b))) {
      const ids = [...new Set(bucket)].sort();
      if (ids.length < 2) continue;
      duplicateCandidatesTotal += ids.length * (ids.length - 1) / 2;
      for (let i = 0; i < ids.length && duplicateCandidates.length < 200; i++) for (let j = i + 1; j < ids.length && duplicateCandidates.length < 200; j++) duplicateCandidates.push({ vistoriaIdA: ids[i], vistoriaIdB: ids[j], action: 'Aviso local; não mesclar automaticamente.' });
    }
    duplicateCandidates.sort((a, b) => compareText(a.vistoriaIdA,b.vistoriaIdA) || compareText(a.vistoriaIdB,b.vistoriaIdB));
    const gapMap = new Map();
    const addGap = (field, id) => { if (!gapMap.has(field)) gapMap.set(field, new Set()); gapMap.get(field).add(id); };
    for (const obra of O) {
      if (!String(obra?.endereco || '').trim()) addGap('endereco', obra?.id || 'sem-id');
      if (!String(obra?.contrato || '').trim()) addGap('contrato', obra?.id || 'sem-id');
    }
    for (const v of V) {
      if (!validDate(v?.data)) addGap('data', v?.id || 'sem-id');
      for (const c of arr(v?.constatacoes)) {
        if (!taxonomia?.codigoDeTipo?.(keyOf(c?.tipo))) addGap('tipo', c?.id || v?.id || 'sem-id');
        if (!taxonomia?.codigoDeAmbiente?.(keyOf(c?.ambiente))) addGap('ambiente', c?.id || v?.id || 'sem-id');
        if (!GRAVIDADES.includes(c?.gravidade)) addGap('gravidade', c?.id || v?.id || 'sem-id');
      }
    }
    const dataGaps = [...gapMap].map(([field, ids]) => ({ field, count: ids.size, ids: [...ids].sort().slice(0,50), truncated: ids.size > 50 })).sort((a, b) => compareText(a.field,b.field));
    const migrationRecords = scopedVerified.map(r => {
      const v = r.snapshot.conteudo.vistoria || {}, o = r.snapshot.conteudo.obra || {}, c = arr(r.snapshot.conteudo.constatacoes);
      return { vistoriaId: r.vistoriaId, snapshotId: r.snapshot.id, snapshotHash: r.snapshot.hash, emissaoId: r.emission.id, tipo: r.emission.tipo, rev: Number(r.emission.rev) || 0, completeness: { endereco: Boolean(String(o.endereco || '').trim()), contrato: Boolean(String(o.contrato || '').trim()), data: Boolean(validDate(v.data)), tipoConstatacao: c.every(x => Boolean(taxonomia?.codigoDeTipo?.(keyOf(x?.tipo)))), ambiente: c.every(x => Boolean(taxonomia?.codigoDeAmbiente?.(keyOf(x?.ambiente)))), gravidade: c.every(x => GRAVIDADES.includes(x?.gravidade)) } };
    }).sort((a, b) => compareText(a.vistoriaId,b.vistoriaId) || a.rev - b.rev || compareText(a.emissaoId,b.emissaoId));
    const severity = GRAVIDADES.map(label => ({ label, count: findings.filter(c => c?.gravidade === label).length }));
    const unknownSeverity = findings.filter(c => !GRAVIDADES.includes(c?.gravidade)).length;
    if (unknownSeverity) severity.push({ label: 'Sem classificação', count: unknownSeverity });

    const recurrenceLinks = findings.filter(c => typeof c?.id === 'string' && typeof c?.recorrenciaDeId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(c.recorrenciaDeId) && c.recorrenciaDeId.toLowerCase() !== c.id.toLowerCase()).length;
    return {
      schema: 'cgu-local-analytics-v1',
      ruleVersion: IndicatorRegistry.RULE_VERSION,
      period,
      taxonomyVersion: taxonomia?.TAXONOMIA_VERSAO || null,
      scope: 'Somente registros deste aparelho; inventário local, sem consolidação institucional.',
      verifiedMeaning: 'Consistência interna do snapshot no IndexedDB local; não prova autoria nem validação central.',
      counts: { localBuildings: obraIds.size, localInspections: vistoriaIds.size, emissionRows: E.filter(e => vistoriaIds.has(e?.vistoriaId)).length, inspectionsWithEmission: emissionsByInspection.size, inspectionsWithVerifiedSnapshot: verifiedLatest.length, unverifiedLatestEmissions: semSnapshotVerificavel.length, periodInspections: scopedInspections.length, undatedInspectionsExcluded: period.windowMonths === null ? 0 : V.filter(v => !validDate(periodDateFor(v))).length, periodEmissionRows: E.filter(e => scopedIds.has(e?.vistoriaId)).length, periodInspectionsWithEmission: inspectionsWithEmission.size, periodInspectionsWithVerifiedSnapshot: inspectionsWithVerified.size, periodUnverifiedLatestEmissions: scopedUnverified.length, verifiedFindings: findings.length },
      kpis: {
        coverage: { indicatorId: IndicatorRegistry.idForKey('kpi.coverage'), numerator: inspectedBuildings.size, denominator: obraIds.size, meaning: `Edifícios locais com snapshot verificável na janela (${period.label}) / edifícios cadastrados neste aparelho.` },
        severeDensity: { indicatorId: IndicatorRegistry.idForKey('kpi.severeDensity'), numerator: severe, denominator: scopedVerified.length, meaning: `Constatações Alta ou Crítica / vistorias com último snapshot verificável na janela (${period.label}).` },
        recurrence: { indicatorId: IndicatorRegistry.idForKey('kpi.recurrence'), numerator: recurrenceLinks, denominator: findings.length, calculable: findings.length > 0, meaning: 'Constatações com ID textual e recorrenciaDeId em formato UUID válido, sem vínculo com o próprio ID (comparação sem distinção entre maiúsculas e minúsculas) / todas as constatações dos snapshots verificáveis; destino não conferido.' },
        remediation: { indicatorId: IndicatorRegistry.idForKey('kpi.remediation'), calculable: false, reason: 'Saneamento verificado não é calculado; ações locais são declarações do usuário sem comprovação de execução.' },
        formalization: { indicatorId: IndicatorRegistry.idForKey('kpi.formalization'), numerator: inspectionsWithEmission.size, denominator: scopedInspections.length, meaning: `Vistorias locais com emissão / vistorias na janela (${period.label}).` },
      snapshotIntegrity: { indicatorId: IndicatorRegistry.idForKey('kpi.snapshotIntegrity'), numerator: inspectionsWithVerified.size, denominator: inspectionsWithEmission.size, meaning: `Vistorias com snapshot selecionado verificável / vistorias com emissão na janela (${period.label}).` },
      photoAssociation: { indicatorId: IndicatorRegistry.idForKey('kpi.photoAssociation'), numerator: linkedFindings, denominator: findings.length, meaning: 'Constatações com ao menos uma foto vinculada existente / constatações nos snapshots verificáveis.' },
      gpsAvailability: { indicatorId: IndicatorRegistry.idForKey('kpi.gpsAvailability'), numerator: gpsAvailable, denominator: scopedVerified.length, meaning: 'Snapshots verificáveis com coordenadas GPS de início / snapshots verificáveis na janela. Indicador descritivo, não nota de qualidade.' }
      },
      dimensions: { severity, systemGroup: systems, environmentGroup: environments, systemCode: systemCodes, environmentCode: environmentCodes, month: months },
      duplicateCandidates,
      duplicateCandidatesTotal,
      duplicateCandidatesTruncated: duplicateCandidatesTotal > duplicateCandidates.length,
      duplicateCandidatesAvailable,
      dataGaps,
      migrationRecords,
      stale: { inspectionsEditedAfterEmission: editedAfterEmission, denominator: scopedVerified.length },
      risk: { calculable: false, reason: 'Sem rubrica aprovada de probabilidade e impacto; não há pontuação ou ranking de risco.' }
    };
  }

  return { resumir, summarizeActions, listFollowUp, pageFollowUp, GRAVIDADES, formatRatio, formatDensity, formatDimensions, periodFor };
});
