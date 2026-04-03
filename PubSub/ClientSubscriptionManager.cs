using DumpAnalyzerApi.Common;
using DumpAnalyzerApi.DTOs;
using DumpAnalyzerApi.Navigators;
using Microsoft.Diagnostics.Runtime;

namespace DumpAnalyzerApi.PubSub
{
    internal class ClientSubscriptionManager
    {
        public static ClientSubscriptionManagerDto Analyze(ClrObject clientSubscriptionManager, ClrHeap heap)
        {
            DateTime? last = ReadDateTime(clientSubscriptionManager, "_lastActivityTime", heap);
            DateTime? update = ReadDateTime(clientSubscriptionManager, "_updateTime", heap);
            DateTime? poll = ReadDateTime(clientSubscriptionManager, "_pollTime", heap);
            string clientID = GetClientFromClientSubscriptionManager(clientSubscriptionManager, heap);

            int? msgCount = GetMessageCount(clientSubscriptionManager, heap);

            var ClientSubscriptionManagerDto = new ClientSubscriptionManagerDto
            {
                ClientID = clientID,
                LastActivityTime = last,
                UpdateTime = update,
                PollTime = poll,
                MessageCount = msgCount ?? 0
            };

            return ClientSubscriptionManagerDto;
        }

        static DateTime? ReadDateTime(ClrObject obj, string fieldName, ClrHeap heap)
        {
            bool isFrameworkDump = Util.IsFrameworkDump(heap.Runtime);

            ClrInstanceField? field = obj.Type.GetFieldByName(fieldName);
            if (field == null)
                return null;

            var dtStruct = field.ReadStruct(obj.Address, false);

            ClrInstanceField? dateDataField;

            if (isFrameworkDump)
                dateDataField = dtStruct.Type.GetFieldByName("dateData");
            else
                dateDataField = dtStruct.Type.GetFieldByName("_dateData");

            if (dateDataField == null)
                throw new Exception($"Field 'dateData' not found in DateTime struct. Please change analysis type to Framework/Core accordinly.");


            // ulong raw = dateDataField.Read<ulong>(dtStruct.Address,true);
            // return DateTime.FromBinary((long)raw);


            ulong raw = dateDataField.Read<ulong>(dtStruct.Address, true);

            long ticksOnly = (long)(raw & 0x3FFFFFFFFFFFFFFF);
            int kindBits = (int)(raw >> 62);

            return new DateTime(ticksOnly, DateTimeKind.Unspecified);

        }

        private static string? GetClientFromClientSubscriptionManager(ClrObject obj, ClrHeap heap)
        {
            return obj.Type?.GetFieldByName("<ClientID>k__BackingField")?.ReadString(obj.Address, false);
        }

        static int? GetMessageCount(ClrObject parentObj, ClrHeap heap)
        {
            var reader = new ClrObjectReader();

            return reader.From(parentObj)
               .Object("_messages")
               .Object("_orderedDictionary")
               .Object("_objectsTable")
               .Value<int>("count")
               .Read();
        }
    }
}
