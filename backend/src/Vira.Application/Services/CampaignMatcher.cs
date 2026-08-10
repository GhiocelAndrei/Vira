using Vira.Abstractions.Models.Campaigns;
using Vira.Abstractions.Models.Creators;

namespace Vira.Application.Services;

/// <summary>A creator↔campaign match: a score (0..100) and grounded reasons (dev-doc D10).</summary>
public record MatchResult(double Percent, IReadOnlyList<string> Reasons);

/// <summary>
/// Scores how well a campaign fits a creator. Matching is information, not a gate — the feed shows
/// the score and (eventually) explains it, but creators choose freely.
/// </summary>
public interface ICampaignMatcher
{
    MatchResult Match(Creator creator, Campaign campaign);
}

/// <summary>
/// Placeholder matcher: every campaign fits at 100% with no reasons. A deliberate seam — swap this
/// for the real engine (StyleVector similarity + grounded AI reasons) without touching the feed
/// endpoint or DTO.
/// </summary>
public class StubCampaignMatcher : ICampaignMatcher
{
    public MatchResult Match(Creator creator, Campaign campaign) => new(100, []);
}
