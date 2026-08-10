// Vira — demo environment. One resource group holds everything.
// Provisions with PLACEHOLDER container images; the deploy workflows push real
// images to ACR and update the apps per push. Re-runnable (idempotent).
targetScope = 'resourceGroup'

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Short prefix for resource names.')
param namePrefix string = 'vira'

@description('Postgres administrator login.')
param postgresAdminUser string = 'viraadmin'

@secure()
@description('Postgres administrator password (pass at deploy time).')
param postgresAdminPassword string

@description('Backend image. Placeholder until the deploy workflow pushes the real one.')
param backendImage string = 'mcr.microsoft.com/k8se/quickstart:latest'

@description('ai-service image. Placeholder until the deploy workflow pushes the real one.')
param aiImage string = 'mcr.microsoft.com/k8se/quickstart:latest'

@secure()
@description('Anthropic API key. Optional at provision; update in Key Vault before AI features.')
param anthropicApiKey string = ''

@secure()
@description('Firebase Admin service-account JSON. Optional at provision; update in Key Vault before business auth.')
param firebaseServiceAccountJson string = ''

@description('Firebase project id (business auth).')
param firebaseProjectId string = ''

@description('Allowed browser origin for CORS — the deployed frontend URL (e.g. the Vercel app).')
param allowedOrigin string = ''

@description('TikTok Login Kit client key (creator auth).')
param tikTokClientKey string = ''

@secure()
@description('TikTok client secret. Optional at provision; update in Key Vault before creator auth.')
param tikTokClientSecret string = ''

@description('TikTok OAuth redirect URI — the backend callback (must match the TikTok app exactly).')
param tikTokRedirectUri string = ''

@description('Frontend base URL the backend redirects creators back to after login.')
param webBaseUrl string = ''

@secure()
@description('Shared key for ai-service to backend service calls (analysis ingest). Optional at provision.')
param serviceApiKey string = ''

@description('Backend base URL the ai-service posts analysis results to (external backend FQDN).')
param backendBaseUrl string = ''

var suffix = uniqueString(resourceGroup().id)
var acrName = 'acr${namePrefix}${suffix}'
var kvName = 'kv-${namePrefix}-${suffix}'
var pgServerName = 'psql-${namePrefix}-${suffix}'
var pgDbName = namePrefix
var backendAppName = '${namePrefix}-backend'
var aiAppName = '${namePrefix}-ai-service'

// Built-in role definition IDs
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'
var kvSecretsUserRoleId = '4633458b-17de-408a-b874-0445c86b69e6'

// ---------------------------------------------------------------------------
// Observability + Container Apps environment
// ---------------------------------------------------------------------------
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-${namePrefix}-${suffix}'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource acaEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-${namePrefix}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Container registry + managed identity
// ---------------------------------------------------------------------------
resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: false // pull via managed identity, no admin creds
  }
}

resource uami 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-${namePrefix}'
  location: location
}

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, uami.id, acrPullRoleId)
  scope: acr
  properties: {
    principalId: uami.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
  }
}

// ---------------------------------------------------------------------------
// Key Vault + secrets
// ---------------------------------------------------------------------------
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: tenant().tenantId
    enableRbacAuthorization: true
    softDeleteRetentionInDays: 7
  }
}

resource kvSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, uami.id, kvSecretsUserRoleId)
  scope: keyVault
  properties: {
    principalId: uami.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', kvSecretsUserRoleId)
  }
}

resource pgConnSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'postgres-connection-string'
  properties: {
    value: 'Host=${pgServer.properties.fullyQualifiedDomainName};Port=5432;Database=${pgDbName};Username=${postgresAdminUser};Password=${postgresAdminPassword};SslMode=Require'
  }
}

resource anthropicSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'anthropic-api-key'
  properties: {
    value: empty(anthropicApiKey) ? 'REPLACE_ME' : anthropicApiKey
  }
}

resource firebaseSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'firebase-service-account'
  properties: {
    value: empty(firebaseServiceAccountJson) ? 'REPLACE_ME' : firebaseServiceAccountJson
  }
}

resource tikTokSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'tiktok-client-secret'
  properties: {
    value: empty(tikTokClientSecret) ? 'REPLACE_ME' : tikTokClientSecret
  }
}

resource serviceKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'service-api-key'
  properties: {
    value: empty(serviceApiKey) ? 'REPLACE_ME' : serviceApiKey
  }
}

// ---------------------------------------------------------------------------
// Postgres Flexible Server (Burstable — cheapest tier for the demo)
// ---------------------------------------------------------------------------
resource pgServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: pgServerName
  location: location
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    version: '16'
    administratorLogin: postgresAdminUser
    administratorLoginPassword: postgresAdminPassword
    storage: { storageSizeGB: 32 }
    backup: { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
  }
}

resource pgDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-06-01-preview' = {
  parent: pgServer
  name: pgDbName
}

// Allow other Azure services (incl. Container Apps) to reach the server.
// TODO: tighten to specific egress once the demo is stable.
resource pgFirewallAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-06-01-preview' = {
  parent: pgServer
  name: 'AllowAllAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}

// ---------------------------------------------------------------------------
// ai-service — internal ingress (only reachable inside the ACA environment)
// ---------------------------------------------------------------------------
resource aiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: aiAppName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${uami.id}': {} }
  }
  properties: {
    managedEnvironmentId: acaEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false
        targetPort: 8000
        transport: 'auto'
      }
      registries: [
        { server: acr.properties.loginServer, identity: uami.id }
      ]
      secrets: [
        {
          name: 'anthropic-api-key'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/anthropic-api-key'
          identity: uami.id
        }
        {
          name: 'service-api-key'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/service-api-key'
          identity: uami.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'ai-service'
          image: aiImage
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'ANTHROPIC_API_KEY', secretRef: 'anthropic-api-key' }
            // ai-service -> backend (analysis ingest).
            { name: 'BACKEND_BASE_URL', value: backendBaseUrl }
            { name: 'BACKEND_SERVICE_KEY', secretRef: 'service-api-key' }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 2 }
    }
  }
  dependsOn: [acrPull, kvSecretsUser, anthropicSecret, serviceKeySecret]
}

// ---------------------------------------------------------------------------
// backend — external ingress (the API gateway)
// ---------------------------------------------------------------------------
resource backendApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: backendAppName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${uami.id}': {} }
  }
  properties: {
    managedEnvironmentId: acaEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
      }
      registries: [
        { server: acr.properties.loginServer, identity: uami.id }
      ]
      secrets: [
        {
          name: 'postgres-connection'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/postgres-connection-string'
          identity: uami.id
        }
        {
          name: 'firebase-service-account'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/firebase-service-account'
          identity: uami.id
        }
        {
          name: 'tiktok-client-secret'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/tiktok-client-secret'
          identity: uami.id
        }
        {
          name: 'service-api-key'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/service-api-key'
          identity: uami.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'backend'
          image: backendImage
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: [
            { name: 'ConnectionStrings__Postgres', secretRef: 'postgres-connection' }
            { name: 'Ai__BaseUrl', value: 'https://${aiApp.properties.configuration.ingress.fqdn}' }
            { name: 'Firebase__CredentialsJson', secretRef: 'firebase-service-account' }
            { name: 'Firebase__ProjectId', value: firebaseProjectId }
            { name: 'App__AllowedOrigins__0', value: allowedOrigin }
            { name: 'App__WebBaseUrl', value: webBaseUrl }
            { name: 'TikTok__ClientKey', value: tikTokClientKey }
            { name: 'TikTok__ClientSecret', secretRef: 'tiktok-client-secret' }
            { name: 'TikTok__RedirectUri', value: tikTokRedirectUri }
            { name: 'Service__ApiKey', secretRef: 'service-api-key' }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 3 }
    }
  }
  dependsOn: [acrPull, kvSecretsUser, pgConnSecret, firebaseSecret, tikTokSecret, serviceKeySecret]
}

// ---------------------------------------------------------------------------
// Outputs (consumed by the deploy workflows)
// ---------------------------------------------------------------------------
output acrName string = acr.name
output acrLoginServer string = acr.properties.loginServer
output backendAppName string = backendApp.name
output aiAppName string = aiApp.name
output backendUrl string = 'https://${backendApp.properties.configuration.ingress.fqdn}'
output keyVaultName string = keyVault.name
output resourceGroup string = resourceGroup().name
