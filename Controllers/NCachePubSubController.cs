using DumpAnalyzerApi.DTOs;
using DumpAnalyzerApi.Logger;
using DumpAnalyzerApi.PubSub;
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
        var dataTarget = _sessionManager.GetDataTargetFromSession(token);
        if (dataTarget == null) return Unauthorized(new { Error = "Invalid or expired token." });

        using var runtime = dataTarget.ClrVersions[0].CreateRuntime();
        var heap = runtime.Heap;

        var clrObj = heap.EnumerateObjects().Where(obj => obj.Type.Name.Equals("Alachisoft.NCache.Caching.Messaging.TopicManager")).FirstOrDefault();
        List<TopicDto>? topicResponse = TopicManager.Analyze(clrObj, heap);

        return Ok(topicResponse);
    }

    [HttpGet("topics/{topicName}/subscriptions")]
    public IActionResult GetTopicSubscriptions([FromHeader(Name = "token")] Guid token, string topicName)
    {
        var session = _sessionManager.GetDataTargetFromSession(token);
        if (session == null) return Unauthorized(new { Error = "Invalid or expired token." });

        return Ok(new TopicSubscriptionsResponse
        {
            Topics = new List<TopicSubscriptionDto>()
        });
    }

    [HttpGet("subscriptions/{subscriptionId}")]
    public IActionResult GetSubscription([FromHeader(Name = "token")] Guid token, string subscriptionId)
    {
        var session = _sessionManager.GetDataTargetFromSession(token);
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

    [HttpGet("client-subscription-managers")]
    public IActionResult GetClientSubscriptionManagers([FromHeader(Name = "token")] Guid token)
    {
        var dataTarget = _sessionManager.GetDataTargetFromSession(token);
        if (dataTarget == null) return Unauthorized(new { Error = "Invalid or expired token." });

        using var runtime = dataTarget.ClrVersions[0].CreateRuntime();
        var heap = runtime.Heap;

        var managers = heap.EnumerateObjects()
            .Where(obj => obj.Type?.Name == "Alachisoft.NCache.Caching.Messaging.ClientSubscriptionManager" || 
            obj.Type?.Name == "Alachisoft.NCache.Caching.Messaging.EventMessagesClientSubscriptionManager")
            .Select(obj => ClientSubscriptionManager.Analyze(obj, heap))
            .ToList();

        return Ok(managers);
    }
}
