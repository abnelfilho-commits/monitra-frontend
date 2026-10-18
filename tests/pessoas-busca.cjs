const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.PESSOAS_FRONT_URL || 'http://127.0.0.1:5186';
(async () => {
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 try {
  const page = await browser.newPage(); page.setDefaultTimeout(12000);
  const calls = [], writes = [], errors = []; let fail = false, role = 'ADMIN', releaseOld;
  const rows = Array.from({length: 41}, (_, i) => ({id:i+1,nome_completo:`Cadastro fictício ${i+1}`,cpf:'11144477735',ativo:true}));
  const filtered = rows.slice(20);
  await page.addInitScript(() => localStorage.setItem('access_token', 'synthetic-only'));
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', async route => {
   const req=route.request(), u=new URL(req.url()); if(u.origin===FRONT)return route.continue();
   if(req.method()!=='GET')writes.push(u.pathname);
   const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname==='/me')return reply({id:99,nome:'Teste',perfil:role,modulos:[]});
   if(u.pathname==='/admin/pessoas/'){
    const params=Object.fromEntries(u.searchParams); calls.push(params);
    if(params.nome==='Antiga')await new Promise(resolve=>{releaseOld=resolve;});
    if(fail)return reply({},500);
    if(params.cpf==='11111111111')return reply({detail:{code:'INVALID_PAYLOAD'}},422);
    const data=params.cpf ? [rows[4]] : params.nome==='Nada' ? [] : params.nome==='Nova' ? [rows[8]] : params.nome ? filtered : rows;
    return reply(data.slice(+params.offset,+params.offset + +params.limit));
   }
   if(/\/admin\/pessoas\/\d+$/.test(u.pathname))return reply(rows[Number(u.pathname.split('/').pop())-1]);
   if(u.pathname.endsWith('/vinculos'))return reply({paciente_id:null,paciente_ativo:null,profissional_id:null,profissional_ativo:null,pacientes:[],profissionais:[]});
   if(u.pathname.endsWith('/acessos'))return reply({usuario:null,autorizacoes:[]});
   return reply([]);
  });
  const input=page.getByLabel('Buscar por nome ou CPF',{exact:true});
  const button=name=>page.getByRole('button',{name,exact:true});
  const firstName=()=>page.locator('.pessoas-table tbody tr').first().locator('strong');
  const requestFor=term=>page.waitForRequest(r=>{const u=new URL(r.url());return u.pathname==='/admin/pessoas/' && (u.searchParams.get('nome')===term||u.searchParams.get('cpf')===term);});
  const search=async(term,enter=false)=>{await input.fill(term); const request=requestFor(term.trim()); if(enter)await input.press('Enter');else await button('Buscar').click();await request;};
  await page.goto(FRONT+'/admin/pessoas');await firstName().waitFor();
  const count=calls.length;await input.fill('Cadastro');assert.equal(calls.length,count);
  await search(' Cadastro ');await page.getByText('Cadastro fictício 21',{exact:true}).waitFor();
  assert.equal(calls.at(-1).nome,'Cadastro');assert.equal(calls.length,count+1);
  await button('Próxima').click();await page.getByText('Página 2',{exact:true}).waitFor();
  assert.equal(calls.at(-1).nome,'Cadastro');assert.equal(calls.at(-1).offset,'20');
  await button('Consultar').click();await page.getByRole('heading',{name:'Cadastro fictício 41',exact:true}).waitFor();
  for(const name of ['Identificação e dados cadastrais','Papéis e atuação','Instituições vinculadas','Acesso à plataforma'])assert.equal(await button(name).getAttribute('aria-expanded'),'false');
  await button('Voltar à lista').click();await page.getByText('Página 2',{exact:true}).waitFor();assert.equal(await input.inputValue(),' Cadastro ');
  await search('Nova',true);await page.getByText('Cadastro fictício 9',{exact:true}).waitFor();assert.equal(calls.at(-1).offset,'0');
  for(const cpf of ['11144477735','111.444.777-35']){await search(cpf);await page.getByText('Cadastro fictício 5',{exact:true}).waitFor();assert.equal(calls.at(-1).cpf,cpf);assert.equal(calls.at(-1).nome,undefined);assert.equal(new URL(page.url()).search,'');}
  for(const value of ['a','12345','111.444.777-','a'.repeat(101)]){
   const before=calls.length;await input.fill(value);await button('Buscar').click();await page.getByRole('alert').waitFor();assert.equal(calls.length,before);
  }
  await search('11111111111');await page.getByText('CPF inválido. Confira os 11 dígitos e tente novamente.').waitFor();assert.ok(!(await page.getByRole('alert').innerText()).includes('11111111111'));
  await button('Limpar').click();await page.getByText('Cadastro fictício 1',{exact:true}).waitFor();assert.equal(await input.inputValue(),'');assert.equal(calls.at(-1).nome,undefined);assert.equal(calls.at(-1).cpf,undefined);
  await search('Nada');await page.getByText('Nenhuma Pessoa encontrada para esta pesquisa.').waitFor();
  fail=true;await search('Falha');await button('Tentar consulta novamente').waitFor();assert.equal(await page.getByText('Nenhuma Pessoa encontrada para esta pesquisa.').count(),0);
  fail=false;await button('Tentar consulta novamente').click();await page.getByText('Cadastro fictício 21',{exact:true}).waitFor();
  await search('Antiga');await search('Nova');await page.getByText('Cadastro fictício 9',{exact:true}).waitFor();
  const oldResponse=page.waitForResponse(r=>new URL(r.url()).searchParams.get('nome')==='Antiga');releaseOld();await oldResponse;
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await firstName().innerText(),'Cadastro fictício 9');
  await input.fill('   ');await input.press('Enter');await page.getByText('Cadastro fictício 1',{exact:true}).waitFor();assert.equal(calls.at(-1).nome,undefined);
  for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});assert.ok(await input.isVisible());assert.ok(await button('Buscar').isVisible());assert.ok(await button('Limpar').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('11144477735')),false);
  const adminCalls=calls.length;role='PROFISSIONAL';await page.reload();await page.waitForURL(url=>url.pathname!=='/admin/pessoas');assert.equal(calls.length,adminCalls);
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  console.log('PASS: busca, CPF, validação, Enter/Buscar/Limpar, paginação, retorno, vazio, erro/reconsulta, respostas obsoletas, painéis, responsividade, privacidade e ADMIN. APIs simuladas.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
