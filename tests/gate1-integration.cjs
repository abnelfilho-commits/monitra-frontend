/* Synthetic integration only. Real browser + real API; no mocked requests.
 * PLAYWRIGHT_MODULE may point to the desktop's bundled playwright package.
 */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FRONT = 'http://127.0.0.1:5174';
const API = 'http://127.0.0.1:8019';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(12000);
    page.on("pageerror", error => console.error("PAGE ERROR", error.message));
    const failures = [];
    page.on('response', r => { if (r.status() >= 500) failures.push(r.status()+' '+new URL(r.url()).pathname); });
    await page.goto(FRONT+'/login');
    await page.locator('input[type=email]').fill('gate1@example.invalid');
    await page.locator('input[type=password]').fill('synthetic-gate1-only');
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/plataforma');
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    assert.ok(token);
    const headers = { Authorization: 'Bearer '+token };
    const get = async path => {
      const response = await page.request.get(API+path, { headers });
      assert.equal(response.status(),200,path);
      return response.json();
    };
    assert.deepEqual((await get('/pacientes/?care_line=NEURO')).map(p=>p.id).sort(),[1,3]);
    assert.deepEqual((await get('/cardiometabolico/pacientes')).map(p=>p.id).sort(),[2,3]);
    for (const path of ['/pacientes/2?care_line=NEURO','/pacientes/1?care_line=CARDIO','/pacientes/4?care_line=CARDIO']) {
      assert.ok([403,404].includes((await page.request.get(API+path,{headers})).status()),path);
    }
    for (const [line,id] of [['NEURO',1],['CARDIO',2],['NEURO',3],['CARDIO',3]]) {
      const view = line==='CARDIO' ? `/cardiometabolico/pacientes/${id}` : `/pacientes/${id}`;
      await page.goto(FRONT+view);
      const action = page.getByRole('button',{name: line==='CARDIO' ? '+ Diagnóstico' : /Diagnóstico/}).first();
      await action.waitFor({state:'visible'});
      await action.click();
      await page.waitForURL('**/diagnosticos/novo*');
      const patientRequest = await get(`/pacientes/${id}?care_line=${line}`);
      assert.equal(patientRequest.id,id);
      // Care line is inherited, never a manually selected form field.
      assert.equal(await page.locator('select[name=care_line]').count(),0);
      await page.getByRole('button',{name:/Diagnóstico Registre uma conclusão/}).click();
      const narrative = `Gate1 diagnosis ${line} patient ${id} run ${Date.now()}`;
      await page.getByPlaceholder('Descreva os sinais observados, a conclusão clínica e os elementos que sustentam este registro...').fill(narrative);
      const posted = page.waitForResponse(r=>r.url()===API+'/diagnosticos' && r.request().method()==='POST');
      await page.getByRole('button',{name:'🩺 Registrar Diagnóstico',exact:true}).click();
      const response = await posted;
      console.log("POST",line,id,response.status());
      assert.equal(response.status(),201,await response.text());
      assert.equal(response.request().postDataJSON().care_line,line);
      const diagnosis = await response.json();
      assert.equal(diagnosis.modulo_id,line==='NEURO'?1:2);
      await page.waitForURL(`**/diagnosticos/${diagnosis.id}?care_line=${line}`);
      console.log("DETAIL",page.url());
      await page.getByText(narrative).waitFor();
      const opposite = line==='NEURO' ? 'CARDIO' : 'NEURO';
      assert.ok([403,404].includes((await page.request.get(API+`/diagnosticos/${diagnosis.id}?care_line=${opposite}`,{headers})).status()));
      await page.goto(FRONT+view);
      await page.getByText(narrative).first().waitFor();
      const oppositeNarrative = `Gate1 diagnosis ${opposite} patient ${id}`;
      assert.equal(await page.getByText(oppositeNarrative).count(),0);
      console.log(`PASS ${line} patient ${id}: 360 → shared form → API → detail → isolated 360`);
    }
    for (const line of ['NEURO','CARDIO']) {
      const diagnoses = await get(`/diagnosticos/paciente/3?care_line=${line}`);
      assert.ok(diagnoses.length);
      assert.ok(diagnoses.every(d=>d.modulo_id===(line==='NEURO'?1:2)));
    }
    const neuroIntervention = await page.request.post(API+'/intervencoes/', {headers, data: {
      paciente_id:3,requested_care_line:'NEURO',tipo:'Synthetic',descricao:'Gate1 Neuro intervention',
      data_intervencao:'2026-01-10T10:00:00'}});
    assert.equal(neuroIntervention.status(),200);
    const cardioIntervention = await page.request.post(API+'/cardiometabolico/pacientes/3/intervencoes', {headers, data: {
      tipo:'Synthetic',descricao:'Gate1 Cardio intervention',prioridade:'moderada'}});
    assert.equal(cardioIntervention.status(),200);
    const neuroTimeline = await get('/timeline/pacientes/3');
    const cardioTimeline = await get('/cardiometabolico/pacientes/3/timeline');
    assert.ok(neuroTimeline.some(e=>e.descricao==='Gate1 Neuro intervention'));
    assert.ok(!neuroTimeline.some(e=>e.descricao==='Gate1 Cardio intervention'));
    assert.ok(cardioTimeline.some(e=>e.descricao==='Gate1 Cardio intervention'));
    assert.ok(!cardioTimeline.some(e=>e.descricao==='Gate1 Neuro intervention'));
    for (const line of ['NEURO','CARDIO']) {
      await page.goto(FRONT+`/pacientes/3/diagnosticos/novo?care_line=${line}`);
      await page.getByRole('button',{name:/Cancelar/}).click();
      await page.waitForURL(FRONT+(line==='CARDIO'?'/cardiometabolico/pacientes/3':'/pacientes/3'));
    }
    console.log('PASS explicit intervention ownership and isolated Timelines; contextual cancellation.');
    assert.deepEqual(failures,[],'Server failures in integration');
    console.log('PASS membership without records, single patient identity, clinic and care-line authorization.');
  } finally { await browser.close(); }
})().catch(error=>{ console.error(error); process.exitCode=1; });
