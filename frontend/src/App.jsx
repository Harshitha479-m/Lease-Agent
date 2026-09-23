import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowUpRight, Bell, Building2, CalendarDays, CheckCircle2, ChevronRight, CircleHelp, FileText, Filter, Loader2, MessageSquareText, Search, ShieldCheck, Sparkles, UploadCloud, X } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const EMPTY_STATS = { total_leases: 0, expiring_soon: 0, renewal_watch: 0, processed_this_month: 0 }

function formatDate(value) {
  if (!value) return 'Not found in document'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function formatMoney(value) {
  return value == null ? 'Not found in document' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function App() {
  const [stats, setStats] = useState(EMPTY_STATS)
  const [leases, setLeases] = useState([])
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [activeNav, setActiveNav] = useState('Overview')
  const fileInput = useRef(null)

  async function loadData() {
    setLoading(true)
    try {
      const [statsResponse, leasesResponse] = await Promise.all([
        fetch(`${API}/dashboard/stats`),
        fetch(`${API}/leases?search=${encodeURIComponent(query)}${status === 'expiring' ? '&status=expiring' : ''}`),
      ])
      if (!statsResponse.ok || !leasesResponse.ok) throw new Error('API unavailable')
      setStats(await statsResponse.json())
      const nextLeases = await leasesResponse.json()
      setLeases(nextLeases)
      setApiError(false)
      if (selected) {
        const freshSelected = nextLeases.find((lease) => lease.id === selected.id)
        if (freshSelected) setSelected(freshSelected)
      }
    } catch {
      setApiError(true)
      setStats(EMPTY_STATS)
      setLeases([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [query, status])

  async function openLease(lease) {
    try {
      const response = await fetch(`${API}/leases/${lease.id}`)
      setSelected(response.ok ? await response.json() : lease)
    } catch { setSelected(lease) }
  }

  async function uploadFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    const body = new FormData()
    body.append('file', file)
    try {
      const response = await fetch(`${API}/leases/upload`, { method: 'POST', body })
      if (!response.ok) throw new Error('Upload failed')
      const lease = await response.json()
      await loadData()
      setSelected(lease)
      setShowUpload(false)
    } catch { setApiError(true) } finally { setUploading(false); event.target.value = '' }
  }

  const nav = [
    { label: 'Overview', icon: Building2 },
    { label: 'Lease library', icon: FileText },
    { label: 'Ask documents', icon: MessageSquareText },
  ]

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span /></div><span>lease<span className="brand-accent">lens</span></span></div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace-switch"><div className="workspace-avatar">AC</div><div><strong>Acme portfolio</strong><small>12 documents</small></div><ChevronRight size={15} /></div>
      <nav>{nav.map(({ label, icon: Icon }) => <button className={activeNav === label ? 'nav-item active' : 'nav-item'} key={label} onClick={() => setActiveNav(label)}><Icon size={17} /><span>{label}</span>{label === 'Ask documents' && <span className="nav-new">AI</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="health"><span className="health-dot" /><div><strong>System healthy</strong><small>Last sync just now</small></div></div><button className="help-button"><CircleHelp size={17} /> Help & support</button><div className="user-card"><div className="user-avatar">JD</div><div><strong>Jordan Davis</strong><small>Portfolio manager</small></div><ChevronRight size={15} /></div></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div><div className="eyebrow">{activeNav === 'Overview' ? 'Portfolio intelligence' : activeNav}</div><h1>{activeNav === 'Overview' ? 'Good Morning, Harshi' : activeNav}</h1></div><div className="top-actions"><button className="icon-button" title="Notifications"><Bell size={18} /><span className="notification-dot" /></button><div className="top-date"><CalendarDays size={16} /> September 22, 2026</div><button className="button primary" onClick={() => setShowUpload(true)}><UploadCloud size={17} /> Add lease</button></div></header>
      {apiError && <div className="api-banner"><AlertTriangle size={16} /> API unavailable. Connect the backend to load your portfolio data.</div>}
      <section className="hero-strip"><div><p className="hero-kicker"><Sparkles size={14} /> LEASE INTELLIGENCE</p><h2>See the obligations<br />before they become urgent.</h2><p className="hero-copy">A single, grounded view of every date, dollar, and clause across your lease portfolio.</p></div><div className="hero-art"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-label"><span className="art-number">{stats.total_leases}</span><span>leases under watch</span></div></div></section>

      <section className="stats-grid"><StatCard label="Total leases" value={stats.total_leases} caption="in your portfolio" icon={FileText} accent="blue" /><StatCard label="Expiring soon" value={stats.expiring_soon} caption="next 90 days" icon={AlertTriangle} accent="coral" alert={stats.expiring_soon > 0} /><StatCard label="Renewal watch" value={stats.renewal_watch} caption="with renewal terms" icon={ArrowUpRight} accent="mint" /><StatCard label="Processed this month" value={stats.processed_this_month} caption="documents analyzed" icon={CheckCircle2} accent="gold" /></section>

      <div className="content-grid"><section className="panel leases-panel"><div className="panel-heading"><div><p className="section-kicker">PORTFOLIO</p><h3>Lease library</h3></div><button className="text-button" onClick={() => { setStatus('all'); setQuery('') }}>View all <ArrowUpRight size={15} /></button></div><div className="toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tenant, property, or file" /></div><button className={status === 'expiring' ? 'filter-button selected' : 'filter-button'} onClick={() => setStatus(status === 'expiring' ? 'all' : 'expiring')}><Filter size={15} /> Expiring soon</button></div><div className="table-wrap"><table><thead><tr><th>Document</th><th>Tenant / property</th><th>Lease term</th><th>Monthly rent</th><th>Status</th><th /></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="table-state"><Loader2 className="spin" size={20} /> Loading portfolio...</td></tr> : leases.length === 0 ? <tr><td colSpan="6" className="table-state empty-state"><div className="empty-icon"><FileText size={20} /></div><strong>No lease documents yet</strong><span>Upload a PDF to start extracting your portfolio.</span><button className="text-button" onClick={() => setShowUpload(true)}>Upload first lease <ArrowUpRight size={15} /></button></td></tr> : leases.map((lease) => <tr key={lease.id} onClick={() => openLease(lease)}><td><div className="file-cell"><div className="pdf-icon"><FileText size={16} /></div><div><strong>{lease.file_name}</strong><small>Added {formatDate(lease.created_at?.slice(0, 10))}</small></div></div></td><td><strong>{lease.tenant_name || 'Tenant not found'}</strong><small>{lease.property_name || 'Property not found'}</small></td><td>{formatDate(lease.lease_end)}</td><td>{formatMoney(lease.monthly_rent)}</td><td><span className="status-pill"><span /> Processed</span></td><td><ChevronRight size={16} className="row-arrow" /></td></tr>)}</tbody></table></div></section>
        <aside className="panel alerts-panel"><div className="panel-heading"><div><p className="section-kicker">ATTENTION NEEDED</p><h3>Upcoming dates</h3></div><button className="icon-button small" title="View all alerts"><ArrowUpRight size={16} /></button></div>{leases.filter((lease) => lease.lease_end).slice(0, 3).map((lease) => <div className="alert-row" key={lease.id}><div className="alert-date"><strong>{new Date(`${lease.lease_end}T00:00:00`).getDate()}</strong><span>{new Date(`${lease.lease_end}T00:00:00`).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span></div><div><strong>{lease.tenant_name || 'Tenant not found'}</strong><small>Lease expiration</small></div><ChevronRight size={15} /></div>)}{leases.filter((lease) => lease.lease_end).length === 0 && <div className="alerts-empty"><div className="calendar-icon"><CalendarDays size={19} /></div><strong>No upcoming dates</strong><span>Dates detected in your leases will appear here.</span></div>}<div className="alert-footer"><ShieldCheck size={16} /> Dates are extracted from source documents</div></aside></div>
    </main>
    {selected && <LeaseDrawer lease={selected} onClose={() => setSelected(null)} />}
    {showUpload && <UploadModal inputRef={fileInput} uploading={uploading} onClose={() => setShowUpload(false)} onUpload={uploadFile} />}
  </div>
}

function StatCard({ label, value, caption, icon: Icon, accent, alert }) { return <div className={`stat-card ${accent}`}><div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon size={17} /></div></div><div className="stat-value">{value}</div><div className={alert ? 'stat-caption warning' : 'stat-caption'}>{alert && <AlertTriangle size={13} />}{caption}</div></div> }

function UploadModal({ inputRef, uploading, onClose, onUpload }) { return <div className="modal-backdrop" onClick={onClose}><div className="upload-modal" onClick={(event) => event.stopPropagation()}><button className="close-button" onClick={onClose}><X size={18} /></button><div className="modal-icon"><UploadCloud size={23} /></div><p className="section-kicker">NEW DOCUMENT</p><h3>Upload a lease</h3><p className="modal-copy">Drop in a PDF and LeaseLens will extract dates, rent, renewal terms, and obligations. Scanned PDFs are supported when OCR is enabled.</p><label className="drop-zone"><input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={onUpload} disabled={uploading} />{uploading ? <><Loader2 className="spin" size={24} /><strong>Analyzing document...</strong><span>Extracting grounded lease fields</span></> : <><UploadCloud size={24} /><strong>Choose a PDF to upload</strong><span>PDF files up to 25 MB</span></>}</label><div className="modal-note"><ShieldCheck size={15} /> Missing information stays marked as not found.</div></div></div> }

function LeaseDrawer({ lease, onClose }) { return <div className="drawer-backdrop" onClick={onClose}><aside className="lease-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-header"><div className="pdf-icon large"><FileText size={18} /></div><div><p className="section-kicker">LEASE RECORD</p><h3>{lease.file_name}</h3></div><button className="close-button" onClick={onClose}><X size={18} /></button></div><div className="drawer-status"><CheckCircle2 size={15} /> Processed from source document</div><div className="detail-section"><p className="section-kicker">PARTIES & PROPERTY</p><Detail label="Tenant" value={lease.tenant_name} /><Detail label="Property" value={lease.property_name} /><Detail label="Address" value={lease.property_address} /></div><div className="detail-section"><p className="section-kicker">FINANCIALS & TERM</p><div className="detail-two"><Detail label="Monthly rent" value={formatMoney(lease.monthly_rent)} /><Detail label="Lease end" value={formatDate(lease.lease_end)} /></div><div className="detail-two"><Detail label="Lease start" value={formatDate(lease.lease_start)} /><Detail label="Notice period" value={lease.notice_period} /></div></div><div className="detail-section"><p className="section-kicker">KEY CLAUSES</p><Detail label="Renewal terms" value={lease.renewal_terms} /><Detail label="Escalation" value={lease.escalation} /><Detail label="Maintenance" value={lease.maintenance} /><Detail label="Compliance" value={lease.compliance} /></div><AskBox leaseId={lease.id} /></aside></div> }
function Detail({ label, value }) { return <div className="detail"><span>{label}</span><strong className={!value ? 'missing' : ''}>{value || 'Not found in document'}</strong></div> }
function AskBox({ leaseId }) { const [question, setQuestion] = useState(''); const [answer, setAnswer] = useState(null); const [busy, setBusy] = useState(false); async function ask() { if (!question.trim()) return; setBusy(true); try { const response = await fetch(`${API}/leases/${leaseId}/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) }); setAnswer(response.ok ? await response.json() : { answer: 'I could not reach the document Q&A service.', sources: [] }) } catch { setAnswer({ answer: 'I could not reach the document Q&A service.', sources: [] }) } finally { setBusy(false) } } return <div className="ask-box"><div className="ask-title"><Sparkles size={16} /><strong>Ask this lease</strong></div><div className="ask-input"><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && ask()} placeholder="e.g. When is the renewal notice due?" /><button onClick={ask} disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <ArrowUpRight size={16} />}</button></div>{answer && <div className="answer"><strong>Answer</strong><p>{answer.answer}</p><small>{answer.sources.length ? `Grounded in ${answer.sources.join(', ')}` : 'No source text found'}</small></div>}</div> }

export default App
