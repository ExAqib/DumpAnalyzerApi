using DumpAnalyzerApi_New.ClassMappingParsers;
using Microsoft.AspNetCore.DataProtection.KeyManagement;

namespace DumpAnalyzerApi_New.ClassMapping
{

    public static class ClassMapping
    {
        public static Dictionary<string, ClassDefinition> Classes { get; set; } = new();

        public static bool ClassExists(string className)
        {
            return Classes.ContainsKey(className);
        }
        public static void PopulateClassMapping(Dictionary<string, Dictionary<string, string>> classMappingData)
        {
            foreach (var key in classMappingData.Keys)
            {
                Classes.Add(key, new ClassDefinition()); // a default value
            }
            foreach (var classEntry in classMappingData)
            {
                var className = classEntry.Key;
                var propertiesData = classEntry.Value;
                var classDefinition = ClassParser.ParseClassDefinition(className, propertiesData);
                Classes[className] = classDefinition;
            }
        }
    }
}
