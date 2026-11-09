import { test, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
const temp = mkdtempSync(join(tmpdir(), 'mental-navigation-'));
await build({stdin:{contents:`export {default as Page} from './src/pages/saudeMental/SaudeMental.jsx'; export {default as Shell} from './src/components/SaudeMentalLayout.jsx'; export {createMemoryRouter,RouterProvider} from 'react-router-dom'; export {createElement,act} from 'react'; export {createRoot} from 'react-dom/client';`,resolveDir:process.cwd(),loader:'jsx'},outfile:join(temp,'test.cjs'),define:{'import.meta.env.VITE_AMBIENTE':'"HML"'},bundle:true,platform:'node',format:'cjs',jsx:'automatic',plugins:[{name:'isolated',setup(b){
 b.onLoad({filter:/AuthContext\.jsx$/},()=>({contents:'export const useAuth=()=>({user:globalThis.actor,logout:()=>{}})',loader:'js'}));
 b.onLoad({filter:/services\/cockpitGestaoMental\.js$/},()=>({contents:'export const MANAGEMENT_AVAILABLE="available", MANAGEMENT_DENIED="denied"; export const cockpitGestaoMental=()=>globalThis.lookup();',loader:'js'}));
 b.onLoad({filter:/services\/operacaoAssistencial\.js$/},()=>({contents:'export const instituicoesOperacionais=async()=>[];',loader:'js'}));
 b.onLoad({filter:/services\/saudeMental\.js$/},()=>({contents:'export const instituicoesMentais=async()=>[]; export const pessoasMentais=async()=>({itens:[]}); export const jornadaMental=async()=>({}); export const erroMental=()=>"error";',loader:'js'}));
 b.onLoad({filter:/(CockpitMental|ProntuarioSaudeMental)\.jsx$/},args=>({contents:`export default function Stub(){return ${JSON.stringify(args.path.includes('CockpitMental')?'CLINICAL':'RECORD')};}`,loader:'jsx'}));
 b.onLoad({filter:/\.css$/},()=>({contents:'',loader:'js'}));
}}],logLevel:'silent'});
const dom=new JSDOM('<div id="root"></div>',{url:'https://test.invalid'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
const channels=[]; const NativeMessageChannel=globalThis.MessageChannel;
globalThis.MessageChannel=class extends NativeMessageChannel { constructor(){super();channels.push(this);} };
const {Page,Shell,createMemoryRouter,RouterProvider,createElement:h,act,createRoot}=createRequire(import.meta.url)(join(temp,'test.cjs'));
let root,router,calls;
async function mount(profile='ADMIN',url='/saude-mental',lookup=async()=>({})){
 globalThis.actor={id:1,perfil:profile}; calls=0;globalThis.lookup=()=>{calls++;return lookup();};
 router=createMemoryRouter([{element:h(Shell),children:[{path:'/saude-mental',element:h(Page)},{path:'/saude-mental/pessoas/:pessoaId/contextos/:contextoId',element:h(Page)},{path:'/agenda-assistencial',element:h('p',null,'AGENDA')}]},{path:'/saude-mental/gestao',element:h('p',null,'MANAGEMENT')}],{initialEntries:[url]});
 root=createRoot(document.getElementById('root'));await act(async()=>root.render(h(RouterProvider,{router})));
}
const text=()=>document.body.textContent;
afterEach(async()=>{if(root)await act(async()=>root.unmount());router?.dispose();root=null;});
after(()=>{channels.forEach(c=>{c.port1.close();c.port2.close();});globalThis.MessageChannel=NativeMessageChannel;dom.window.close();rmSync(temp,{recursive:true,force:true});});
for(const profile of ['ADMIN','GESTOR'])test(profile+' direct/reload preserves institutional filter and replaces history',async()=>{await mount(profile,'/saude-mental?instituicao_id=3');assert.equal(router.state.location.pathname,'/saude-mental/gestao');assert.equal(router.state.location.search,'?instituicao_id=3');assert.equal(router.state.historyAction,'REPLACE');assert.equal(calls,1);assert(!text().includes('CLINICAL'));});
test('loading does not render clinical cockpit',async()=>{let resolve;await mount('ADMIN','/saude-mental',()=>new Promise(r=>{resolve=r;}));assert.match(text(),/Verificando/);assert(!text().includes('CLINICAL'));await act(async()=>resolve({}));assert.equal(router.state.location.pathname,'/saude-mental/gestao');});
test('professional denied management retains clinical cockpit',async()=>{await mount('PROFISSIONAL','/saude-mental',async()=>{throw {response:{status:403}};});assert.match(text(),/CLINICAL/);assert.equal(router.state.location.pathname,'/saude-mental');});
test('admin 403 does not grant clinical or management access',async()=>{await mount('ADMIN','/saude-mental',async()=>{throw {response:{status:403}};});assert.match(text(),/Acesso gerencial indisponível/);assert(!text().includes('CLINICAL'));});
test('network failure remains uncertain and can retry',async()=>{await mount('GESTOR','/saude-mental',async()=>{throw Error('offline');});assert.match(text(),/Não foi possível verificar/);assert(!text().includes('CLINICAL'));globalThis.lookup=async()=>({});await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Tentar novamente').click());assert.equal(router.state.location.pathname,'/saude-mental/gestao');});
for(const [url,expected] of [['/saude-mental#pessoas','Pessoas'],['/saude-mental/pessoas/5/contextos/2?instituicao_id=3','RECORD'],['/agenda-assistencial','AGENDA']])test('clinical route preserved '+url,async()=>{await mount('ADMIN',url);assert.equal(calls,0);assert.match(text(),new RegExp(expected));});
test('overview menu uses same guarded entry without navigation loop',async()=>{await mount('GESTOR','/saude-mental?instituicao_id=3#pessoas');await act(async()=>[...document.querySelectorAll('a')].find(a=>a.textContent==='Visão Geral').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true,button:0})));assert.equal(router.state.location.pathname,'/saude-mental/gestao');assert.equal(calls,1);});
