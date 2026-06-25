using System.Text.RegularExpressions;

namespace DumpAnalyzerApi_New.ClassMappingParsers
{
    internal static class PropertyParsingHelper
    {
        public static string GetAngleBracketContent(string input)
        {
            var match = Regex.Match(input, @"<([^>]*)>");
            return match.Success ? match.Groups[1].Value : string.Empty;
        }
    }
    public enum PropertyTypeKind
    {
        Primitive,
        Object,
        Enumerable,
        Enum,
        DateTime
    }

    public abstract class PropertyType
    {
        public PropertyTypeKind Kind { get; }

        protected PropertyType(PropertyTypeKind kind)
        {
            Kind = kind;
        }
    }

    /* Primitive Property Types */
    public class PrimitiveType : PropertyType
    {

        private static readonly HashSet<string> PrimitiveTypes =

        [
            "int",
            "long",
            "float",
            "double",
            "bool",
            "string",
            "byte",
            "short",
            "char",
            "decimal"
        ];
        public string Name { get; }

        public PrimitiveType(string name)
            : base(PropertyTypeKind.Primitive)
        {
            Name = name;
        }


        public static bool IsTypeMatch(string typeName)
        {
            return PrimitiveTypes.Contains(typeName);
        }
    }

    public class ObjectType : PropertyType
    {
        public string ClassName { get; }

        public ObjectType(string className)
            : base(PropertyTypeKind.Object)
        {
            ClassName = className;
        }
        public static bool IsTypeMatch(string typeName)
        {
            return ClassMapping.ClassMapping.ClassExists(typeName);
        }
    }

    public enum IteratableType
    {
        List,
        Dictionary
    }
    public class EnumerableType : PropertyType
    {
        public PropertyType ElementType { get; }
        public IteratableType Type {  get; }
        public EnumerableType(string elementTypeName)
            : base(PropertyTypeKind.Enumerable)
        {
            string element = PropertyParsingHelper.GetAngleBracketContent(elementTypeName);
            if (elementTypeName.StartsWith("List<"))
            {
                Type = IteratableType.List;
            }
            else if (elementTypeName.StartsWith("Dictionary<"))
            {
                Type = IteratableType.Dictionary;
            }
            else
            {
                throw new ArgumentException("Enumerable is not registered");
            }
            ElementType = PropertyParser.ParseProperty(element);
        }
        public EnumerableType(PropertyType elementType)
            : base(PropertyTypeKind.Enumerable)
        {
            ElementType = elementType;
        }
        
        public static bool IsTypeMatch(string typeName)
        {
            return (
                (typeName.StartsWith("List<") || typeName.StartsWith("Dictionary<")) 
                && typeName.EndsWith(">")
                );
        }
    }

    public class EnumType : PropertyType
    {
        public string EnumName { get; }

        public EnumType(string enumName)
            : base(PropertyTypeKind.Enum)
        {
            EnumName = PropertyParsingHelper.GetAngleBracketContent(enumName);
        }

        public static bool IsTypeMatch(string typeName)
        {
            return (
                typeName.StartsWith("Enum<") 
                && typeName.EndsWith(">")
                );
        }
    }

    public class DateTimeType : PropertyType
    {
        public DateTimeType()
            : base(PropertyTypeKind.DateTime)
        {
        }

        public static bool IsTypeMatch(string typeName)
        {
            return typeName == "DateTime" || typeName == "DateTimeOffset";
        }
    }

    public class PropertyDefinition
    {
        public string Name { get; set; }

        public PropertyType Type { get; set; }
    }

    public class ClassDefinition
    {
        public string Name { get; set; }

        public List<PropertyDefinition> Properties { get; set; } = new();
    }
}
