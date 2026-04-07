
namespace DumpAnalyzerApi.DTOs;

public class CacheOverviewResponse
{
    public string CacheName { get; set; } = string.Empty;
    public int ServersCount { get; set; }
    public List<string> Servers { get; set; } = new();
    public int CacheCount { get; set; }
    public string CacheTopology { get; set; } = string.Empty;
    public int ReplicationQueueMirrorQueue { get; set; }
    public string CurrentViewId { get; set; } = string.Empty;
    public string InstallingViewId { get; set; } = string.Empty;
    public bool IsStateTransfer { get; set; }
    public long CacheSize { get; set; } // Based on usual cache size type

    public string InstallType { get; set; } // Framework/core

    public int ProcessId { get; set; }

    public int CpuUtilization { get; set; }
    public DateTime? MessageManagerLastTime { get; internal set; }
}
