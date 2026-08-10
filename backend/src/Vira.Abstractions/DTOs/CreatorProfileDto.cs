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
    public List<ClipDto> Clips { get; set; } = [];
    public AggregatesDto Aggregates { get; set; } = new();
}
