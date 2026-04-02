using Microsoft.Diagnostics.Runtime;
using System;

namespace DumpAnalyzerApi.Navigators
{
    public class ValueNavigator<T> : NavigatorBase where T : unmanaged
    {

        private readonly string _fieldName;

        public ValueNavigator(ClrObject obj, ClrObjectReader reader, string fieldName)
            : base(obj, reader)
        {
            _fieldName = fieldName;
        }

        public T Read()
        {
            if (IsNull) 
                return default;

            var field = GetField(_fieldName);

            if (field == null) 
                return default;

            return (T)field.Read<T>(_current, interior: false);
        }
    }
}

