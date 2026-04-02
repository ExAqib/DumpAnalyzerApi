using Microsoft.Diagnostics.Runtime;
using System;

namespace DumpAnalyzerApi.Navigators
{
    public class ObjectNavigator : NavigatorBase
    {
        public ObjectNavigator(ClrObject obj, ClrObjectReader reader)
           : base(obj, reader) { }

        // Traverse to inner object
        public ObjectNavigator Object(string fieldName)
        {
            if (IsNull) return new ObjectNavigator(default, _reader);

            var field = GetField(fieldName);
            if (field == null) return new ObjectNavigator(default, _reader);

            var inner = field.ReadObject(_current, interior: false);
            return new ObjectNavigator(inner, _reader);
        }

        // Stop traversal and read as string
        public StringNavigator String(string fieldName)
        {
            return new StringNavigator(_current, _reader, fieldName);
        }

        // Stop traversal and read as generic value
        public ValueNavigator<T> Value<T>(string fieldName)  where T : unmanaged
        {
            return new ValueNavigator<T>(_current, _reader, fieldName);
        }

        public ArrayListNavigator ArrayList(string fieldName)
        {
            return new ArrayListNavigator(_current, _reader, fieldName);
        }
    }
}
