// Local synthetic API only. No real credentials, backend or HML writes.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const FRONT='http://127.0.0.1:5176';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();page.setDefaultTimeout(10000);let rows=[],posts=0,mode='normal';const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('access_token','synthetic'));
 await page.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.origin===FRONT)return route.continue();const reply=(d,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(d)});
 if(u.pathname==='/me')return reply({id:1,perfil:'ADMIN',nome:'Admin sintético',modulos:[]});
 if(u.pathname==='/admin/instituicoes/')return reply([{id:3,razao_social:'Instituição sintética',ativo:true}]);
 if(u.pathname==='/admin/vinculos-institucionais/profissionais')return reply([{id:100,instituicao_id:3,profissional_id:20,ocupacao_id:10,ativo:true,data_inicio:'2026-01-01',data_fim:null}]);
 if(u.pathname.endsWith('/consolidacao'))return reply({instituicao_id:3,data_referencia:'2026-11-10',ocupacao_id:null,totais:{horas_semanais:'0.00',profissionais_distintos:0,vinculos_com_capacidade:0,vinculos_sem_capacidade:0,informacao_completa:true},ocupacoes:[],vinculos:[]});
 if(u.pathname.includes('/100/capacidades')){
 if(req.method()==='GET'){if(mode==='late'){await new Promise(r=>setTimeout(r,700));return reply([{...rows[0],id:999}]);}return reply(rows);}
 posts++;if(mode==='denied')return reply({},403);if(mode==='validation')return reply({},422);if(mode==='conflict')return reply({detail:{code:'PERIOD_CONFLICT'}},409);
 if(mode==='uncertain')return route.abort();
 const body=req.postDataJSON();let row;
 if(u.pathname.endsWith('/close')){row=rows[0];row.data_fim=body.data_fim;row.estado='ENCERRADO';row.vigente=false;}
 else if(u.pathname.endsWith('/invalidate')){row=rows[0];row.ativo=false;row.estado='INVALIDADO';row.vigente=false;}
 else{row={id:1,profissional_instituicao_id:100,instituicao_id:3,data_referencia:'2026-11-10',ativo:true,estado:'VIGENTE',vigente:true,...body};rows=[row];}
 await new Promise(r=>setTimeout(r,150));return reply(row);
 }return reply([]);});
 await page.goto(FRONT+'/admin/instituicoes/capacidade?instituicao_id=3&data_referencia=2026-11-10');
 await page.getByRole('combobox',{name:/Vínculo profissional institucional/}).selectOption('100');
 const dialog=page.getByRole('dialog');await dialog.getByText('Nenhuma capacidade cadastrada.').waitFor();
 await dialog.getByLabel('Motivo').fill('Teste inválido');await dialog.getByRole('button',{name:'Confirmar cadastro'}).click();await dialog.getByRole('alert').waitFor();assert.equal(posts,0);
 await dialog.getByLabel('Horas inteiras').fill('1');await dialog.getByLabel('Minutos inteiros').fill('30');await dialog.getByLabel('Motivo').fill('Teste sintético');
 await dialog.getByLabel('Data de término (opcional)').fill('2026-01-01');await dialog.getByRole('button',{name:'Confirmar cadastro'}).click();await dialog.getByRole('alert').waitFor();assert.equal(posts,0);await dialog.getByLabel('Data de término (opcional)').fill('');
 page.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'Confirmar cadastro'}).dblclick();await dialog.getByText('Operação confirmada no histórico.').waitFor();assert.equal(posts,1);assert.equal(rows[0].minutos_semanais,90);
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});await dialog.locator('.capacity-dialog-body').evaluate(el=>el.scrollTop=0);await page.waitForTimeout(100);assert.ok(await dialog.locator('footer').evaluate(el=>el.getBoundingClientRect().bottom<=window.innerHeight));await page.screenshot({path:`/private/tmp/capacidade-modal-${width}.png`});assert.ok(await dialog.evaluate(el=>el.getBoundingClientRect().width<=window.innerWidth));}
 await dialog.getByRole('button',{name:'Encerrar #1'}).click();await dialog.getByLabel('Data de término',{exact:true}).fill('2026-11-10');await dialog.getByLabel('Motivo').fill('Encerramento sintético');page.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'Confirmar encerramento'}).click();await dialog.getByText('Operação confirmada no histórico.').waitFor();assert.equal(posts,2);
 await dialog.getByRole('button',{name:'Invalidar #1'}).click();await dialog.getByLabel('Motivo').fill('Invalidação sintética');page.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'Confirmar invalidação'}).click();await dialog.getByText('Operação confirmada no histórico.').waitFor();assert.equal(rows[0].ativo,false);
 for(const state of ['denied','validation']){mode=state;await dialog.getByLabel('Motivo').fill('Erro sintético');page.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'Confirmar cadastro'}).click();await dialog.getByRole('alert').waitFor();assert.equal(await dialog.getByRole('button',{name:'Confirmar cadastro'}).isEnabled(),true);}
 mode='conflict';await dialog.getByLabel('Motivo').fill('Conflito');page.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'Confirmar cadastro'}).click();await dialog.getByRole('alert').filter({hasText:'Conflito'}).waitFor();
 mode='uncertain';page.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'Confirmar cadastro'}).click();await dialog.getByRole('alert').filter({hasText:'Resultado não confirmado'}).waitFor();assert.equal(await dialog.getByRole('button',{name:'Fechar',exact:true}).isDisabled(),false);
 const count=posts;await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});await page.reload();await page.getByRole('combobox',{name:/Vínculo profissional institucional/}).selectOption('100');await dialog.getByRole('button',{name:'Reconciliar resultado'}).waitFor();assert.equal(await dialog.getByRole('button',{name:'Confirmar cadastro'}).isDisabled(),true);await dialog.getByRole('button',{name:'Reconciliar resultado'}).click();await dialog.getByRole('alert').filter({hasText:'ainda não confirmado'}).waitFor();assert.equal(posts,count);
 rows[0].ativo=true;rows[0].data_fim=null;rows[0].estado='VIGENTE';rows[0].vigente=true;
 await dialog.getByRole('button',{name:'Reconciliar resultado'}).click();await dialog.getByText('Operação confirmada no histórico.').waitFor();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.match(page.url(),/instituicao_id=3&data_referencia=2026-11-10/);assert.deepEqual(errors,[]);
 mode='late';await page.getByRole('combobox',{name:/Vínculo profissional institucional/}).selectOption('100');await dialog.getByRole('button',{name:'Fechar',exact:true}).click();mode='normal';await page.getByRole('combobox',{name:/Vínculo profissional institucional/}).selectOption('100');await dialog.getByText('Registro #1 · VIGENTE').waitFor();await page.waitForTimeout(800);assert.equal(await dialog.getByText(/Registro #999/).count(),0);await page.keyboard.press('Escape');
 console.log('PASS: cadastro 90min, clique duplo, histórico, encerramento, invalidação, conflito, incerteza, reconciliação negativa/positiva sem POST, Esc seguro, filtros e 2 viewports.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
