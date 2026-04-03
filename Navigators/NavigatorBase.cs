using DumpAnalyzerApi.Common;
using Microsoft.Diagnostics.Runtime;

namespace DumpAnalyzerApi.Navigators
{
    public abstract class NavigatorBase
    {
       
        protected ClrObject _current;
        protected ClrObjectReader _reader;
        protected bool _isFrameworkDump;


        protected NavigatorBase(ClrObject obj, ClrObjectReader reader)
        {
            _current = obj;
            _reader = reader;

            if (reader.Heap != null)
                _isFrameworkDump = Util.IsFrameworkDump(reader.Heap.Runtime);
        }

        public ClrObject Current => _current;
        public bool IsNull => _current.IsNull || _current.Type == null;

        protected ClrInstanceField GetField(string name)
        {
            if (IsNull) 
                return null;

            return _reader.GetField(_current.Type, name);
        }

    }
}
