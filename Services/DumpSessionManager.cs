using Microsoft.Diagnostics.Runtime;
using System.Collections.Concurrent;

namespace DumpAnalyzerApi.Services;

public class DumpSessionManager : IDisposable
{
    private readonly ConcurrentDictionary<Guid, DumpSession> _sessions = new();

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

        var session = new DumpSession()
        {
            Token = token,
            DataTarget = dataTarget,
            DumpPath = dumpPath
        };

        _sessions.TryAdd(token, session);

        return token;
    }

    public DataTarget? GetDataTargetFromSession(Guid token)
    {
        return GetSession(token)?.DataTarget;
    }

    public DumpSession? GetSession(Guid token)
    {
        _sessions.TryGetValue(token, out var session);
        return session;
    }
    
    public bool UnloadDump(Guid token)
    {
        if (_sessions.TryRemove(token, out var dataTarget))
        {
            dataTarget?.DataTarget?.Dispose();
            return true;
        }
        return false;
    }

    public void Dispose()
    {
        foreach (var session in _sessions.Values)
        {
            session?.DataTarget?.Dispose();
        }
        _sessions.Clear();
    }
}
