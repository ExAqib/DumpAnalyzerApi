using Microsoft.Diagnostics.Runtime;
using Microsoft.Diagnostics.Runtime.Interfaces;

namespace DumpAnalyzerApi.Common
{
    public class Util
    {
        public static string GetInstallVersion(ClrRuntime runtime)
        {
            if (IsFrameworkDump(runtime))
                return ".NET Framework";

            else if (IsNetCoreDump(runtime))
                return ".NET Core";

            return "N/A";
        }

        public static string ResolveRuntimeFieldName(string name, bool isFramework)
        {
            return isFramework
                ? RemoveLeadingUnderscore(name)
                : AddLeadingUnderscore(name);
        }

        public static string RemoveLeadingUnderscore(string name)
        {
            return !string.IsNullOrEmpty(name) && name.StartsWith("_")
                ? name.Substring(1)
                : name;
        }

        public static string AddLeadingUnderscore(string name)
        {
            return !string.IsNullOrEmpty(name) && !name.StartsWith("_")
                ? "_" + name
                : name;
        }


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

        internal static int GetProcessId(ClrRuntime runtime)
        {
           return  runtime.DataTarget.DataReader.ProcessId;
        }

        internal static string GetBackingField(string property)
        {
            //return obj.Type?.GetFieldByName("<ClientID>k__BackingField")?.ReadString(obj.Address, false);

            return $"<{property}>k__BackingField";

        }
    }
}
