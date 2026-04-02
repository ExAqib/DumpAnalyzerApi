using DumpAnalyzerApi.DTOs;
using DumpAnalyzerApi.Logger;
using DumpAnalyzerApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace DumpAnalyzerApi.Controllers;

[ApiController]
[Route("ncache/pub-sub")]
public class NCachePubSubController : ControllerBase
{
    private readonly DumpSessionManager _sessionManager;

    public NCachePubSubController(DumpSessionManager sessionManager)
    {
        _sessionManager = sessionManager;
    }

    [HttpGet("topics")]
    public IActionResult GetTopics([FromHeader(Name = "token")] Guid token)
    {
        var dataTarget = _sessionManager.GetSession(token);
        if (dataTarget == null) return Unauthorized(new { Error = "Invalid or expired token." });

        using var runtime = dataTarget.ClrVersions[0].CreateRuntime();
        var heap = runtime.Heap;

        var clrObj = heap.EnumerateObjects().Where(obj => obj.Type.Name.Equals("Alachisoft.NCache.Caching.Messaging.TopicManager")).FirstOrDefault();
        var topicNames = TopicManager.Analyze(clrObj, heap);

        var Topics = new List<TopicDto>();

        foreach (string name in (ICollection<string>) topicNames)
        {
            Topics.Add(new TopicDto() { TopicName = name});
        }



        return Ok(new TopicsResponse
        {
            Topics = Topics
        });
    }

    [HttpGet("topics/{topicName}/subscriptions")]
    public IActionResult GetTopicSubscriptions([FromHeader(Name = "token")] Guid token, string topicName)
    {
        var session = _sessionManager.GetSession(token);
        if (session == null) return Unauthorized(new { Error = "Invalid or expired token." });

        return Ok(new TopicSubscriptionsResponse
        {
            Topics = new List<TopicSubscriptionDto>()
        });
    }

    [HttpGet("subscriptions/{subscriptionId}")]
    public IActionResult GetSubscription([FromHeader(Name = "token")] Guid token, string subscriptionId)
    {
        var session = _sessionManager.GetSession(token);
        if (session == null) return Unauthorized(new { Error = "Invalid or expired token." });

        return Ok(new SubscriptionResponse
        {
            SubscriptionDetail = new TopicSubscriptionDto
            {
                SubscriptionID = subscriptionId
            },
            Clients = new List<ClientDto>(),
            Messages = new List<MessageDto>()
        });
    }
}
