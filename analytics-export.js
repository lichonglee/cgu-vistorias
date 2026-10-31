/* Exportadores minimizados; nenhum conteúdo de relatório é copiado. */
(function(root,factory){const registry=typeof module==='object'&&module.exports?require('./indicator-registry.js'):root.IndicatorRegistry;const api=factory(registry);if(typeof module==='object'&&module.exports)module.exports=api;else root.AnalyticsExport=api;})(typeof self!=='undefined'?self:this,function(IndicatorRegistry){
  if(!IndicatorRegistry)throw new Error('IndicatorRegistry deve carregar antes de AnalyticsExport.');
  const arrays = value => Array.isArray(value) ? value : [];
  const safeId=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)?value:null;
  const safeDate=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const d=new Date(`${value}T00:00:00Z`);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?value:null;};
  const periodOf=p=>{const asOf=safeDate(p?.asOf),to=safeDate(p?.to),from=p?.from===null?null:safeDate(p?.from),windowMonths=p?.windowMonths===null?null:[12,24].includes(p?.windowMonths)?p.windowMonths:undefined;if(!asOf||!to||windowMonths===undefined||(windowMonths!==null&&!from))throw new TypeError('Período inválido.');return{asOf,windowMonths,from,to};};
  const countKeys=new Set(['localBuildings','periodInspections','undatedInspectionsExcluded','periodEmissionRows','periodInspectionsWithEmission','periodInspectionsWithVerifiedSnapshot','periodUnverifiedLatestEmissions','verifiedFindings']);
  const kpiKeys=new Set(['coverage','severeDensity','recurrence','remediation','formalization','snapshotIntegrity','photoAssociation','gpsAvailability']);
  const dimensionKeys=new Set(['severity','systemGroup','environmentGroup','systemCode','environmentCode','month']);
  const labels={severity:new Set(['Informativa','Baixa','Média','Alta','Crítica','Sem classificação']),systemGroup:new Set(['Estrutura e vedações','Impermeabilização e umidade','Cobertura e drenagem','Esquadrias e acabamentos','Instalações elétricas','Instalações hidrossanitárias','Climatização, elevadores e outros','Segurança, acessibilidade e conservação','Outros','Tipo sem correspondência no catálogo da interface','Sem classificação']),environmentGroup:new Set(['Acesso e circulação','Áreas de trabalho','Áreas de apoio','Áreas técnicas','Cobertura e subsolo','Outros','Ambiente sem correspondência no catálogo da interface','Sem classificação']),systemCode:/^(SIS\.[A-Z]{3}\.\d{3}|Tipo sem correspondência)$/,environmentCode:/^(AMB\.[A-Z]{3}\.\d{3}|Ambiente sem correspondência)$/,month:/^(\d{4}-(0[1-9]|1[0-2])|Data ausente)$/};
  function aggregatePayload(summary) {
    if (!summary || summary.schema !== 'cgu-local-analytics-v1' || !summary.period || !summary.counts || !summary.kpis || !summary.dimensions) throw new TypeError('Resumo analítico inválido.');
    if(summary.ruleVersion!==IndicatorRegistry.RULE_VERSION)throw new TypeError('Indicator registry version mismatch.');
    const counts = Object.fromEntries(Object.entries(summary.counts).filter(([key, value]) => countKeys.has(key) && Number.isSafeInteger(value) && value >= 0).sort(([a],[b])=>a<b?-1:a>b?1:0));
    const kpis = Object.fromEntries(Object.entries(summary.kpis).filter(([key])=>kpiKeys.has(key)).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key, item])=>[key, item && Number.isSafeInteger(item.numerator) && Number.isSafeInteger(item.denominator) ? {indicatorId:IndicatorRegistry.idForKey('kpi.'+key),numerator:item.numerator,denominator:item.denominator,calculable:item.denominator>0} : {indicatorId:IndicatorRegistry.idForKey('kpi.'+key),calculable:false}]));
    const dimensions = Object.fromEntries(Object.entries(summary.dimensions).filter(([key])=>dimensionKeys.has(key)).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key, rows])=>[key, arrays(rows).filter(x=>{const rule=labels[key],label=String(x?.label||'');return rule instanceof Set?rule.has(label):rule.test(label);}).map(x=>({label:String(x.label),count:Number.isSafeInteger(x.count)&&x.count>=0?x.count:0})).sort((a,b)=>a.label<b.label?-1:a.label>b.label?1:a.count-b.count)]));
    return {schema:'cgu-local-analytics-v1',ruleVersion:IndicatorRegistry.RULE_VERSION,scope:'Dados locais deste aparelho; classe restrita; não consolidado institucionalmente.',period:periodOf(summary.period),taxonomyVersion:summary.taxonomyVersion==='cgu-app-taxonomia-1'?summary.taxonomyVersion:null,counts,kpis,dimensions};
  }
  async function seal(payload, SnapshotLib) {
    if (!SnapshotLib || typeof SnapshotLib.canonicalize!=='function') throw new TypeError('Canonicalizador obrigatório.');
    const canonical = SnapshotLib.canonicalize(payload);
    const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical));
    const sha256=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
    const envelope={...payload,sha256};
    return {object:envelope,json:SnapshotLib.canonicalize(envelope),sha256};
  }
  async function gerarAgregado(summary,{SnapshotLib}={}) { return seal(aggregatePayload(summary),SnapshotLib); }
  async function gerarManifesto(summary,{SnapshotLib,incluirIds=false}={}) {
    if (!summary || summary.schema!=='cgu-local-analytics-v1') throw new TypeError('Resumo analítico inválido.');
    const records=arrays(summary.migrationRecords).map(r=>{
      const item={tipo:['tecnico','fotografico','consolidado'].includes(r.tipo)?r.tipo:'desconhecido',rev:Number.isSafeInteger(r.rev)&&r.rev>=0?r.rev:0,taxonomyVersion:summary.taxonomyVersion==='cgu-app-taxonomia-1'?summary.taxonomyVersion:null,completeness:{endereco:Boolean(r.completeness?.endereco),contrato:Boolean(r.completeness?.contrato),data:Boolean(r.completeness?.data),tipoConstatacao:Boolean(r.completeness?.tipoConstatacao),ambiente:Boolean(r.completeness?.ambiente),gravidade:Boolean(r.completeness?.gravidade)}};
      if(incluirIds){for(const key of ['vistoriaId','snapshotId','emissaoId']){const id=safeId(r[key]);if(id)item[key]=id;}if(typeof r.snapshotHash==='string'&&/^[a-f0-9]{64}$/i.test(r.snapshotHash))item.snapshotHash=r.snapshotHash.toLowerCase();}
      return item;
    }).sort((a,b)=>SnapshotLib.canonicalize(a)<SnapshotLib.canonicalize(b)?-1:SnapshotLib.canonicalize(a)>SnapshotLib.canonicalize(b)?1:0);
    return seal({schema:'cgu-migration-manifest-v1',scope:'Manifesto local minimizado; classe restrita; não contém evidências ou texto livre.',period:periodOf(summary.period),taxonomyVersion:summary.taxonomyVersion==='cgu-app-taxonomia-1'?summary.taxonomyVersion:null,idsIncluded:Boolean(incluirIds),records},SnapshotLib);
  }
  return Object.freeze({gerarAgregado,gerarManifesto});
});
