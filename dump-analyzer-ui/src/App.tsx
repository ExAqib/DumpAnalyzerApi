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
              <div className="panel">
                <div className="sectionTitle">/ncache/overview</div>
                <div className="grid2" style={{ marginBottom: 12 }}>
                  <OverviewStat label="Cache Name" value={readOverviewValue(overview, 'CacheName')} />
                  <OverviewStat label="Cache Topology" value={readOverviewValue(overview, 'CacheTopology')} />
                  <OverviewStat label="Servers Count" value={readOverviewValue(overview, 'ServersCount')} />
                  <OverviewStat label="Cache Count" value={readOverviewValue(overview, 'CacheCount')} />
                  <OverviewStat label="Install Type" value={readOverviewValue(overview, 'InstallType')} />
                  <OverviewStat label="Process ID" value={readOverviewValue(overview, 'ProcessId')} />
                  <OverviewStat label="Message Manager Last Time" value={formatDisplayDate(readOverviewValue(overview, 'MessageManagerLastTime'))} />
                </div>
                <div className="muted2" style={{ marginBottom: 8 }}>
                  Raw response
                </div>
                <JsonBlock value={overview} />
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
