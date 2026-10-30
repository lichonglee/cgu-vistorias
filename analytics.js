/* Agregações locais, sem transportar conteúdo de relatórios ou evidências.
   “Verificado” significa consistência do snapshot no IndexedDB deste aparelho,
   não autoria nem validação central. */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib;
  else root.Analytics = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  const GRAVIDADES = ['Informativa', 'Baixa', 'Média', 'Alta', 'Crítica'];
  const oneDecimal = n => Number(n).toFixed(1).replace('.', ',');
  const formatRatio = k => k.denominator ? `${k.numerator} / ${k.denominator} (${oneDecimal(k.numerator * 100 / k.denominator)}%)` : `${k.numerator} / 0 (sem base local)`;
  const formatDensity = k => k.denominator ? `${oneDecimal(k.numerator / k.denominator)} constatações por vistoria (${k.numerator} / ${k.denominator})` : `${k.numerator} / 0 (sem base local)`;
  const arr = v => Array.isArray(v) ? v : [];
  const keyOf = v => typeof v === 'string' ? v : '';
  const countBy = (items, key) => {
    const out = new Map();
    for (const item of items) {
      const k = key(item) || 'Sem classificação';
      out.set(k, (out.get(k) || 0) + 1);
    }
    return [...out].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'));
  };
  const toEpoch = v => {
    if (Number.isFinite(v)) return v;
    if (typeof v === 'string') { const n = Date.parse(v); return Number.isFinite(n) ? n : 0; }
    return 0;
  };
  const hasGps = gps => gps && Number.isFinite(gps.lat) && gps.lat >= -90 && gps.lat <= 90 && Number.isFinite(gps.lon) && gps.lon >= -180 && gps.lon <= 180;

  async function resumir({ obras = [], vistorias = [], emissoes = [], snapshots = [], snapshotLib, sistemaPorTipo = {}, grupoPorAmbiente = {} } = {}) {
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
      candidates.sort((a, b) => (Number(b.rev) || 0) - (Number(a.rev) || 0) || toEpoch(b.data) - toEpoch(a.data) || String(a.tipo).localeCompare(String(b.tipo)) || String(a.formato).localeCompare(String(b.formato)) || String(a.id).localeCompare(String(b.id)));
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

    const findings = verifiedLatest.flatMap(r => arr(r.snapshot.conteudo.constatacoes));
    const severe = findings.filter(c => c?.gravidade === 'Alta' || c?.gravidade === 'Crítica').length;
    const inspectionsWithEmission = new Set(emissionsByInspection.keys());
    const inspectionsWithVerified = new Set(verifiedLatest.map(r => r.vistoriaId));
    // Cobertura usa o vínculo atual da vistoria com o inventário local.
    const inspectedBuildings = new Set(verifiedLatest.map(r => inspectionById.get(r.vistoriaId)?.obraId).filter(id => id && obraIds.has(id)));
    const evidenceIds = new Set(verifiedLatest.flatMap(r => arr(r.snapshot.conteudo.evidencias).map(ev => ev?.id).filter(Boolean)));
    const linkedFindings = findings.filter(c => arr(c?.fotoIds).some(id => evidenceIds.has(id))).length;
    const gpsAvailable = verifiedLatest.filter(r => hasGps(r.snapshot.conteudo.vistoria?.gps)).length;
    const editedAfterEmission = verifiedLatest.filter(r => r.editedAfterEmission).length;
    const months = countBy(verifiedLatest, r => {
      const date = r.snapshot.conteudo.vistoria?.data;
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Data ausente';
      const parsed = new Date(date + 'T00:00:00Z');
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date.slice(0, 7) : 'Data ausente';
    });
    const systems = countBy(findings, c => Object.hasOwn(sistemaPorTipo, keyOf(c?.tipo)) ? sistemaPorTipo[keyOf(c.tipo)] : 'Tipo sem correspondência no catálogo da interface');
    const environments = countBy(findings, c => Object.hasOwn(grupoPorAmbiente, keyOf(c?.ambiente)) ? grupoPorAmbiente[keyOf(c.ambiente)] : 'Ambiente sem correspondência no catálogo da interface');
    const severity = GRAVIDADES.map(label => ({ label, count: findings.filter(c => c?.gravidade === label).length }));
    const unknownSeverity = findings.filter(c => !GRAVIDADES.includes(c?.gravidade)).length;
    if (unknownSeverity) severity.push({ label: 'Sem classificação', count: unknownSeverity });

    return {
      schema: 'cgu-local-analytics-v1',
      scope: 'Somente registros deste aparelho; inventário local, sem consolidação institucional.',
      verifiedMeaning: 'Consistência interna do snapshot no IndexedDB local; não prova autoria nem validação central.',
      counts: { localBuildings: obraIds.size, localInspections: vistoriaIds.size, emissionRows: E.filter(e => vistoriaIds.has(e?.vistoriaId)).length, inspectionsWithEmission: inspectionsWithEmission.size, inspectionsWithVerifiedSnapshot: inspectionsWithVerified.size, unverifiedLatestEmissions: semSnapshotVerificavel.length, verifiedFindings: findings.length },
      kpis: {
        coverage: { numerator: inspectedBuildings.size, denominator: obraIds.size, meaning: 'Edifícios do inventário local atual vinculados a vistoria cujo snapshot selecionado é verificável / edifícios cadastrados neste aparelho; histórico, sem janela temporal.' },
        severeDensity: { numerator: severe, denominator: verifiedLatest.length, meaning: 'Constatações Alta ou Crítica / vistorias locais com último snapshot verificável.' },
        recurrence: { calculable: false, reason: 'Não há vínculo estruturado e validado entre constatações reincidentes.' },
        remediation: { calculable: false, reason: 'Não há ciclo de ação corretiva estruturado no registro local.' },
        formalization: { numerator: inspectionsWithEmission.size, denominator: vistoriaIds.size, meaning: 'Vistorias locais com ao menos uma emissão oficial / vistorias cadastradas.' },
      snapshotIntegrity: { numerator: inspectionsWithVerified.size, denominator: inspectionsWithEmission.size, meaning: 'Vistorias com emissão cujo snapshot mais recente passou na verificação local / vistorias com emissão.' },
      photoAssociation: { numerator: linkedFindings, denominator: findings.length, meaning: 'Constatações com ao menos uma foto vinculada existente / constatações nos snapshots verificáveis.' },
      gpsAvailability: { numerator: gpsAvailable, denominator: verifiedLatest.length, meaning: 'Snapshots verificáveis com coordenadas GPS de início / snapshots verificáveis. Indicador descritivo, não nota de qualidade.' }
      },
      dimensions: { severity, systemGroup: systems, environmentGroup: environments, month: months },
      stale: { inspectionsEditedAfterEmission: editedAfterEmission, denominator: verifiedLatest.length },
      risk: { calculable: false, reason: 'Sem rubrica aprovada de probabilidade e impacto; não há pontuação ou ranking de risco.' }
    };
  }

  return { resumir, GRAVIDADES, formatRatio, formatDensity };
});
