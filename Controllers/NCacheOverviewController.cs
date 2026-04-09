using DumpAnalyzerApi.Common;
using DumpAnalyzerApi.DTOs;
using DumpAnalyzerApi.Navigators;
using DumpAnalyzerApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Diagnostics.Runtime;
using Microsoft.Diagnostics.Runtime.Interfaces;

namespace DumpAnalyzerApi.Controllers;

[ApiController]
[Route("ncache/overview")]
public class NCacheOverviewController : ControllerBase
{
    private readonly DumpSessionManager _sessionManager;

    public NCacheOverviewController(DumpSessionManager sessionManager)
    {
        _sessionManager = sessionManager;
    }

    [HttpGet]
    public IActionResult GetOverview([FromHeader(Name = "token")] Guid token)
    {
        // Add message amnager last run time and connected client in over veiw section TODO
        var session = _sessionManager.GetSession(token);
        if (session == null)
        {
            return Unauthorized(new { Error = "Invalid or expired token." });
        }

        using var runtime = session.ClrVersions[0].CreateRuntime();

        var clrObject = runtime.Heap.EnumerateObjects().Where(obj => obj.Type?.Name == "Alachisoft.NCache.Caching.CacheRuntimeContext").First();
        var clrHeapStorageObject = runtime.Heap.EnumerateObjects().Where(obj => obj.Type?.Name == "Alachisoft.NCache.Storage.ClrHeapStorageProvider").First();

        var clrReader = new ClrObjectReader();

        var runtimeContextNavigator = clrReader.WithHeap(runtime.Heap).From(clrObject);

        var messageManagerClr = runtime.Heap.EnumerateObjects().Where(obj => obj.Type?.Name == "Alachisoft.NCache.Caching.Messaging.MessageManager").First();

        var readers = new Microsoft.Diagnostics.Runtime.Utilities.DbgEng.DbgEngIDataReader(session.DataReader.DisplayName);

        readers.DebugControl.GetCurrentSystemUpTime(out TimeSpan systemUptime);
        readers.DebugControl.GetCurrentTimeDate(out DateTime? debugSessionTime);
        readers.DebugSystemObjects.GetCurrentProcessUpTime(out TimeSpan processUptime);
        var miniReader = session.DataReader;
        GetDumpTime(miniReader);
        var response = new CacheOverviewResponse
        {
            CacheName = runtimeContextNavigator
                       .Object("_cacheImpl")
                       .String("_name")
                       .Read(),

            ServersCount = runtimeContextNavigator
                           .Object("_cacheImpl")
                           .Object("_cluster")
                           .Object("_servers")
                           .Object("_list")
                           .Value<int>("_size")
                           .Read(),

            Servers = [.. runtimeContextNavigator
                           .Object("_cacheImpl")
                           .Object("_cluster")
                           .Object("_servers")
                           .Object("_list")
                           .ArrayList("_items")
                           .ReadAddress()
                           .Select(addr => addr.ToString())],

            CacheCount = new ClrObjectReader()
                       .From(clrHeapStorageObject)
                       .Object("_itemDict")
                       .Value<int>("count")
                       .Read(),

            CacheTopology = runtimeContextNavigator
                        .Object("_cacheImpl")?
                        .Current
                        .Type?
                        .Name?
                        .Split('.').
                        LastOrDefault() ?? "NULL",

            ReplicationQueueMirrorQueue = -0,
            CurrentViewId = runtimeContextNavigator
                           .Object("_cacheImpl")
                           .Object("_cluster")
                           .Value<int>("_lastViewId")
                           .Read()
                           .ToString(),

            InstallingViewId = "NA",
            IsStateTransfer = false,
            CacheSize = 0,

            InstallType = Util.GetInstallVersion(runtime),
            ProcessId = Util.GetProcessId(runtime),
            MessageManagerLastTime = new ClrObjectReader().
                        WithHeap(runtime.Heap).
                        From(messageManagerClr)
                        .DateTimeNavigator("_expirationTimestamp")
                        .ReadDateTime(),

            CpuUtilization = runtime?.ThreadPool?.CpuUtilization ?? -1,

            DebugSessionTimeDisplay = GetDumpTime(session.DataReader).ToString(),
            SystemUptimeDisplay = $"{systemUptime.Days} days {systemUptime:hh\\:mm\\:ss}",
            ProcessUptimeDisplay = $"{processUptime.Days} days {processUptime:hh\\:mm\\:ss}"

        };
        readers.Dispose();

        return Ok(response);
    }

    private static DateTime GetDumpTime(IDataReader reader)
    {
        if (reader is MinidumpReader miniReader)
        {
              DateTime time = DateTimeOffset.FromUnixTimeSeconds(miniReader.TimeStamp).UtcDateTime.ToLocalTime();
            return time;
        }
        return default;
    }
}
