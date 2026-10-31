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
  const ID_LEGADO = /^[A-Za-z0-9_-]{8,64}$/;   // ids de vistoria/edifício gerados pelo fallback antigo de DB.uid (não UUID)
  const MIMES = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  const MAX_ARQUIVO_BYTES = 50 * 1024 * 1024;
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

  /* O hash do snapshot autentica o envelope inteiro (identidade, vínculos, formato, número, criadoEm) e o conteúdo.
     Só o próprio campo hash fica de fora. appVersion do envelope é espelho de conteudo.app.versao. */
  const ENV_KEYS = ['schema', 'schemaVersion', 'canonicalizacao', 'hashAlgoritmo', 'id', 'emissaoId', 'vistoriaId', 'obraId', 'tipo', 'formato', 'numero', 'rev', 'criadoEm', 'appVersion'];
  async function hashSnapshot(s) {
    const m = {}; for (const k of ENV_KEYS) m[k] = s[k];
    m.conteudo = s.conteudo;
    const bytes = enc(canonicalize(m));
    if (bytes.length > MAX_SNAPSHOT_BYTES + 4096) throw new Error('snapshot excede o limite de ' + MAX_SNAPSHOT_BYTES + ' bytes');
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
    await hashConteudo(conteudo);   // aplica o limite de tamanho
    const s = {
      id, schema: SCHEMA, schemaVersion: SCHEMA_VERSION, canonicalizacao: C14N, hashAlgoritmo: ALGO,
      criadoEm: criadoEm || Date.now(), appVersion: appVersion || null,
      emissaoId, vistoriaId: conteudo.vistoria.id, obraId: conteudo.obra.id,
      tipo: conteudo.emissao.tipo, formato, numero: conteudo.emissao.numero, rev: conteudo.emissao.rev,
      conteudo
    };
    s.hash = await hashSnapshot(s);
    return s;
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
      for (const k of ['id', 'emissaoId']) if (typeof s[k] !== 'string' || !UUID.test(s[k])) erros.push(k + ' não é UUID');
      for (const k of ['vistoriaId', 'obraId']) if (typeof s[k] !== 'string' || !(UUID.test(s[k]) || ID_LEGADO.test(s[k]))) erros.push(k + ' inválido');
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
        else {
          for (const finding of c.constatacoes) {
            if (finding?.recorrenciaDeId != null && (typeof finding.recorrenciaDeId !== 'string' || !UUID.test(finding.recorrenciaDeId) || finding.recorrenciaDeId === finding.id)) erros.push('recorrenciaDeId inválido ou autorreferente');
          }
          if (c.evidencias.some(e => !e || !HEX64.test(e.sha256 || ''))) erros.push('evidência sem sha256');
          const ids = c.evidencias.map(e => e && e.id);
          if (new Set(ids).size !== ids.length) erros.push('evidências com id repetido');
          if (c.evidencias.some(e => e && e.vistoriaId !== s.vistoriaId)) erros.push('evidência de outra vistoria');
          const refs = c.constatacoes.flatMap(k => Array.isArray(k && k.fotoIds) ? k.fotoIds : []);
          if (refs.some(r => !ids.includes(r))) erros.push('constatação referencia foto fora das evidências');
        }
        if (c.vistoria && c.vistoria.obraId !== s.obraId) erros.push('vistoria.obraId diverge');
        if (c.emissao && S2(c.emissao.numero) !== S2(s.numero)) erros.push('numero do envelope diverge do conteúdo');
        if (!c.emissao || !c.emissao.numero || c.vistoria.seq !== c.emissao.numero.seq || c.vistoria.ano !== c.emissao.numero.ano) erros.push('seq/ano da vistoria divergem de emissao.numero');
        if (!c.app || c.app.versao !== s.appVersion) erros.push('appVersion diverge do conteúdo');
      }
      if (!erros.length) {
        const h = await hashSnapshot(s);
        if (h !== s.hash) erros.push('hash não confere com o conteúdo');
      }
    } catch (e) { erros.push(String(e.message || e)); }
    return { ok: !erros.length, erros };
  }

  const S2 = v => canonicalize(v === undefined ? null : v);

  /* ---------- artefato emitido (PDF/DOCX exato) ---------- */
  const startsWith = async (blob, bytes) => { const b = new Uint8Array(await blob.slice(0, bytes.length).arrayBuffer()); return bytes.every((x, i) => b[i] === x); };
  const MAGIC = { pdf: [0x25, 0x50, 0x44, 0x46, 0x2d], docx: [0x50, 0x4b, 0x03, 0x04] };

  async function criarArquivo({ id, snapshot, arquivo, blob }) {
    if (blob.size > MAX_ARQUIVO_BYTES) throw new Error('arquivo excede o limite de ' + MAX_ARQUIVO_BYTES + ' bytes');
    return { id, emissaoId: snapshot.emissaoId, snapshotId: snapshot.id, arquivo, mime: MIMES[snapshot.formato], blob, sha256: await hashBlob(blob), bytes: blob.size };
  }

  /* Estados: 'ausente' (sem registro), 'divergente', 'verificado'. Compara com snapshot e emissão informados. */
  async function verificarArquivo(emissao, snapshot, arq) {
    if (!arq) return { estado: 'ausente', detalhe: 'Arquivo emitido não está preservado neste aparelho.' };
    const erros = [];
    try {
      if (typeof arq.id !== 'string' || !UUID.test(arq.id)) erros.push('id inválido');
      if (!snapshot) erros.push('sem snapshot');
      else {
        if (arq.snapshotId !== snapshot.id) erros.push('snapshotId diverge');
        if (arq.emissaoId !== snapshot.emissaoId || arq.emissaoId !== emissao.id) erros.push('emissaoId diverge');
        if (arq.mime !== MIMES[snapshot.formato]) erros.push('mime diverge do formato');
        if (emissao.formato !== snapshot.formato) erros.push('formato da emissão diverge do snapshot');
        if (emissao.arquivoId !== undefined && emissao.arquivoId !== arq.id) erros.push('arquivoId diverge');
        if (typeof emissao.arquivo !== 'string' || arq.arquivo !== emissao.arquivo) erros.push('nome do arquivo diverge da emissão');
        if (!String(arq.arquivo).toLowerCase().endsWith('.' + snapshot.formato)) erros.push('extensão não corresponde ao formato');
        if (!(await startsWith(arq.blob, MAGIC[snapshot.formato] || [0]))) erros.push('assinatura do arquivo não corresponde ao formato');
      }
      if (!(arq.blob instanceof Blob)) erros.push('blob ausente');
      else {
        if (arq.bytes !== arq.blob.size) erros.push('tamanho diverge');
        if (arq.blob.size > MAX_ARQUIVO_BYTES) erros.push('acima do limite');
        if (!HEX64.test(arq.sha256 || '')) erros.push('sha256 inválido');
        else if (arq.sha256 !== emissao.arquivoSha256) erros.push('sha256 difere do registrado na emissão');
        else if (await hashBlob(arq.blob) !== arq.sha256) erros.push('conteúdo não confere com sha256');
      }
    } catch (e) { erros.push(String(e.message || e)); }
    return erros.length ? { estado: 'divergente', detalhe: erros.join('; ') } : { estado: 'verificado', detalhe: 'SHA-256 do arquivo confere.' };
  }

  const PREFIXO = { tecnico: 'VT', fotografico: 'MF', consolidado: 'RC' };
  /* A linha de emissões não é coberta pelo hash; seus metadados têm de coincidir com o envelope autenticado.
     numero da emissão é o texto impresso (VT/MF/RC-nnn/aaaa); no snapshot é {seq, ano}. */
  function metadadosDivergentes(e, s) {
    const d = [];
    for (const k of ['vistoriaId', 'obraId', 'tipo', 'formato', 'rev']) if (e[k] !== s[k]) d.push(k);
    const m = /^(VT|MF|RC)-(\d{3,})\/(\d{4})$/.exec(typeof e.numero === 'string' ? e.numero : '');
    if (!m || m[1] !== PREFIXO[s.tipo] || Number(m[2]) !== (s.numero && s.numero.seq) || Number(m[3]) !== (s.numero && s.numero.ano)) d.push('numero');
    return d;
  }

  /* Estado de uma emissão perante seu snapshot:
     'legado' (emissão sem snapshotId: anterior ao recurso, sem snapshot verificável),
     'ausente' (referencia snapshot que não existe), 'divergente', 'verificado'. */
  async function verificarEmissao(emissao, snapshot) {
    if (!emissao.snapshotId && !emissao.snapshotHash) return { estado: 'legado', detalhe: 'Emissão anterior ao snapshot; conteúdo não verificável.' };
    if (!snapshot) return { estado: 'ausente', detalhe: 'Snapshot referenciado não encontrado neste aparelho.' };
    if (snapshot.id !== emissao.snapshotId || snapshot.emissaoId !== emissao.id) return { estado: 'divergente', detalhe: 'Snapshot não pertence a esta emissão.' };
    if (snapshot.hash !== emissao.snapshotHash) return { estado: 'divergente', detalhe: 'Hash da emissão difere do snapshot.' };
    const dif = metadadosDivergentes(emissao, snapshot);
    if (dif.length) return { estado: 'divergente', detalhe: 'Linha da emissão diverge do snapshot: ' + dif.join(', ') + '.' };
    const v = await validar(snapshot);
    return v.ok ? { estado: 'verificado', detalhe: 'SHA-256 confere.' } : { estado: 'divergente', detalhe: v.erros.join('; ') };
  }

  /* Regra de importação/mesclagem por id: nunca sobrescreve. */
  function compararExistente(existente, recebido) {
    if (!existente) return 'novo';
    return existente.hash === recebido.hash ? 'duplicata' : 'conflito';
  }

  return { SCHEMA, SCHEMA_VERSION, C14N, ALGO, MAX_SNAPSHOT_BYTES, canonicalize, hashConteudo, hashSnapshot, hashBlob, criarArquivo, verificarArquivo, MIMES, MAX_ARQUIVO_BYTES, sha256, capturar, criar, validar, verificarEmissao, compararExistente };
});
