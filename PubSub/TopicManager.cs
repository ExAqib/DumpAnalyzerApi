using Alachisoft.NCache.Caching.Messaging;
using Alachisoft.NCache.Common.Messaging;
using Alachisoft.NCache.Runtime.Caching;
using DumpAnalyzerApi.Common;
using DumpAnalyzerApi.DTOs;
using DumpAnalyzerApi.Navigators;
using Microsoft.Diagnostics.Runtime;

internal partial class TopicManager
{
    static int  _count = -1; // MessageCount in all topics
    private IDictionary<string, object> _topics;

    

    internal static List<TopicDto> Analyze(ClrObject topicManagerObj, ClrHeap heap)
    {
        var topicsField = topicManagerObj.Type.GetFieldByName("_topics");
        bool isFrameworkDump = Util.IsFrameworkDump(heap.Runtime);

        var topicsObj = topicsField.ReadObject(topicManagerObj.Address, false);
        if (!topicsObj.IsValid)
        {
            return null;
        }

        var _dictionaryReader = new ClrDictionaryReader(isFrameworkDump);
        var topics = _dictionaryReader.Read(topicsObj, heap);

        var Topics = new List<TopicDto>();

        foreach (var (topicName, topicObj) in topics)
        {
           var topicReader = new ClrObjectReader();
            topicReader.From(topicObj);

            var topicDto = new TopicDto();

            topicDto.TopicName = topicName;
            topicDto.TopicType = ((TopicType)topicReader.From(topicObj).Value<int>("_type").Read()).ToString();

            string priorityField = Util.GetBackingField("Priority");
            int priorityValue = topicReader.From(topicObj).Value<int>(priorityField).Read();

            topicDto.TopicPriority = ((Alachisoft.NCache.Runtime.Messaging.TopicPriority)priorityValue).ToString();
            
            var count = topicReader.From(topicObj).Object("_subscribers").Value<int>("count").Read();
            var freeList = topicReader.From(topicObj).Object("_subscribers").Value<int>("freeList").Read();

            if (count > 0)
                count = count - freeList;

            topicDto.Subscribers = count;

            count = topicReader.From(topicObj).Object("_subscriptions").Value<int>(Util.ResolveRuntimeFieldName("_count",isFrameworkDump)).Read();
            freeList = topicReader.From(topicObj).Object("_subscriptions").Value<int>(Util.ResolveRuntimeFieldName("_freeList", isFrameworkDump)).Read();

            if (count > 0)
                count = count - freeList;

            topicDto.Subscriptions = count;

            topicDto.Messages = topicReader.From(topicObj).Object("_messages").Value<int>("_count").Read();

            var subReader = new ClrObjectReader();
            subReader.Heap = heap;

            //System.Collections.Generic.Dictionary`2+Entry[[Alachisoft.NCache.Common.SubscriptionIdentifier, Alachisoft.NCache.Common],[Alachisoft.NCache.Caching.Messaging.Subscriptions, Alachisoft.NCache.Cache]]
            var subDict = subReader.From(topicObj)
                .Dictionary("_subscriptions")
                .ReadDictionaryWithObjectKey();

            var subsriptionDetails = new TopicSubscriptionDto();

            foreach (var (subidentifierClr,subObjeClrObject) in subDict)
            {
                subsriptionDetails = GetSubscriptionDetails(subObjeClrObject, heap);

                var reader = new ClrObjectReader();

                SubscriptionPolicyType subPolicyEnum = (SubscriptionPolicyType)reader.From(subidentifierClr)
                    .Value<int>("_subscriptionPolicy")
                    .Read();

                subsriptionDetails.Name = reader.From(subidentifierClr)
                   .String("_subscriptionName")
                   .Read();

                subsriptionDetails.SubscriptionPolicy = subPolicyEnum.ToString();


                if (subPolicyEnum == SubscriptionPolicyType.DurableSharedSubscription)
                {
                    topicDto.DurableShared ++;
                }
                else if (subPolicyEnum == SubscriptionPolicyType.DurableExclusiveSubscription)
                {
                    topicDto.DurableExclusive ++;
                }
                else if (subPolicyEnum == SubscriptionPolicyType.NonDurableExclusiveSubscription)
                {
                    topicDto.NonDurable ++;
                }

                topicDto.SubsriptionDetails.Add( subsriptionDetails);
            }       

            Topics.Add(topicDto);

        }

        return Topics;     
    }

    static TopicSubscriptionDto GetSubscriptionDetails(ClrObject subObjeClrObject, ClrHeap heap)
    {
        TopicSubscriptionDto? rsp = new TopicSubscriptionDto();

        var reader = new ClrObjectReader();

        SubscriptionPolicyType subPolicyEnum = (SubscriptionPolicyType)reader.From(subObjeClrObject)
           .Value<int>("_subscriptionPolicy")
           .Read();

        var  navigator = reader.From(subObjeClrObject);
        rsp.SubscriptionPolicy = subPolicyEnum.ToString();
        rsp.SubscriptionID = "N/A";
        rsp.ExpirationTime = navigator.Value<long>("_expirationTime").Read();

        if (subObjeClrObject.Type.Name.Equals("Alachisoft.NCache.Caching.Messaging.ExclusiveSubscriptions")) 
            rsp.ConnectedClients = [navigator.String("_clientId").Read()];          
      
        else        
             rsp.ConnectedClients = navigator.Object("_connectedClients").ArrayList("_items").ReadStringList();

        rsp.NumberOfClients = rsp.ConnectedClients.Count;
        return rsp;

    }
}
internal enum TopicType
{
    Genaral = 0,
    Events = 1
}