import { apiFetch } from './http'

export type LoadDumpResponse = {
  success?: boolean
  Success?: boolean
  token?: string
  Token?: string
  sessionToken?: string
  SessionToken?: string
  message?: string
  Message?: string
  [key: string]: unknown
}

export type TokenResponse = {
  token?: string
  Token?: string
}

export type CacheOverviewResponse = Record<string, unknown>

export type HashMapResponse = Record<string, unknown>

export type TopicDto = {
  TopicName: string
  TopicPriority: string
  TopicType: string
  Subscribers: number
  Subscriptions: number
  Publishers: number
  Messages: number
  DurableShared: number
  DurableExclusive: number
  NonDurable: number
  SubsriptionDetails: TopicSubscriptionDetailDto[]
}

export type TopicSubscriptionsResponse = Record<string, unknown>
export type SubscriptionResponse = Record<string, unknown>
export type TopicSubscriptionDetailDto = {
  SubscriptionID: string
  NumberOfClients: number
  Name: string
  SubscriptionPolicy: string
  ConnectedClients: string[]
  ExpirationTime: number
}
export type ClientSubscriptionManagerDto = {
  ClientID: string
  LastActivityTime: string | null
  UpdateTime: string | null
  PollTime: string | null
  MessageCount: number
}

export async function loadDump(path: string): Promise<{ token: string }> {
  // Prefer the explicit dump controller route (matches your current MVP).
  const res = await apiFetch<LoadDumpResponse>('/api/dump/load', {
    method: 'POST',
    body: { path },
  })

  const directToken = res.token ?? res.Token ?? res.sessionToken ?? res.SessionToken
  const discoveredToken =
    directToken ??
    Object.entries(res).find(([k, v]) => /token/i.test(k) && typeof v === 'string' && v.trim().length > 0)?.[1]

  const token = (discoveredToken ?? '').toString().trim()
  if (!token) {
    throw new Error(
      `Token not returned from /api/dump/load. Response keys: ${
        Object.keys(res).length ? Object.keys(res).join(', ') : '(empty)'
      }`,
    )
  }
  return { token }
}

export async function getOverview(token: string): Promise<CacheOverviewResponse> {
  return apiFetch<CacheOverviewResponse>('/ncache/overview', { token })
}

export async function getOwnershipMap(token: string): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>('/ncache/core/distribution-map/ownership-map', { token })
}

export async function getPreviousHashMap(token: string): Promise<HashMapResponse> {
  return apiFetch<HashMapResponse>('/ncache/core/distribution-map/previous-hash-map', { token })
}

export async function getInstalledHashMap(token: string): Promise<HashMapResponse> {
  return apiFetch<HashMapResponse>('/ncache/core/distribution-map/installed-hash-map', { token })
}

function readAny<T>(obj: Record<string, unknown>, keyPascal: string, fallback: T): T {
  const keyCamel = keyPascal.charAt(0).toLowerCase() + keyPascal.slice(1)
  const v = obj[keyPascal] ?? obj[keyCamel]
  if (v === undefined || v === null) return fallback
  return v as T
}

export async function getTopics(token: string): Promise<TopicDto[]> {
  const res = await apiFetch<unknown>('/ncache/pub-sub/topics', { token })

  if (!Array.isArray(res)) return []

  return res.map((t) => {
    const obj = t as Record<string, unknown>
    const subscriptionDetailsRaw =
      (readAny(obj, 'SubsriptionDetails', undefined) as unknown[] | undefined) ??
      (readAny(obj, 'SubscriptionDetails', undefined) as unknown[] | undefined) ??
      []

    const subsriptionDetails: TopicSubscriptionDetailDto[] = Array.isArray(subscriptionDetailsRaw)
      ? subscriptionDetailsRaw.map((s) => {
          const subObj = s as Record<string, unknown>
          return {
            SubscriptionID: String(readAny(subObj, 'SubscriptionID', '') ?? ''),
            NumberOfClients: Number(readAny(subObj, 'NumberOfClients', 0) ?? 0),
            Name: String(readAny(subObj, 'Name', '') ?? ''),
            SubscriptionPolicy: String(readAny(subObj, 'SubscriptionPolicy', '') ?? ''),
            ConnectedClients: Array.isArray(readAny(subObj, 'ConnectedClients', []))
              ? (readAny(subObj, 'ConnectedClients', []) as unknown[]).map((c) => String(c))
              : [],
            ExpirationTime: Number(readAny(subObj, 'ExpirationTime', 0) ?? 0),
          }
        })
      : []

    return {
      TopicName: String(readAny(obj, 'TopicName', '') ?? ''),
      TopicPriority: String(readAny(obj, 'TopicPriority', '') ?? ''),
      TopicType: String(readAny(obj, 'TopicType', '') ?? ''),
      Subscribers: Number(readAny(obj, 'Subscribers', 0) ?? 0),
      Subscriptions: Number(readAny(obj, 'Subscriptions', 0) ?? 0),
      Publishers: Number(readAny(obj, 'Publishers', 0) ?? 0),
      Messages: Number(readAny(obj, 'Messages', 0) ?? 0),
      DurableShared: Number(readAny(obj, 'DurableShared', 0) ?? 0),
      DurableExclusive: Number(readAny(obj, 'DurableExclusive', 0) ?? 0),
      NonDurable: Number(readAny(obj, 'NonDurable', 0) ?? 0),
      SubsriptionDetails: subsriptionDetails,
    }
  })
}

export async function getTopicSubscriptions(token: string, topicName: string): Promise<TopicSubscriptionsResponse> {
  return apiFetch<TopicSubscriptionsResponse>(`/ncache/pub-sub/topics/${encodeURIComponent(topicName)}/subscriptions`, {
    token,
  })
}

export async function getSubscription(token: string, subscriptionId: string): Promise<SubscriptionResponse> {
  return apiFetch<SubscriptionResponse>(`/ncache/pub-sub/subscriptions/${encodeURIComponent(subscriptionId)}`, { token })
}

export async function getClientSubscriptionManagers(token: string): Promise<ClientSubscriptionManagerDto[]> {
  const res = await apiFetch<unknown>('/ncache/pub-sub/client-subscription-managers', { token })
  if (!Array.isArray(res)) return []

  return res.map((item) => {
    const obj = item as Record<string, unknown>
    return {
      ClientID: String(readAny(obj, 'ClientID', '') ?? ''),
      LastActivityTime: (readAny(obj, 'LastActivityTime', null) as string | null) ?? null,
      UpdateTime: (readAny(obj, 'UpdateTime', null) as string | null) ?? null,
      PollTime: (readAny(obj, 'PollTime', null) as string | null) ?? null,
      MessageCount: Number(readAny(obj, 'MessageCount', 0) ?? 0),
    }
  })
}

