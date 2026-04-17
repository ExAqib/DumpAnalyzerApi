using DumpAnalyzerApi.DTOs;
using DumpAnalyzerApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace DumpAnalyzerApi.Controllers;

[ApiController]
[Route("ncache/core/distribution-map")]
public class NCacheCoreController : ControllerBase
{
    private readonly DumpSessionManager _sessionManager;

    public NCacheCoreController(DumpSessionManager sessionManager)
    {
        _sessionManager = sessionManager;
    }

    [HttpGet("ownership-map")]
    public IActionResult GetOwnershipMap([FromHeader(Name = "token")] Guid token)
    {
        var session = _sessionManager.GetDataTargetFromSession(token);
        if (session == null) return Unauthorized(new { Error = "Invalid or expired token." });

        var map = new Dictionary<string, List<BucketDto>>();
        return Ok(map);
    }

    [HttpGet("previous-hash-map")]
    public IActionResult GetPreviousHashMap([FromHeader(Name = "token")] Guid token)
    {
        var session = _sessionManager.GetDataTargetFromSession(token);
        if (session == null) return Unauthorized(new { Error = "Invalid or expired token." });

        return Ok(new HashMapResponse
        {
            Buckets = new List<BucketDto>()
        });
    }

    [HttpGet("installed-hash-map")]
    public IActionResult GetInstalledHashMap([FromHeader(Name = "token")] Guid token)
    {
        var session = _sessionManager.GetDataTargetFromSession(token);
        if (session == null) return Unauthorized(new { Error = "Invalid or expired token." });

        return Ok(new HashMapResponse
        {
            Buckets = new List<BucketDto>()
        });
    }
}
