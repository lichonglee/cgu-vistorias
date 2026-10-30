/* CGU Vistorias — snapshot imutável por emissão oficial.
   Captura o conteúdo que gerou o relatório, canonicaliza (cgu-c14n-1) e calcula SHA-256.
   Sem dependências de DOM: roda no navegador (global SnapshotLib) e no Node (module.exports) para testes.
   Contrato: docs/CONTRATO-SNAPSHOT.md */
(function (root, factory) {
  const lib = factory();
  if (typeof module === 'object' && module.exports) module.exports = lib;
  else root.SnapshotLib = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  const SCHEMA = 'cgu-emission-snapshot', SCHEMA_VERSION = 1, C14N = 'cgu-c14n-1', ALGO = 'SHA-256';
  const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;   // teto por snapshot (UTF-8 do JSON canônico de conteudo)
  const MAX_DEPTH = 32;
  const HEX64 = /^[0-9a-f]{64}$/;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const BINARY_KEYS = new Set(['blob', 'base', 'bytes', 'cropBackup']);

  const enc = s => new TextEncoder().encode(s);
  const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
  async function sha256(data) {
    const subtle = (typeof crypto !== 'undefined' && crypto.subtle) || null;
    if (!subtle) throw new Error('SHA-256 indisponível neste contexto (requer HTTPS ou localhost)');
    return hex(await subtle.digest('SHA-256', typeof data === 'string' ? enc(data) : data));
  }

  /* cgu-c14n-1: JSON sem espaços; chaves de objeto em ordem crescente de unidades de código UTF-16;
     arrays preservam a ordem; propriedades undefined são omitidas; null permitido; -0 vira 0;
     rejeita NaN/±Infinity, bigint, função, símbolo, Date, Blob, typed arrays, Map/Set, ciclos e objetos não simples. */
  function canonicalize(v, depth = 0, seen = new Set()) {
    if (depth > MAX_DEPTH) throw new Error('profundidade excessiva');
    if (v === null) return 'null';
    switch (typeof v) {
      case 'string': return JSON.stringify(v);
      case 'boolean': return v ? 'true' : 'false';
      case 'number':
        if (!Number.isFinite(v)) throw new Error('número não finito');
        return JSON.stringify(Object.is(v, -0) ? 0 : v);
      case 'object': {
        if (seen.has(v)) throw new Error('referência circular');
        const proto = Object.getPrototypeOf(v);
        seen.add(v);
        try {
          if (Array.isArray(v)) return '[' + v.map(x => x === undefined ? 'null' : canonicalize(x, depth + 1, seen)).join(',') + ']';
          if (proto !== Object.prototype && proto !== null) throw new Error('objeto não simples (' + (v.constructor && v.constructor.name) + ')');
          return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort()
            .map(k => JSON.stringify(k) + ':' + canonicalize(v[k], depth + 1, seen)).join(',') + '}';
        } finally { seen.delete(v); }
      }
      default: throw new Error('tipo não suportado: ' + typeof v);
    }
  }

  const clone = v => JSON.parse(canonicalize(v));   // cópia profunda JSON-pura (falha se houver tipo inválido)

  async function hashConteudo(conteudo) {
    const c = canonicalize(conteudo);
    const bytes = enc(c);
    if (bytes.length > MAX_SNAPSHOT_BYTES) throw new Error('snapshot excede o limite de ' + MAX_SNAPSHOT_BYTES + ' bytes');
    return sha256(bytes);
  }

  async function hashBlob(blob) { return sha256(await blob.arrayBuffer()); }

  /* Monta o conteúdo emitido. Entradas já carregadas do IndexedDB; nada é lido depois (sem corrida com edição).
     fotos: registros com blob (e opcional base). cfg: apenas campos que aparecem no relatório. */
  async function capturar({ obra, vistoria, fotos, cfg, emissao, appVersion }) {
    const { constatacoes, status, ...vcampos } = vistoria;
    const evid = [];
    for (const f of fotos) {
      const meta = {};
      for (const [k, val] of Object.entries(f)) if (!BINARY_KEYS.has(k) && !(val instanceof Blob)) meta[k] = val;
      if (f.cropBackup) meta.temCropBackup = true;
      meta.sha256 = await hashBlob(f.blob);
      meta.bytes = f.blob.size;
      if (f.base) { meta.baseSha256 = await hashBlob(f.base); meta.baseBytes = f.base.size; }
      evid.push(meta);
    }
    return clone({
      app: { versao: appVersion || null },
      emissao: { tipo: emissao.tipo, numero: emissao.numero, rev: emissao.rev },
      obra,
      vistoria: vcampos,
      constatacoes: constatacoes || [],
      evidencias: evid,
      configuracao: cfg || {}
    });
  }

  /* Cria o envelope. `uid` é injetado (DB.uid). O hash cobre somente `conteudo`. */
  async function criar({ id, emissaoId, formato, conteudo, criadoEm, appVersion }) {
    const hash = await hashConteudo(conteudo);
    return {
      id, schema: SCHEMA, schemaVersion: SCHEMA_VERSION, canonicalizacao: C14N, hashAlgoritmo: ALGO, hash,
      criadoEm: criadoEm || Date.now(), appVersion: appVersion || null,
      emissaoId, vistoriaId: conteudo.vistoria.id, obraId: conteudo.obra.id,
      tipo: conteudo.emissao.tipo, formato, numero: conteudo.emissao.numero, rev: conteudo.emissao.rev,
      conteudo
    };
  }

  /* Validação estrutural + recálculo do hash. Retorna {ok, erros[]}; nunca lança. Reutilizável na importação. */
  async function validar(s) {
    const erros = [];
    try {
      if (!s || typeof s !== 'object' || Array.isArray(s)) return { ok: false, erros: ['não é objeto'] };
      if (s.schema !== SCHEMA) erros.push('schema inválido');
      if (s.schemaVersion !== SCHEMA_VERSION) erros.push('schemaVersion não suportada');
      if (s.canonicalizacao !== C14N) erros.push('canonicalização desconhecida');
      if (s.hashAlgoritmo !== ALGO) erros.push('algoritmo desconhecido');
      for (const k of ['id', 'emissaoId', 'vistoriaId', 'obraId']) if (typeof s[k] !== 'string' || !UUID.test(s[k])) erros.push(k + ' não é UUID');
      if (typeof s.hash !== 'string' || !HEX64.test(s.hash)) erros.push('hash inválido');
      if (!['tecnico', 'fotografico', 'consolidado'].includes(s.tipo)) erros.push('tipo inválido');
      if (!['docx', 'pdf'].includes(s.formato)) erros.push('formato inválido');
      if (!Number.isInteger(s.rev) || s.rev < 0) erros.push('rev inválida');
      if (!s.conteudo || typeof s.conteudo !== 'object') erros.push('conteudo ausente');
      if (!erros.length) {
        const c = s.conteudo;
        if (!c.vistoria || c.vistoria.id !== s.vistoriaId) erros.push('vistoriaId diverge do conteúdo');
        if (!c.obra || c.obra.id !== s.obraId) erros.push('obraId diverge do conteúdo');
        if (!c.emissao || c.emissao.tipo !== s.tipo || c.emissao.rev !== s.rev) erros.push('tipo/rev divergem do conteúdo');
        if (!Array.isArray(c.constatacoes) || !Array.isArray(c.evidencias)) erros.push('constatacoes/evidencias ausentes');
        else if (c.evidencias.some(e => !e || !HEX64.test(e.sha256 || ''))) erros.push('evidência sem sha256');
      }
      if (!erros.length) {
        const h = await hashConteudo(s.conteudo);
        if (h !== s.hash) erros.push('hash não confere com o conteúdo');
      }
    } catch (e) { erros.push(String(e.message || e)); }
    return { ok: !erros.length, erros };
  }

  /* Estado de uma emissão perante seu snapshot:
     'legado' (emissão sem snapshotId: anterior ao recurso, sem snapshot verificável),
     'ausente' (referencia snapshot que não existe), 'divergente', 'verificado'. */
  async function verificarEmissao(emissao, snapshot) {
    if (!emissao.snapshotId && !emissao.snapshotHash) return { estado: 'legado', detalhe: 'Emissão anterior ao snapshot; conteúdo não verificável.' };
    if (!snapshot) return { estado: 'ausente', detalhe: 'Snapshot referenciado não encontrado neste aparelho.' };
    if (snapshot.id !== emissao.snapshotId || snapshot.emissaoId !== emissao.id) return { estado: 'divergente', detalhe: 'Snapshot não pertence a esta emissão.' };
    if (snapshot.hash !== emissao.snapshotHash) return { estado: 'divergente', detalhe: 'Hash da emissão difere do snapshot.' };
    const v = await validar(snapshot);
    return v.ok ? { estado: 'verificado', detalhe: 'SHA-256 confere.' } : { estado: 'divergente', detalhe: v.erros.join('; ') };
  }

  /* Regra de importação/mesclagem por id: nunca sobrescreve. */
  function compararExistente(existente, recebido) {
    if (!existente) return 'novo';
    return existente.hash === recebido.hash ? 'duplicata' : 'conflito';
  }

  return { SCHEMA, SCHEMA_VERSION, C14N, ALGO, MAX_SNAPSHOT_BYTES, canonicalize, hashConteudo, hashBlob, sha256, capturar, criar, validar, verificarEmissao, compararExistente };
});
