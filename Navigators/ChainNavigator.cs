using Alachisoft.NCache.Common.Net;
using DumpAnalyzerApi.Common;
using Microsoft.Diagnostics.Runtime;
using Microsoft.Extensions.ObjectPool;
using System;

namespace DumpAnalyzerApi.Navigators
{
    public class ChainNavigator : IResettable
    {
        private ClrObject _root;
        private ClrObject _current;
        private ClrArray? _currentArray;
        private bool _isListContext;
        private string? _listField;
        private bool _isFrameworkDump;

        public ClrObject Current => _current;


        public ClrHeap Heap { get; private set; }

        public ChainNavigator() { }
      

        public ChainNavigator From(ClrObject obj)
        {
            _root = _current = obj;
            return this;
        }


        public ChainNavigator Object(string field)
        {
            _current = _current.ReadObjectField(field);
            return this;
        }


        public ChainNavigator Property(string property)
        {
            string field = Util.GetBackingField(property);
            _current = _current.ReadObjectField(field);
            return this;
        }

        public ChainNavigator StaticObject(string field)
        {
            ClrStaticField? staticField = _current.Type.GetStaticFieldByName(field);

            foreach (var appDomain in Heap.Runtime.AppDomains)
            {
                if (staticField.IsInitialized(appDomain))
                {
                    _current = staticField.ReadObject(appDomain);
                    break;
                }
            }

            return this;
        }


        public string? String(string field)
        {
            var result = _current.ReadObjectField(field).AsString();
            ResetToRoot();
            return result;
        }

        public T Value<T>(string field) where T : unmanaged
        {
            var result = _current.ReadField<T>(field);
            ResetToRoot();
            return result;
        }

        public ChainNavigator ResetToRoot()
        {
            _current = _root;
            _currentArray = null;
            _isListContext = false;
            _listField = null;
            return this;
        }


        public bool TryReset()
        {
            _current = _root = default;
            return true;    
        }

        public ChainNavigator List(string field)
        {
            if (_current.IsNull)
                return this;

            var arrayObj = _current.ReadObjectField(field);

            if (!arrayObj.IsNull)
            {
                _currentArray = arrayObj.AsArray();
                _isListContext = true;
                _listField = field;
            }

            return this;
        }

        public DateTime? ReadDateTime(string fieldName)
        {
            IList<ClrObject> result = new List<ClrObject>();

            if (fieldName == null)
                throw new Exception($"Argument for data time parsing is null");


            ClrInstanceField? field = Current.Type.GetFieldByName(fieldName);
            if (field == null)
                return null;

            var dtStruct = field.ReadStruct(Current.Address, false);

            ClrInstanceField? dateDataField = dtStruct.Type.GetFieldByName(Util.ResolveRuntimeFieldName("dateData", _isFrameworkDump));

            if (dateDataField == null)
                throw new Exception($"Field 'dateData' not found in DateTime struct. Please change analysis type to Framework/Core accordinly.");


            // ulong raw = dateDataField.Read<ulong>(dtStruct.Address,true);
            // return DateTime.FromBinary((long)raw);


            ulong raw = dateDataField.Read<ulong>(dtStruct.Address, true);

            long ticksOnly = (long)(raw & 0x3FFFFFFFFFFFFFFF);
            int kindBits = (int)(raw >> 62);

            var date = new DateTime(ticksOnly, DateTimeKind.Unspecified);
            ResetToRoot();
            return date;

        }

        public List<Address> ReadAddress()
        {
            var result = new List<Address>();

            if (!_isListContext || _currentArray == null)
                return result;

            var array = _currentArray;

            for (int i = 0; i < array.Value.Length; i++)
            {
                var item = array.Value.GetObjectValue(i);
                if (!item.IsValid)
                    continue;

                //  Direct read (no new reader, no new navigator)
                int port = item.ReadField<int>("port");

                var ipObj = item.ReadObjectField("ip_addr");
                string? ip = ipObj.ReadObjectField(
                    _isFrameworkDump ? "m_ToString" : "_toString"
                ).AsString();

                if (ip != null)
                    result.Add(new Address(ip, port));
            }

            ResetToRoot();
            return result;
        }

        public List<string> ReadStrings()
        {
            var result = new List<string>();

            if (!_isListContext || _currentArray == null)
                return result;

            var array = _currentArray;

            if (array.Value.Type.ComponentType.ElementType == ClrElementType.String)
            {
                for (int i = 0; i < array.Value.Length; i++)
                {
                    var obj = array.Value.GetObjectValue(i);
                    if (!obj.IsValid)
                        continue;

                    var str = obj.AsString();
                    if (str != null)
                        result.Add(str);
                }
            }

            ResetToRoot();
            return result;
        }

        public List<T> ReadList<T>() where T : unmanaged
        {
            var result = new List<T>();

            if (!_isListContext || _currentArray == null)
                return result;

            var array = _currentArray;

            if (array.Value.Type.ComponentType.IsPrimitive)
            {
                result = array.Value.ReadValues<T>(0, array.Value.Length).ToList();
            }

            ResetToRoot();
            return result;
        }




        public List<T> ReadList<T>(Func<ClrObject, T> selector)
        {
            var result = new List<T>();

            if (!_isListContext || _currentArray == null)
                return result;

            var array = _currentArray;

            for (int i = 0; i < array.Value.Length; i++)
            {
                var item = array.Value.GetObjectValue(i);
                if (!item.IsValid)
                    continue;

                result.Add(selector(item));
            }

            ResetToRoot();
            return result;
        }

        internal ChainNavigator WithHeap(ClrHeap heap)
        {
            Heap = heap;

            if (Heap != null)
                _isFrameworkDump = Util.IsFrameworkDump(Heap.Runtime);

            return this;
        }

        internal ChainNavigator AsRoot()
        {
            _root = _current;
            return this;
        }      

    }

}
