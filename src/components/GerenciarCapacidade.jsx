import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { pendingKey, readPending, savePending, clearPending, matchesPending } from '../services/capacidadePendencias';
import { consultarHistorico, operarCapacidade } from '../services/capacidadeInstitucional';

const date = value => value ? value.split('-').reverse().join('/') : 'Sem término';
const message = e => ({401:'Sessão expirada.',403:'Operação não autorizada.',404:'Vínculo ou capacidade não encontrado.',409:'Conflito de vigência ou estado. Consulte o histórico.',422:'Confira os valores e o período informados.'}[e?.response?.status] || 'Falha de comunicação.');
export default function GerenciarCapacidade({ link, institutionName, institution, reference, onClose, onConfirmed }) {
  const { user } = useAuth();
  const key = pendingKey(user?.id, institution, link.id);
  const initial = () => { try { return { op: readPending(key), blocked: false }; } catch { return { op: null, blocked: true }; } };
  const [journal] = useState(initial);
  const [storageBlocked, setStorageBlocked] = useState(journal.blocked);
  const dialog = useRef(null), busyRef = useRef(false), alive = useRef(false);
  const [rows,setRows]=useState(null), [busy,setBusy]=useState(false), [error,setError]=useState(''), [notice,setNotice]=useState('');
  const [pending,setPending]=useState(journal.op), [action,setAction]=useState('create'), [record,setRecord]=useState(null);
  const [hours,setHours]=useState('0'), [minutes,setMinutes]=useState('0'), [start,setStart]=useState(reference), [end,setEnd]=useState(''), [reason,setReason]=useState('');
  const params={instituicao_id:institution,data_referencia:reference};
  function validate(data) {
    if(!Array.isArray(data)||data.some(r=>r.instituicao_id!==institution||r.profissional_instituicao_id!==link.id||r.data_referencia!==reference)) throw Error('Escopo inconsistente');
    return data;
  }
  useEffect(()=>{
    alive.current=true;const origin=document.activeElement;const controller=new AbortController();
    dialog.current.showModal();
    consultarHistorico(link.id,{instituicao_id:institution,data_referencia:reference},controller.signal)
      .then(data=>{if(alive.current)setRows(validate(data));}).catch(e=>{if(alive.current)setError(message(e));});
    return ()=>{alive.current=false;controller.abort();if (origin?.isConnected) origin.focus(); else document.getElementById('capacity-management-entry')?.focus();};
    // Component is keyed by institution/link/reference; no request survives its scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  async function reconcile(op) {
    const data=validate(await consultarHistorico(link.id,params));
    if(!alive.current)return;
    setRows(data);
    if(data.filter(row=>matchesPending(row,op)).length!==1)throw Error('Estado não confirmado');
    clearPending(key,op);setPending(null);setNotice('Operação confirmada no histórico.');setReason('');setAction('create');setRecord(null);setEnd('');onConfirmed();
  }
  async function retryRead() {
    if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');
    try{const saved=readPending(key);if(saved){setPending(saved);await reconcile(saved);}else if(pending||storageBlocked)throw Error('Conferência necessária');else{const data=validate(await consultarHistorico(link.id,params));if(alive.current)setRows(data);}}
    catch(e){if(alive.current)setError(pending?'Resultado ainda não confirmado. Escritas bloqueadas; solicite conferência administrativa.':message(e));}
    finally{busyRef.current=false;if(alive.current)setBusy(false);}
  }
  async function submit(e){
    e.preventDefault();if(busyRef.current||pending||storageBlocked||!rows)return;
    try{const saved=readPending(key);if(saved){setPending(saved);return;}}catch{setStorageBlocked(true);return;}
    const total=Number(hours)*60+Number(minutes);
    if(action==='create'&&(start<link.data_inicio||(link.data_fim&&(!end||start>link.data_fim||end>link.data_fim)))){setError('A capacidade deve estar integralmente dentro da vigência do vínculo.');return;}
    if(!reason.trim()||(action==='create'&&(!Number.isSafeInteger(total)||total<=0||total>2147483647||!start||(end&&end<start)))||(action==='close'&&(!end||end<record.data_inicio||(record.data_fim&&end>record.data_fim)))){setError('Confira minutos, motivo e datas de vigência.');return;}
    if(!window.confirm(`Confirmar ${action==='create'?'cadastro':action==='close'?'encerramento':'invalidação'} da capacidade no vínculo #${link.id}${record?`, registro #${record.id}`:''}?`))return;
    const payload=action==='create'?{minutos_semanais:total,data_inicio:start,data_fim:end||null,motivo:reason.trim()}:action==='close'?{data_fim:end,motivo:reason.trim()}:{motivo:reason.trim()};
    let op;
    const expected=action==='create'?{minutos_semanais:total,data_inicio:start,data_fim:end||null}:{minutos_semanais:record.minutos_semanais,data_inicio:record.data_inicio,data_fim:action==='close'?end:record.data_fim};
    try{op=savePending(key,{action,id:record?.id||null,expected});}catch{setStorageBlocked(true);setError('Não foi possível proteger a operação. Nenhum novo envio será realizado.');return;}
    busyRef.current=true;setBusy(true);setNotice('');setError('');setPending(op);
    let accepted=false;
    try{
      const result=await operarCapacidade(link.id,params,action,record?.id,payload);accepted=true;
      if(!alive.current)return;
      if(result?.instituicao_id!==institution||result?.profissional_instituicao_id!==link.id||!result.id||!matchesPending(result,op))throw Error('Resposta inconsistente');
      await reconcile(op);
    }catch(e){if(alive.current){if(!accepted&&[403,404,409,422].includes(e?.response?.status)){try{clearPending(key,op);setPending(null);}catch{setStorageBlocked(true);}setError(message(e));}else setError('Resultado não confirmado. Não repita a operação. Reconsulte ou solicite conferência administrativa.');}}
    finally{busyRef.current=false;if(alive.current)setBusy(false);}
  }
  function choose(type,row){setAction(type);setRecord(row);setEnd(row?.data_fim||'');setReason('');setNotice('');setError('');}
  return <dialog ref={dialog} className="capacity-dialog" aria-labelledby="capacity-title" onCancel={e=>{e.preventDefault();if(!busyRef.current)onClose();}}>
    <header><h2 id="capacity-title">Gerenciar capacidade</h2><p>{institutionName} — {link.profissional_nome||`Profissional #${link.profissional_id}`}<br/>{link.ocupacao_nome||`Ocupação #${link.ocupacao_id}`} · Vínculo #{link.id}</p></header>
    <div className="capacity-dialog-body">
      <p>Referência: {date(reference)}. Vigência do vínculo: {date(link.data_inicio)} — {date(link.data_fim)}{!link.ativo?' (inativo)':''}.</p>
      {storageBlocked&&<p role="alert">Armazenamento indisponível ou inválido. Escritas bloqueadas; solicite conferência administrativa.</p>}{error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
      {!rows?<p role="status">Histórico ainda não disponível.</p>:<><p>Capacidade vigente: {rows.filter(r=>r.vigente).map(r=>`${r.minutos_semanais} min`).join(', ')||'Não informada'}</p>
      <h3>Histórico</h3>{!rows.length&&<p>Nenhuma capacidade cadastrada.</p>}
      {rows.map(r=><article key={r.id}><strong>Registro #{r.id} · {r.estado}</strong><p>{r.minutos_semanais} min semanais · {date(r.data_inicio)} — {date(r.data_fim)}</p>{r.ativo&&<><button disabled={busy||!!pending||storageBlocked} onClick={()=>choose('close',r)}>Encerrar #{r.id}</button> <button disabled={busy||!!pending||storageBlocked} onClick={()=>choose('invalidate',r)}>Invalidar #{r.id}</button></>}</article>)}
      <button disabled={busy||!!pending||storageBlocked||!link.ativo} onClick={()=>choose('create',null)}>Nova capacidade</button>
      <form onSubmit={submit}><fieldset disabled={busy||!!pending||storageBlocked||(action==='create'&&!link.ativo)}><legend>{action==='create'?'Cadastrar capacidade':action==='close'?'Encerrar capacidade':'Invalidar registro'}{record?` #${record.id}`:''}</legend>
        {action==='create'&&<><label>Horas inteiras<input type="number" min="0" max="35791394" step="1" required value={hours} onChange={e=>setHours(e.target.value)}/></label><label>Minutos inteiros<input type="number" min="0" max="59" step="1" required value={minutes} onChange={e=>setMinutes(e.target.value)}/></label><label>Data de início<input type="date" required value={start} onChange={e=>setStart(e.target.value)}/></label></>}
        {action!=='invalidate'&&<label>Data de término{action==='create'?' (opcional)':''}<input type="date" required={action==='close'} value={end} onChange={e=>setEnd(e.target.value)}/></label>}
        <label>Motivo<textarea required value={reason} onChange={e=>setReason(e.target.value)}/></label>
        {action==='invalidate'&&<p>A invalidação marca o registro como inválido e preserva seu histórico. Não equivale a encerrar sua vigência.</p>}
        <button type="submit">Confirmar {action==='create'?'cadastro':action==='close'?'encerramento':'invalidação'}</button>
      </fieldset></form></>}
    </div><footer><button disabled={busy} onClick={retryRead}>{pending?'Reconciliar resultado':'Atualizar histórico'}</button><button disabled={busy} onClick={onClose}>Fechar</button>{pending&&<p>Pendência preservada nesta sessão. Novas escritas bloqueadas até reconciliação confiável.</p>}</footer>
  </dialog>;
}
