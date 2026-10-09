const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.AE2_FRONT_URL || 'http://127.0.0.1:5176';
(async () => {
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();page.setDefaultTimeout(12000);
  let role='ADMIN', failure=0, delay=0;
  const tables=[], versions=[], prices=[], calls=[], errors=[];
  const services=[{id:1,codigo:'PSI45',descricao:'Psicoterapia individual',ocupacao_nome:'Psicologia',duracao_minutos:45,ativo:true,em_uso:true},
    {id:2,codigo:'TO45',descricao:'Terapia ocupacional',ocupacao_nome:'Terapia Ocupacional',duracao_minutos:45,ativo:true}];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('access_token','synthetic-only'));
  await page.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url()),path=u.pathname;
   if(u.origin===FRONT)return route.continue();
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(path==='/me')return reply({id:99,nome:'Admin sintético',perfil:role,modulos:[]});
   if(path==='/admin/instituicoes/')return reply([{id:1,razao_social:'Empresa Sintética',nome_fantasia:null,ativo:true}]);
   if(path==='/admin/economia/servicos/')return reply(services);
   if(!path.startsWith('/admin/economia/'))return reply([]);
   calls.push({method:req.method(),path,body:req.postDataJSON()});
   if(delay)await new Promise(r=>setTimeout(r,delay));
   if(failure)return reply({detail:{code:failure===409?'EXTERNAL_CODE_EXISTS':'ECONOMIC_OPERATION_FAILED'}},failure);
   const parts=path.split('/'),kind=parts[3],id=Number(parts[4]),action=parts[5],body=req.postDataJSON(),method=req.method();
   const version=versions.find(v=>v.id===id);
   if(kind==='tabelas'){
    if(!id){if(method==='GET')return reply(tables);const t={id:tables.length+1,...body,proprietario_nome:'Empresa Sintética'};tables.push(t);return reply(t);}
    if(!action)return reply(tables.find(t=>t.id===id));
    if(method==='GET')return reply(versions.filter(v=>v.tabela_id===id));
    const v={id:versions.length+1,tabela_id:id,...body,estado:'DRAFT',publicado_em:null};versions.push(v);return reply(v);
   }
   const hydrate=p=>{const s=services.find(s=>s.id===p.servico_id);return {...p,servico_codigo:s.codigo,servico_descricao:s.descricao,ocupacao_nome:s.ocupacao_nome,duracao_minutos:s.duracao_minutos,servico_ativo:s.ativo};};
   if(kind==='versoes'){
    if(!action){if(method==='PUT')Object.assign(version,body);return reply(version);}
    if(action==='publicar'){Object.assign(version,{estado:'PUBLISHED',publicado_em:'2026-11-01T12:00:00Z'});return reply(version);}
    if(method==='POST'){
     const p={id:prices.length?Math.max(...prices.map(p=>p.id))+1:1,versao_id:id,...body};prices.push(p);return reply(hydrate(p));
    }
    const rows=prices.filter(p=>p.versao_id===id).map(hydrate), previous=versions.filter(v=>v.tabela_id===version.tabela_id&&v.estado==='PUBLISHED'&&v.vigente_desde<version.vigente_desde).sort((a,b)=>b.vigente_desde.localeCompare(a.vigente_desde))[0];
    return reply({precos:rows,quantidade_precos:rows.length,servicos_ativos:rows.filter(p=>p.servico_ativo).length,servicos_inativos:rows.filter(p=>!p.servico_ativo).length,versao_anterior_id:previous?.id??null,servicos_anteriores_sem_preco:previous?prices.filter(p=>p.versao_id===previous.id&&!rows.some(r=>r.servico_id===p.servico_id)).length:0});
   }
   if(kind==='precos'){
    const p=prices.find(p=>p.id===id);
    if(method==='DELETE'){prices.splice(prices.indexOf(p),1);return route.fulfill({status:204});}
    Object.assign(p,body);return reply(hydrate(p));
   }
   throw new Error('Unexpected request '+path);
  });
  await page.goto(FRONT+'/admin/economia');
  await page.getByRole('link',{name:'Tabelas de Preços',exact:true}).click();
  await page.getByText('Nenhuma tabela cadastrada').waitFor();
  delay=300;await page.getByRole('button',{name:'Atualizar',exact:true}).click();await page.getByRole('status').filter({hasText:'Carregando'}).waitFor();delay=0;
  await page.getByRole('button',{name:'Nova Tabela',exact:true}).click();
  await page.getByLabel('Instituição proprietária *').selectOption('1');await page.getByLabel('Código *',{exact:true}).fill('TAB');await page.getByLabel('Nome *',{exact:true}).fill('Tabela de Teste');
  await page.getByRole('button',{name:'Criar tabela',exact:true}).click();
  await page.getByText('Nenhuma versão cadastrada').waitFor();
  async function newVersion(number,day){
   await page.getByRole('button',{name:'Nova Versão',exact:true}).click();await page.getByLabel('Número da versão *').fill(String(number));await page.getByLabel('Vigente desde *').fill(day);await page.getByRole('button',{name:'Criar versão',exact:true}).click();await page.getByText('Nenhum preço cadastrado').waitFor();
  }
  await newVersion(1,'2026-11-01');
  await page.getByRole('button',{name:'Adicionar serviço',exact:true}).click();
  await page.getByLabel('Serviço econômico *').selectOption('1');await page.getByLabel('Valor-base (R$) *').fill('150,00');await page.getByLabel('Código externo',{exact:true}).fill('EXT');
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.getByRole('dialog').evaluate(e=>e.scrollWidth<=e.clientWidth));await page.screenshot({path:`/tmp/ae2-form-${width}.png`,fullPage:true});}
  failure=409;await page.getByRole('button',{name:'Salvar preço',exact:true}).click();await page.getByText('Este código externo já existe nesta versão.').waitFor();assert.equal(await page.getByLabel('Valor-base (R$) *').inputValue(),'150,00');failure=0;
  await page.getByRole('button',{name:'Salvar preço',exact:true}).click();await page.getByRole('cell',{name:'R$ 150,00',exact:true}).waitFor();
  await page.reload();await page.getByRole('cell',{name:'R$ 150,00',exact:true}).waitFor();
  await page.getByRole('button',{name:'Editar preço',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Publicar versão',exact:true}).isDisabled(),true);
  await page.getByLabel('Valor-base (R$) *').fill('');await page.getByRole('button',{name:'Salvar preço',exact:true}).click();assert.equal(prices[0].valor_base,'150.00');
  await page.getByLabel('Valor-base (R$) *').fill('151,25');await page.getByRole('button',{name:'Salvar preço',exact:true}).click();await page.getByRole('cell',{name:'R$ 151,25',exact:true}).waitFor();
  await page.getByRole('button',{name:'Editar preço',exact:true}).click();await page.getByLabel('Valor-base (R$) *').fill('150,00');await page.getByRole('button',{name:'Salvar preço',exact:true}).click();await page.getByRole('cell',{name:'R$ 150,00',exact:true}).waitFor();
  await page.getByRole('button',{name:'Editar versão',exact:true}).click();await page.getByLabel('Número da versão *').fill('3');await page.getByRole('button',{name:'Salvar versão',exact:true}).click();await page.getByText('Versão 3 — RASCUNHO').waitFor();
  async function publish(){await page.getByRole('button',{name:'Publicar versão',exact:true}).click();await page.getByText(/Esta versão não herda preços de versões anteriores/).waitFor();assert.equal(await page.getByRole('button',{name:'Confirmar publicação'}).isDisabled(),true);await page.getByLabel('Entendo os avisos').check();await page.getByRole('button',{name:'Confirmar publicação'}).click();await page.getByText(/Versão \d+ — PUBLICADA/).waitFor();}
  await publish();await page.reload();await page.getByText('Versão 3 — PUBLICADA').waitFor();assert.equal(await page.getByRole('button',{name:'Editar preço',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Adicionar serviço'}).count(),0);assert.equal(await page.getByRole('button',{name:'Editar versão'}).count(),0);
  services[0].ativo=false;await page.reload();await page.getByRole('cell',{name:'INATIVO',exact:true}).waitFor();await page.getByRole('cell',{name:'R$ 150,00',exact:true}).waitFor();
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`/tmp/ae2-version-${width}.png`,fullPage:true});}
  await page.getByRole('link',{name:'Voltar à Tabela',exact:true}).click();await newVersion(2,'2026-12-01');await page.getByText('1 serviços da versão anterior ainda sem preço nesta versão.').waitFor();
  await page.getByRole('button',{name:'Adicionar serviço'}).click();assert.equal(await page.getByRole('option',{name:/PSI45/}).count(),0);
  await page.getByLabel('Serviço econômico *').selectOption('2');await page.getByLabel('Valor-base (R$) *').fill('0,00');await page.getByRole('button',{name:'Salvar preço',exact:true}).click();await page.getByRole('cell',{name:'R$ 0,00',exact:true}).waitFor();
  await page.getByRole('button',{name:'Remover preço'}).click();await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(prices.length,2);
  await page.getByRole('button',{name:'Remover preço'}).click();await page.getByRole('button',{name:'Confirmar remoção'}).click();await page.getByText('Nenhum preço cadastrado').waitFor();
  await publish();assert.equal(versions[1].estado,'PUBLISHED');
  for(const status of [403,422,500]){failure=status;await page.getByRole('button',{name:'Atualizar',exact:true}).click();await page.getByRole('alert').waitFor();}failure=0;
  await page.getByRole('button',{name:'Atualizar',exact:true}).click();await page.getByText('Versão 2 — PUBLICADA').waitFor();
  for(const profile of ['ADMIN_CLINICA','PROFISSIONAL','SUPORTE','GESTOR']){
   role=profile;const before=calls.length;for(const path of ['/admin/economia/tabelas','/admin/economia/tabelas/1','/admin/economia/tabelas/1/versoes/1']){await page.goto(FRONT+path);await page.waitForURL('**/dashboard');}assert.equal(calls.length,before);
  }
  assert.equal(errors.length,0,errors.join('\n'));assert.ok(calls.every(c=>!c.body||!('publicado_por_usuario_id' in c.body)));
  console.log('PASS AE2: ADMIN-only, table/version CRUD, persisted 150.00, draft edit, zero/absence, omissions, empty publication, readonly, inactive history, errors, responsive 1440/768/390.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
