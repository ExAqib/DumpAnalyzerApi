using Alachisoft.NCache.Common.Net;
using Microsoft.Diagnostics.Runtime;
using Microsoft.OpenApi.Models;

namespace DumpAnalyzerApi.Navigators
{  
    public class ListNavigator : NavigatorBase
    {
        private readonly string _fieldName;

        public ListNavigator(ClrObject obj, ClrObjectReader reader, string fieldName)
            : base(obj, reader)
        {
            _fieldName = fieldName;
        }

        public List<Address> ReadAddress()
        {
            var result = new List<Address>();
            var listOnHeap = Read();
            foreach (ClrObject item in listOnHeap)
            {
                var reader = new ClrObjectReader().From(item);
                var port = reader
                   .Value<int>("port")
                   .Read();

                var ip = reader
                    .Object("ip_addr")
                    .String("_toString")
                    .Read();

                item.GetType().GetField("port");

                result.Add(new Alachisoft.NCache.Common.Net.Address(ip, port));
            }
            return result;
        }

        public List<string> ReadStringList()
        {
            List<string> result = new List<string>();

            if (IsNull)
                return null;

            var underLyingArray = Current.ReadObjectField(_fieldName);

            ClrArray array = underLyingArray.AsArray();

            if (array.Type.ComponentType.IsPrimitive || array.Type.ComponentType.IsString)
            {
               if (array.Type.ComponentType.ElementType == ClrElementType.String)
               {
                    for (int i = 0; i < array.Length; i++)
                    {
                        var val = array.GetObjectValue(i);

                        if (!val.IsValid)
                            continue;

                        string? item = val.AsString();

                        if(item != null)
                            result.Add(item);                        
                    }
                }
            }

            return result;
        }

        public List<T> ReadList<T>() where T : unmanaged
        {
            List<T> result = new List<T>();

            if (IsNull)
                return result;

            var underLyingArray = Current.ReadObjectField(_fieldName);

            ClrArray array = underLyingArray.AsArray();
            Console.WriteLine($"Found an array of type: {array.Type.Name}, Length: {array.Length}");

            // Example 1: Reading an array of simple value types (e.g., int, string)
            if (array.Type.ComponentType.IsPrimitive || array.Type.ComponentType.IsString)
            {
                // You can use ReadContents<T>() for primitive types and strings
                if (array.Type.ComponentType.ElementType == ClrElementType.Int32)
                {
                    result = array.ReadValues<T>(0, array.Length).ToList<T>(); // may be length -1
                    return result;
                }               
            }

            return result;
        }

        public IList<ClrObject> Read()
        {
            IList<ClrObject> result = new List<ClrObject>();

            if (IsNull)
                return result;
            var underLyingArray = Current.ReadObjectField(_fieldName);

            ClrArray array = underLyingArray.AsArray();
            Console.WriteLine($"Found an array of type: {array.Type.Name}, Length: {array.Length}");

            // Example 1: Reading an array of simple value types (e.g., int, string)
            if (array.Type.ComponentType.IsObjectReference)
            {
                for (int i = 0; i < array.Length; i++)
                {
                    ClrObject elementObject = array.GetObjectValue(i);
                    if (elementObject.IsValid)
                    {
                        result.Add(elementObject);
                        // You can further inspect elementObject here
                    }
                }
            }
            return result;
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
