using Microsoft.Diagnostics.Runtime;

namespace DumpAnalyzerApi.Navigators
{
    public class NavigatorBase
    {
       
        protected ClrObject _current;
        protected ClrObjectReader _reader;

        protected NavigatorBase(ClrObject obj, ClrObjectReader reader)
        {
            _current = obj;
            _reader = reader;
        }

        public ClrObject Current => _current;
        public bool IsNull => _current.IsNull || _current.Type == null;

        protected ClrInstanceField GetField(string name)
        {
            if (IsNull) return null;
            return _reader.GetField(_current.Type, name);
        }

    }
}
