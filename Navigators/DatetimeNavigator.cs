using Alachisoft.NCache.Common.Net;
using DumpAnalyzerApi.Common;
using Microsoft.Diagnostics.Runtime;

namespace DumpAnalyzerApi.Navigators
{
    public class DatetimeNavigator: NavigatorBase 
    {
        private readonly string _fieldName;

        public DatetimeNavigator(ClrObject obj, ClrObjectReader reader, string fieldName)
            : base(obj, reader)
        {
            _fieldName = fieldName;
        }

        public DateTime? ReadDateTime()
        {
            IList<ClrObject> result = new List<ClrObject>();

            if (IsNull)
                throw new Exception($"Argument for data time parsing is null"); 


            ClrInstanceField? field = Current.Type.GetFieldByName(_fieldName);
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

            return new DateTime(ticksOnly, DateTimeKind.Unspecified);

        }      
    }
}
