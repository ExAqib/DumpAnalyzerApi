namespace DumpAnalyzerApi.DTOs;

public class BucketDto
{
    public int BucketId { get; set; }
    public string State { get; set; } = string.Empty;
    public string TemporaryOwner { get; set; } = string.Empty;
    public string PermanentOwner { get; set; } = string.Empty;
}

public class HashMapResponse
{
    public List<BucketDto> Buckets { get; set; } = new();
}
