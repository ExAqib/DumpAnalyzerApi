using Microsoft.Diagnostics.Runtime;

namespace DumpAnalyzerApi_New.Common
{
    public enum ProcessVersionType
    {
        Framework,
        NetCore,
        Unknown
    }
    public class ProcessVersion
    {
        public static bool IsFrameworkDump(ClrRuntime runtime)
        {
            var module = runtime.AppDomains.FirstOrDefault().Modules.FirstOrDefault(m => m.Name.Contains("mscorlib") || m.Name.Contains("System.Private.CoreLib"));

            if (module != null)
                return module.Name.Contains("mscorlib");

            return false;
        }

        public static bool IsNetCoreDump(ClrRuntime runtime)
        {
            var module = runtime.AppDomains.FirstOrDefault().Modules.FirstOrDefault(m => m.Name.Contains("mscorlib") || m.Name.Contains("System.Private.CoreLib"));

            if (module != null)
                return module.Name.Contains("System.Private.CoreLib");


            return false;
        }

    }
}
