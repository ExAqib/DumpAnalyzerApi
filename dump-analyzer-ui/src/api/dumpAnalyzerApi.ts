import { apiFetch } from './http'

export type LoadDumpResponse = {
  Success?: boolean
  Token?: string
  Message?: string
}

export type TokenResponse = {
  token?: string
  Token?: string
}

export type CacheOverviewResponse = Record<string, unknown>

export type HashMapResponse = Record<string, unknown>

export type TopicsResponse = {
  topics?: Array<{ topicName?: string; TopicName?: string }>
  Topics?: Array<{ topicName?: string; TopicName?: string }>
}

export type TopicSubscriptionsResponse = Record<string, unknown>
export type SubscriptionResponse = Record<string, unknown>

export async function loadDump(path: string): Promise<{ token: string }> {
  // Prefer the explicit dump controller route (matches your current MVP).
  const res = await apiFetch<LoadDumpResponse>('/api/dump/load', {
    method: 'POST',
    body: { path },
  })

  const token = (res.Token ?? '').toString()
  if (!token) throw new Error('Token not returned from /api/dump/load')
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

export async function getTopics(token: string): Promise<string[]> {
  const res = await apiFetch<TopicsResponse>('/ncache/pub-sub/topics', { token })
  const list = res.Topics ?? res.topics ?? []
  return list
    .map((t) => (t.TopicName ?? t.topicName ?? '').toString())
    .filter((x) => x.length > 0)
}

export async function getTopicSubscriptions(token: string, topicName: string): Promise<TopicSubscriptionsResponse> {
  return apiFetch<TopicSubscriptionsResponse>(`/ncache/pub-sub/topics/${encodeURIComponent(topicName)}/subscriptions`, {
    token,
  })
}

export async function getSubscription(token: string, subscriptionId: string): Promise<SubscriptionResponse> {
  return apiFetch<SubscriptionResponse>(`/ncache/pub-sub/subscriptions/${encodeURIComponent(subscriptionId)}`, { token })
}

