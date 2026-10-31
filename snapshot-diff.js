/* Comparação local entre snapshots congelados. Não valida autoria; o chamador
   deve verificar cada emissão antes de exibir o resultado. */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib;
  else root.SnapshotDiff = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const canonicalize = value => {
    if (typeof SnapshotLib !== 'undefined') return SnapshotLib.canonicalize(value);
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
    return '{' + Object.keys(value).sort(compareText).map(k => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
  };
  const unavailable = reason => ({ available: false, reason, added: [], removed: [], changed: [], unchanged: [], evidence: { added: [], removed: [], unchanged: [] } });
  function compareSnapshots(left, right) {
    try {
      const a = left?.conteudo, b = right?.conteudo;
      if (!a || !b || !a.obra?.id || !b.obra?.id || !a.vistoria?.id || !b.vistoria?.id) return unavailable('Identificação de edifício ou vistoria ausente.');
      if (left.obraId !== a.obra.id || right.obraId !== b.obra.id || left.vistoriaId !== a.vistoria.id || right.vistoriaId !== b.vistoria.id) return unavailable('Vínculos do snapshot inconsistentes.');
      if (a.obra.id !== b.obra.id) return unavailable('As emissões pertencem a edifícios diferentes.');
      if (a.vistoria.id !== b.vistoria.id) return unavailable('As emissões pertencem a vistorias diferentes.');
      if (!Array.isArray(a.constatacoes) || !Array.isArray(b.constatacoes) || !Array.isArray(a.evidencias) || !Array.isArray(b.evidencias)) return unavailable('Constatações ou evidências ausentes.');

      const index = rows => {
        const map = new Map();
        for (const row of rows) {
          if (!row || typeof row.id !== 'string' || !row.id || map.has(row.id)) throw new Error('ID de constatação ausente ou repetido.');
          map.set(row.id, row);
        }
        return map;
      };
      const ai = index(a.constatacoes), bi = index(b.constatacoes);
      const ids = [...new Set([...ai.keys(), ...bi.keys()])].sort(compareText);
      const added = [], removed = [], changed = [], unchanged = [];
      const projection = row => {
        const copy = {};
        for (const key of Object.keys(row).sort(compareText)) if (key !== 'fotoIds') copy[key] = row[key];
        return copy;
      };
      for (const id of ids) {
        const before = ai.get(id), after = bi.get(id);
        if (!before) added.push({ id, after });
        else if (!after) removed.push({ id, before });
        else {
          const oldValue = projection(before), newValue = projection(after);
          if (canonicalize(oldValue) === canonicalize(newValue)) unchanged.push({ id, before, after });
          else {
            const fields = [...new Set([...Object.keys(oldValue), ...Object.keys(newValue)])].sort(compareText)
              .filter(key => canonicalize(oldValue[key] === undefined ? null : oldValue[key]) !== canonicalize(newValue[key] === undefined ? null : newValue[key]));
            changed.push({ id, before, after, fields });
          }
        }
      }
      const hashes = rows => {
        const map = new Map();
        for (const row of rows) {
          if (!row || !/^[0-9a-f]{64}$/.test(row.sha256 || '')) throw new Error('Hash de evidência inválido.');
          map.set(row.sha256, (map.get(row.sha256) || 0) + 1);
        }
        return map;
      };
      const ah = hashes(a.evidencias), bh = hashes(b.evidencias), evidenceHashes = [...new Set([...ah.keys(), ...bh.keys()])].sort(compareText);
      const evidence = { added: [], removed: [], unchanged: [] };
      for (const sha256 of evidenceHashes) {
        const before = ah.get(sha256) || 0, after = bh.get(sha256) || 0;
        if (after > before) evidence.added.push({ sha256, count: after - before });
        if (before > after) evidence.removed.push({ sha256, count: before - after });
        if (before && after) evidence.unchanged.push({ sha256, count: Math.min(before, after) });
      }
      return {
        available: true,
        added, removed, changed, unchanged, evidence,
        totals: {
          left: a.constatacoes.length, right: b.constatacoes.length,
          leftReconciles: removed.length + changed.length + unchanged.length === a.constatacoes.length,
          rightReconciles: added.length + changed.length + unchanged.length === b.constatacoes.length
        }
      };
    } catch (error) { return unavailable(String(error.message || error)); }
  }
  async function compareEmissions(left, right, snapshots, verifyEmission) {
    try {
      if (!left || !right || left.id === right.id) return unavailable('Selecione duas emissões distintas.');
      if (typeof verifyEmission !== 'function' || !Array.isArray(snapshots)) return unavailable('Verificação dos snapshots indisponível.');
      const a = snapshots.find(s => s.id === left.snapshotId), b = snapshots.find(s => s.id === right.snapshotId);
      if (!a || !b) return unavailable('Um dos snapshots está ausente neste aparelho.');
      const [va, vb] = await Promise.all([verifyEmission(left, a), verifyEmission(right, b)]);
      if (va?.estado !== 'verificado' || vb?.estado !== 'verificado') return unavailable('As duas emissões precisam continuar verificadas; nenhum resultado parcial foi exibido.');
      return compareSnapshots(a, b);
    } catch (error) { return unavailable('Não foi possível verificar as duas emissões: ' + String(error.message || error)); }
  }
  return { compareSnapshots, compareEmissions };
});
