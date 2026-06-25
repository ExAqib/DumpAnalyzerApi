namespace DumpAnalyzerApi_New.ClassMappingParsers
{
    public class ClassMappingJsonParser
    {
        public static Dictionary<string, Dictionary<string, string>> ParseJsonToClassMapping(string json)
        {
            var classMappingData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, string>>>(json);
            return classMappingData ?? new Dictionary<string, Dictionary<string, string>>();
        }

        public static Dictionary<string, Dictionary<string, string>> ParseJsonToClassMappingFromFile(string filePath)
        {
            var json = File.ReadAllText(filePath);
            return ParseJsonToClassMapping(json);
        }
    }
}
