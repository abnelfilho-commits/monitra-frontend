const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.AE4_FRONT_URL || 'http://127.0.0.1:5176';
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => localStorage.setItem('access_token','synthetic-only'));
    const rows = [1,2].map(id => ({agenda_cuidado_id:id,paciente_id:id,paciente_nome:`Pessoa ${id}`,atividade_nome:'Atividade',ocupacao_nome:'Ocupação',duracao_minutos:45,modulo_id:3,modulo_nome:'Saúde Mental',contexto_assistencial_id:10,data_inicio:'2026-10-01',data_fim:null,status:'PLANEJADO',mapeamento_id:id===2?20:null,servico_id:id===2?2:null,servico_codigo:'OLD',servico_descricao:'Anterior',servico_ativo:false}));
    const writes=[],errors=[];
    let conflict=false;
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*', route => {
      const req=route.request(),url=new URL(req.url()),path=url.pathname;
      if(url.origin===FRONT) return route.continue();
      const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
      if(path==='/me') return reply({id:99,nome:'ADMIN',perfil:'ADMIN',modulos:[]});
      if(path==='/admin/economia/servicos/') return reply([{id:1,codigo:'ACTIVE',descricao:'Serviço ativo',ocupacao_nome:'Ocupação',duracao_minutos:45,ativo:true},{id:2,codigo:'OLD',descricao:'Anterior',ativo:false}]);
      if(path==='/admin/economia/mapeamentos/' && req.method()==='GET') return reply(rows);
      if(path.startsWith('/admin/economia/mapeamentos/') && ['POST','PUT'].includes(req.method())) {
        writes.push([req.method(),req.postDataJSON()]);
        if(conflict) return reply({detail:{code:'MAPPING_CONFLICT'}},409);
        const row=req.method()==='POST'?rows[0]:rows[1];
        Object.assign(row,{mapeamento_id:row.agenda_cuidado_id*10,servico_id:1,servico_codigo:'ACTIVE',servico_descricao:'Serviço ativo',servico_ativo:true});
        return reply(row);
      }
      return reply([]);
    });
    await page.goto(FRONT+'/admin/economia');
    await page.getByRole('link',{name:'Administrar Mapeamentos Econômicos'}).click();
    const row=id=>page.getByRole('row').filter({has:page.getByRole('rowheader',{name:`Pessoa ${id} · Agenda #${id}`})});
    await row(1).waitFor();
    assert.match(await row(2).innerText(),/INATIVO/);
    await row(1).getByRole('button',{name:'Mapear',exact:true}).click();
    await page.getByLabel('Serviço Econômico *').waitFor();
    assert.equal(await page.getByLabel('Serviço Econômico *').locator('option').count(),2);
    assert.equal(await page.getByRole('button',{name:'Salvar mapeamento'}).isDisabled(),true);
    await page.getByLabel('Serviço Econômico *').selectOption('1');
    conflict=true;
    await page.getByRole('button',{name:'Salvar mapeamento'}).click();
    await page.getByRole('alert').filter({hasText:'já foi mapeado'}).waitFor();
    assert.equal(writes.length,1);assert.equal(writes[0][0],'POST');
    await page.getByRole('button',{name:'Cancelar',exact:true}).click();
    conflict=false;
    await row(1).getByRole('button',{name:'Mapear',exact:true}).click();
    await page.getByLabel('Serviço Econômico *').selectOption('1');
    await page.getByRole('button',{name:'Salvar mapeamento'}).click();
    await page.getByText('Mapeamento salvo com sucesso.').waitFor();
    await row(2).getByRole('button',{name:'Alterar',exact:true}).click();
    await page.getByText('Serviço atual: OLD — Anterior — INATIVO').waitFor();
    await page.getByLabel('Serviço Econômico *').selectOption('1');
    await page.getByRole('button',{name:'Confirmar alteração'}).click();
    await page.getByText('Mapeamento salvo com sucesso.').waitFor();
    await page.reload();await row(1).waitFor();
    assert.match(await row(2).innerText(),/ACTIVE/);
    await page.getByLabel(/^Situação/).selectOption('NAO_MAPEADOS');
    await page.getByText('Nenhum planejamento encontrado.').waitFor();
    await page.getByLabel(/^Situação/).selectOption('TODOS');
    await page.getByLabel('Paciente ou atividade').fill('Pessoa 2');
    assert.equal(await page.getByRole('rowheader').count(),1);
    assert.deepEqual(writes,[['POST',{agenda_cuidado_id:1,servico_id:1}],['POST',{agenda_cuidado_id:1,servico_id:1}],['PUT',{servico_id:1}]]);
    assert.deepEqual(errors,[]);
    console.log('PASS AE4: hub, lista, filtros, inativo visível/não selecionável, conflito sem substituição, criação, alteração explícita e reload.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
