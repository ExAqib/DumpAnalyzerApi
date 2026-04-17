using DumpAnalyzerApi.Navigators;
using Microsoft.Diagnostics.Runtime;

namespace DumpAnalyzerApi
{
    public class DumpSession
    {
        public Guid Token { get; set; }
        public string? DumpPath { get; set; }
        public DataTarget? DataTarget { get; set; }
        public ChainNavigator HostServer { get; set; }
    }
}
