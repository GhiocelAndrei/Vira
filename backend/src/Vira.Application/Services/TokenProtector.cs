using Microsoft.AspNetCore.DataProtection;

namespace Vira.Application.Services;

/// <summary>Encrypts/decrypts TikTok access + refresh tokens before they touch the DB
/// (CLAUDE.md: tokens encrypted at rest). Backed by ASP.NET Data Protection.</summary>
public interface ITokenProtector
{
    string Protect(string plaintext);
    string Unprotect(string protectedText);
}

public class TokenProtector : ITokenProtector
{
    private readonly IDataProtector _protector;

    public TokenProtector(IDataProtectionProvider provider)
    {
        // Purpose string versions the protector — bump if the token format ever changes.
        _protector = provider.CreateProtector("Vira.TikTokTokens.v1");
    }

    public string Protect(string plaintext) => _protector.Protect(plaintext);
    public string Unprotect(string protectedText) => _protector.Unprotect(protectedText);
}
