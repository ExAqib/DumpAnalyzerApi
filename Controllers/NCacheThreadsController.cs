using Alachisoft.NCache.MetricServer;
using DumpAnalyzerApi.DTOs;
using DumpAnalyzerApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Diagnostics.Runtime;
using System.Security.Cryptography;

namespace DumpAnalyzerApi.Controllers;

[ApiController]
[Route("api/ncache/threads")]
public class NCacheThreadsController : ControllerBase
{
    private readonly DumpSessionManager _sessionManager;

    public NCacheThreadsController(DumpSessionManager sessionManager)
    {
        _sessionManager = sessionManager;
    }

    [HttpGet]
    public IActionResult GetThreads([FromHeader(Name = "token")] Guid token)
    {
        if (string.IsNullOrWhiteSpace(token.ToString()))
        {
            return Unauthorized(new { message = "Token is required" });
        }

        var session = _sessionManager.GetDataTargetFromSession(token);
        if (session == null)
        {
            return Unauthorized(new { Error = "Invalid or expired token." });
        }

        using var runtime = session.ClrVersions[0].CreateRuntime();

        // Dummy implementation based on  WinDbg output
        var threads = new List<ThreadStackDto>
        {
            new ThreadStackDto
            {
                ManagedThreadId = 80,
                OSThreadId = "0x4638",
                OSIdDecimal = 17976,
                StackFrames = new List<string>
                {
                    "[InlinedCallFrame]",
                    "[InlinedCallFrame]",
                    "Interop+Winsock.recv(System.Net.Sockets.SafeSocketHandle, Byte*, Int32, System.Net.Sockets.SocketFlags)",
                    "System.Net.Sockets.Socket.Receive(Byte[], Int32, Int32, System.Net.Sockets.SocketFlags, System.Net.Sockets.SocketError ByRef)",
                    "System.Net.Sockets.NetworkStream.Read(Byte[], Int32, Int32)",
                    "Alachisoft.NCache.Common.Communication.TcpConnection.Receive(Byte[], Int32)",
                    "Alachisoft.NCache.Common.Communication.TcpChannel.ReceiveResponse()",
                    "Alachisoft.NCache.Common.Communication.TcpChannel.Run()",
                    "System.Threading.ExecutionContext.RunInternal(System.Threading.ExecutionContext, System.Threading.ContextCallback, System.Object)",
                    "[DebuggerU2MCatchHandlerFrame]"
                }
            }
        };

        return Ok(GetThreadStack(runtime));
    }

    private static List<ThreadStackDto> GetThreadStack(ClrRuntime runtime)
    {
        var threadStacks = new List<ThreadStackDto>();
        foreach (ClrThread thread in runtime.Threads)
        {
            if (!thread.IsAlive)
                continue;

            var dto = new ThreadStackDto
            {
                ManagedThreadId = thread.ManagedThreadId,
                OSThreadId = $"{thread.OSThreadId:x}",
                OSIdDecimal = Convert.ToInt32($"{thread.OSThreadId:x}", 16)
            };

            // Add all stack frames
            foreach (ClrStackFrame frame in thread.EnumerateStackTrace())
            {
                var frameString = frame.ToString();
                if (frameString != null)
                    dto.StackFrames.Add(frameString);
            }

            threadStacks.Add(dto);
        }

        return threadStacks;
    }
}
