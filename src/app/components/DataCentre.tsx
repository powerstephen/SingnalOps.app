'use client'
import { useState, useRef } from 'react'
import { CheckCircle, Plus, ExternalLink, Upload, ChevronRight } from 'lucide-react'
import { useImport } from '../context/ImportContext'
import ImportModal from './ImportModal'

interface Dataset { label: string; records: number; fields: string[] }
interface Integration {
  id: string; name: string; icon: string; category: string
  description: string; comingSoon?: boolean; datasets?: Dataset[]
}

const categories = [
  { id:'crm',          label:'CRM',          description:'Connect your CRM to import contacts, deals, and pipeline history.', csvLabel:'CRM Contacts', csvRecords:200, csvFields:['company','contact','title','industry','stage','deal_value','close_date','status','last_contact'] },
  { id:'billing',      label:'Billing',       description:'Connect your billing system to analyse LTV, MRR, churn, and expansion.', csvLabel:'Billing Data', csvRecords:20, csvFields:['company','mrr','ltv','plan','seats','arr','churn_date','expansion_revenue','renewal_date'] },
  { id:'cs',           label:'CS',            description:'Connect your CS platform to surface which customers are truly profitable.', csvLabel:'CS History', csvRecords:20, csvFields:['company','total_tickets','ticket_type','sentiment','time_to_value_days','health_trend','risk_flags','csm'] },
  { id:'outreach',     label:'Outreach',      description:'Push scored accounts and generated emails to your outreach tools.', csvLabel:'', csvRecords:0, csvFields:[] },
  { id:'signals',      label:'Signals',       description:'Layer in live buying signals to identify in-market accounts.', csvLabel:'', csvRecords:0, csvFields:[] },
]

const integrations: Integration[] = [
  { id:'hubspot',    name:'HubSpot',    category:'crm',      icon:'🟠', description:'Sync contacts, deals, and pipeline data automatically.', datasets:[{label:'CRM Contacts',records:200,fields:['company','contact','deal_stage','deal_value','last_activity','status']}] },
  { id:'salesforce', name:'Salesforce', category:'crm',      icon:'🔵', description:'Connect your Salesforce org to sync leads, opportunities, and custom objects.', comingSoon:true },
  { id:'attio',      name:'Attio',      category:'crm',      icon:'🟣', description:'Powerful CRM integration to manage relationships and track deal flow.', comingSoon:true },
  { id:'pipedrive',  name:'Pipedrive',  category:'crm',      icon:'🟢', description:'Pull deal stages, contact activity, and pipeline data from Pipedrive.', comingSoon:true },
  { id:'stripe',     name:'Stripe',     category:'billing',  icon:'💳', description:'Connect Stripe to analyse real LTV, MRR, churn, and expansion revenue.', datasets:[{label:'Billing Data',records:20,fields:['customer','mrr','ltv','plan','churn_date','expansion_revenue']}] },
  { id:'chargebee',  name:'Chargebee',  category:'billing',  icon:'📊', description:'Import subscription billing data to power your best-customer ICP profile.', datasets:[{label:'Subscription Data',records:20,fields:['company','mrr','arr','plan','seats','renewal_date']}] },
  { id:'paddle',     name:'Paddle',     category:'billing',  icon:'🏓', description:'Sync Paddle billing events and revenue data for LTV analysis.', comingSoon:true },
  { id:'intercom',   name:'Intercom',   category:'cs',       icon:'💬', description:'Pull support ticket volume, type, and sentiment to identify high-maintenance accounts.', datasets:[{label:'CS Tickets',records:20,fields:['company','tickets','ticket_type','sentiment','response_time','health_trend']}] },
  { id:'zendesk',    name:'Zendesk',    category:'cs',       icon:'🎫', description:'Import CS ticket history to surface which customers are truly profitable.', datasets:[{label:'Support History',records:20,fields:['company','open_tickets','sentiment','risk_flags','csm']}] },
  { id:'freshdesk',  name:'Freshdesk',  category:'cs',       icon:'🌿', description:'Connect Freshdesk to analyse support cost per customer.', comingSoon:true },
  { id:'outreach',   name:'Outreach',   category:'outreach', icon:'📤', description:'Push scored accounts and emails directly to Outreach sequences.', comingSoon:true },
  { id:'salesloft',  name:'Salesloft',  category:'outreach', icon:'📨', description:'Send high-scoring accounts straight to Salesloft for sequencing.', comingSoon:true },
  { id:'apollo',     name:'Apollo',     category:'outreach', icon:'🚀', description:'Export lookalike prospects to Apollo outreach campaigns.', comingSoon:true },
  { id:'linkedin',   name:'LinkedIn',   category:'signals',  icon:'🔗', description:'Monitor job changes, hiring signals, and company updates.', comingSoon:true },
  { id:'harmonic',   name:'Harmonic',   category:'signals',  icon:'📡', description:'Pull funding, headcount, and hiring signal data via Harmonic API.', comingSoon:true },
  { id:'bombora',    name:'Bombora',    category:'signals',  icon:'🎯', description:'Layer intent signal data to identify in-market accounts.', comingSoon:true },
]

const catColors: Record<string, string> = {
  crm:'bg-blue-100 text-blue-600', billing:'bg-teal-100 text-teal-700',
  cs:'bg-purple-100 text-purple-600', outreach:'bg-amber-100 text-amber-700', signals:'bg-red-100 text-red-600',
}
const catLabels: Record<string, string> = { crm:'CRM', billing:'Billing', cs:'CS', outreach:'Outreach', signals:'Signals' }

export default function DataCentre() {
  const { sources, removeSource, addSource } = useImport()
  const [activeCat, setActiveCat] = useState('crm')
  const [importing, setImporting] = useState<Integration | null>(null)
  const [uploadingCsv, setUploadingCsv] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const cat = categories.find(c => c.id === activeCat)!
  const visibleIntegrations = integrations.filter(i => i.category === activeCat)

  const isConn = (id: string) =>
    integrations.find(i => i.id === id)?.datasets?.some(ds =>
      sources.some(s => s.id === `${id}-${ds.label.toLowerCase().replace(/\s/g, '-')}`)
    ) ?? false

  const csvConnected = sources.some(s => s.id === `csv-${activeCat}`)
  const connectedInCat = visibleIntegrations.some(i => isConn(i.id)) || csvConnected
  const totalConnected = categories.filter(c =>
    integrations.filter(i => i.category === c.id).some(i => isConn(i.id)) ||
    sources.some(s => s.id === `csv-${c.id}`)
  ).length

  function handleConnect(ig: Integration) {
    if (!ig.datasets) return
    setImporting(ig)
  }
  function handleDisconnect(ig: Integration) {
    ig.datasets?.forEach(ds => removeSource(`${ig.id}-${ds.label.toLowerCase().replace(/\s/g, '-')}`))
  }
  function handleCsvUpload(file: File) {
    if (!file || !cat.csvFields.length) return
    setUploadingCsv(true)
    setTimeout(() => {
      addSource({ id:`csv-${activeCat}`, name:`CSV — ${cat.csvLabel}`, type:activeCat as any, records:cat.csvRecords, label:cat.csvLabel, connectedAt:new Date().toISOString() })
      setUploadingCsv(false)
    }, 1800)
  }

  return (
    <div>
      {importing && importing.datasets && (
        <ImportModal source={{ id:importing.id, name:importing.name, icon:importing.icon, datasets:importing.datasets }} onClose={() => setImporting(null)} onComplete={() => setImporting(null)} />
      )}

      <div className="mb-5">
        <p className="text-slate-400 text-sm">
          Connect one source per category.{' '}
          {totalConnected > 0
            ? <span className="text-teal-400 font-medium">{totalConnected} of {categories.length} categories connected.</span>
            : <span className="text-slate-500">No sources connected yet.</span>}
        </p>
      </div>

      {sources.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {sources.map(s => (
            <div key={s.id} className="bg-teal-500/5 border border-teal-500/20 rounded-lg p-3">
              <p className="text-xs text-teal-400 font-semibold mb-0.5 truncate">{s.name}</p>
              <p className="text-xl font-bold text-white">{s.records.toLocaleString()}</p>
              <p className="text-xs text-slate-500">records ingested</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-6">
        {/* Left nav */}
        <div className="w-40 flex-shrink-0">
          <div className="space-y-1">
            {categories.map(c => {
              const connected = integrations.filter(i => i.category === c.id).some(i => isConn(i.id)) || sources.some(s => s.id === `csv-${c.id}`)
              const active = activeCat === c.id
              return (
                <button key={c.id} onClick={() => setActiveCat(c.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${active ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'}`}>
                  <span>{c.label}</span>
                  {connected ? <CheckCircle size={14} className="text-teal-500 flex-shrink-0" /> : <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: white cards grid */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 mb-4">{cat.description}</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            {visibleIntegrations.map(ig => {
              const conn = isConn(ig.id)
              const otherConn = connectedInCat && !conn && !csvConnected
              return (
                <div key={ig.id}
                  className={`bg-white rounded-2xl p-5 flex flex-col shadow-sm transition-all ${
                    conn ? 'ring-2 ring-teal-500' :
                    ig.comingSoon || otherConn || csvConnected ? 'opacity-55' : 'hover:shadow-md'
                  }`}>
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl border border-gray-100">
                      {ig.icon}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${catColors[ig.category] ?? 'bg-gray-100 text-gray-500'}`}>
                      {catLabels[ig.category]}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-1">{ig.name}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed flex-1 mb-4">{ig.description}</p>
                  {conn && ig.datasets && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {ig.datasets.map(ds => (
                        <span key={ds.label} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-100">{ds.label} · {ds.records}</span>
                      ))}
                    </div>
                  )}
                  {ig.comingSoon ? (
                    <div className="text-xs text-gray-400 border border-gray-200 rounded-xl px-3 py-2.5 text-center font-medium">Coming soon</div>
                  ) : conn ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDisconnect(ig)} className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-teal-600 border border-teal-300 bg-teal-50 rounded-xl px-3 py-2.5 hover:bg-red-50 hover:text-red-500 hover:border-red-300 transition-colors">
                        <CheckCircle size={14} /> Connected
                      </button>
                      <button className="border border-gray-200 rounded-xl p-2.5 text-gray-400 hover:text-gray-600"><ExternalLink size={13} /></button>
                    </div>
                  ) : (otherConn || csvConnected) ? (
                    <div className="text-xs text-gray-400 border border-gray-200 rounded-xl px-3 py-2.5 text-center">Disconnect active first</div>
                  ) : (
                    <button onClick={() => handleConnect(ig)} className="flex items-center justify-center gap-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl px-3 py-2.5 transition-colors w-full">
                      <Plus size={14} /> Connect
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* CSV upload option */}
          {cat.csvFields.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-xs text-slate-500 font-medium">or upload a file instead</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
              {csvConnected ? (
                <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm ring-2 ring-teal-500">
                  <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center text-xl border border-teal-100">📄</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-gray-900 text-sm">CSV — {cat.csvLabel}</p>
                      <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium border border-teal-100">✓ Connected</span>
                    </div>
                    <p className="text-xs text-gray-500">{cat.csvRecords} records · {cat.csvFields.slice(0,4).join(', ')}...</p>
                  </div>
                  <button onClick={() => removeSource(`csv-${activeCat}`)} className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition-colors">Disconnect</button>
                </div>
              ) : (
                <div className={`bg-white rounded-2xl p-4 border-2 border-dashed border-gray-200 shadow-sm transition-all ${connectedInCat ? 'opacity-50' : 'hover:border-teal-400 cursor-pointer'}`} onClick={() => !connectedInCat && fileRef.current?.click()}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center text-xl border border-gray-100">📄</div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm mb-0.5">Upload CSV or Google Sheet export</p>
                      <p className="text-xs text-gray-500">Expected fields: {cat.csvFields.slice(0,5).join(', ')}{cat.csvFields.length > 5 ? '...' : ''}</p>
                    </div>
                    {connectedInCat ? (
                      <span className="text-xs text-gray-300 italic flex-shrink-0">Disconnect active first</span>
                    ) : uploadingCsv ? (
                      <div className="flex items-center gap-2 text-xs text-teal-600 flex-shrink-0">
                        <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /> Importing...
                      </div>
                    ) : (
                      <button className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-2 flex-shrink-0">
                        <Upload size={12} /> Upload
                      </button>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={e => { if (e.target.files?.[0]) handleCsvUpload(e.target.files[0]) }} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
