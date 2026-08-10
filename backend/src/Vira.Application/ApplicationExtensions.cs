using Mapster;
using MapsterMapper;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Vira.Abstractions.Settings;
using Vira.Application.Interfaces;
using Vira.Application.Mapping;
using Vira.Application.Seed;
using Vira.Application.Services;
using Vira.DataAccess;

namespace Vira.Application;

public static class ApplicationExtensions
{
    public static IServiceCollection AddApplication(this IServiceCollection services, string connectionString)
    {
        // DataAccess layer (EF Core / Postgres)
        services.AddDataAccess(connectionString);

        // Mapster (scans IRegister configs in this assembly)
        var mapsterConfig = TypeAdapterConfig.GlobalSettings;
        mapsterConfig.Scan(typeof(MappingRegister).Assembly);
        services.AddSingleton(mapsterConfig);
        services.AddScoped<IMapper, ServiceMapper>();

        // External-service clients over pooled HttpClient (IHttpClientFactory).
        // AiSettings is bound in Program.cs; the delegate runs lazily at client-creation time.
        services.AddHttpClient<IAiModelClient, AiServiceClient>((sp, client) =>
        {
            var ai = sp.GetRequiredService<IOptions<AiSettings>>().Value;
            if (!string.IsNullOrWhiteSpace(ai.BaseUrl))
                client.BaseAddress = new Uri(ai.BaseUrl);
            client.Timeout = TimeSpan.FromSeconds(ai.TimeoutSeconds);
        });
        services.AddHttpClient<ITikTokClient, TikTokClient>((sp, client) =>
        {
            // Display API host; the Login Kit authorize URL is a separate absolute URL.
            client.BaseAddress = new Uri("https://open.tiktokapis.com");
        });

        // Mocked creator data source (the brand-facing roster). Singleton so the Guids it generates
        // at startup stay stable for the process lifetime.
        services.AddSingleton<IMockCreatorSeed, MockCreatorSeed>();

        // Token encryption at rest (ASP.NET Data Protection is configured in Program.cs).
        services.AddSingleton<ITokenProtector, TokenProtector>();

        // Application services (DB-backed).
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IBusinessService, BusinessService>();
        services.AddScoped<ICampaignService, CampaignService>();
        services.AddScoped<ICreatorService, CreatorService>();

        // Creator↔campaign matching seam — stub (everything fits) until the real engine lands.
        services.AddSingleton<ICampaignMatcher, StubCampaignMatcher>();

        return services;
    }
}
