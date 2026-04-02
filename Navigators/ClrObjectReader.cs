using Microsoft.Diagnostics.Runtime;
using System.Collections.Concurrent;

namespace DumpAnalyzerApi.Navigators
{
    public class ClrObjectReader
    {
        private readonly ConcurrentDictionary<(ClrType, string), ClrInstanceField> _fieldCache
           = new();

        public ClrInstanceField GetField(ClrType type, string name)
        {
            return _fieldCache.GetOrAdd((type, name), key =>
            {
                return key.Item1?.GetFieldByName(key.Item2);
            });
        }

        public ObjectNavigator From(ClrObject obj)
        {
            return new ObjectNavigator(obj, this);
        }
    }
}
