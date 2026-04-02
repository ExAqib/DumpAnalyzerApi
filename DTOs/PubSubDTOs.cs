namespace DumpAnalyzerApi.DTOs;

public class TopicsResponse
{
    public List<TopicDto> Topics { get; set; } = new();
}

public class TopicDto
{
    public string TopicName { get; set; } = string.Empty;
    public string TopicPriority { get; set; } = string.Empty;
    public string TopicType { get; set; } = string.Empty;
    public int Subscribers { get; set; }
    public int Subscriptions { get; set; }
    public int Publishers { get; set; }
    public int Messages { get; set; }
    public bool DurableShared { get; set; }
    public bool DurableExclusive { get; set; }
    public bool NonDurable { get; set; }
}

public class TopicSubscriptionsResponse
{
    public List<TopicSubscriptionDto> Topics { get; set; } = new();
}

public class TopicSubscriptionDto
{
    public string SubscriptionID { get; set; } = string.Empty;
    public int NumberOfClients { get; set; }
    public bool DurableShared { get; set; }
    public bool DurableExclusive { get; set; }
    public bool NonDurable { get; set; }
}

public class SubscriptionResponse
{
    public TopicSubscriptionDto? SubscriptionDetail { get; set; }
    public List<ClientDto> Clients { get; set; } = new();
    public List<MessageDto> Messages { get; set; } = new();
}

public class ClientDto
{
    public string Id { get; set; } = string.Empty;
    public DateTime? LastPollTime { get; set; }
    public DateTime? UpdateTime { get; set; }
    public DateTime? LastActivityTime { get; set; }
    public int MessageCount { get; set; }
}

public class MessageDto
{
    public string Id { get; set; } = string.Empty;
    public DateTime? CreationTime { get; set; }
    public DateTime? AssignmentTime { get; set; }
}
