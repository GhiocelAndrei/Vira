using Vira.Abstractions.Models.Identity;

namespace Vira.Abstractions.DTOs;

/// <summary>The signed-in account, as returned by <c>GET /auth/me</c> and after login.</summary>
public class MeDto
{
    public Guid AccountId { get; set; }
    public string Email { get; set; } = string.Empty;
    public AccountType Type { get; set; }
    public Guid? BusinessId { get; set; }
    public string? CompanyName { get; set; }
    public bool OnboardingComplete { get; set; }

    // Creator persona.
    public Guid? CreatorId { get; set; }
    public string? DisplayName { get; set; }   // nav identity (company for brands, creator name for creators)
}

/// <summary>Result of a successful Firebase authentication — carries the session to set as a cookie.</summary>
public class AuthResultDto
{
    public Guid SessionId { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public MeDto Me { get; set; } = new();
}
