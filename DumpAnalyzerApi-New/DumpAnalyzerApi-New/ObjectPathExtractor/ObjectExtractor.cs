using DumpAnalyzerApi_New.DocumentParsers;
using Microsoft.Diagnostics.Runtime;
using Microsoft.Diagnostics.Runtime.Interfaces;

namespace DumpAnalyzerApi_New.ObjectPathExtractor
{
    public class ObjectExtractor
    {
        private readonly ClrRuntime _runtime;

        public ObjectExtractor(ClrRuntime runtime)
        {
            _runtime = runtime;
        }

        /// <summary>
        /// Entry point: resolves the root object then traverses the path.
        /// </summary>
        public ClrObject GetObject(RootDefinition rootDefinition)
        {
            ClrObject rootObject = GetRootObject(rootDefinition.Root);
            return TraversePath(rootObject, rootDefinition.Path);
        }

        private ClrObject GetRootObject(RootInfo rootInfo)
        {
            switch (rootInfo.MemoryType)
            {
                case MemoryType.Heap:
                    {
                        // Enumerate all objects on the heap and find the one at the given index.
                        var heap = _runtime.Heap;
                        int idx = 0;
                        foreach (ClrObject obj in heap.EnumerateObjects())
                        {
                            if (!obj.IsValid) continue;
                            if (string.IsNullOrEmpty(rootInfo.Type) || obj.Type?.Name == rootInfo.Type)
                            {
                                if (idx == rootInfo.Index)
                                    return obj;
                                idx++;
                            }
                        }
                        throw new InvalidOperationException(
                            $"No heap object of type '{rootInfo.Type}' found at index {rootInfo.Index}.");
                    }

                case MemoryType.Static:
                    {
                        // Walk all types looking for a matching static field.
                        //var heap = _runtime.Heap;
                        //foreach (ClrType type in heap.EnumerateTypes())
                        //{
                        //    if (type.Name != rootInfo.Type) continue;
                        //    foreach (ClrStaticField staticField in type.StaticFields)
                        //    {
                        //        // AppDomain-aware: use the first app domain that has a value.
                        //        foreach (ClrAppDomain domain in _runtime.AppDomains)
                        //        {
                        //            ulong addr = staticField.GetAddress(domain);
                        //            if (addr == 0) continue;
                        //            ClrObject obj = heap.GetObject(addr);
                        //            if (obj.IsValid) return obj;
                        //        }
                        //    }
                        //}
                        throw new InvalidOperationException(
                            $"No static object of type '{rootInfo.Type}' found.");
                    }

                case MemoryType.StackVariable:
                    {
                        // Walk all threads and their stack frames looking for a local at the given index.
                        //int frameIdx = rootInfo.Index;
                        //var heap = _runtime.Heap;
                        //foreach (ClrThread thread in _runtime.Threads)
                        //{
                        //    foreach (ClrStackFrame frame in thread.EnumerateStackTrace())
                        //    {
                        //        if (frame.Method == null) continue;
                        //        int localIdx = 0;
                        //        foreach (ClrValue local in frame.EnumerateLocals())
                        //        {
                        //            if (localIdx == frameIdx)
                        //            {
                        //                ulong addr = local.Address;
                        //                ClrObject obj = heap.GetObject(addr);
                        //                if (obj.IsValid &&
                        //                    (string.IsNullOrEmpty(rootInfo.Type) || obj.Type?.Name == rootInfo.Type))
                        //                    return obj;
                        //            }
                        //            localIdx++;
                        //        }
                        //    }
                        //}
                        throw new InvalidOperationException(
                            $"No stack variable of type '{rootInfo.Type}' found at index {rootInfo.Index}.");
                    }

                default:
                    throw new NotSupportedException($"MemoryType '{rootInfo.MemoryType}' is not supported.");
            }
        }

        private ClrObject TraversePath(ClrObject currentObject, List<PathAction> pathActions)
        {
            foreach (var action in pathActions)
            {
                switch (action.Type)
                {
                    case PathActionType.Field:
                        currentObject = GetField(currentObject, action.Name);
                        break;

                    case PathActionType.StaticField:
                        currentObject = GetStaticField(currentObject, action.Name);
                        break;

                    case PathActionType.Property:
                    case PathActionType.StaticProperty:
                        // ClrMD doesn't expose property getters directly;
                        // properties are backed by auto-generated fields (<Name>k__BackingField).
                        currentObject = GetBackingField(currentObject, action.Name);
                        break;

                    case PathActionType.Index:
                        currentObject = GetIndex(currentObject, action.Name);
                        break;

                    //case PathActionType.DictionaryKey:
                    //    currentObject = GetDictionaryValue(currentObject, action.Name);
                    //    break;

                    //case PathActionType.First:
                    //    currentObject = GetFirst(currentObject);
                    //    break;

                    //case PathActionType.Where:
                    //    // action.Name holds the field=value predicate, e.g. "Status=Active"
                    //    currentObject = GetWhere(currentObject, action.Name);
                    //    break;

                    //case PathActionType.Enumerate:
                    //    // Returns the Nth element; action.Name is the numeric index string.
                    //    currentObject = GetEnumerated(currentObject, action.Name);
                    //    break;

                    default:
                        throw new NotSupportedException($"Path action type '{action.Type}' is not supported.");
                }
            }
            return currentObject;
        }

        // ── Field access ─────────────────────────────────────────────────────────

        private static ClrObject GetField(ClrObject obj, string fieldName)
        {
            ClrInstanceField? field = obj.Type?.GetFieldByName(fieldName)
                ?? throw new InvalidOperationException(
                    $"Field '{fieldName}' not found on type '{obj.Type?.Name}'.");

            ulong addr = field.GetAddress(obj.Address);
            ClrObject result = obj.Type!.Heap.GetObject(addr);

            if (!result.IsValid)
                throw new InvalidOperationException(
                    $"Field '{fieldName}' on '{obj.Type?.Name}' did not yield a valid object.");

            return result;
        }

        private static ClrObject GetStaticField(ClrObject obj, string fieldName)
        {
            ClrStaticField? field = obj.Type?.StaticFields
                .FirstOrDefault(f => f.Name == fieldName)
                ?? throw new InvalidOperationException(
                    $"Static field '{fieldName}' not found on type '{obj.Type?.Name}'.");

            // Use the first app domain that has a non-zero address.
            ClrHeap heap = obj.Type!.Heap;
            foreach (ClrAppDomain domain in heap.Runtime.AppDomains)
            {
                ulong addr = field.GetAddress(domain);
                if (addr == 0) continue;
                ClrObject result = heap.GetObject(addr);
                if (result.IsValid) return result;
            }
            throw new InvalidOperationException(
                $"Static field '{fieldName}' on '{obj.Type?.Name}' has no initialized value.");
        }

        /// <summary>
        /// Auto-properties are stored as compiler-generated backing fields named
        /// "&lt;PropertyName&gt;k__BackingField".
        /// </summary>
        private static ClrObject GetBackingField(ClrObject obj, string propertyName)
        {
            string backingName = $"<{propertyName}>k__BackingField";
            return GetField(obj, backingName);
        }

        // ── Indexed / collection access ───────────────────────────────────────────

        private static ClrObject GetIndex(ClrObject obj, string indexStr)
        {
            if (!int.TryParse(indexStr, out int index))
                throw new ArgumentException($"Index '{indexStr}' is not a valid integer.");

            ClrType type = obj.Type
                ?? throw new InvalidOperationException("Object has no type information.");

            // Arrays
            if (type.IsArray)
            {
                ulong elementAddr = type.GetArrayElementAddress(obj.Address, index);
                return type.Heap.GetObject(elementAddr);
            }

            // List<T> — the backing store is a field named "_items".
            ClrInstanceField? itemsField = type.GetFieldByName("_items");
            if (itemsField != null)
            {
                ulong itemsAddr = itemsField.GetAddress(obj.Address);
                ClrObject items = type.Heap.GetObject(itemsAddr);
                if (items.Type?.IsArray == true)
                {
                    ulong elementAddr = items.Type.GetArrayElementAddress(items.Address, index);
                    return items.Type.Heap.GetObject(elementAddr);
                }
            }

            throw new NotSupportedException(
                $"GetIndex is not supported for type '{type.Name}'.");
        }

        //private static ClrObject GetDictionaryValue(ClrObject obj, string key)
        //{
        //    ClrType type = obj.Type
        //        ?? throw new InvalidOperationException("Object has no type information.");

        //    // Dictionary<TKey,TValue> stores entries in an "entries" array.
        //    // Each entry is a value type with fields: key, value, hashCode, next.
        //    ClrInstanceField? entriesField = type.GetFieldByName("entries")
        //        ?? throw new InvalidOperationException(
        //            $"Cannot find 'entries' field on '{type.Name}'. Is this a Dictionary<,>?");

        //    ulong entriesAddr = entriesField.GetAddress(obj.Address);
        //    ClrObject entries = type.Heap.GetObject(entriesAddr);

        //    if (entries.Type?.IsArray != true)
        //        throw new InvalidOperationException("'entries' field is not an array.");

        //    int length = entries.Type.GetArrayLength(entries.Address);
        //    for (int i = 0; i < length; i++)
        //    {
        //        ulong entryAddr = entries.Type.GetArrayElementAddress(entries.Address, i);
        //        // Read the key field from the struct element.
        //        ClrType? entryType = entries.Type.ComponentType;
        //        ClrInstanceField? keyField = entryType?.GetFieldByName("key");
        //        if (keyField == null) continue;

        //        object? entryKey = keyField.Read<ulong>(entryAddr, interior: true);
        //        if (entryKey?.ToString() == key)
        //        {
        //            ClrInstanceField? valueField = entryType!.GetFieldByName("value")
        //                ?? throw new InvalidOperationException("Dictionary entry has no 'value' field.");
        //            ulong valueAddr = valueField.GetAddress(entryAddr, interior: true);
        //            return type.Heap.GetObject(valueAddr);
        //        }
        //    }
        //    throw new KeyNotFoundException($"Key '{key}' not found in dictionary.");
        //}

        //// ── LINQ-like enumeration ─────────────────────────────────────────────────

        //private static ClrObject GetFirst(ClrObject obj)
        //{
        //    foreach (ClrObject element in EnumerateCollection(obj))
        //        return element;

        //    throw new InvalidOperationException("Collection is empty; cannot get First element.");
        //}

        ///// <summary>
        ///// Finds the first element where &lt;fieldName&gt; == &lt;value&gt;.
        ///// <paramref name="predicate"/> format: "FieldName=Value"
        ///// </summary>
        //private static ClrObject GetWhere(ClrObject obj, string predicate)
        //{
        //    int sep = predicate.IndexOf('=');
        //    if (sep < 0)
        //        throw new ArgumentException(
        //            $"Where predicate '{predicate}' must be in 'FieldName=Value' format.");

        //    string fieldName = predicate[..sep].Trim();
        //    string expected = predicate[(sep + 1)..].Trim();

        //    foreach (ClrObject element in EnumerateCollection(obj))
        //    {
        //        ClrInstanceField? field = element.Type?.GetFieldByName(fieldName);
        //        if (field == null) continue;

        //        object? value = field.Read<object>(element.Address, interior: false);
        //        if (value?.ToString() == expected)
        //            return element;
        //    }
        //    throw new InvalidOperationException(
        //        $"No element matching '{predicate}' found in collection.");
        //}

        ///// <summary>
        ///// Returns the element at position <paramref name="indexStr"/> after enumerating the collection.
        ///// </summary>
        //private static ClrObject GetEnumerated(ClrObject obj, string indexStr)
        //{
        //    if (!int.TryParse(indexStr, out int index))
        //        throw new ArgumentException($"Enumerate index '{indexStr}' is not a valid integer.");

        //    int i = 0;
        //    foreach (ClrObject element in EnumerateCollection(obj))
        //    {
        //        if (i == index) return element;
        //        i++;
        //    }
        //    throw new IndexOutOfRangeException(
        //        $"Collection has fewer than {index + 1} elements.");
        //}

        ///// <summary>
        ///// Unified helper that yields each ClrObject from an array, List&lt;T&gt;, or
        ///// any type that exposes a backing "_items" array.
        ///// </summary>
        //private static IEnumerable<ClrObject> EnumerateCollection(ClrObject obj)
        //{
        //    ClrType type = obj.Type
        //        ?? throw new InvalidOperationException("Object has no type information.");

        //    if (type.IsArray)
        //    {
        //        int len = type.GetArrayLength(obj.Address);
        //        for (int i = 0; i < len; i++)
        //        {
        //            ulong addr = type.GetArrayElementAddress(obj.Address, i);
        //            yield return type.Heap.GetObject(addr);
        //        }
        //        yield break;
        //    }

        //    // List<T>
        //    ClrInstanceField? itemsField = type.GetFieldByName("_items");
        //    ClrInstanceField? sizeField = type.GetFieldByName("_size");
        //    if (itemsField != null)
        //    {
        //        ulong itemsAddr = itemsField.GetAddress(obj.Address);
        //        ClrObject items = type.Heap.GetObject(itemsAddr);
        //        int count = sizeField != null
        //            ? sizeField.Read<int>(obj.Address, interior: false)
        //            : (items.Type?.GetArrayLength(items.Address) ?? 0);

        //        if (items.Type?.IsArray == true)
        //        {
        //            for (int i = 0; i < count; i++)
        //            {
        //                ulong addr = items.Type.GetArrayElementAddress(items.Address, i);
        //                yield return items.Type.Heap.GetObject(addr);
        //            }
        //        }
        //        yield break;
        //    }

        //    throw new NotSupportedException(
        //        $"Cannot enumerate objects of type '{type.Name}'.");
        //}
    }
}