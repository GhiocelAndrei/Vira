using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Vira.Abstractions.Constants;
using Vira.Abstractions.Models.Identity;
using Vira.Abstractions.Settings;
using Vira.Api.Auth;
using Vira.Application;
using Vira.Application.Auth;
using Vira.Application.Seed;
using Vira.DataAccess;

var builder = WebApplication.CreateBuilder(args);

// Controllers (D3) + OpenAPI/Swagger (frontend generates types from the spec).
// Serialize enums as their string names so the public API contract matches the ai-service
// payload (and reads cleanly for the frontend + Python clients) rather than bare integers.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Settings binding.
builder.Services.Configure<AiSettings>(builder.Configuration.GetSection("Ai"));
builder.Services.Configure<TikTokSettings>(builder.Configuration.GetSection("TikTok"));
builder.Services.Configure<FirebaseSettings>(builder.Configuration.GetSection("Firebase"));

// Application layer wires DataAccess, Mapster, and the service clients.
var connectionString = builder.Configuration.GetConnectionString("Postgres") ?? string.Empty;
builder.Services.AddApplication(connectionString);

// Persist the Data Protection key ring in Postgres so encrypted TikTok tokens survive restarts
// (the Container Apps filesystem is ephemeral).
builder.Services.AddDataProtection().PersistKeysToDbContext<ViraDbContext>();

// Firebase Admin — verifies business ID tokens. No-ops when unconfigured (placeholder env).
FirebaseInitializer.Initialize(builder.Configuration.GetSection("Firebase").Get<FirebaseSettings>() ?? new());

// CORS for the SPA (credentials required so the session cookie flows cross-site).
var allowedOrigins = builder.Configuration.GetSection("App:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173"];
builder.Services.AddCors(o => o.AddPolicy("spa", p => p
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

// Auth: our own session-cookie scheme + a Business policy for brand endpoints.
builder.Services.AddAuthentication(AuthConstants.SessionScheme)
    .AddScheme<AuthenticationSchemeOptions, SessionAuthenticationHandler>(AuthConstants.SessionScheme, null);
builder.Services.AddAuthorization(o =>
{
    o.AddPolicy(AuthConstants.BusinessPolicy, p => p
        .RequireAuthenticatedUser()
        .RequireClaim(AuthConstants.Claims.AccountType, nameof(AccountType.Business)));
    o.AddPolicy(AuthConstants.CreatorPolicy, p => p
        .RequireAuthenticatedUser()
        .RequireClaim(AuthConstants.Claims.AccountType, nameof(AccountType.Creator)));
});

var app = builder.Build();

// Apply migrations on startup (runs from inside the container — the only reliable path given the
// Azure Postgres firewall) and seed the demo brands/campaigns. Skipped when no connection string.
if (!string.IsNullOrWhiteSpace(connectionString))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ViraDbContext>();
    db.Database.Migrate();
    await DemoBrandSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("spa");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
