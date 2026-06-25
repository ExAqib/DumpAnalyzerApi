using Microsoft.Diagnostics.Runtime;

namespace DumpAnalyzerApi_New.Common
{
    public class Util
    {

        /*
         * Process Related Functions
         */
        public static ProcessVersionType GetInstallVersion(ClrRuntime runtime)
        {
            if (ProcessVersion.IsFrameworkDump(runtime))
                return ProcessVersionType.Framework;

            else if (ProcessVersion.IsNetCoreDump(runtime))
                return ProcessVersionType.NetCore;

            return ProcessVersionType.Unknown;
        }
        internal static int GetProcessId(ClrRuntime runtime)
        {
            return runtime.DataTarget.DataReader.ProcessId;
        }

        /*
         * Field Name Related Functions
         */
        public static string ResolveRuntimeFieldName(string name, bool isFramework)
        {
            var resolvedName = name;

            if (isFramework) {
               resolvedName = RemoveLeadingUnderscore(resolvedName);
            }

            return resolvedName;
        }

        public static string RemoveLeadingUnderscore(string name)
        {
            return !string.IsNullOrEmpty(name) && name.StartsWith("_")
                ? name.Substring(1)
                : name;
        }

        internal static string GetBackingField(string property)
        {
            //return obj.Type?.GetFieldByName("<ClientID>k__BackingField")?.ReadString(obj.Address, false);

            return $"<{property}>k__BackingField";

        }
    }
}
