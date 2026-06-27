using System.Text.Json.Serialization;

namespace DumpAnalyzerApi_New.DocumentParsers
{
    public class DumpAnalyzerConfiguration
    {
        public Dictionary<string, RootDefinition> Objects { get; set; } = new();
    }

    public class RootDefinition
    {
        public RootInfo Root { get; set; } = new();

        public List<PathAction> Path { get; set; } = new();

        public string Type { get; set; } = string.Empty;
    }

    public class RootInfo
    {
        /// <summary>
        /// CLR Type name.
        /// Example:
        /// System.Collections.Generic.List<ComplexOrderSystem.Test>
        /// </summary>
        public string Type { get; set; } = string.Empty;

        /// <summary>
        /// Heap index, stack frame index, etc.
        /// Meaning depends on MemoryType.
        /// </summary>
        public int Index { get; set; }

        /// <summary>
        /// Heap, Static, StackVariable...
        /// </summary>
        public MemoryType MemoryType { get; set; }
    }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum MemoryType
    {
        Heap,
        Static,
        StackVariable
    }

    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum PathActionType
    {
        Field,
        StaticField,
        Property,
        StaticProperty,
        Index,
        DictionaryKey,
        First,
        Where,
        Enumerate
    }

    public class PathAction
    {
        public PathActionType Type { get; set; }

        public string Name { get; set; } = string.Empty;
    }
}
