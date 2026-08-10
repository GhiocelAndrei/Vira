using System.Text.Json;

namespace Vira.Abstractions.DTOs;

/// <summary>
/// The body the ai-service POSTs to <c>POST /creator/{creatorId}/clips/{tikTokVideoId}/analysis</c>.
/// The version stamps are typed (we use them); the scored analysis itself is taken as a raw
/// <see cref="JsonElement"/> and stored verbatim — the ontology is versioned and evolves, so the
/// backend keeps the AI output as-is rather than dropping fields it doesn't model. The authored
/// shape is the analyzer's Pydantic contract in the ai-service.
/// </summary>
public class ClipAnalysisDto
{
    public JsonElement Analysis { get; set; }
    public string AiModel { get; set; } = string.Empty;
    public string PromptVersion { get; set; } = string.Empty;
    public string OntologyVersion { get; set; } = string.Empty;
    public DateTimeOffset AnalyzedAt { get; set; }
}
