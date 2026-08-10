using Microsoft.AspNetCore.DataProtection;
using Vira.Application.Services;
using Xunit;

namespace Vira.Tests;

/// <summary>TikTok tokens must be encrypted at rest (CLAUDE.md) — the protector round-trips them and
/// never stores plaintext.</summary>
public class TokenProtectorTests
{
    private static readonly ITokenProtector Protector = new TokenProtector(new EphemeralDataProtectionProvider());

    [Theory]
    [InlineData("act.abcDEF123.-_rotating")]
    [InlineData("")]
    public void Protect_then_Unprotect_returns_the_original(string token)
    {
        var encrypted = Protector.Protect(token);
        Assert.Equal(token, Protector.Unprotect(encrypted));
    }

    [Fact]
    public void Protected_value_is_not_the_plaintext()
    {
        const string token = "refresh.super-secret";
        Assert.NotEqual(token, Protector.Protect(token));
    }
}
