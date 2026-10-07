const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = process.env.MENTAL_FRONT_URL || 'http://127.0.0.1:5177';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(10000);
    await page.addInitScript(() => localStorage.setItem('access_token', 'synthetic-only'));
    const empty = 'Ainda não há Check-ins de Bem-Estar suficientes para produzir uma leitura clínica longitudinal neste contexto.';
    let count = 0, denied = false, requests = 0;
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*', route => {
      const req=route.request(), u=new URL(req.url());
      if(u.origin===FRONT)return route.continue();
      const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
      if(u.pathname==='/me')return reply({id:99,nome:'Synthetic',perfil:'PROFISSIONAL',modulos:[]});
      assert.equal(req.method(),'GET');
      assert.equal(u.pathname,'/saude-mental/pessoas/18/contextos/9');
      assert.equal(u.searchParams.get('instituicao_id'),'5');
      requests++;
      if(denied)return reply({detail:'Forbidden'},403);
      return reply({pessoa_id:18,nome_completo:'Pessoa teste',instituicao_id:5,instituicao_nome:'Instituição teste',contexto_assistencial_id:9,modulo_id:3,contexto_estado:'ABERTO',linha_estado:'ATIVA',data_inicio:'2026-01-01',data_fim:null,
        bem_estar:{pode_registrar:false,formulario:null,checkins:Array.from({length:count},(_,i)=>({id:i+1,data_hora:`2026-10-0${i+1}T12:00:00Z`,respondente_pessoa_id:18,modalidade:'ASSISTIDO',canal:'PORTAL_PROFISSIONAL',respostas:{humor:'BOM'}}))},
        clinical_reading:{patient_id:null,pessoa_id:18,contexto_assistencial_id:9,care_line:'MENTAL_HEALTH',risk:null,trend:null,metadata:{total_registros:count},clinical_state:{titulo:count===0?'Sem leitura clínica':count===1?'Momento observado':'Leitura longitudinal descritiva',descricao:'Descrição recebida do backend.'},summary:count===0?empty:`Narrativa canônica ${count} <script>não executar</script>`}});
    });
    await page.goto(FRONT+'/saude-mental/pessoas/18/contextos/9?instituicao_id=5');
    const block=page.getByRole('region',{name:'Resumo clínico automático'});
    await block.getByText(empty,{exact:true}).waitFor();
    await block.getByText('Base: Sem dados',{exact:true}).waitFor();
    assert.equal(await block.getByRole('heading',{name:'Resumo clínico automático'}).count(),1);
    assert.ok(await page.evaluate(()=>{
      const b=document.querySelector('[aria-label="Resumo clínico automático"]');
      return !!(document.querySelector('.mental-record__summary').compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING)
        && !!(b.compareDocumentPosition(document.querySelector('.mental-record__timeline'))&Node.DOCUMENT_POSITION_FOLLOWING);
    }));
    for(count of [1,3]) {
      const before=requests;
      await page.getByRole('button',{name:'Atualizar',exact:true}).click();
      await block.getByText(`Narrativa canônica ${count} <script>não executar</script>`,{exact:true}).waitFor();
      assert.equal(requests,before+1);
      await block.getByText(`Base: ${count} registro(s)`,{exact:true}).waitFor();
      await block.getByText('Descrição recebida do backend.',{exact:true}).waitFor();
      assert.equal(await block.locator('script').count(),0);
      assert.equal(await page.locator('.mental-record__timeline article').count(),count);
      assert.equal(await page.locator('.mental-record__series-table tbody tr').count(),count);
    }
    for(const name of ['Registrar Diagnóstico','PHQ-9','GAD-7','CBI','PTS','Intervenção','Gerar relatório'])
      assert.equal(await page.getByRole('button',{name,exact:true}).isDisabled(),true);
    await page.screenshot({path:'/tmp/w3-reading-desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    await page.screenshot({path:'/tmp/w3-reading-mobile.png',fullPage:true});
    denied=true;await page.getByRole('button',{name:'Atualizar',exact:true}).click();
    await block.waitFor({state:'detached'});
    assert.deepEqual(errors,[]);
    console.log('PASS: ClinicalReading contextual, zero/one/multiple, refresh, safe text, authorization, evolution/timeline, disabled actions, responsive.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
