namespace Vira.Abstractions.Constants;

/// <summary>Names shared across the auth handler, controllers, and cookie handling.</summary>
public static class AuthConstants
{
    public const string SessionCookieName = "vira_session";
    public const string SessionScheme = "Session";
    public const string BusinessPolicy = "Business";

    public const string CreatorPolicy = "Creator";

    public static class Claims
    {
        public const string AccountId = "vira:account_id";
        public const string BusinessId = "vira:business_id";
        public const string CreatorId = "vira:creator_id";
        public const string AccountType = "vira:account_type";
    }
}
