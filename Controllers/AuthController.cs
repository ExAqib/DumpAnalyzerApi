using DumpAnalyzerApi.DTOs;
using DumpAnalyzerApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace DumpAnalyzerApi.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly DumpSessionManager _sessionManager;

    public AuthController(DumpSessionManager sessionManager)
    {
        _sessionManager = sessionManager;
    }

    [HttpPost("get-token")]
    public IActionResult GetToken([FromBody] AuthRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FilePath))
        {
            return BadRequest(new { Error = "Dump filePath is required." });
        }

        try
        {
            var token = _sessionManager.LoadDump(request.FilePath);
            return Ok(new TokenResponse { Token = token.ToString() });
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
