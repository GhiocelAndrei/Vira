namespace Vira.Abstractions.DTOs;

/// <summary>The logged-in creator's real TikTok profile + cached clips (Display API), for the
/// Profile screen. Reuses <see cref="ClipDto"/> + <see cref="AggregatesDto"/>.</summary>
public class CreatorProfileDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public long FollowerCount { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Niche { get; set; }
    /// <summary>False until the creator completes the one-time onboarding clip selection — the frontend
    /// shows the selection panel while this is false, and the clip list is then the fetched candidates.</summary>
    public bool ClipsSelected { get; set; }
    /// <summary>False until the creator submits their intake questionnaire — the second onboarding step.</summary>
    public bool QuestionnaireComplete { get; set; }
    public List<ClipDto> Clips { get; set; } = [];
    public AggregatesDto Aggregates { get; set; } = new();
}
