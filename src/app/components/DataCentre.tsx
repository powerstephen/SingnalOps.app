'use client'
import { useState, useRef } from 'react'
import { CheckCircle, Plus, ExternalLink, Upload, ChevronRight, FileText } from 'lucide-react'
import { useImport } from '../context/ImportContext'
import ImportModal from './ImportModal'

interface Integration {
  id: string
  name: string
  icon: string
  description: string
  datasets?: { label: string; records: number; fields: string[] }[]
  comingSoon?: boolean
}

interface Category {
  id: string
  label: string
  description: string
  csvFields: string[]
  csvLabel: string
  csvRecords: number
  integrations: Integration[]
}

const categories: Category[] = [
  {
    id: 'crm', label: 'CRM',
    description: 'Connect your CRM to import contacts, deals, and pipeline history.',
    csvLabel: 'CRM Contacts', csvRecords: 200,
    csvFields: ['company', 'contact', 'title', 'industry', 'stage', 'deal_value', 'close_date', 'status', 'last_contact'],
    integrations: [
      { id:'hubspot',    name:'HubSpot',    icon:'🟠', description:'Sync contacts, deals, and pipeline data automatically.', datasets:[{label:'CRM Contacts',records:200,fields:['company','contact','deal_stage','deal_value','last_activity','status']}] },
      { id:'salesforce', name:'Salesforce', icon:'🔵', description:'Connect your Salesforce org to sync leads, opportunities, and custom objects.', comingSoon:true },
      { id:'attio',      name:'Attio',      icon:'🟣', description:'Manage relationships and track deal flow in real-time.', comingSoon:true },
      { id:'pipedrive',  name:'Pipedrive',  icon:'🟢', description:'Pull deal stages, contact activity, and pipeline data.', comingSoon:true },
    ]
  },
  {
    id: 'billing', label: 'Billing',
    description: 'Connect your billing system to analyse real LTV, MRR, churn, and expansion.',
    csvLabel: 'Billing Data', csvRecords: 20,
    csvFields: ['company', 'mrr', 'ltv', 'plan', 'seats', 'arr', 'churn_date', 'expansion_revenue', 'renewal_date'],
    integrations: [
      { id:'stripe',    name:'Stripe',    icon:'💳', description:'Connect Stripe to analyse real LTV, MRR, churn, and expansion revenue.', datasets:[{label:'Billing Data',records:20,fields:['customer','mrr','ltv','plan','churn_date','expansion_revenue']}] },
      { id:'chargebee', name:'Chargebee', icon:'📊', description:'Import subscription billing data to power your best-customer ICP profile.', datasets:[{label:'Subscription Data',records:20,fields:['company','mrr','arr','plan','seats','renewal_date']}] },
      { id:'paddle',    name:'Paddle',    icon:'🏓', description:'Sync Paddle billing events and revenue data for LTV analysis.', comingSoon:true },
    ]
  },
  {
    id: 'cs', label: 'CS',
    description: 'Connect your CS platform to surface which customers are truly profitable vs high-maintenance.',
    csvLabel: 'CS History', csvRecords: 20,
    csvFields: ['company', 'total_tickets', 'ticket_type', 'sentiment', 'time_to_value_days', 'health_trend', 'risk_flags', 'csm'],
    integrations: [
      { id:'intercom',  name:'Intercom',  icon:'💬', description:'Pull support ticket volume, type, and sentiment to identify high-maintenance accounts.', datasets:[{label:'CS Tickets',records:20,fields:['company','tickets','ticket_type','sentiment','response_time','health_trend']}] },
      { id:'zendesk',   name:'Zendesk',   icon:'🎫', description:'Import CS ticket history to surface which customers are truly profitable.', datasets:[{label:'Support History',records:20,fields:['company','open_tickets','sentiment','risk_flags','csm']}] },
      { id:'freshdesk', name:'Freshdesk', icon:'🌿', description:'Connect Freshdesk to analyse support cost per customer.', comingSoon:true },
    ]
  },
  {
    id: 'outreach', label: 'Outreach',
    description: 'Push scored accounts and generated emails directly to your outreach tools.',
    csvLabel: 'Outreach Contacts', csvRecords: 0,
    csvFields: [],
    integrations: [
      { id:'outreach',  name:'Outreach',  icon:'📤', description:'Push scored accounts and generated emails directly to Outreach sequences.', comingSoon:true },
      { id:'salesloft', name:'Salesloft', icon:'📨', description:'Send high-scoring accounts straight to Salesloft for immediate sequencing.', comingSoon:true },
      { id:'apollo',    name:'Apollo',    icon:'🚀', description:'Export lookalike prospects directly to Apollo outreach campaigns.', comingSoon:true },
    ]
  },
  {
    id: 'signals', label: 'Signals',
    description: 'Layer in live buying signals to identify in-market accounts.',
    csvLabel: 'Signal Data', csvRecords: 0,
    csvFields: [],
    integrations: [
      { id:'linkedin', name:'LinkedIn', icon:'🔗', description:'Monitor job changes, hiring signals, and company updates from LinkedIn.', comingSoon:true },
      { id:'harmonic', name:'Harmonic', icon:'📡', description:'Pull funding, headcount, and hiring signal data via Harmonic API.', comingSoon:true },
      { id:'bombora',  name:'Bombora',  icon:'🎯', description:'Layer intent signal data from Bombora to identify in-market accounts.', comingSoon:true },
    ]
  },
]

export default function DataCentre() {
  const { sources, removeSource, addSource } = useImport()
  const [activeCategory, setActiveCategory] = useState('crm')
  const [importing, setImporting] = useState<Integration | null>(null)
  const [uploadingCsv, setUploadingCsv] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const category = categories.find(c => c.id === activeCategory)!

  const getConnectedId = (catId: string) => {
    const cat = categories.find(c => c.id === catId)
    if (!cat) return null
    // Check native integrations
    for (const ig of cat.integrations) {
      if (ig.datasets?.some(ds => sources.some(s => s.id === `${ig.id}-${ds.label.toLowerCase().replace(/\s/g, '-')}`))) return ig.id
    }
    // Check CSV upload for this category
    if (sources.some(s => s.id === `csv-${catId}`)) return `csv-${catId}`
    return null
  }

  const connectedInCategory = getConnectedId(activeCategory)
  const totalConnected = categories.filter(c => getConnectedId(c.id)).length

  function handleConnect(ig: Integration) {
    if (!ig.datasets) return
    setImporting(ig)
  }

  function handleDisconnect(ig: Integration) {
    ig.datasets?.forEach(ds => removeSource(`${ig.id}-${ds.label.toLowerCase().replace(/\s/g, '-')}`))
  }

  function handleCsvDisconnect() {
    removeSource(`csv-${activeCategory}`)
  }

  function handleCsvUpload(file: File) {
    if (!file || !category.csvFields.length) return
    setUploadingCsv(true)
    // Simulate import animation briefly
    setTimeout(() => {
      addSource({
        id: `csv-${activeCategory}`,
        name: `CSV — ${category.csvLabel}`,
        type: activeCategory as any,
        records: category.csvRecords || Math.floor(Math.random() * 150) + 50,
        label: category.csvLabel,
        connectedAt: new Date().toISOString(),
      })
      setUploadingCsv(false)
    }, 1800)
  }

  const csvConnected = connectedInCategory === `csv-${activeCategory}`

  return (
    <div>
      {importing && importing.datasets && (
        <ImportModal
          source={{ id: importing.id, name: importing.name, icon: importing.icon, datasets: importing.datasets }}
          onClose={() => setImporting(null)}
          onComplete={() => setImporting(null)}
        />
      )}

      {/* Header */}
      <div className="mb-5">
        <p className="text-slate-400 text-sm">
          Connect one source per category to power your ICP profile, scoring, and signals.{' '}
          {totalConnected > 0
            ? <span className="text-teal-400 font-medium">{totalConnected} of {categories.length} categories connected.</span>
            : <span className="text-slate-500">No sources connected yet.</span>
          }
        </p>
      </div>

      {/* Connected summary */}
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
            {categories.map(cat => {
              const connected = !!getConnectedId(cat.id)
              const active = activeCategory === cat.id
              return (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    active ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <span>{cat.label}</span>
                  {connected
                    ? <CheckCircle size={14} className="text-teal-500 flex-shrink-0" />
                    : <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
                  }
                </button>
              )
            })}
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 mb-4">{category.description}</p>

          {/* Native integrations */}
          <div className="space-y-3 mb-5">
            {category.integrations.map(ig => {
              const isConnected = connectedInCategory === ig.id
              const otherConnected = connectedInCategory && connectedInCategory !== ig.id && !csvConnected

              return (
                <div key={ig.id}
                  className={`bg-white rounded-xl p-4 flex items-center gap-4 border transition-all ${
                    isConnected ? 'border-teal-500 shadow-sm' :
                    ig.comingSoon || otherConnected ? 'border-gray-200 opacity-55' :
                    csvConnected ? 'border-gray-200 opacity-55' :
                    'border-gray-200 hover:border-gray-300 shadow-sm'
                  }`}
                >
                  <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border border-gray-100">
                    {ig.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{ig.name}</p>
                      {ig.comingSoon && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Coming soon</span>}
                      {isConnected && <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium border border-teal-200">✓ Connected</span>}
                    </div>
                    <p className="text-xs text-gray-500">{ig.description}</p>
                    {isConnected && ig.datasets && (
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {ig.datasets.map(ds => (
                          <span key={ds.label} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-100">
                            {ds.label} · {ds.records} records
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {ig.comingSoon ? <span className="text-xs text-gray-300">—</span>
                    : isConnected ? (
                      <div className="flex items-center gap-2">
                        <button className="text-gray-400 hover:text-gray-600 p-1.5 rounded"><ExternalLink size={13} /></button>
                        <button onClick={() => handleDisconnect(ig)} className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition-colors">Disconnect</button>
                      </div>
                    ) : (otherConnected || csvConnected) ? (
                      <span className="text-xs text-gray-300 italic">Disconnect active first</span>
                    ) : (
                      <button onClick={() => handleConnect(ig)} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 py-2 transition-colors">
                        <Plus size={13} /> Connect
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* CSV / Google Sheets divider */}
          {category.csvFields.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-xs text-slate-500 font-medium">or upload a file instead</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>

              {csvConnected ? (
                <div className="bg-white rounded-xl p-4 flex items-center gap-4 border border-teal-500 shadow-sm">
                  <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border border-teal-100">
                    📄
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900 text-sm">CSV — {category.csvLabel}</p>
                      <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium border border-teal-200">✓ Connected</span>
                    </div>
                    <p className="text-xs text-gray-500">Fields: {category.csvFields.slice(0,5).join(', ')}{category.csvFields.length > 5 ? '...' : ''}</p>
                  </div>
                  <button onClick={handleCsvDisconnect} className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className={`bg-white rounded-xl p-4 border border-dashed border-gray-300 transition-all ${connectedInCategory ? 'opacity-50' : 'hover:border-teal-400'}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border border-gray-100">
                      📄
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm mb-0.5">Upload CSV or Google Sheet export</p>
                      <p className="text-xs text-gray-500 mb-2">
                        Export your {category.label.toLowerCase()} data as a CSV and upload here. SignalOps will match it to the right fields automatically.
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {category.csvFields.map(f => (
                          <span key={f} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{f}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {connectedInCategory ? (
                        <span className="text-xs text-gray-300 italic">Disconnect active first</span>
                      ) : uploadingCsv ? (
                        <div className="flex items-center gap-2 text-xs text-teal-600">
                          <div className="w-3 h-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                          Importing...
                        </div>
                      ) : (
                        <button
                          onClick={() => fileRef.current?.click()}
                          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-600 rounded-lg px-4 py-2 transition-colors"
                        >
                          <Upload size={13} /> Upload CSV
                        </button>
                      )}
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleCsvUpload(e.target.files[0]) }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
