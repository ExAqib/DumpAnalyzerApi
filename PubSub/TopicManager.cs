using DumpAnalyzerApi.Common;
using DumpAnalyzerApi.DTOs;
using Microsoft.Diagnostics.Runtime;
using Alachisoft.NCache.Caching.Messaging;

internal partial class TopicManager
{
    static int  _count = -1; // MessageCount in all topics
    private IDictionary<string, object> _topics;

    internal static object Analyze(ClrObject topicManagerObj, ClrHeap heap)
    {

        var topicsField = topicManagerObj.Type.GetFieldByName("_topics");
        

        var topicsObj = topicsField.ReadObject(topicManagerObj.Address, false);
        if (!topicsObj.IsValid)
        {
            return null;
        }

        var _dictionaryReader = new ClrDictionaryReader();
        var topics = _dictionaryReader.Read(topicsObj, heap);

        var Topics = new List<TopicDto>();

       // foreach (string name in (ICollection<string>)topicNames)
       // {
         //   Topics.Add(new TopicDto() { TopicName = name });
       // }

        return  topics.Keys;

        foreach (var (topicName, topicObj) in topics)
        {
            var topicDto = new TopicDto();

            var subsField = topicObj.Type?.GetFieldByName("_subscriptions");
            var subsObj = subsField.ReadObject(topicObj.Address, false);

            var typeField = topicObj.Type?.GetFieldByName("_type");
            var topicType = typeField.Read<int>(topicObj, false);
            //topicDto.TopicType = Enum.Parse(Alachisoft.NCache.Caching.Messaging.TopicType, topicType);

            int count = ClrDictionaryReader.GetDictionaryCount(subsObj);
            
        }
        
        return null;        
    }


    
}