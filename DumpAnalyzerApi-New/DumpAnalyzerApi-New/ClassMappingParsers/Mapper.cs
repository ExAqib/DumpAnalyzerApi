using Microsoft.AspNetCore.DataProtection.KeyManagement;

namespace DumpAnalyzerApi_New.ClassMappingParsers
{

    public class ClassParser
    {
        public static ClassDefinition ParseClassDefinition(string className, Dictionary<string, string> propertiesData)
        {
            var classDefinition = new ClassDefinition
            {
                Name = className,
                Properties = new List<PropertyDefinition>()
            };
            foreach (var propertyEntry in propertiesData)
            {
                var propertyName = propertyEntry.Key;
                var propertyTypeString = propertyEntry.Value;
                var propertyDefinition = PropertyParser.ParsePropertyDefination(propertyName, propertyTypeString);
                classDefinition.Properties.Add(propertyDefinition);
            }
            return classDefinition;
        }

    }

    public class PropertyParser
    {
        public static PropertyType ParseProperty(string value)
        {
            PropertyType propertyType;

            if (PrimitiveType.IsTypeMatch(value))
            {
                propertyType = new PrimitiveType(value);
            }
            else if (EnumerableType.IsTypeMatch(value))
            {
                propertyType = new EnumerableType(value);
            }
            else if(EnumType.IsTypeMatch(value))
            {
                propertyType = new EnumType(value);
            }
            else if(DateTimeType.IsTypeMatch(value))
            {
                propertyType = new DateTimeType();
            }
            else if(ObjectType.IsTypeMatch(value))
            {
                propertyType = new ObjectType(value);
            }
            else
            {
                throw new Exception($"Unknown property type: {value}");
            }

            return propertyType;
        }
        public static PropertyDefinition ParsePropertyDefination(string key, string value)
        {
            PropertyDefinition propertyDefination = new PropertyDefinition();
            propertyDefination.Name = key;
            propertyDefination.Type = ParseProperty(value);

            return propertyDefination;
        }
    }
}
