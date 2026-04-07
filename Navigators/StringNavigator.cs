using Microsoft.Diagnostics.Runtime;
using System;

namespace DumpAnalyzerApi.Navigators
{
    public class StringNavigator : NavigatorBase
    {
        private readonly string _fieldName;

        public StringNavigator(ClrObject obj, ClrObjectReader reader, string fieldName)
            : base(obj, reader)
        {
            _fieldName = fieldName;
        }

        // Read string
        public string Read()
        {
            if (IsNull) return null;

            var field = GetField(_fieldName);
            return field.ReadString(_current, interior: false);
        }

        // Optional: read as object for further chaining (rare)
        public ObjectNavigator Object()
        {
            var field = GetField(_fieldName);
            var obj = field?.ReadObject(_current, false) ?? default;
            return new ObjectNavigator(obj, _reader);
        }
    }
}
