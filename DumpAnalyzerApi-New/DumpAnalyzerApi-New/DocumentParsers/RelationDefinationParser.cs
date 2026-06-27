namespace DumpAnalyzerApi_New.DocumentParsers
{
    public class RelationDefinationParser
    {
        public static Dictionary<string, RootDefinition> ParseJsonToRelationMapping(string json)
        {
            var classMappingData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, RootDefinition>>(json);
            return classMappingData ?? new Dictionary<string, RootDefinition>();
        }

        public static Dictionary<string, RootDefinition> ParseJsonToRelationMappingFromFile(string filePath)
        {
            var json = File.ReadAllText(filePath);
            return ParseJsonToRelationMapping(json);
        }
    }
}
