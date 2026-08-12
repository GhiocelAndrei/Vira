namespace Vira.Abstractions.Common;

/// <summary>
/// 8 scored style dimensions, each 0.0–1.0 (dev-doc §6). Produced by the AI creator portrait and
/// reused as a campaign's target vector, so both sides share this type and similarity is computed on
/// one scale. Doubles are fine here — this is not the money path (CLAUDE.md rule 1 governs money
/// only). TODO: similarity logic later.
/// </summary>
public class StyleVector
{
    public double Warmth { get; set; }
    public double Energy { get; set; }
    public double Authority { get; set; }
    public double Refinement { get; set; }
    public double Convention { get; set; }
    public double Humor { get; set; }
    public double Demonstration { get; set; }
    public double Intimacy { get; set; }
}
