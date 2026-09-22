/* Real local form, synthetic HTTP only; no clinical database. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = 'http://127.0.0.1:5176';
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage();
    const posts = [], errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', dialog => dialog.accept());
    await page.addInitScript(() => localStorage.setItem('access_token','synthetic-only'));
    await page.route('**/*', route => {
      const u = new URL(route.request().url());
      if (u.origin === FRONT) return route.continue();
      const json = value => route.fulfill({contentType:'application/json',body:JSON.stringify(value)});
      if (u.pathname === '/me') return json({id:99,nome:'Synthetic',perfil:'PROFISSIONAL',modulos:[{id:2,nome:'Cardio'}]});
      if (u.pathname === '/cardiometabolico/registro-diario') {
        posts.push(route.request().postDataJSON());
        return json({registro_id:1});
      }
      if (u.pathname === '/cardiometabolico/pacientes/22') return json({id:22,nome:'Synthetic',altura:1.9});
      return json([]);
    });
    for (const [weight,height] of [['82','1.75'],['82',''],['','1.75'],['','']]) {
      await page.goto(FRONT+'/cardiometabolico/pacientes/22/registro-diario?care_line=2');
      const h = page.getByRole('spinbutton',{name:'Altura (m)',exact:true});
      await h.waitFor();
      assert.equal(await h.inputValue(),''); // Never prefill cadastral height.
      assert.equal(await h.getAttribute('step'),'0.01');
      await page.getByRole('spinbutton',{name:'Peso (kg)',exact:true}).fill(weight);
      await h.fill(height);
      assert.equal(await page.getByRole('spinbutton',{name:/IMC/}).count(),0);
      await page.getByRole('button',{name:'Salvar registro clínico'}).click();
      await page.waitForURL('**/cardiometabolico/pacientes/22?care_line=2');
      const payload = posts.at(-1);
      assert.equal(payload.altura,height || null);
      assert.equal(payload.peso,weight || null);
      assert.equal(payload.paciente_id,22);
      assert.equal(payload.atividade_fisica,'baixa');
      assert.ok(!('imc' in payload));
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: 4 cases, decimal/empty payload, no cadastral fallback, no manual BMI, submission/context preserved.');
  } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
