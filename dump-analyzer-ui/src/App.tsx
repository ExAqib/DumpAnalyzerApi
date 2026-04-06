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
                    label="Message Manager Last Time" 
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
              <div className="panel">
                <div className="fieldRow" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div className="sectionTitle" style={{ marginBottom: 4 }}>
                      /ncache/pub-sub/*
                    </div>
                    <div className="muted2">
                      Topics are real today (found via TopicManager in dump). Subscription endpoints are placeholders.
                    </div>
                  </div>
                  <button disabled={busy} onClick={refreshTopics}>
                    Refresh topics
                  </button>
                </div>

                <div className="grid2">
                  <div>
                    <div className="sectionTitle">Topics</div>
                    {topics.length === 0 ? (
                      <div className="muted">No topics returned yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {topics.map((t) => (
                          <button
                            key={t.TopicName}
                            className={selectedTopic?.TopicName === t.TopicName ? 'primary' : ''}
                            onClick={() => setSelectedTopic(t)}
                            style={{ textAlign: 'left' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, width: '100%' }}>
                              <span>{t.TopicName}</span>
                              <span className="muted2">Msgs: {t.Messages}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="sectionTitle">
                      Selected topic {selectedTopic ? <span className="muted2">({selectedTopic.TopicName})</span> : null}
                    </div>
                    {selectedTopic ? (
                      <div className="grid2" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <OverviewStat label="Topic Priority" value={selectedTopic.TopicPriority} />
                        <OverviewStat label="Topic Type" value={selectedTopic.TopicType} />
                        <OverviewStat label="Subscribers" value={String(selectedTopic.Subscribers)} />
                        <OverviewStat label="Subscriptions" value={String(selectedTopic.Subscriptions)} />
                        <OverviewStat label="Publishers" value={String(selectedTopic.Publishers)} />
                        <OverviewStat label="Messages" value={String(selectedTopic.Messages)} />
                        <OverviewStat label="Durable Shared" value={String(selectedTopic.DurableShared)} />
                        <OverviewStat label="Durable Exclusive" value={String(selectedTopic.DurableExclusive)} />
                        <OverviewStat label="NonDurable" value={String(selectedTopic.NonDurable)} />
                        <OverviewStat label="Subscription Details" value={String(selectedTopic.SubsriptionDetails.length)} />
                      </div>
                    ) : (
                      <div className="muted">Select a topic.</div>
                    )}
                    {selectedTopic && selectedTopic.SubsriptionDetails.length > 0 ? (
                      <div style={{ marginTop: 12 }}>
                        <div className="sectionTitle">Subscription details from topics API</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {selectedTopic.SubsriptionDetails.map((sub, idx) => (
                            <div key={`${sub.SubscriptionID}-${idx}`} className="panel" style={{ padding: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                                <strong>{sub.Name || '(unnamed subscription)'}</strong>
                                <span className="muted2">{sub.SubscriptionPolicy}</span>
                              </div>
                              <div className="muted2" style={{ marginBottom: 6 }}>
                                Subscription ID: {sub.SubscriptionID || 'N/A'}
                              </div>
                              <div className="muted2" style={{ marginBottom: 6 }}>
                                Number of clients: {sub.NumberOfClients}
                              </div>
                              <div className="muted2" style={{ marginBottom: 6 }}>
                                Expiration time: {sub.ExpirationTime}
                              </div>
                              <div className="muted2">
                                Connected clients: {sub.ConnectedClients.length ? sub.ConnectedClients.join(', ') : 'None'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="muted2" style={{ marginTop: 10, marginBottom: 8 }}>
                      Raw subscriptions response
                    </div>
                    <JsonBlock value={topicSubscriptions} />
                  </div>

                  <div>
                    <div className="sectionTitle">Lookup subscription</div>
                    <div className="fieldRow" style={{ marginBottom: 10 }}>
                      <input
                        type="text"
                        placeholder="subscriptionId"
                        value={subscriptionId}
                        onChange={(e) => setSubscriptionId(e.target.value)}
                      />
                      <button disabled={busy || subscriptionId.trim().length === 0} onClick={handleFetchSubscription}>
                        Fetch
                      </button>
                    </div>
                    <JsonBlock value={subscriptionDetail} />
                  </div>

                  <div>
                    <div className="fieldRow" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                      <div className="sectionTitle" style={{ margin: 0 }}>
                        Client subscription managers
                      </div>
                      <button disabled={busy} onClick={refreshClientSubscriptionManagers}>
                        Refresh
                      </button>
                    </div>
                    {clientSubscriptionManagers.length === 0 ? (
                      <div className="muted">No client subscription manager details returned yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {clientSubscriptionManagers.map((item, idx) => (
                          <div key={`${item.ClientID}-${idx}`} className="panel" style={{ padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                              <strong>{item.ClientID || '(unknown client)'}</strong>
                              <span className="muted2">Messages: {item.MessageCount}</span>
                            </div>
                            <div className="muted2" style={{ marginBottom: 6 }}>
                              Last activity time: {formatDisplayDate(item.LastActivityTime)}
                            </div>
                            <div className="muted2" style={{ marginBottom: 6 }}>
                              Update time: {formatDisplayDate(item.UpdateTime)}
                            </div>
                            <div className="muted2">Poll time: {formatDisplayDate(item.PollTime)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export default App
