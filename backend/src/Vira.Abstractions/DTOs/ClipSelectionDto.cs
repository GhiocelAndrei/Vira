namespace Vira.Abstractions.DTOs;

/// <summary>
/// A creator's onboarding clip selection: up to 10 TikTok video ids, picked from the clips we
/// already fetched on login. Posting this keeps only these clips and discards the rest.
/// </summary>
public class ClipSelectionRequestDto
{
    public List<string> TikTokVideoIds { get; set; } = [];
}
