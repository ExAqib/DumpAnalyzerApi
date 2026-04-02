import { useEffect, useMemo, useState } from 'react'
import {
  getInstalledHashMap,
  getOverview,
  getOwnershipMap,
  getPreviousHashMap,
  getSubscription,
  getTopicSubscriptions,
  getTopics,
  loadDump,
} from './api/dumpAnalyzerApi'
import { clearToken, getLastDumpPath, getToken, setLastDumpPath, setToken } from './lib/session'

function App() {
  const [token, setTokenState] = useState<string | null>(() => getToken())
  const [dumpPath, setDumpPath] = useState<string>(() => getLastDumpPath())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tab, setTab] = useState<'overview' | 'core' | 'pubsub'>('overview')

  const [overview, setOverviewState] = useState<unknown>(null)
  const [ownershipMap, setOwnershipMapState] = useState<unknown>(null)
  const [previousHashMap, setPreviousHashMapState] = useState<unknown>(null)
  const [installedHashMap, setInstalledHashMapState] = useState<unknown>(null)

  const [topics, setTopicsState] = useState<string[]>([])
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [topicSubscriptions, setTopicSubscriptionsState] = useState<unknown>(null)
  const [subscriptionId, setSubscriptionId] = useState('')
  const [subscriptionDetail, setSubscriptionDetailState] = useState<unknown>(null)

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
      if (list.length && !selectedTopic) setSelectedTopic(list[0])
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token])

  useEffect(() => {
    if (!token || !selectedTopic) return
    let cancelled = false
    ;(async () => {
      setError(null)
      setTopicSubscriptionsState(null)
      try {
        const res = await getTopicSubscriptions(token, selectedTopic)
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

  function JsonBlock({ value }: { value: unknown }) {
    return <pre>{value === null ? 'null' : JSON.stringify(value, null, 2)}</pre>
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
                            key={t}
                            className={selectedTopic === t ? 'primary' : ''}
                            onClick={() => setSelectedTopic(t)}
                            style={{ textAlign: 'left' }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="sectionTitle">
                      Topic subscriptions {selectedTopic ? <span className="muted2">({selectedTopic})</span> : null}
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
