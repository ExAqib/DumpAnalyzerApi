namespace DumpAnalyzerApi.DTOs;

public class AuthRequest
{
    public string FilePath { get; set; } = string.Empty;
}

public class TokenResponse
{
    public string Token { get; set; } = string.Empty;
}
