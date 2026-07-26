import { db } from "./index.ts";

export interface AiIdentityInput {
  id?: string;
  tenantId: string;
  aiName?: string;
  aiPronunciation?: string;
  aiPersonality?: string;
  aiGreeting?: string;
  aiProvider?: string;
  aiProviderStatus?: string;
  metadata?: any;
  aiDialect?: string;
  aiLanguage?: string;
  aiModelName?: string;
  aiGender?: string;
  bargeIn?: string;
  bargeInSensitivity?: string;
  agentStartsFirst?: string;
}

export interface AiSessionInput {
  id?: string;
  tenantId: string;
  agentId?: string;
  agentName?: string;
  channelId?: string;
  callerNumber?: string;
  sessionState?: any;
  startedAt?: Date;
  endedAt?: Date;
}

export interface RagDocumentInput {
  id?: string;
  tenantId: string;
  filename: string;
  fileFormat: string;
  fileSizeBytes?: bigint;
  mimeType?: string;
  storagePath: string;
  status?: string;
  errorMessage?: string;
  chunkCount?: number;
  aiIdentityId?: string;
}

export interface AiToolCallInput {
  id?: string;
  tenantId: string;
  sessionId?: string;
  toolName: string;
  arguments?: any;
  result?: any;
  status?: string;
}

// User helper
export async function getOrCreateUser(uid: string, email: string) {
  try {
    return await db.user.upsert({
      where: { uid },
      update: { email },
      create: { uid, email },
    });
  } catch (error) {
    console.error("Error in getOrCreateUser:", error);
    throw new Error("Failed to get or create user in database.", { cause: error });
  }
}

// Tenant helpers
export async function dbGetAllTenants() {
  try {
    return await db.tenant.findMany({
      include: {
        aiIdentities: true,
        ragDocuments: true,
        aiToolCalls: true,
      }
    });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return [];
  }
}

export async function dbGetTenantById(id: string) {
  try {
    return await db.tenant.findUnique({
      where: { id },
      include: {
        aiIdentities: true,
        ragDocuments: true,
      }
    });
  } catch (error) {
    console.error("Error fetching tenant by id:", error);
    return null;
  }
}

export interface TenantUpsertInput {
  id?: string;
  name?: string;
  companyName?: string;
  brandName?: string;
  businessCategory?: string;
  description?: string;
  taxIdNumber?: string;
  taxAddress?: string;
  operationalAddress?: string;
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  financeEmail?: string;
  apiKey?: string;
  apiSecret?: string;
  balance?: string;
  creditLimit?: string;
  billingType?: "prepaid" | "postpaid";
  status?: "active" | "inactive" | "suspended" | "deleted";
  timezone?: string;
  city?: string;
  country?: string;
  nib?: string;
  npwp?: string;
  postalCode?: string;
  website?: string;
}

export async function dbUpsertTenant(tenantData: TenantUpsertInput) {
  try {
    const compName = tenantData.companyName || tenantData.name || "Default Company";

    let apiKey = tenantData.apiKey;
    if (!apiKey && tenantData.id) {
      const existing = await db.tenant.findUnique({ where: { id: tenantData.id }, select: { apiKey: true, apiSecret: true } });
      apiKey = existing?.apiKey || `key_${tenantData.id}_${Date.now()}`;
    }
    if (!apiKey) {
      apiKey = `key_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    }

    let apiSecret = tenantData.apiSecret;
    if (!apiSecret && tenantData.id) {
      const existing = await db.tenant.findUnique({ where: { id: tenantData.id }, select: { apiSecret: true } });
      apiSecret = existing?.apiSecret || `secret_${tenantData.id}_${Date.now()}`;
    }
    if (!apiSecret) {
      apiSecret = `secret_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    }

    const data: any = {
      name: tenantData.name,
      companyName: compName,
      brandName: tenantData.brandName,
      businessCategory: tenantData.businessCategory,
      description: tenantData.description,
      taxIdNumber: tenantData.taxIdNumber,
      taxAddress: tenantData.taxAddress,
      operationalAddress: tenantData.operationalAddress,
      contactPersonName: tenantData.contactPersonName,
      contactPersonEmail: tenantData.contactPersonEmail,
      contactPersonPhone: tenantData.contactPersonPhone,
      financeEmail: tenantData.financeEmail,
      apiKey,
      apiSecret,
      timezone: tenantData.timezone || "UTC",
      city: tenantData.city,
      country: tenantData.country || "ID",
      nib: tenantData.nib,
      npwp: tenantData.npwp,
      postalCode: tenantData.postalCode,
      website: tenantData.website,
    };

    if (tenantData.id) {
      return await db.tenant.upsert({
        where: { id: tenantData.id },
        update: data,
        create: { ...data, id: tenantData.id },
      });
    }

    return await db.tenant.create({
      data: {
        ...data,
        balance: tenantData.balance || "0.00",
        creditLimit: tenantData.creditLimit || "0.00",
        billingType: tenantData.billingType || "prepaid",
        status: tenantData.status || "active",
      },
    });
  } catch (error) {
    console.error("Error upserting tenant:", error);
    throw new Error("Failed to save tenant to PostgreSQL.", { cause: error });
  }
}

// AiIdentity helpers
export async function dbGetAiIdentitiesByTenant(tenantId: string) {
  try {
    return await db.aiIdentity.findMany({
      where: { tenantId },
    });
  } catch (error) {
    console.error("Error fetching AI identities:", error);
    return [];
  }
}

export async function dbGetAllAiIdentities() {
  try {
    return await db.aiIdentity.findMany();
  } catch (error) {
    console.error("Error fetching all AI identities:", error);
    return [];
  }
}

export async function dbUpsertAiIdentity(data: any) {
  try {
    const extraMetadata: any = {};
    const allowedMetadataKeys = [
      "bargeIn",
      "agentStartsFirst",
      "role",
      "extension",
      "timezone",
      "operating_timezone",
      "speakingRate",
      "temperature",
      "defaultFallback",
      "defaultFallbackResponse",
      "prebuiltVoice",
      "systemInstruction",
      "isDefault",
      "pitch",
    ];
    for (const key of allowedMetadataKeys) {
      if (data[key] !== undefined) {
        extraMetadata[key] = data[key];
      }
    }

    const existingMetadata = data.metadata && typeof data.metadata === "object" ? data.metadata : {};
    const mergedMetadata = { ...existingMetadata, ...extraMetadata };

    const aiData: any = {
      aiName: data.aiName || data.agentName,
      aiPronunciation: data.aiPronunciation || data.pronunciation,
      aiPersonality: data.aiPersonality || data.personality,
      aiGreeting: data.aiGreeting || data.greetingMessage,
      aiProvider: data.aiProvider || "gemini",
      aiProviderStatus: data.aiProviderStatus || "active",
      metadata: Object.keys(mergedMetadata).length > 0 ? mergedMetadata : undefined,
      aiDialect: data.aiDialect || data.dialect,
      aiLanguage: data.aiLanguage || data.language,
      aiModelName: data.aiModelName || data.aiModel,
      aiGender: data.aiGender || data.gender || "male",
      bargeInSensitivity: data.bargeInSensitivity,
      tenantId: data.tenantId,
      extension: data.extension,
      prebuilt_voice: data.prebuiltVoice,
      temperature: data.temperature,
      speaking_rate: data.speakingRate,
      pitch: data.pitch,
      barge_in: data.bargeIn,
      agent_starts_first: data.agentStartsFirst,
      role: data.role,
      greeting_message: data.greetingMessage,
      system_instruction: data.systemInstruction,
      default_fallback: data.defaultFallback || data.defaultFallbackResponse,
      operating_timezone: data.operating_timezone || data.timezone,
      is_default: data.isDefault,
    };

    if (data.id) {
      return await db.aiIdentity.upsert({
        where: { id: data.id },
        update: { ...aiData, updatedAt: new Date() },
        create: { ...aiData, id: data.id },
      });
    }

    return await db.aiIdentity.create({
      data: aiData,
    });
  } catch (error) {
    console.error("Error upserting AI identity:", error);
    throw new Error("Failed to save AI identity to PostgreSQL.", { cause: error });
  }
}

// Callback Requests helpers
export async function dbGetAllCallbackRequests(tenantId?: string) {
  try {
    return await db.callbackRequest.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching callback requests:", error);
    return [];
  }
}

export async function dbUpsertCallbackRequest(data: any) {
  try {
    const cbData = {
      tenantId: data.tenantId,
      callerName: data.callerName,
      phoneNumber: data.phoneNumber,
      reason: data.reason,
      preferredTime: data.preferredTime,
      status: data.status || "pending",
    };

    if (data.id) {
      return await db.callbackRequest.upsert({
        where: { id: data.id },
        update: { ...cbData, updatedAt: new Date() },
        create: { ...cbData, id: data.id },
      });
    }

    return await db.callbackRequest.create({
      data: cbData,
    });
  } catch (error) {
    console.error("Error upserting callback request:", error);
    throw error;
  }
}

// Tools helpers
// TODO: TenantTool model is not in Prisma schema yet; disable DB-backed tool storage for now.
// export async function dbGetTenantTools(tenantId: string) {
//   try {
//     return await db.tenantTool.findMany({
//       where: { tenantId },
//     });
//   } catch (error) {
//     console.error("Error fetching tenant tools:", error);
//     return [];
//   }
// }

// export async function dbUpsertTenantTool(data: any) {
//   try {
//     const toolData = {
//       tenantId: data.tenantId,
//       name: data.name,
//       description: data.description,
//       enabled: data.enabled ?? true,
//     };
//
//     if (data.id) {
//       return await db.tenantTool.upsert({
//         where: { id: data.id },
//         update: { ...toolData, updatedAt: new Date() },
//         create: { ...toolData, id: data.id },
//       });
//     }
//
//     return await db.tenantTool.create({
//       data: toolData,
//     });
//   } catch (error) {
//     console.error("Error upserting tenant tool:", error);
//     throw error;
//   }
// }

export async function dbDeleteTenant(id: string) {
  try {
    await db.tenant.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    console.error("Error deleting tenant:", error);
    return false;
  }
}

export async function dbDeleteAiIdentity(id: string) {
  try {
    await db.aiIdentity.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    console.error("Error deleting AI identity:", error);
    return false;
  }
}

// AiSession helpers
export async function dbCreateAiSession(data: AiSessionInput) {
  try {
    const sessionStateWithAgent = data.sessionState ? { ...data.sessionState, agentName: data.agentName, agentId: data.agentId } : (data.agentName || data.agentId ? { agentName: data.agentName, agentId: data.agentId } : undefined);
    return await db.aiSession.create({
      data: {
        id: data.id,
        tenantId: data.tenantId,
        agentId: data.agentId,
        channelId: data.channelId,
        callerNumber: data.callerNumber,
        sessionState: sessionStateWithAgent,
        startedAt: data.startedAt || new Date(),
        endedAt: data.endedAt,
      },
    });
  } catch (error) {
    console.error("Error creating AI session:", error);
    throw new Error("Failed to create AI session in PostgreSQL.", { cause: error });
  }
}

export async function dbEndAiSession(sessionId: string, sessionState?: any) {
  try {
    // Extract agent info from sessionState if provided for backward compatibility or direct calls
    const agentId = sessionState?.agentId;
    const agentName = sessionState?.agentName;

    return await db.aiSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        sessionState: sessionState,
        ...(agentId && { agentId }),
      },
    });
  } catch (error) {
    console.error("Error ending AI session:", error);
    return null;
  }
}

export async function dbGetSessionsByTenant(tenantId: string) {
  try {
    return await db.aiSession.findMany({
      where: { tenantId },
      orderBy: { startedAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return [];
  }
}

export async function dbGetAllAiSessions() {
  try {
    return await db.aiSession.findMany({
      orderBy: { startedAt: "desc" },
      take: 100,
    });
  } catch (error) {
    console.error("Error fetching all sessions:", error);
    return [];
  }
}

// RagDocument helpers
export async function dbCreateRagDocument(data: RagDocumentInput) {
  try {
    return await db.ragDocument.create({
      data: {
        id: data.id,
        tenantId: data.tenantId,
        filename: data.filename,
        fileFormat: data.fileFormat,
        fileSizeBytes: data.fileSizeBytes || 0n,
        mimeType: data.mimeType,
        storagePath: data.storagePath,
        status: data.status || "processing",
        errorMessage: data.errorMessage,
        chunkCount: data.chunkCount || 0,
        aiIdentityId: data.aiIdentityId,
      },
    });
  } catch (error) {
    console.error("Error creating RagDocument:", error);
    throw new Error("Failed to create RagDocument in PostgreSQL.", { cause: error });
  }
}

export async function dbGetRagDocumentsByTenant(tenantId: string) {
  try {
    return await db.ragDocument.findMany({
      where: { tenantId },
    });
  } catch (error) {
    console.error("Error fetching RagDocuments:", error);
    return [];
  }
}

export async function dbUpdateRagDocumentStatus(id: string, status: string, errorMessage?: string, chunkCount?: number) {
  try {
    return await db.ragDocument.update({
      where: { id },
      data: {
        status,
        errorMessage,
        chunkCount,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error updating RagDocument status:", error);
    return null;
  }
}

// AiToolCall helpers
export async function dbCreateAiToolCall(data: AiToolCallInput) {
  try {
    return await db.aiToolCall.create({
      data: {
        id: data.id,
        tenantId: data.tenantId,
        sessionId: data.sessionId,
        toolName: data.toolName,
        arguments: data.arguments,
        result: data.result,
        status: data.status || "pending",
      },
    });
  } catch (error) {
    console.error("Error creating AiToolCall:", error);
    throw new Error("Failed to create AiToolCall in PostgreSQL.", { cause: error });
  }
}

export async function dbUpdateAiToolCallResult(id: string, result: any, status: string = "completed") {
  try {
    return await db.aiToolCall.update({
      where: { id },
      data: {
        result,
        status,
      },
    });
  } catch (error) {
    console.error("Error updating AiToolCall result:", error);
    return null;
  }
}

export async function dbGetToolCallsByTenant(tenantId: string) {
  try {
    return await db.aiToolCall.findMany({
      where: { tenantId },
    });
  } catch (error) {
    console.error("Error fetching tool calls:", error);
    return [];
  }
}

// VoiceProfile helpers
export async function dbGetAllVoiceProfiles() {
  try {
    return await db.voiceProfile.findMany({
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Error fetching voice profiles:", error);
    return [];
  }
}

export async function dbCreateVoiceProfile(data: any) {
  try {
    return await db.voiceProfile.create({
      data: {
        name: data.name,
        voice_name: data.voiceName,
        language: data.language || "id-ID",
        gender: data.gender,
        description: data.description,
      },
    });
  } catch (error) {
    console.error("Error creating voice profile:", error);
    throw new Error("Failed to create voice profile in database.", { cause: error });
  }
}

export async function dbUpdateVoiceProfile(id: string, data: any) {
  try {
    return await db.voiceProfile.update({
      where: { id },
      data,
    });
  } catch (error) {
    console.error("Error updating voice profile:", error);
    return null;
  }
}

export async function dbDeleteVoiceProfile(id: string) {
  try {
    await db.voiceProfile.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    console.error("Error deleting voice profile:", error);
    return false;
  }
}

// TenantApiKey helpers
export async function dbGetTenantApiKey(tenantId: string, service: string = "gemini") {
  try {
    return await db.tenantApiKey.findFirst({
      where: {
        tenantId,
        service,
      },
    });
  } catch (error) {
    console.error("Error fetching tenant API key:", error);
    return null;
  }
}

export async function dbGetAllTenantApiKeys() {
  try {
    return await db.tenantApiKey.findMany();
  } catch (error) {
    console.error("Error fetching all tenant API keys:", error);
    return [];
  }
}

export async function dbUpsertTenantApiKey(tenantId: string, apiKey: string, service: string = "gemini", status: string = "active") {
  try {
    return await db.tenantApiKey.upsert({
      where: { tenantId },
      update: {
        apiKey,
        status,
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        service,
        apiKey,
        status,
      },
    });
  } catch (error) {
    console.error("Error upserting tenant API key:", error);
    throw new Error("Failed to save tenant API key to database.", { cause: error });
  }
}

export async function dbDeleteTenantApiKey(tenantId: string, service: string = "gemini") {
  try {
    await db.tenantApiKey.delete({
      where: { tenantId },
    });
    return true;
  } catch (error) {
    console.error("Error deleting tenant API key:", error);
    return false;
  }
}
