import { useEffect, useMemo, useState } from 'react'
import {
  ClientSubscriptionManagerDto,
  getClientSubscriptionManagers,
  getInstalledHashMap,
  getOverview,
  getOwnershipMap,
  getPreviousHashMap,
  getSubscription,
  getTopicSubscriptions,
  getTopics,
  loadDump,
  TopicDto,
} from './api/dumpAnalyzerApi'
import { clearToken, getLastDumpPath, getToken, setLastDumpPath, setToken } from './lib/session'

type OverviewModel = Record<string, unknown> | null

function App() {
  const [token, setTokenState] = useState<string | null>(() => getToken())
  const [dumpPath, setDumpPath] = useState<string>(() => getLastDumpPath())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tab, setTab] = useState<'overview' | 'core' | 'pubsub'>('overview')
  const [showRawOverview, setShowRawOverview] = useState(false)
  const [pubSubView, setPubSubView] = useState<'topics' | 'clients' | 'lookup'>('topics')

  const [overview, setOverviewState] = useState<OverviewModel>(null)
  const [ownershipMap, setOwnershipMapState] = useState<unknown>(null)
  const [previousHashMap, setPreviousHashMapState] = useState<unknown>(null)
  const [installedHashMap, setInstalledHashMapState] = useState<unknown>(null)

  const [topics, setTopicsState] = useState<TopicDto[]>([])
  const [selectedTopic, setSelectedTopic] = useState<TopicDto | null>(null)
  const [topicSubscriptions, setTopicSubscriptionsState] = useState<unknown>(null)
  const [subscriptionId, setSubscriptionId] = useState('')
  const [subscriptionDetail, setSubscriptionDetailState] = useState<unknown>(null)
  const [clientSubscriptionManagers, setClientSubscriptionManagersState] = useState<ClientSubscriptionManagerDto[]>([])

  const tokenShort = useMemo(() => (token ? `${token.slice(0, 8)}…${token.slice(-6)}` : ''), [token])

  async function handleLoadDump() {
    setError(null)
    setBusy(true)
    try {
      setLastDumpPath(dumpPath)
      const res = await loadDump(dumpPath)
      setToken(res.token)
      setTokenState(res.token)
      setTab('overview')
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load dump')
    } finally {
      setBusy(false)
    }
  }

  function handleLogout() {
    clearToken()
    setTokenState(null)
    setError(null)
    setOverviewState(null)
    setOwnershipMapState(null)
    setPreviousHashMapState(null)
    setInstalledHashMapState(null)
    setTopicsState([])
    setSelectedTopic(null)
    setTopicSubscriptionsState(null)
    setSubscriptionId('')
    setSubscriptionDetailState(null)
    setClientSubscriptionManagersState([])
  }

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      setError(null)
      try {
        const res = await getOverview(token)
        if (!cancelled) setOverviewState(res)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load overview')
        if (e?.status === 401) handleLogout()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  async function refreshCore() {
    if (!token) return
    setError(null)
    setBusy(true)
    try {
      const [own, prev, inst] = await Promise.all([
        getOwnershipMap(token),
        getPreviousHashMap(token),
        getInstalledHashMap(token),
      ])
      setOwnershipMapState(own)
      setPreviousHashMapState(prev)
      setInstalledHashMapState(inst)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load core data')
      if (e?.status === 401) handleLogout()
    } finally {
      setBusy(false)
    }
  }

  async function refreshTopics() {
    if (!token) return
    setError(null)
    setBusy(true)
    try {
      const list = await getTopics(token)
      setTopicsState(list)
      if (list.length) setSelectedTopic(list[0])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load topics')
      if (e?.status === 401) handleLogout()
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!token) return
    if (tab === 'core' && ownershipMap === null && previousHashMap === null && installedHashMap === null) {
      refreshCore()
    }
    if (tab === 'pubsub' && topics.length === 0) {
      refreshTopics()
    }
    if (tab === 'pubsub' && clientSubscriptionManagers.length === 0) {
      refreshClientSubscriptionManagers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token])

  useEffect(() => {
    if (!token || !selectedTopic) return
    let cancelled = false
    ;(async () => {
      setError(null)
      setTopicSubscriptionsState(null)
      try {
        const res = await getTopicSubscriptions(token, selectedTopic.TopicName)
        if (!cancelled) setTopicSubscriptionsState(res)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load topic subscriptions')
        if (e?.status === 401) handleLogout()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, selectedTopic])

  async function handleFetchSubscription() {
    if (!token) return
    setError(null)
    setBusy(true)
    try {
      const res = await getSubscription(token, subscriptionId)
      setSubscriptionDetailState(res)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load subscription')
      if (e?.status === 401) handleLogout()
    } finally {
      setBusy(false)
    }
  }

  async function refreshClientSubscriptionManagers() {
    if (!token) return
    setError(null)
    setBusy(true)
    try {
      const res = await getClientSubscriptionManagers(token)
      setClientSubscriptionManagersState(res)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load client subscription managers')
      if (e?.status === 401) handleLogout()
    } finally {
      setBusy(false)
    }
  }

  function JsonBlock({ value }: { value: unknown }) {
    return <pre>{value === null ? 'null' : JSON.stringify(value, null, 2)}</pre>
  }

  function readOverviewValue(obj: OverviewModel, key: string): string {
    if (!obj) return 'N/A'
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1)
    const value = obj[key] ?? obj[camelKey]
    return value === undefined || value === null || value === '' ? 'N/A' : String(value)
  }

  function OverviewStat({ label, value }: { label: string; value: string }) {
    return (
      <div className="panel" style={{ padding: 12 }}>
        <div className="muted2" style={{ fontSize: 12, marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
      </div>
    )
  }

  const Icons = {
    server: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>,
    topology: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>,
    database: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>,
    activity: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
    cpu: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>,
    clock: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
    chevron: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>,
    code: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>,
    view: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
    queue: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
    transfer: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>,
    size: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line></svg>,
    network: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"></rect><rect x="2" y="16" width="6" height="6" rx="1"></rect><rect x="9" y="2" width="6" height="6" rx="1"></rect><path d="M5 16v-3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"></path><line x1="12" y1="8" x2="12" y2="12"></line></svg>
  }

  function EnterpriseStatistic({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode, color: string }) {
    return (
      <div className="metric-card">
        <div className="metric-header">
          <div className={`metric-icon ${color}`}>
            {icon}
          </div>
          <div className="metric-label">{label}</div>
        </div>
        <div className="metric-value">{value}</div>
      </div>
    )
  }

  function formatDisplayDate(value: string | null | undefined): string {
    if (!value) return 'N/A'
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return String(value)

    const day = String(dt.getDate()).padStart(2, '0')
    const month = dt.toLocaleString('en-US', { month: 'short' })
    const year = String(dt.getFullYear()).slice(-2)

    let hours = dt.getHours()
    const minutes = String(dt.getMinutes()).padStart(2, '0')
    const seconds = String(dt.getSeconds()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    if (hours === 0) hours = 12

    return `${day}-${month}-${year} ${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`
  }

  function getServersList(obj: OverviewModel): string[] {
    if (!obj) return []
    const val = obj['Servers'] ?? obj['servers']
    if (Array.isArray(val)) {
      return val.map((x) => String(x))
    }
    return []
  }

  return (
    <div className="appShell">
      <div className="container">
        <div className="topBar">
          <div className="brand">
            <div className="brandTitle">Dump Analyzer</div>
            <div className="brandSub">NCache process dump (ClrMD)</div>
          </div>
          {token ? (
            <div className="fieldRow">
              <div className="pill">
                <span className="muted2">token</span>
                <span>{tokenShort}</span>
              </div>
              <button className="danger" onClick={handleLogout}>
                Unload / Clear token
              </button>
            </div>
          ) : (
            <div className="pill">Backend: proxied to http://localhost:5168</div>
          )}
        </div>

        {error ? (
          <div className="errorBox" style={{ marginBottom: 14 }}>
            {error}
          </div>
        ) : null}

        {!token ? (
          <div className="panel">
            <div className="sectionTitle">Load dump</div>
            <div className="muted" style={{ marginBottom: 10 }}>
              Enter the full path to the dump file on the machine running the API.
            </div>
            <div className="fieldRow">
              <input
                type="text"
                placeholder="e.g. C:\\dumps\\ncache.dmp"
                value={dumpPath}
                onChange={(e) => setDumpPath(e.target.value)}
              />
              <button className="primary" disabled={busy || dumpPath.trim().length === 0} onClick={handleLoadDump}>
                {busy ? 'Loading…' : 'Load'}
              </button>
            </div>
            <div className="muted2" style={{ marginTop: 10 }}>
              Calls POST /api/dump/load and stores the returned token. All subsequent requests send it via the token
              header.
            </div>
          </div>
        ) : (
          <>
            <div className="tabs">
              <div className={`tab ${tab === 'overview' ? 'tabActive' : ''}`} onClick={() => setTab('overview')}>
                Overview
              </div>
              <div className={`tab ${tab === 'core' ? 'tabActive' : ''}`} onClick={() => setTab('core')}>
                Core
              </div>
              <div className={`tab ${tab === 'pubsub' ? 'tabActive' : ''}`} onClick={() => setTab('pubsub')}>
                Pub/Sub
              </div>
            </div>

            {tab === 'overview' ? (
              <div className="enterprise-panel">
                <div className="breadcrumb">
                  <div className="breadcrumb-item">Dump Analyzer</div>
                  <div className="breadcrumb-separator">{Icons.chevron}</div>
                  <div className="breadcrumb-item" title={dumpPath}>
                    {dumpPath ? dumpPath.split(/[\/\\]/).pop() || 'Dump' : 'Dump'}
                  </div>
                  <div className="breadcrumb-separator">{Icons.chevron}</div>
                  <div className="breadcrumb-item active">Overview</div>
                </div>

                <div className="overview-header">
                  <div className="overview-title-group">
                    <h2 className="overview-title">{readOverviewValue(overview, 'CacheName')}</h2>
                    <div className="overview-subtitle">
                      Process ID: {readOverviewValue(overview, 'ProcessId')} &bull; Status: Active
                    </div>
                  </div>
                  <div className="status-badge">
                    <div className="status-badge-dot"></div>
                    Analyzed
                  </div>
                </div>

                <div className="metrics-grid">
                  <EnterpriseStatistic 
                    label="Topology" 
                    value={readOverviewValue(overview, 'CacheTopology')} 
                    icon={Icons.topology}
                    color="purple"
                  />
                  <EnterpriseStatistic 
                    label="Servers" 
                    value={readOverviewValue(overview, 'ServersCount')} 
                    icon={Icons.server}
                    color="blue"
                  />
                  <EnterpriseStatistic 
                    label="Cache Count" 
                    value={readOverviewValue(overview, 'CacheCount')} 
                    icon={Icons.database}
                    color="orange"
                  />
                  <EnterpriseStatistic 
                    label="Current View ID" 
                    value={readOverviewValue(overview, 'CurrentViewId')} 
                    icon={Icons.view}
                    color="green"
                  />
                  {/*<EnterpriseStatistic */}
                  {/*  label="Installing View ID" */}
                  {/*  value={readOverviewValue(overview, 'InstallingViewId')} */}
                  {/*  icon={Icons.view}*/}
                  {/*  color="blue"*/}
                  {/*/>*/}
                  {/*<EnterpriseStatistic */}
                  {/*  label="State Transfer" */}
                  {/*  value={readOverviewValue(overview, 'IsStateTransfer')} */}
                  {/*  icon={Icons.transfer}*/}
                  {/*  color="purple"*/}
                  {/*/>*/}
                  {/*<EnterpriseStatistic */}
                  {/*  label="Cache Size" */}
                  {/*  value={readOverviewValue(overview, 'CacheSize')} */}
                  {/*  icon={Icons.size}*/}
                  {/*  color="orange"*/}
                  {/*/>*/}
                  {/*<EnterpriseStatistic */}
                  {/*  label="Rep/Mirror Queue" */}
                  {/*  value={readOverviewValue(overview, 'ReplicationQueueMirrorQueue')} */}
                  {/*  icon={Icons.queue}*/}
                  {/*  color="blue"*/}
                  {/*/>*/}
                  <EnterpriseStatistic 
                    label="Install Type" 
                    value={readOverviewValue(overview, 'InstallType')} 
                    icon={Icons.cpu}
                    color="green"
                  />
                  {/*<EnterpriseStatistic */}
                  {/*  label="Message Manager" */}
                  {/*  value={readOverviewValue(overview, 'MessageManagerLastTime') === 'N/A' || !overview?.MessageManagerLastTime ? 'Unknown' : 'Active'} */}
                  {/*  icon={Icons.activity}*/}
                  {/*  color="blue"*/}
                  {/*/>*/}
                  <EnterpriseStatistic 
                    label="Last Event/Messages Assignment Time" 
                    value={formatDisplayDate(readOverviewValue(overview, 'MessageManagerLastTime'))} 
                    icon={Icons.clock}
                    color="purple"
                  />
                </div>

                <div className="section-divider">
                  <span className="section-divider-text">IP Addresses</span>
                </div>

                <div className="servers-container">
                  <div className="servers-header">
                    {Icons.network} Server Nodes
                  </div>
                  <div className="servers-list">
                    {getServersList(overview).length > 0 ? (
                      getServersList(overview).map((ip, idx) => (
                        <div key={idx} className="server-pill">
                          <span className="status-badge-dot" style={{ backgroundColor: '#29d3ff', boxShadow: '0 0 8px #29d3ff' }}></span>
                          {ip}
                        </div>
                      ))
                    ) : (
                      <div className="muted2">No servers found</div>
                    )}
                  </div>
                </div>

                <div className="section-divider">
                  <span className="section-divider-text">Technical Details</span>
                </div>

                <div 
                  className="raw-data-toggle" 
                  onClick={() => setShowRawOverview(!showRawOverview)}
                >
                  {Icons.code}
                  {showRawOverview ? 'Hide Raw Response' : 'Show Raw Response'}
                </div>
                
                {showRawOverview && (
                  <div className="raw-data-container">
                    <div className="raw-data-header">
                      <span>/ncache/overview</span>
                      <span>JSON</span>
                    </div>
                    <div className="raw-data-content">
                      <JsonBlock value={overview} />
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {tab === 'core' ? (
              <div className="panel">
                <div className="fieldRow" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div className="sectionTitle" style={{ marginBottom: 4 }}>
                      /ncache/core/distribution-map/*
                    </div>
                    <div className="muted2">These endpoints are currently placeholders in the API.</div>
                  </div>
                  <button disabled={busy} onClick={refreshCore}>
                    Refresh
                  </button>
                </div>

                <div className="grid2">
                  <div>
                    <div className="sectionTitle">ownership-map</div>
                    <JsonBlock value={ownershipMap} />
                  </div>
                  <div>
                    <div className="sectionTitle">previous-hash-map</div>
                    <JsonBlock value={previousHashMap} />
                  </div>
                  <div>
                    <div className="sectionTitle">installed-hash-map</div>
                    <JsonBlock value={installedHashMap} />
                  </div>
                </div>
              </div>
            ) : null}

            {tab === 'pubsub' ? (
              <div className="enterprise-panel">
                <div className="overview-header" style={{ marginBottom: 16, paddingBottom: 16 }}>
                  <div className="overview-title-group">
                    <h2 className="overview-title">Pub/Sub Monitoring</h2>
                    <div className="overview-subtitle">
                      Analyze active topics, inspect subscriptions, and monitor top-level clients
                    </div>
                  </div>
                </div>

                <div className="sub-tabs">
                  <div className={`sub-tab ${pubSubView === 'topics' ? 'active' : ''}`} onClick={() => setPubSubView('topics')}>
                    Topics Explorer
                  </div>
                  <div className={`sub-tab ${pubSubView === 'clients' ? 'active' : ''}`} onClick={() => setPubSubView('clients')}>
                    Client Managers
                  </div>
                  <div className={`sub-tab ${pubSubView === 'lookup' ? 'active' : ''}`} onClick={() => setPubSubView('lookup')}>
                    Deep Lookup
                  </div>
                  <div style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                    <button disabled={busy} onClick={() => {
                        if (pubSubView === 'topics') refreshTopics()
                        if (pubSubView === 'clients') refreshClientSubscriptionManagers()
                    }}>
                      Refresh Data
                    </button>
                  </div>
                </div>

                {pubSubView === 'topics' && (
                  <div className="split-pane">
                    <div className="pane-left">
                      {topics.length === 0 ? (
                        <div className="muted">No topics returned yet.</div>
                      ) : (
                        topics.map((t) => (
                          <div
                            key={t.TopicName}
                            className={`topic-card-btn ${selectedTopic?.TopicName === t.TopicName ? 'active' : ''}`}
                            onClick={() => setSelectedTopic(t)}
                          >
                            <span>{t.TopicName}</span>
                            <span className="topic-msg-count">{t.Messages}</span>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="pane-right">
                      {selectedTopic ? (
                        <>
                          <div className="sectionTitle" style={{ marginBottom: 16, fontSize: 16 }}>
                            {selectedTopic.TopicName} Metrics
                          </div>
                          <div className="metrics-grid" style={{ marginBottom: 20 }}>
                            <EnterpriseStatistic label="Priority" value={selectedTopic.TopicPriority} icon={Icons.activity} color="blue" />
                            <EnterpriseStatistic label="Type" value={selectedTopic.TopicType} icon={Icons.topology} color="purple" />
                            <EnterpriseStatistic label="Subscribers" value={String(selectedTopic.Subscribers)} icon={Icons.network} color="orange" />
                            <EnterpriseStatistic label="Messages" value={String(selectedTopic.Messages)} icon={Icons.database} color="blue" />
                            <EnterpriseStatistic label="Durable Shared Subscriptions" value={String(selectedTopic.DurableShared)} icon={Icons.queue} color="purple" />
                          </div>

                          <div className="section-divider" style={{ margin: '16px 0' }}>
                            <span className="section-divider-text">Subscriptions ({selectedTopic.SubsriptionDetails.length})</span>
                          </div>

                          {selectedTopic.SubsriptionDetails.length > 0 ? (
                             selectedTopic.SubsriptionDetails.map((sub, idx) => (
                               <div key={`${sub.SubscriptionID}-${idx}`} className="subscription-card">
                                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                   <strong style={{ color: 'var(--text)', fontSize: 16 }}>{sub.Name || '(unnamed)'}</strong>
                                   <div className="status-badge" style={{ padding: '4px 10px' }}>
                                     <div className="status-badge-dot"></div>
                                     {sub.SubscriptionPolicy}
                                   </div>
                                 </div>
                                 <div className="muted2" style={{ fontSize: 13, marginBottom: 4 }}><strong>ID:</strong> {sub.SubscriptionID || 'N/A'}</div>
                                 <div className="muted2" style={{ fontSize: 13, marginBottom: 4 }}><strong>Clients:</strong> {sub.NumberOfClients}</div>
                                 <div className="muted2" style={{ fontSize: 13, marginBottom: 12 }}><strong>Expires:</strong> {sub.ExpirationTime}</div>
                                 {sub.ConnectedClients && sub.ConnectedClients.length > 0 && (
                                   <div className="servers-list" style={{ padding: 0 }}>
                                     {sub.ConnectedClients.map((c, i) => (
                                       <div key={i} className="server-pill" style={{ padding: '4px 8px', fontSize: 11 }}>{c}</div>
                                     ))}
                                   </div>
                                 )}
                               </div>
                             ))
                          ) : (
                            <div className="muted2">No subscriptions for this topic.</div>
                          )}
                          
                          <details style={{ marginTop: 24, cursor: 'pointer' }}>
                            <summary className="muted" style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>Show Raw JSON</summary>
                            <div className="raw-data-container" style={{ marginTop: 12 }}>
                               <JsonBlock value={topicSubscriptions} />
                            </div>
                          </details>
                        </>
                      ) : (
                        <div className="muted">Please select a topic to view details.</div>
                      )}
                    </div>
                  </div>
                )}

                {pubSubView === 'clients' && (
                  <div>
                    {clientSubscriptionManagers.length === 0 ? (
                      <div className="muted">No client subscription manager details returned yet.</div>
                    ) : (
                      <div className="client-managers-grid">
                        {clientSubscriptionManagers.map((item, idx) => (
                          <div key={`${item.ClientID}-${idx}`} className="metric-card" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                              <div style={{ wordBreak: 'break-all', fontWeight: 600, color: 'var(--text)' }}>
                                {item.ClientID || '(unknown client)'}
                              </div>
                              <div className="topic-msg-count" style={{ background: 'rgba(124, 92, 255, 0.2)', color: '#a5b4fc', marginLeft: 12, flexShrink: 0 }}>
                                {item.MessageCount} msgs
                              </div>
                            </div>
                            
                            <div className="muted2" style={{ fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {Icons.clock} <span style={{ width: 75 }}>Last Activity:</span> <span style={{ color: 'var(--text)' }}>{formatDisplayDate(item.LastActivityTime)}</span>
                            </div>
                            <div className="muted2" style={{ fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {Icons.transfer} <span style={{ width: 75 }}>Update Time:</span> <span style={{ color: 'var(--text)' }}>{formatDisplayDate(item.UpdateTime)}</span>
                            </div>
                            <div className="muted2" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {Icons.queue} <span style={{ width: 75 }}>Poll:</span> <span style={{ color: 'var(--text)' }}>{formatDisplayDate(item.PollTime)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {pubSubView === 'lookup' && (
                  <div className="search-dashboard">
                    <div className="metric-icon blue" style={{ margin: '0 auto 20px', width: 48, height: 48 }}>
                      {Icons.code}
                    </div>
                    <div className="overview-title" style={{ fontSize: 20, marginBottom: 8 }}>Find Subscription</div>
                    <div className="muted" style={{ marginBottom: 24 }}>Enter a Subscription ID to retrieve specific configuration and payload history.</div>
                    
                    <div className="search-input-wrapper">
                      <input
                        type="text"
                        placeholder="e.g. sub-xyz-123"
                        value={subscriptionId}
                        onChange={(e) => setSubscriptionId(e.target.value)}
                        style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                      />
                      <button 
                        className="primary" 
                        disabled={busy || subscriptionId.trim().length === 0} 
                        onClick={handleFetchSubscription}
                        style={{ padding: '0 24px', borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                      >
                        {busy ? 'Fetching…' : 'Fetch'}
                      </button>
                    </div>

                    {subscriptionDetail && (
                      <div className="raw-data-container" style={{ marginTop: 24, textAlign: 'left' }}>
                        <div className="raw-data-header">Result JSON</div>
                        <div className="raw-data-content">
                          <JsonBlock value={subscriptionDetail} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export default App
