using Microsoft.Diagnostics.Runtime;
using Microsoft.Diagnostics.Runtime.Interfaces;
using DumpAnalyzerApi.Logger;

namespace DumpAnalyzerApi.Common
{
    internal sealed class ClrDictionaryReader
    {
        private readonly ILogger _logger = new ConsoleLogger("ClrDictionaryReader", true);

        bool _isFrameworkDump;

        public ClrDictionaryReader( bool isFrameWork)
        {
            _isFrameworkDump = isFrameWork;
        }

        string ResolveRuntimeFieldName(string name)
        {
            return Util.ResolveRuntimeFieldName(name,_isFrameworkDump);
        }

        public IDictionary<string, ClrObject> Read(
            ClrObject dictionary,
            ClrHeap heap)
        {
            var result = new Dictionary<string, ClrObject>();

            if (!dictionary.IsValid || dictionary.Type == null)
            {
                _logger.LogWarning("Invalid dictionary object");
                return result;
            }

            
            var entriesField = dictionary.Type.GetFieldByName(ResolveRuntimeFieldName("entries"));//_entries for core dump
            if (entriesField == null)
            {
                _logger.LogWarning("Dictionary has no _entries field");
                return result;
            }

            var entriesObj = entriesField.ReadObject(dictionary.Address, false);
            if (!entriesObj.IsValid)
            {
                _logger.LogWarning("Invalid _entries object in dictionary");
                return result;
            }

            var array = entriesObj.AsArray();

            string? key = null;

            int length = array.Length;

            for (int i = 0; i < length; i++)
            {
                var entry = array.GetStructValue(i);

                var keyField = entry.Type.GetFieldByName("key");

                if (keyField.ContainingType.Name.Contains("System.Collections.Generic.Dictionary<Alachisoft.NCache.Common.Net.Address, System.Collections.Generic.Dictionary<System.Int32, Alachisoft.NCache.Common.DataStructures.HashMapBucket>>+Entry"))
                {
                    key = ReadIpAddressString(keyField, entry);
                }
                else
                {
                    if(keyField.Type.Name.Equals("System.Int32"))
                        key = keyField?.Read<int>(entry.Address, true).ToString();
                    else
                        key = keyField?.ReadString(entry.Address, true);
                }

                if (key == null)
                    continue;

                var valueField = entry.Type.GetFieldByName("value");
                var value = valueField?.ReadObject(entry.Address, true);

                if (!string.IsNullOrEmpty(key) && value.HasValue && !value.Value.IsNull)
                {
                    result[key] = value.Value;
                }
            }

            return result;
        }

        public string? ReadIpAddressString(ClrInstanceField keyField, IClrValue entry)
        {
            ClrObject? address = keyField?.ReadObject(entry.Address, true);
            if (address.Value.IsNull)
                return null;


            int port = address.Value.ReadField<int>("port");

         
            var IPAddressField = address.Value.Type.GetFieldByName("ip_addr");

            ClrObject IPAddress = IPAddressField.ReadObject(address.Value.Address, false);


            return IPAddress.ReadStringField(Util.ResolveRuntimeFieldName("_toString", _isFrameworkDump)) + ":" + port;

        }

        internal static int GetDictionaryCount(ClrObject dictObj,bool isFramework)
        {
            var countField = dictObj.Type.GetFieldByName(Util.ResolveRuntimeFieldName("_count", isFramework));
            int count = countField.Read<int>(dictObj.Address, false);

            var freeListField = dictObj.Type.GetFieldByName(Util.ResolveRuntimeFieldName("_freeCount", isFramework));
            int freeList = freeListField.Read<int>(dictObj.Address, false);

            if (count == 0)
                return count;

            var acutalCount = count - freeList;
            return acutalCount;
        }
    }        
}
