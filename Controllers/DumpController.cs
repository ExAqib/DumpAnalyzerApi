using DumpAnalyzerApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace DumpAnalyzerApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DumpController : ControllerBase
{
    private readonly DumpSessionManager _sessionManager;

    public DumpController(DumpSessionManager sessionManager)
    {
        _sessionManager = sessionManager;
    }

    [HttpPost("load")]
    public IActionResult LoadDump([FromBody] LoadDumpRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Path))
        {
            return BadRequest(new { Error = "Dump path is required." });
        }

        try
        {
            var token = _sessionManager.LoadDump(request.Path);
            return Ok(new { Success = true, Token = token, Message = "Dump loaded successfully." });
        }
        catch (FileNotFoundException ex)
        {
            return NotFound(new { Error = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Error = $"Failed to load dump: {ex.Message}" });
        }
    }
}

public class LoadDumpRequest
{
    public string Path { get; set; } = string.Empty;
}
