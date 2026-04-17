using Alachisoft.NCache.Common.Net;
using DumpAnalyzerApi.Common;
using DumpAnalyzerApi.DTOs;
using DumpAnalyzerApi.Navigators;
using DumpAnalyzerApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Diagnostics.Runtime;


namespace DumpAnalyzerApi.Controllers;

[ApiController]
[Route("ncache/overview")]
public class NCacheOverviewController : ControllerBase
{
    private readonly DumpSessionManager _sessionManager;
    private readonly GenericObjectPool<ChainNavigator> _pool;

    public NCacheOverviewController(DumpSessionManager sessionManager, GenericObjectPool<ChainNavigator> pool)
    {
        _sessionManager = sessionManager;
        _pool = pool;
    }

    [HttpGet]
    public IActionResult GetOverview([FromHeader(Name = "token")] Guid token)
    {
        // Add connected clienDataTarget?DataTarget?DataTarget?DataTarget?n over veiw section TODO
        var dumpSession = _sessionManager.GetSession(token);

        if (dumpSession == null)        
            return Unauthorized(new { Error = "Invalid or expired token." });
        

        var dataTarget = dumpSession.DataTarget;
        ClrRuntime? runtime = dataTarget?.ClrVersions[0].CreateRuntime();
              

        ClrObject hostServerClr = runtime.Heap
            .EnumerateObjects()
            .FirstOrDefault(obj => obj.Type.Name.Equals("Alachisoft.NCache.Management.HostServer"));


        ChainNavigator cacheHostServer = new ChainNavigator().From(hostServerClr).WithHeap(runtime.Heap);
        dumpSession.HostServer = cacheHostServer;

        var runtimeContextReference  = cacheHostServer
                       .StaticObject("cacheInfo")
                       .Object("_cache")
                       .Object("_context");

        ChainNavigator cacheImpl = _pool.Get()
            .WithHeap(runtime.Heap)
            .From(runtimeContextReference.Current)
            .Object("_cacheImpl")
            .AsRoot();

        ChainNavigator runtimeContext = _pool.Get()
            .WithHeap(runtime.Heap)
            .From(runtimeContextReference.Current)
            .AsRoot();

        cacheHostServer.ResetToRoot();
        
        
        try
        {
            var response = new CacheOverviewResponse();

            response.CacheName = cacheImpl
                   .String("_name");

            response.ServersCount = cacheImpl
                      .Object("_cluster")
                      .Object("_servers")
                      .Object("_list")
                      .Value<int>("_size");

            response.Servers = [..  cacheImpl
                                        .Object("_cluster")
                                        .Object("_servers")
                                        .Object("_list")
                                        .List("_items")
                                        .ReadAddress()
                                        .Select(addr => addr.ToString()) ];

            response.CacheCount = cacheImpl
                  .Object("_internalCache")
                  .Object("_cache")
                  .Object("_cacheStore")
                  .Object("_itemDict")
                  .Value<int>("count");


            response.CacheTopology = cacheImpl
                   .Current
                   .Type?
                   .Name?
                   .Split('.').
                   LastOrDefault() ?? "NULL";

            response.ReplicationQueueMirrorQueue = -0;
            response.CurrentViewId = cacheImpl
                      .Object("_cluster")
                      .Value<int>("_lastViewId")
                      .ToString();

            response.InstallingViewId = "NA";
            response.IsStateTransfer = false;
            response.CacheSize = 0;

            response.InstallType = Util.GetInstallVersion(runtime);
            response.ProcessId = Util.GetProcessId(runtime);
      
            response.MessageManagerLastTime = runtimeContext
                 .Property("MessageManager")
                 .ReadDateTime("_expirationTimestamp");

            response.CpuUtilization = runtime?.ThreadPool?.CpuUtilization ?? -1;
            response.DebugSessionTimeDisplay = GetDumpTime(dataTarget.DataReader).ToString();

            return Ok(response);
        }
        finally
        {
            _pool.Return(runtimeContext);
            _pool.Return(cacheImpl);
        }

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