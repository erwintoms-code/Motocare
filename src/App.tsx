import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Bike, CalendarDays, Fuel, Gauge, Plus, Wrench, Download, Upload, Trash2, Pencil, ClipboardList, CircleCheck, AlertTriangle } from 'lucide-react'

type FuelLog = { id: string; date: string; odo: number; liters: number; full: boolean; price: number; station: string; notes: string }
type ServiceLog = { id: string; date: string; odo: number; item: string; cost: number; notes: string }
type Task = { id: string; name: string; intervalKm: number; intervalMonths: number; lastOdo: number | null; lastDate: string; notes: string }
type Data = { bike: string; currentOdo: number; fuel: FuelLog[]; services: ServiceLog[]; tasks: Task[] }

const KEY = 'motocare-v21-data'
const today = () => new Date().toISOString().slice(0, 10)
const uid = () => crypto.randomUUID()
const initial: Data = {
  bike: 'Honda Click 125i V3 (2024)',
  currentOdo: 0,
  fuel: [], services: [],
  tasks: [
    { id: uid(), name: 'CVT cleaning / inspection', intervalKm: 6000, intervalMonths: 6, lastOdo: null, lastDate: '', notes: 'I-adjust ayon sa manual at kondisyon.' },
    { id: uid(), name: 'PMS / general inspection', intervalKm: 3000, intervalMonths: 3, lastOdo: null, lastDate: '', notes: 'Sundin ang eksaktong schedule ng owner’s manual.' },
    { id: uid(), name: 'Drive belt inspection / replacement', intervalKm: 20000, intervalMonths: 24, lastOdo: null, lastDate: '', notes: 'Inspection muna; palitan ayon sa manual at wear limit.' },
    { id: uid(), name: 'Coolant level / condition', intervalKm: 3000, intervalMonths: 3, lastOdo: null, lastDate: '', notes: 'Top-up o palit gamit ang tamang coolant specification.' },
    { id: uid(), name: 'Brake fluid inspection / replacement', intervalKm: 0, intervalMonths: 24, lastOdo: null, lastDate: '', notes: 'Gamitin lamang ang fluid grade na nakasaad sa manual.' },
    { id: uid(), name: 'Brake cleaning / inspection', intervalKm: 6000, intervalMonths: 6, lastOdo: null, lastDate: '', notes: 'Suriin ang pads/shoes, rotor/drum at caliper.' },
    { id: uid(), name: 'Air filter inspection / cleaning', intervalKm: 3000, intervalMonths: 3, lastOdo: null, lastDate: '', notes: 'Palitan kapag marumi o ayon sa manual.' },
    { id: uid(), name: 'Spark plug inspection', intervalKm: 6000, intervalMonths: 6, lastOdo: null, lastDate: '', notes: 'Suriin ang gap at kondisyon.' },
    { id: uid(), name: 'Fuel filter / fuel system inspection', intervalKm: 12000, intervalMonths: 12, lastOdo: null, lastDate: '', notes: 'Ipa-check kung may sintomas o ayon sa manual.' },
    { id: uid(), name: 'Tire pressure / tire condition', intervalKm: 1000, intervalMonths: 1, lastOdo: null, lastDate: '', notes: 'Mas mainam i-check bago bumiyahe.' },
    { id: uid(), name: 'Battery / charging check', intervalKm: 6000, intervalMonths: 6, lastOdo: null, lastDate: '', notes: 'Suriin terminals at charging voltage.' }
  ]
}

function loadData(): Data {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initial
    const parsed = JSON.parse(raw) as Data
    return { ...initial, ...parsed, fuel: parsed.fuel || [], services: parsed.services || [], tasks: parsed.tasks || initial.tasks }
  } catch { return initial }
}
const money = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(n)
const fmt = (n: number) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 1 }).format(n)

function fuelStats(logs: FuelLog[]) {
  const sorted = [...logs].sort((a,b) => a.odo - b.odo || a.date.localeCompare(b.date))
  const baselines = sorted.filter(x => x.full)
  const completed: { from: number; to: number; km: number; liters: number; kmL: number; cost: number }[] = []
  for (let i = 1; i < baselines.length; i++) {
    const prev = baselines[i - 1], next = baselines[i]
    const included = sorted.filter(x => x.odo > prev.odo && x.odo <= next.odo)
    const liters = included.reduce((s,x) => s + x.liters, 0)
    const cost = included.reduce((s,x) => s + x.liters * x.price, 0)
    const km = next.odo - prev.odo
    if (km > 0 && liters > 0) completed.push({ from: prev.odo, to: next.odo, km, liters, kmL: km / liters, cost })
  }
  const baseline = baselines[baselines.length - 1]
  const pending = baseline ? sorted.filter(x => x.odo > baseline.odo) : []
  return {
    completed,
    provisionalKm: baseline ? Math.max(0, (sorted[sorted.length - 1]?.odo || baseline.odo) - baseline.odo) : 0,
    provisionalLiters: pending.reduce((s,x) => s + x.liters, 0),
    provisionalCost: pending.reduce((s,x) => s + x.liters * x.price, 0),
    totalCost: sorted.reduce((s,x) => s + x.liters * x.price, 0),
    totalLiters: sorted.reduce((s,x) => s + x.liters, 0),
    lastKmL: completed.at(-1)?.kmL ?? null,
    baselineOdo: baseline?.odo ?? null
  }
}

export default function App() {
  const [data, setData] = useState<Data>(loadData)
  const [tab, setTab] = useState<'home'|'fuel'|'maintenance'|'history'>('home')
  const [fuelForm, setFuelForm] = useState({ date: today(), odo: '', liters: '', full: 'partial', price: '', station: '', notes: '' })
  const [serviceForm, setServiceForm] = useState({ date: today(), odo: '', item: 'PMS / general inspection', cost: '', notes: '' })
  const [taskForm, setTaskForm] = useState<{id:string|null; name:string; odo:string; date:string; notes:string}>({id:null,name:'',odo:'',date:today(),notes:''})
  const [editingFuel, setEditingFuel] = useState<string|null>(null)
  const [editingService, setEditingService] = useState<string|null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(data)) }, [data])
  const stats = useMemo(() => fuelStats(data.fuel), [data.fuel])
  const latestOdo = Math.max(data.currentOdo, ...data.fuel.map(x=>x.odo), ...data.services.map(x=>x.odo), 0)
  const setOdo = (v: number) => setData(d => ({...d, currentOdo:v}))
  const addFuel = (e: React.FormEvent) => {
    e.preventDefault()
    const odo = Number(fuelForm.odo), liters = Number(fuelForm.liters), price = Number(fuelForm.price)
    if (!fuelForm.date || !Number.isFinite(odo) || odo < 0 || liters <= 0 || price < 0) return alert('Pakisuri ang petsa, odometer, liters at presyo.')
    const old = data.fuel.find(x=>x.id===editingFuel)
    const others = data.fuel.filter(x=>x.id!==editingFuel)
    const priorMax = Math.max(0, ...others.map(x=>x.odo))
    if (odo < priorMax) return alert(`Hindi puwedeng mas mababa sa huling fuel odometer (${fmt(priorMax)} km). Kung correction ito, i-edit ang maling entry.`)
    const entry: FuelLog = { id: old?.id || uid(), date:fuelForm.date, odo, liters, full:fuelForm.full==='full', price, station:fuelForm.station, notes:fuelForm.notes }
    setData(d=>({...d, fuel: [...d.fuel.filter(x=>x.id!==entry.id), entry].sort((a,b)=>a.odo-b.odo), currentOdo:Math.max(d.currentOdo,odo)}))
    setEditingFuel(null); setFuelForm({date:today(),odo:'',liters:'',full:'partial',price:'',station:'',notes:''})
  }
  const editFuel = (x: FuelLog) => { setEditingFuel(x.id); setFuelForm({date:x.date,odo:String(x.odo),liters:String(x.liters),full:x.full?'full':'partial',price:String(x.price),station:x.station,notes:x.notes}); setTab('fuel'); window.scrollTo({top:0,behavior:'smooth'}) }
  const deleteFuel = (id:string) => { if(confirm('Burahin ang fuel record na ito?')) setData(d=>({...d,fuel:d.fuel.filter(x=>x.id!==id)})) }
  const addService = (e:React.FormEvent) => {
    e.preventDefault()
    const odo=Number(serviceForm.odo), cost=Number(serviceForm.cost||0)
    if(!serviceForm.date || !serviceForm.item || !Number.isFinite(odo) || odo<0) return alert('Pakisuri ang service details.')
    const old=data.services.find(x=>x.id===editingService)
    const entry:ServiceLog={id:old?.id||uid(),date:serviceForm.date,odo,item:serviceForm.item,cost,notes:serviceForm.notes}
    setData(d=>({...d,services:[...d.services.filter(x=>x.id!==entry.id),entry].sort((a,b)=>b.odo-a.odo),currentOdo:Math.max(d.currentOdo,odo)}))
    setEditingService(null);setServiceForm({date:today(),odo:'',item:'PMS / general inspection',cost:'',notes:''})
  }
  const editService=(x:ServiceLog)=>{setEditingService(x.id);setServiceForm({date:x.date,odo:String(x.odo),item:x.item,cost:String(x.cost),notes:x.notes});setTab('maintenance');window.scrollTo({top:0,behavior:'smooth'})}
  const markTask=(t:Task)=>{const odo=prompt(`Odometer noong ginawa ang ${t.name}?`,String(latestOdo));if(odo===null)return;const n=Number(odo);if(!Number.isFinite(n)||n<0)return alert('Invalid na odometer.');setData(d=>({...d,tasks:d.tasks.map(x=>x.id===t.id?{...x,lastOdo:n,lastDate:today()}:x),currentOdo:Math.max(d.currentOdo,n)}))}
  const exportData=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`motocare-backup-${today()}.json`;a.click();URL.revokeObjectURL(url)}
  const importData=(file?:File)=>{if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const obj=JSON.parse(String(reader.result));if(!Array.isArray(obj.fuel)||!Array.isArray(obj.services)||!Array.isArray(obj.tasks))throw new Error();if(confirm('I-restore ang backup? Papalitan nito ang kasalukuyang MotoCare data.'))setData({...initial,...obj})}catch{alert('Hindi valid na MotoCare backup file.')}};reader.readAsText(file)}
  const removeService=(id:string)=>{if(confirm('Burahin ang service record?'))setData(d=>({...d,services:d.services.filter(x=>x.id!==id)}))}
  const completedAvg=stats.completed.length?stats.completed.reduce((s,x)=>s+x.kmL,0)/stats.completed.length:null
  const serviceItems=['PMS / general inspection','CVT cleaning / inspection','Drive belt replacement','Coolant service','Brake fluid replacement','Brake cleaning / inspection','Air filter cleaning / replacement','Spark plug inspection / replacement','Fuel filter / fuel system','Tire / tire pressure','Battery / charging check','Other']
  return <div className="app">
    <header className="topbar"><div className="brand"><div className="brand-icon"><Bike size={23}/></div><div><b>MOTOCARE</b><small>ALAGA SA MOTOR, ALAGA SA BIYAHE</small></div></div><button className="icon-btn" title="I-download ang backup" onClick={exportData}><Download size={18}/></button></header>
    <main>
      <section className="hero"><div><span className="eyebrow">MOTORCYCLE CARE SYSTEM</span><h1>{data.bike}</h1><p>Maintenance at fuel records mo, nasa iisang lugar.</p></div><div className="odo-box"><Gauge size={18}/><span>ODOMETER</span><strong>{fmt(latestOdo)} <small>km</small></strong><button onClick={()=>{const v=prompt('Ilagay ang kasalukuyang odometer (km):',String(latestOdo));if(v!==null&&Number(v)>=0)setOdo(Number(v))}}>I-update</button></div></section>
      <nav className="tabs">{(['home','fuel','maintenance','history'] as const).map((x)=><button key={x} className={tab===x?'active':''} onClick={()=>setTab(x)}>{x==='home'?'Overview':x==='fuel'?'Fuel Tracker':x==='maintenance'?'Maintenance':'History'}</button>)}</nav>
      {tab==='home'&&<div className="content">
        <div className="section-head"><div><span className="eyebrow">DASHBOARD</span><h2>Motor status</h2></div><span className="live"><i/> LOCAL DATA</span></div>
        <div className="stats-grid">
          <Stat icon={<Gauge/>} label="Current Odometer" value={`${fmt(latestOdo)} km`} sub="Pinakahuling naitalang odo"/>
          <Stat icon={<Fuel/>} label="Average Fuel Economy" value={completedAvg?`${completedAvg.toFixed(2)} km/L`:'—'} sub={`${stats.completed.length} completed full-tank interval`}/>
          <Stat icon={<Activity/>} label="Fuel Expenses" value={money(stats.totalCost)} sub={`${fmt(stats.totalLiters)} L total recorded`}/>
          <Stat icon={<Wrench/>} label="Service Records" value={String(data.services.length)} sub="Naitalang maintenance"/>
        </div>
        <div className="panel"><div className="panel-title"><h3><Fuel size={18}/> Fuel efficiency</h3><button className="text-btn" onClick={()=>setTab('fuel')}>Buksan tracker →</button></div>
          {stats.lastKmL!==null?<div className="efficiency"><strong>{stats.lastKmL.toFixed(2)} <small>km/L</small></strong><span>Pinakahuling completed full-tank interval</span></div>:<div className="empty"><Fuel/><b>Wala pang completed fuel measurement</b><span>Magtala ng baseline Full Tank, pagkatapos ay mga refill hanggang sa susunod na Full Tank.</span></div>}
          {stats.baselineOdo!==null&&<div className="provisional"><div><b>Provisional · naghihintay ng next full tank</b><small>Simula sa baseline na {fmt(stats.baselineOdo)} km</small></div><div className="prov-numbers"><span>{fmt(stats.provisionalKm)} km</span><span>{stats.provisionalLiters.toFixed(2)} L</span><span>{money(stats.provisionalCost)}</span></div></div>}
        </div>
        <div className="panel"><div className="panel-title"><h3><ClipboardList size={18}/> Maintenance checklist</h3><button className="text-btn" onClick={()=>setTab('maintenance')}>Tingnan lahat →</button></div>
          <div className="task-list">{data.tasks.slice(0,5).map(t=><TaskRow key={t.id} task={t} onMark={()=>markTask(t)}/>)}</div>
        </div>
        <div className="backup-row"><div><b>Data backup</b><span>Nasa browser/device na ito naka-save ang records mo.</span></div><div className="actions"><button className="secondary" onClick={exportData}><Download size={15}/> Export</button><button className="secondary" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Restore</button><input ref={fileRef} type="file" accept="application/json" hidden onChange={e=>importData(e.target.files?.[0])}/></div></div>
      </div>}
      {tab==='fuel'&&<div className="content">
        <div className="section-head"><div><span className="eyebrow">FUEL LOGBOOK</span><h2>{editingFuel?'I-edit ang fuel record':'Magtala ng karga'}</h2></div></div>
        <div className="panel form-panel"><form onSubmit={addFuel}>
          <div className="form-grid">
            <Field label="Petsa"><input type="date" required value={fuelForm.date} onChange={e=>setFuelForm({...fuelForm,date:e.target.value})}/></Field>
            <Field label="Odometer (km)"><input type="number" min="0" step="0.1" required placeholder="Hal. 10200" value={fuelForm.odo} onChange={e=>setFuelForm({...fuelForm,odo:e.target.value})}/></Field>
            <Field label="Liters na naikarga"><input type="number" min="0.01" step="0.001" required placeholder="Hal. 2.5" value={fuelForm.liters} onChange={e=>setFuelForm({...fuelForm,liters:e.target.value})}/></Field>
            <Field label="Presyo kada litro (₱)"><input type="number" min="0" step="0.01" required placeholder="Hal. 65.50" value={fuelForm.price} onChange={e=>setFuelForm({...fuelForm,price:e.target.value})}/></Field>
            <Field label="Uri ng karga"><select value={fuelForm.full} onChange={e=>setFuelForm({...fuelForm,full:e.target.value})}><option value="partial">Partial refill</option><option value="full">Full Tank</option></select></Field>
            <Field label="Gasolinahan (optional)"><input value={fuelForm.station} onChange={e=>setFuelForm({...fuelForm,station:e.target.value})} placeholder="Pangalan ng station"/></Field>
            <Field label="Notes (optional)" wide><input value={fuelForm.notes} onChange={e=>setFuelForm({...fuelForm,notes:e.target.value})} placeholder="Hal. first click ng nozzle"/></Field>
          </div>
          <div className="hint"><AlertTriangle size={16}/><span><b>Full-tank method:</b> Ang unang Full Tank ay baseline lamang at hindi isasama ang liters nito sa unang computation. Isasama ang lahat ng refill pagkatapos nito hanggang sa susunod na Full Tank.</span></div>
          <div className="form-actions">{editingFuel&&<button type="button" className="secondary" onClick={()=>{setEditingFuel(null);setFuelForm({date:today(),odo:'',liters:'',full:'partial',price:'',station:'',notes:''})}}>Cancel edit</button>}<button className="primary"><Plus size={17}/> {editingFuel?'I-save ang pagbabago':'I-save ang fuel record'}</button></div>
        </form></div>
        <div className="stats-grid compact"><Stat icon={<Fuel/>} label="Total Liters" value={`${stats.totalLiters.toFixed(2)} L`} sub="Lahat ng recorded refills"/><Stat icon={<Activity/>} label="Total Fuel Cost" value={money(stats.totalCost)} sub="Kasama ang partial at full fills"/><Stat icon={<Gauge/>} label="Last Full-to-Full" value={stats.lastKmL?`${stats.lastKmL.toFixed(2)} km/L`:'Pending'} sub="Pinakahuling completed interval"/></div>
        <div className="panel"><div className="panel-title"><h3>Fuel history</h3><span className="muted">{data.fuel.length} entries</span></div>
          {data.fuel.length===0?<Empty text="Wala pang fuel entries. Simulan sa pagtatala ng unang Full Tank bilang baseline."/>:<div className="table-wrap"><table><thead><tr><th>Petsa</th><th>Odo</th><th>Liters</th><th>Type</th><th>Gastos</th><th></th></tr></thead><tbody>{[...data.fuel].sort((a,b)=>b.odo-a.odo).map(x=><tr key={x.id}><td>{x.date}</td><td>{fmt(x.odo)} km</td><td>{x.liters.toFixed(2)} L</td><td><span className={x.full?'tag full':'tag'}>{x.full?'FULL':'PARTIAL'}</span></td><td>{money(x.liters*x.price)}</td><td><div className="row-actions"><button onClick={()=>editFuel(x)} title="Edit"><Pencil size={15}/></button><button onClick={()=>deleteFuel(x.id)} title="Delete"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>}
        </div>
        <div className="panel"><div className="panel-title"><h3>Completed full-tank intervals</h3></div>{stats.completed.length===0?<Empty text="Lalabas dito ang km/L kapag may dalawang Full Tank entries na."/>:<div className="table-wrap"><table><thead><tr><th>Odo range</th><th>Distance</th><th>Fuel used</th><th>Efficiency</th></tr></thead><tbody>{stats.completed.map((x,i)=><tr key={i}><td>{fmt(x.from)}–{fmt(x.to)}</td><td>{fmt(x.km)} km</td><td>{x.liters.toFixed(2)} L</td><td><b className="green">{x.kmL.toFixed(2)} km/L</b></td></tr>)}</tbody></table></div>}</div>
      </div>}
      {tab==='maintenance'&&<div className="content">
        <div className="section-head"><div><span className="eyebrow">SERVICE & PREVENTIVE CARE</span><h2>Maintenance log</h2></div></div>
        <div className="panel form-panel"><form onSubmit={addService}><h3 className="form-heading">{editingService?'I-edit ang service record':'Magdagdag ng service record'}</h3><div className="form-grid">
          <Field label="Petsa"><input type="date" required value={serviceForm.date} onChange={e=>setServiceForm({...serviceForm,date:e.target.value})}/></Field>
          <Field label="Odometer (km)"><input type="number" min="0" step="0.1" required value={serviceForm.odo} placeholder="Hal. 12000" onChange={e=>setServiceForm({...serviceForm,odo:e.target.value})}/></Field>
          <Field label="Maintenance item" wide><select value={serviceForm.item} onChange={e=>setServiceForm({...serviceForm,item:e.target.value})}>{serviceItems.map(x=><option key={x}>{x}</option>)}</select></Field>
          <Field label="Gastos (₱)"><input type="number" min="0" step="0.01" value={serviceForm.cost} placeholder="0.00" onChange={e=>setServiceForm({...serviceForm,cost:e.target.value})}/></Field>
          <Field label="Notes / shop (optional)"><input value={serviceForm.notes} onChange={e=>setServiceForm({...serviceForm,notes:e.target.value})} placeholder="Detalye ng ginawa"/></Field>
        </div><div className="form-actions">{editingService&&<button type="button" className="secondary" onClick={()=>{setEditingService(null);setServiceForm({date:today(),odo:'',item:'PMS / general inspection',cost:'',notes:''})}}>Cancel edit</button>}<button className="primary"><Plus size={17}/> I-save ang service</button></div></form></div>
        <div className="panel"><div className="panel-title"><h3>Maintenance checklist</h3><span className="muted">Starter intervals · editable sa source code</span></div><p className="small-note">Mga paalala lamang ang interval sa ibaba, hindi opisyal na Honda specification. I-verify ang eksaktong schedule at fluid specs sa owner’s manual para sa Philippine-market Click 125i.</p><div className="task-list">{data.tasks.map(t=><TaskRow key={t.id} task={t} onMark={()=>markTask(t)}/>)}</div></div>
      </div>}
      {tab==='history'&&<div className="content"><div className="section-head"><div><span className="eyebrow">SERVICE RECORDS</span><h2>Maintenance history</h2></div></div><div className="panel">{data.services.length===0?<Empty text="Wala pang maintenance records. Magdagdag sa Maintenance tab."/>:<div className="history-list">{[...data.services].sort((a,b)=>b.odo-a.odo).map(x=><div className="history-item" key={x.id}><div className="history-icon"><Wrench size={18}/></div><div className="history-main"><b>{x.item}</b><span>{x.date} · {fmt(x.odo)} km</span>{x.notes&&<small>{x.notes}</small>}</div><div className="history-cost">{money(x.cost)}<div className="row-actions"><button onClick={()=>editService(x)}><Pencil size={15}/></button><button onClick={()=>removeService(x.id)}><Trash2 size={15}/></button></div></div></div>)}</div>}</div></div>}
    </main>
    <footer><b>MOTOCARE v2.1</b><span>Local-first PWA · Data stays in this browser</span><span className="disclaimer">Maintenance intervals are starter reminders only. Follow the official owner’s manual and qualified mechanic advice.</span></footer>
  </div>
}

function Stat({icon,label,value,sub}:{icon:React.ReactNode;label:string;value:string;sub:string}){return <div className="stat-card"><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>}
function Field({label,children,wide}:{label:string;children:React.ReactNode;wide?:boolean}){return <label className={`field ${wide?'wide':''}`}><span>{label}</span>{children}</label>}
function Empty({text}:{text:string}){return <div className="empty"><ClipboardList/><span>{text}</span></div>}
function TaskRow({task,onMark}:{task:Task;onMark:()=>void}){return <div className="task-row"><div className="task-check"><CircleCheck size={18}/></div><div className="task-info"><b>{task.name}</b><span>{task.lastDate?`Huling ginawa: ${task.lastDate} · ${fmt(task.lastOdo||0)} km`:'Wala pang naitalang huling service'}</span><small>{task.notes}</small></div><div className="task-interval">{task.intervalKm?`Every ${fmt(task.intervalKm)} km`:'Time-based'}<small>{task.intervalMonths} buwan</small></div><button className="mark-btn" onClick={onMark}>Mark done</button></div>}
