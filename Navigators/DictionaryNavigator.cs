using DumpAnalyzerApi.Common;
using Microsoft.Diagnostics.Runtime;

namespace DumpAnalyzerApi.Navigators
{
    public class DictionaryNavigator : NavigatorBase
    {
        private readonly string _fieldName;

        public DictionaryNavigator(ClrObject obj, ClrObjectReader reader, string fieldName)
            : base(obj, reader)
        {
            _fieldName = fieldName;
            if (reader.Heap == null)
                throw new Exception("ClrHeap is not provided for dictionary navigator.");
        }

        public IDictionary<ClrObject, ClrObject> ReadDictionaryWithObjectKey()
        {
            ClrObject dictionary = Current.ReadObjectField(_fieldName);

            var result = new Dictionary<ClrObject, ClrObject>();

            if (!dictionary.IsValid || dictionary.Type == null)
            {
                return result;
            }

            var entriesField = dictionary.Type.GetFieldByName(Util.ResolveRuntimeFieldName("entries", _isFrameworkDump));
            if (entriesField == null)
            {
                return result;
            }

            var entriesObj = entriesField.ReadObject(dictionary.Address, false);
            if (!entriesObj.IsValid)
            {
                return result;
            }

            var array = entriesObj.AsArray();

            int length = array.Length;

            for (int i = 0; i < length; i++)
            {
                var entry = array.GetStructValue(i);

                var keyField = entry.Type.GetFieldByName("key");

                ClrObject? keyClrObject = keyField?.ReadObject(entry.Address, true);

                if (keyClrObject == null)
                    continue;

                var valueField = entry.Type.GetFieldByName("value");
                var value = valueField?.ReadObject(entry.Address, true);

                if (value.HasValue && !value.Value.IsNull)
                {
                    result[keyClrObject.Value] = value.Value;
                }
            }

            return result;
        }
    }
}
