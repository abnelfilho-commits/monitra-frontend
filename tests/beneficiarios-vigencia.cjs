const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.AE3_FRONT_URL || 'http://127.0.0.1:5176';
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    // Both UTC/local day boundaries: DATE must remain an inclusive calendar date.
    for (const [timezoneId, instant] of [['America/Cuiaba','2026-10-12T02:30:00Z'],['Asia/Tokyo','2026-10-10T16:30:00Z']]) {
      const context = await browser.newContext({timezoneId});
      const page = await context.newPage();
      await page.clock.install({time:new Date(instant)});
      await page.addInitScript(() => localStorage.setItem('access_token','synthetic-only'));
      const rows = [null,'2026-12-31','2026-10-11','2026-10-10'].map((fim,i) => ({id:i+1,paciente_nome:['Sem término','Término futuro','Termina hoje','Terminou ontem'][i],inicio:'2026-10-01',fim}));
      const writes=[], errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*', route => {
        const req=route.request(), url=new URL(req.url()), p=url.pathname;
        if(url.origin===FRONT) return route.continue();
        const reply=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
        if(p==='/me') return reply({id:99,nome:'ADMIN sintético',perfil:'ADMIN',modulos:[]});
        if(p==='/admin/economia/contratos/1') return reply({id:1,codigo:'TESTE',edicao:2,estado:'PUBLISHED',inicio:'2026-10-01',fim:'2026-12-31',pagador_instituicao_id:1,tabela_preco_id:1});
        if(p==='/admin/economia/contratos/1/beneficiarios') return reply(rows);
        if(req.method()==='POST') {
          assert.equal(p,'/admin/economia/beneficiarios/2/encerrar');
          writes.push(req.postDataJSON()); rows[1].fim=req.postDataJSON().fim;return reply(rows[1]);
        }
        return reply([]);
      });
      await page.goto(FRONT+'/admin/economia/contratos/1');
      const row=name=>page.getByRole('row').filter({has:page.getByRole('rowheader',{name,exact:true})});
      await row('Término futuro').waitFor();
      for(const name of ['Sem término','Término futuro','Termina hoje']) {
        assert.match(await row(name).innerText(),/VIGENTE/);
        assert.equal(await row(name).getByRole('button',{name:'Encerrar cobertura'}).count(),1);
      }
      assert.match(await row('Terminou ontem').innerText(),/ENCERRADA/);
      assert.equal(await row('Terminou ontem').getByRole('button').count(),0);
      await row('Término futuro').getByRole('button',{name:'Encerrar cobertura'}).click();
      await page.getByLabel('Data final da cobertura *').fill('2026-10-20');
      await page.getByRole('button',{name:'Confirmar encerramento'}).click();
      await page.getByText('Término da cobertura atualizado com sucesso.').waitFor();
      await page.reload();
      await row('Término futuro').waitFor();
      assert.match(await row('Término futuro').innerText(),/20\/10\/2026/);
      assert.match(await row('Término futuro').innerText(),/VIGENTE/);
      assert.deepEqual(writes,[{fim:'2026-10-20'}]);
      assert.deepEqual(errors,[]);
      await context.close();
    }
    console.log('PASS: fim aberto/futuro/hoje/passado, fim inclusivo, antecipação + reload e limites UTC/local em Cuiabá/Tóquio.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
