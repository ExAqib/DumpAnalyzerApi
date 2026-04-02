using Microsoft.Diagnostics.Runtime;
using System.Collections.Concurrent;

namespace DumpAnalyzerApi.Services;

public class DumpSessionManager : IDisposable
{
    private readonly ConcurrentDictionary<Guid, DataTarget> _sessions = new();

    public Guid LoadDump(string dumpPath)
    {
        if (!File.Exists(dumpPath))
        {
            throw new FileNotFoundException($"Dump file not found at: {dumpPath}");
        }

        var dataTarget = DataTarget.LoadDump(dumpPath);
        
        // Ensure there is at least one CLR version before returning token
        if (dataTarget.ClrVersions.Length == 0)
        {
            dataTarget.Dispose();
            throw new InvalidOperationException("No CLR versions found in the dump. Ensure this is a valid .NET memory dump.");
        }

        var token = Guid.NewGuid();
        _sessions.TryAdd(token, dataTarget);

        return token;
    }

    public DataTarget? GetSession(Guid token)
    {
        _sessions.TryGetValue(token, out var dataTarget);
        return dataTarget;
    }
    
    public bool UnloadDump(Guid token)
    {
        if (_sessions.TryRemove(token, out var dataTarget))
        {
            dataTarget.Dispose();
            return true;
        }
        return false;
    }

    public void Dispose()
    {
        foreach (var session in _sessions.Values)
        {
            session.Dispose();
        }
        _sessions.Clear();
    }
}
