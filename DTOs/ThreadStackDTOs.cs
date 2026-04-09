namespace DumpAnalyzerApi.DTOs;

public class ThreadStackDto
{
    public int ManagedThreadId { get; set; }
    public string OSThreadId { get; set; }
    public int OSIdDecimal { get; set; }
    public List<string> StackFrames { get; set; } = new();
}
