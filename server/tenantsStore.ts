import { TenantProfile, AgentProfile, KnowledgeDoc, CallbackRequest, TenantApiKey, RagDocumentRecord } from "../src/types";
import {
  dbUpsertTenant,
  dbUpsertAiIdentity,
  dbDeleteAiIdentity,
  dbGetTenantApiKey,
  dbUpsertTenantApiKey,
  dbDeleteTenantApiKey,
  dbGetAllTenants,
  dbGetTenantById as dbFetchTenantById,
  dbDeleteTenant as dbRemoveTenant,
  dbUpsertCallbackRequest,
  dbCreateRagDocument,
  dbGetRagDocumentsByTenant,
} from "../src/db/repository.ts";

export const DEFAULT_TENANTS: TenantProfile[] = [
  // ... (keeping the existing DEFAULT_TENANTS for seeding)
  {
    id: "tenant_telecom",
    name: "PT Telekom Seluler",
    businessCategory: "Telekomunikasi & Internet",
    description: "Penyedia layanan seluler dan internet broadband nasional.",
    agents: [
      {
        id: "agent_telko_siti",
        tenantId: "tenant_telecom",
        agentName: "Siti",
        role: "Customer Service & Info Paket",
        extension: "501",
        pronunciation: "siti telekom",
        language: "Indonesia",
        dialect: "Standar / Baku",
        gender: "Perempuan",
        aiModel: "Gemini 2.5 Flash",
        personality: "Anda adalah CS senior yang ramah, profesional, dan responsif dari PT Telekom Seluler.",
        timezone: "WIB (Asia/Jakarta)",
        speakingRate: "Normal",
        temperature: 0.3,
        defaultFallbackResponse: "Mohon maaf, saya tidak memiliki informasi mengenai hal tersebut.",
        prebuiltVoice: "Zephyr",
        systemInstruction: "Anda adalah Siti, CS Utama PT Telekom Seluler. Jawablah pertanyaan pelanggan seputar paket internet, tagihan, dan promo 5G secara ramah dan efektif.",
        greetingMessage: "Halo! Selamat datang di layanan pelanggan PT Telekom Seluler bersama Siti. Ada yang bisa saya bantu hari ini?",
        agentStartsFirst: true,
        isDefault: true
      },
      {
        id: "agent_telko_budi",
        tenantId: "tenant_telecom",
        agentName: "Budi (Teknisi)",
        role: "Dukungan Teknik & Gangguan Sinyal",
        extension: "502",
        pronunciation: "budi teknisi telekom",
        language: "Indonesia",
        dialect: "Standar / Baku",
        gender: "Laki-laki",
        aiModel: "Gemini 2.5 Pro",
        personality: "Anda adalah teknisi jaringan yang taktis, solutif, dan cekatan dalam membantu troubleshooting.",
        timezone: "WIB (Asia/Jakarta)",
        speakingRate: "Normal",
        temperature: 0.2,
        defaultFallbackResponse: "Sistem saya belum dapat memverifikasi kendala tersebut. Mari saya hubungkan dengan tim teknisi lapangan.",
        prebuiltVoice: "Fenrir",
        systemInstruction: "Anda adalah Budi, Spesialis Dukungan Teknis Jaringan PT Telekom Seluler. Pandu pelanggan melakukan restart, cek Flight Mode, atau catat ticket callback penanganan sinyal.",
        greetingMessage: "Halo, dengan Budi dari Tim Teknis PT Telekom Seluler. Bisa disebutkan kendala sinyal atau jaringan yang sedang dialami?",
        agentStartsFirst: true,
        isDefault: false
      },
      {
        id: "agent_telko_dewi",
        tenantId: "tenant_telecom",
        agentName: "Dewi (Sales & Promo)",
        role: "Penjualan & Upgrade Paket",
        extension: "503",
        pronunciation: "dewi sales",
        language: "Indonesia",
        dialect: "Jakarta / Gaul",
        gender: "Perempuan",
        aiModel: "Gemini 1.5 Flash",
        personality: "Anda adalah konsultan penjualan yang antusias, ceria, dan persuasif.",
        timezone: "WIB (Asia/Jakarta)",
        speakingRate: "Cepat",
        temperature: 0.4,
        defaultFallbackResponse: "Untuk promo edisi terbatas ini, mari saya sambungkan dengan tim sales khusus.",
        prebuiltVoice: "Aoede",
        systemInstruction: "Anda adalah Dewi dari Tim Sales & Promo PT Telekom Seluler. Berikan penawaran paket internet Unlimited 5G dan kuota hemat bulanan dengan menarik.",
        greetingMessage: "Halo Kak! Dengan Dewi nih dari Tim Promo PT Telekom Seluler. Mau cari paket kuota murah atau upgrade ke 5G Ultra?",
        agentStartsFirst: true,
        isDefault: false
      }
    ],
    documents: [
      {
        id: "doc_telko_1",
        title: "Katalog Paket Internet & Promo 5G",
        category: "Produk & Harga",
        content: "1. Paket Unlimited 5G Ultra: Rp 100.000/bulan (FUP 100GB, kecepatan turun ke 1Mbps setelah FUP).\n2. Paket Hemat Bulanan: Rp 50.000 (30GB kuota utama + 10GB kuota malam).\n3. Paket Harian Super: Rp 10.000 (5GB berlaku 24 jam).\nPembayaran dapat dilakukan via e-wallet (GoPay, OVO, Dana), Virtual Account BCA/Mandiri/BRI, atau minimarket terdekat.",
        updatedAt: Date.now() - 86400000 * 2
      },
      {
        id: "doc_telko_2",
        title: "Prosedur Penanganan Kendala Sinyal & Jaringan",
        category: "SOP Layanan",
        content: "Langkah penanganan awal jika sinyal hilang/lambat:\n1. Minta pelanggan melakukan restart perangkat atau aktifkan Mode Pesawat (Flight Mode) selama 10 detik.\n2. Pastikan lokasi pelanggan tidak dalam area perbaikan tower.\n3. Cek sisa kuota data.\n4. Jika kendala berlanjut lebih dari 1x24 jam, tawarkan pencatatan callback dari Tim Teknisi Lapangan menggunakan tool 'request_callback'.",
        updatedAt: Date.now() - 86400000
      }
    ],
    tools: [
      {
        id: "request_callback",
        name: "Catat Callback Teknisi / CS",
        description: "Mencatat nomor HP dan alasan callback dari pelanggan jika membutuhkan penanganan lebih lanjut dari tim teknisi.",
        enabled: true
      },
      {
        id: "check_order_status",
        name: "Cek Status Laporan / Tiket",
        description: "Mengecek status tiket laporan gangguan berdasarkan nomor tiket.",
        enabled: true
      }
    ],
    callbackRequests: [
      {
        id: "cb_101",
        tenantId: "tenant_telecom",
        callerName: "Bapak Ahmad",
        phoneNumber: "081299887766",
        reason: "Sinyal lambat di daerah Kebayoran Baru setelah hujan deras",
        preferredTime: "Sore jam 16:00 WIB",
        status: "pending",
        createdAt: Date.now() - 3600000 * 3
      }
    ]
  },
  {
    id: "tenant_clinic",
    name: "Klinik Sehat Utama",
    businessCategory: "Kesehatan & Medis",
    description: "Fasilitas kesehatan keluarga terlengkap dengan layanan poli umum, anak, dan gigi.",
    agents: [
      {
        id: "agent_med_budi",
        tenantId: "tenant_clinic",
        agentName: "Dr. Budi",
        role: "Pendaftaran & Informasi Dokter",
        extension: "504",
        pronunciation: "dokter bu-di",
        language: "Indonesia",
        dialect: "Jawa",
        gender: "Laki-laki",
        aiModel: "Gemini 2.5 Pro",
        personality: "Anda adalah asisten medis yang empatik, tenang, dan jelas dalam memberikan informasi pendaftaran dan jadwal dokter.",
        timezone: "WIB (Asia/Jakarta)",
        speakingRate: "Normal",
        temperature: 0.3,
        defaultFallbackResponse: "Mohon maaf, saya belum memiliki data resmi mengenai hal tersebut. Mohon tanyakan ke pihak administrasi klinik.",
        prebuiltVoice: "Kore",
        systemInstruction: "Anda adalah Dr. Budi, Asisten Medis AI Klinik Sehat Utama. Layani pertanyaan pasien terkait jam pendaftaran, biaya dokter, syarat berobat, dan pendaftaran jadwal konsul.",
        greetingMessage: "Selamat datang di Klinik Sehat Utama. Saya Dr. Budi, asisten AI pendaftaran. Ada yang bisa saya bantu mengenai pendaftaran atau jadwal dokter?",
        agentStartsFirst: true,
        isDefault: true
      },
      {
        id: "agent_med_siti",
        tenantId: "tenant_clinic",
        agentName: "Suster Siti",
        role: "Layanan BPJS & Syarat Berobat",
        extension: "505",
        pronunciation: "suster siti",
        language: "Indonesia",
        dialect: "Standar / Baku",
        gender: "Perempuan",
        aiModel: "Gemini 2.5 Flash",
        personality: "Anda adalah perawat administrasi yang sabar, teliti, dan menguasai alur pelayanan BPJS.",
        timezone: "WIB (Asia/Jakarta)",
        speakingRate: "Pelan",
        temperature: 0.2,
        defaultFallbackResponse: "Untuk verifikasi rujukan BPJS khusus, silakan konfirmasi ke loket administrasi utama.",
        prebuiltVoice: "Charon",
        systemInstruction: "Anda adalah Suster Siti, Petugas Informasi Administrasi & BPJS Klinik Sehat Utama. Jelaskan syarat kartu BPJS, KTP pasien baru, dan alur rujukan.",
        greetingMessage: "Halo, selamat datang di Klinik Sehat Utama. Saya Suster Siti, siap membantu pertanyaan seputar alur berobat BPJS atau kartu pasien.",
        agentStartsFirst: true,
        isDefault: false
      }
    ],
    documents: [
      {
        id: "doc_med_1",
        title: "Jadwal Praktik Dokter & Tarif Konsultasi",
        category: "Layanan Medis",
        content: "Jam Operasional Klinik: Senin - Sabtu (08:00 - 21:00 WIB). Hari Minggu & Tanggal Merah Tutup.\nJadwal Dokter:\n- Dokter Umum (Dr. Andi): Senin-Jumat jam 08:00 - 14:00 (Biaya Rp 150.000).\n- Dokter Spesialis Anak (Dr. Maya): Senin-Sabtu jam 15:00 - 20:00 (Biaya Rp 250.000).\n- Dokter Gigi (Dr. Rina): Selasa & Kamis jam 13:00 - 18:00 (Biaya Rp 200.000).",
        updatedAt: Date.now() - 86400000 * 5
      },
      {
        id: "doc_med_2",
        title: "Syarat Berobat & Asuransi / BPJS",
        category: "Administrasi",
        content: "Syarat Pasien Baru:\n1. Membawa Kartu Identitas (KTP/SIM/KIA).\n2. Membawa Kartu BPJS Kesehatan aktif (untuk fasilitas kesehatan tingkat 1).\n3. Janji temu dapat didaftarkan H-1 melalui pencatatan callback pendaftaran.",
        updatedAt: Date.now() - 86400000 * 4
      }
    ],
    tools: [
      {
        id: "request_callback",
        name: "Pendaftaran Janji Temu / Callback",
        description: "Mencatat nama pasien, nomor WhatsApp, dan jadwal dokter yang diinginkan.",
        enabled: true
      }
    ],
    callbackRequests: [
      {
        id: "cb_102",
        tenantId: "tenant_clinic",
        callerName: "Ibu Ratna",
        phoneNumber: "085611223344",
        reason: "Pendaftaran konsul Spesialis Anak dengan Dr. Maya",
        preferredTime: "Besok Jam 16:00",
        status: "pending",
        createdAt: Date.now() - 3600000 * 5
      }
    ]
  },
  {
    id: "tenant_shop",
    name: "Toko Online Berkah Store",
    businessCategory: "E-Commerce & Retail",
    description: "Pusat belanja produk berkualitas dengan garansi resmi toko.",
    agents: [
      {
        id: "agent_shop_budi",
        tenantId: "tenant_shop",
        agentName: "Budi",
        role: "CS & Retur Barang",
        extension: "506",
        pronunciation: "bu-di berkah store",
        language: "Indonesia",
        dialect: "Jakarta / Gaul",
        gender: "Laki-laki",
        aiModel: "Gemini 2.5 Flash",
        personality: "Anda adalah customer service e-commerce yang ceria, membantu, dan ramah.",
        timezone: "WIB (Asia/Jakarta)",
        speakingRate: "Normal",
        temperature: 0.3,
        defaultFallbackResponse: "Mohon maaf, mengenai hal tersebut saya tidak memiliki informasinya.",
        prebuiltVoice: "Puck",
        systemInstruction: "Anda adalah Budi, Customer Service dari Toko Online Berkah Store. Layani pertanyaan pelanggan seputar kebijakan garansi, prosedur pengembalian barang (retur), dan konfirmasi pengiriman.",
        greetingMessage: "Halo! Terima kasih telah menghubungi Berkah Store. Saya Budi, siap membantu pertanyaan Anda mengenai produk, retur, atau pesanan Anda.",
        agentStartsFirst: true,
        isDefault: true
      },
      {
        id: "agent_shop_linda",
        tenantId: "tenant_shop",
        agentName: "Linda",
        role: "Status Resi & Lacak Pengiriman",
        extension: "507",
        pronunciation: "linda resi",
        language: "Indonesia",
        dialect: "Standar / Baku",
        gender: "Perempuan",
        aiModel: "Gemini 1.5 Flash",
        personality: "Anda adalah spesialis logistik yang cepat, akurat, dan Informatif.",
        timezone: "WIB (Asia/Jakarta)",
        speakingRate: "Cepat",
        temperature: 0.2,
        defaultFallbackResponse: "Resi pengiriman belum terdeteksi. Silakan berikan nomor pesanan Anda.",
        prebuiltVoice: "Aoede",
        systemInstruction: "Anda adalah Linda, Petugas Lacak Pesanan Berkah Store. Bantu pelanggan mengecek status resi JNE/J&T/Sicepat.",
        greetingMessage: "Halo, dengan Linda dari Tim Ekspedisi Berkah Store. Ada nomor pesanan atau resi yang ingin dicek?",
        agentStartsFirst: true,
        isDefault: false
      }
    ],
    documents: [
      {
        id: "doc_shop_1",
        title: "Syarat & Prosedur Retur Barang",
        category: "Kebijakan Toko",
        content: "Ketentuan Retur & Garansi Berkah Store:\n1. Pengajuan retur maksimal 7 hari kerja sejak barang diterima.\n2. Wajib melampirkan video unboxing utuh tanpa terpotong.\n3. Biaya kirim pengembalian ditanggung toko jika barang cacat produksi/salah kirim.\n4. Barang elektronik mendapatkan garansi resmi toko selama 12 bulan.",
        updatedAt: Date.now() - 86400000 * 3
      }
    ],
    tools: [
      {
        id: "request_callback",
        name: "Bantuan Retur / Callback CS",
        description: "Mencatat nomor telepon dan nomor pesanan pelanggan untuk dibantu prosedur retur.",
        enabled: true
      },
      {
        id: "check_order_status",
        name: "Cek Resi & Status Pesanan",
        description: "Mengecek lokasi dan status pengiriman barang.",
        enabled: true
      }
    ],
    callbackRequests: []
  },
  {
    id: "tenant_cable",
    name: "Apex Cable & Broadband TV",
    businessCategory: "TV Cable & Fiber Broadband",
    description: "Premier cable television and high-speed fiber internet service provider.",
    agents: [
      {
        id: "agent_cable_sarah",
        tenantId: "tenant_cable",
        agentName: "Sarah",
        role: "Customer Care & Channel Packages",
        extension: "508",
        pronunciation: "sarah cable advisor",
        language: "Inggris",
        dialect: "American English (US)",
        gender: "Perempuan",
        aiModel: "Gemini 2.5 Flash",
        personality: "You are Sarah, a cheerful, articulate, and highly helpful Customer Care Representative at Apex Cable TV.",
        timezone: "EST (New York)",
        speakingRate: "Normal",
        temperature: 0.3,
        defaultFallbackResponse: "I'm sorry, I don't have that channel or subscription detail on hand. Let me log a request for an account specialist.",
        prebuiltVoice: "Zephyr",
        systemInstruction: "You are Sarah, Senior Customer Care Representative at Apex Cable TV. Help callers explore cable channel lineups, HD packages, billing inquiries, and sports passes in clear English.",
        greetingMessage: "Hello! Thank you for calling Apex Cable TV. My name is Sarah. How can I help you with your cable TV or billing inquiry today?",
        agentStartsFirst: true,
        isDefault: true
      },
      {
        id: "agent_cable_mark",
        tenantId: "tenant_cable",
        agentName: "Mark (Tech Support)",
        role: "Set-Top Box & Signal Troubleshooting",
        extension: "509",
        pronunciation: "mark cable technician",
        language: "Inggris",
        dialect: "American English (US)",
        gender: "Laki-laki",
        aiModel: "Gemini 2.5 Pro",
        personality: "You are Mark, an analytical, patient, and highly technical support engineer specializing in TV signal diagnostics and set-top boxes.",
        timezone: "EST (New York)",
        speakingRate: "Normal",
        temperature: 0.2,
        defaultFallbackResponse: "I couldn't verify that error code immediately. Let me schedule a technician callback for a home diagnostic visit.",
        prebuiltVoice: "Puck",
        systemInstruction: "You are Mark, Lead Technical Specialist at Apex Cable TV. Help customers troubleshoot set-top box error codes (Error 102, black screen, HDMI connection issues), perform power resets, or log service technician dispatch tickets.",
        greetingMessage: "Hi there, this is Mark from Apex Cable Technical Support. Are you experiencing signal disruption or an error code on your set-top box?",
        agentStartsFirst: true,
        isDefault: false
      }
    ],
    documents: [
      {
        id: "doc_cable_1",
        title: "Cable TV Channel Lineups & Premium Packages",
        category: "Packages & Pricing",
        content: "Apex Cable Channel Packages & Pricing:\n1. Essential Starter Pack: $49.99/month - Includes 75+ channels, local news, weather, and basic entertainment.\n2. Family Ultra HD Pass: $79.99/month - Includes 180+ channels featuring HBO Max, Showtime, Disney Channel, and 4K Sports.\n3. Sports Mega Pass Add-On: $29.99/month - Includes NFL Network, ESPN+, Premier League, NBA TV, and RedZone.\n4. Payment Methods: Auto-pay via Credit/Debit card, Online Banking, or phone bill payment.",
        updatedAt: Date.now()
      },
      {
        id: "doc_cable_2",
        title: "Set-Top Box Troubleshooting & Error Codes",
        category: "Technical SOP",
        content: "Common Set-Top Box Troubleshooting Steps:\n1. Error Code 102 (Signal Lost / Black Screen):\n   - Verify HDMI cable is firmly connected between the set-top box and TV set.\n   - Unplug the power cable from the set-top box, wait 15 seconds, and plug it back in (Soft Reset).\n   - Ensure TV input/source is set to HDMI 1 or HDMI 2.\n2. Error Code 404 (Subscription Refresh Required):\n   - Perform account signal refresh via account portal or request a technician callback.\n3. If signal issue persists after reboot, log a technician callback using the 'request_callback' tool.",
        updatedAt: Date.now()
      }
    ],
    tools: [
      {
        id: "request_callback",
        name: "Schedule Technician Callback",
        description: "Logs customer phone number and issue for a callback from a field service technician.",
        enabled: true
      },
      {
        id: "check_order_status",
        name: "Check Ticket & Order Status",
        description: "Checks the status of service technician dispatch tickets.",
        enabled: true
      }
    ],
    callbackRequests: [
      {
        id: "cb_103",
        tenantId: "tenant_cable",
        callerName: "John Smith",
        phoneNumber: "+1-555-019-2831",
        reason: "Persistent Error Code 102 on living room set-top box after storm",
        preferredTime: "Today at 2:00 PM EST",
        status: "pending",
        createdAt: Date.now() - 3600000 * 2
      }
    ]
  }
];

let tenantsMemory: TenantProfile[] = [];

// Ensure tenant has valid agents array and top-level sync
export function normalizeTenant(tenant: any): TenantProfile {
  if (!Array.isArray(tenant.agents) || tenant.agents.length === 0) {
    tenant.agents = [
      {
        id: `agent_${tenant.id}_default`,
        tenantId: tenant.id,
        agentName: tenant.agentName || "Agent CS Utama",
        role: "Customer Service Utama",
        extension: tenant.extension || "501",
        pronunciation: tenant.pronunciation || tenant.agentName || "Agent AI",
        language: tenant.language || "Indonesia",
        dialect: tenant.dialect || "Standar / Baku",
        gender: tenant.gender || "Perempuan",
        aiModel: tenant.aiModel || "Gemini 2.5 Flash",
        personality: tenant.personality || tenant.systemInstruction || "",
        timezone: tenant.timezone || "WIB (Asia/Jakarta)",
        speakingRate: tenant.speakingRate || "Normal",
        temperature: tenant.temperature ?? 0.3,
        defaultFallbackResponse: tenant.defaultFallbackResponse || "Mohon maaf, saya belum memiliki informasinya.",
        prebuiltVoice: tenant.prebuiltVoice || "Zephyr",
        systemInstruction: tenant.systemInstruction || "",
        greetingMessage: tenant.greetingMessage || "Halo, ada yang bisa saya bantu?",
        agentStartsFirst: tenant.agentStartsFirst ?? true,
        bargeIn: tenant.bargeIn ?? true,
        bargeInSensitivity: tenant.bargeInSensitivity || "gemini_only",
        isDefault: true
      }
    ];
  }

  // Ensure every agent has an ID and tenantId
  tenant.agents.forEach((ag: any, idx: number) => {
    if (!ag.id) ag.id = `agent_${tenant.id}_${idx + 1}`;
    if (!ag.tenantId) ag.tenantId = tenant.id;
  });

  // Mirror primary agent properties to legacy fields for backward compatibility
  const primaryAgent = tenant.agents.find((a: any) => a.isDefault) || tenant.agents[0];
  if (primaryAgent) {
    tenant.extension = primaryAgent.extension;
    tenant.agentName = primaryAgent.agentName;
    tenant.language = primaryAgent.language;
    tenant.dialect = primaryAgent.dialect;
    tenant.prebuiltVoice = primaryAgent.prebuiltVoice;
    tenant.aiModel = primaryAgent.aiModel;
    tenant.greetingMessage = primaryAgent.greetingMessage;
    tenant.systemInstruction = primaryAgent.systemInstruction;
  }

  return tenant as TenantProfile;
}

function mapAiIdentityToAgent(ai: any): AgentProfile {
  const meta = (ai.metadata && typeof ai.metadata === 'object') ? ai.metadata : {};
  return {
    id: ai.id,
    tenantId: ai.tenantId,
    agentName: ai.agentName || ai.aiName || meta.agentName,
    role: ai.role || meta.role,
    extension: ai.extension || meta.extension,
    pronunciation: ai.aiPronunciation || meta.pronunciation,
    language: ai.aiLanguage || meta.language,
    dialect: ai.aiDialect || meta.dialect,
    gender: ai.aiGender || meta.gender,
    aiModel: ai.aiModelName || meta.aiModel,
    personality: ai.aiPersonality || meta.personality,
    timezone: ai.timezone || meta.timezone || meta.operating_timezone,
    speakingRate: ai.speakingRate || meta.speakingRate,
    temperature: typeof ai.temperature !== 'undefined' ? ai.temperature : meta.temperature,
    defaultFallbackResponse: ai.defaultFallback || meta.defaultFallback || meta.defaultFallbackResponse,
    prebuiltVoice: ai.prebuiltVoice || meta.prebuiltVoice,
    systemInstruction: ai.systemInstruction || meta.systemInstruction,
    greetingMessage: ai.aiGreeting || meta.greetingMessage,
    agentStartsFirst: typeof ai.agentStartsFirst !== 'undefined' ? ai.agentStartsFirst === true || ai.agentStartsFirst === 'true' : meta.agentStartsFirst !== false,
    bargeIn: typeof ai.bargeIn !== 'undefined' ? ai.bargeIn === true || ai.bargeIn === 'true' : meta.bargeIn !== false,
    bargeInSensitivity: ai.bargeInSensitivity || meta.bargeInSensitivity,
    isDefault: ai.isDefault ?? meta.isDefault ?? false,
  };
}

function mapDbTenantToProfile(t: any): TenantProfile {
  const agents = t.aiIdentities?.map(mapAiIdentityToAgent) || [];
  const primaryAgent = agents.find((a: AgentProfile) => a.isDefault) || agents[0];
  return {
    id: t.id,
    name: t.name,
    businessCategory: t.businessCategory,
    description: t.description || "",
    agents,
    documents: t.ragDocuments?.map((d: any) => ({
      id: d.id,
      title: d.filename,
      category: d.fileFormat,
      content: d.storagePath,
      updatedAt: d.updatedAt ? new Date(d.updatedAt).getTime() : Date.now()
    })) || [],
    // Mirror primary agent fields to tenant level for backward compatibility with JSON format
    extension: primaryAgent?.extension,
    agentName: primaryAgent?.agentName,
    language: primaryAgent?.language,
    dialect: primaryAgent?.dialect,
    prebuiltVoice: primaryAgent?.prebuiltVoice,
    aiModel: primaryAgent?.aiModel,
    greetingMessage: primaryAgent?.greetingMessage,
    systemInstruction: primaryAgent?.systemInstruction,
    tools: [], // tools not in DB schema (TenantTool model missing)
    callbackRequests: [], // fetched separately via dbGetAllCallbackRequests
  };
}

const isPrisma = () => process.env.DB_SOURCE === "prisma";

// Load tenants from PostgreSQL
export async function initTenantsStore(): Promise<TenantProfile[]> {
  if (!isPrisma()) {
    console.log("Using JSON source for tenants (in-memory).");
    tenantsMemory = [...DEFAULT_TENANTS].map(normalizeTenant);
    return tenantsMemory;
  }
  try {
    const dbTenants = await dbGetAllTenants();
    if (dbTenants.length === 0) {
      console.log("No tenants found in DB, seeding with defaults...");
      for (const t of DEFAULT_TENANTS) {
        await syncTenantToPostgres(t);
      }
      const reloaded = await dbGetAllTenants();
      tenantsMemory = reloaded.map(mapDbTenantToProfile);
    } else {
      tenantsMemory = dbTenants.map(mapDbTenantToProfile);
    }
    console.log(`Loaded ${tenantsMemory.length} tenants from PostgreSQL.`);
  } catch (err) {
    console.error("Failed to load tenants from PostgreSQL:", err);
  }
  return tenantsMemory;
}


export function getAllTenants(): TenantProfile[] {
  if (tenantsMemory.length === 0) {
    initTenantsStore();
  }
  return tenantsMemory;
}

export function getTenantById(id: string): TenantProfile | undefined {
  const tenants = getAllTenants();
  return tenants.find((t) => t.id === id || t.extension === id || t.agents?.some(a => a.extension === id || a.id === id));
}

export function getAgentById(agentId: string): { tenant: TenantProfile; agent: AgentProfile } | undefined {
  const tenants = getAllTenants();
  for (const t of tenants) {
    if (t.agents) {
      const a = t.agents.find((agent) => agent.id === agentId);
      if (a) return { tenant: t, agent: a };
    }
  }
  return undefined;
}

export function getTenantAndAgentBySipHeaders(
  apiKey?: string,
  tenantId?: string,
  agentId?: string
): { tenant: TenantProfile; agent: AgentProfile } | undefined {
  const tenants = getAllTenants();
  
  // Handle composite raw string if passed as single argument (e.g. "key123:tenant_cable:agent_cable_sarah" or "tenant_cable:agent_cable_sarah")
  if (apiKey && (!tenantId && !agentId) && apiKey.includes(":")) {
    const parts = apiKey.split(":");
    if (parts.length === 3) {
      apiKey = parts[0];
      tenantId = parts[1];
      agentId = parts[2];
    } else if (parts.length === 2) {
      tenantId = parts[0];
      agentId = parts[1];
    }
  }

  // If tenantId is provided directly
  if (tenantId) {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      let agent: AgentProfile | undefined;
      if (agentId) {
        agent = tenant.agents?.find((a) => a.id === agentId);
      }
      if (!agent) {
        agent = tenant.agents?.find((a) => a.isDefault) || tenant.agents?.[0];
      }
      if (agent) return { tenant, agent };
    }
  }

  // If agentId is provided without tenantId
  if (agentId) {
    for (const t of tenants) {
      const a = t.agents?.find((ag) => ag.id === agentId);
      if (a) return { tenant: t, agent: a };
    }
  }

  // Default fallback if no header matched
  if (tenants.length > 0) {
    const t = tenants[0];
    const defaultAgent = t.agents?.find((a) => a.isDefault) || t.agents?.[0];
    if (defaultAgent) return { tenant: t, agent: defaultAgent };
  }

  return undefined;
}

export function getTenantAndAgentByExtension(ext: string): { tenant: TenantProfile; agent: AgentProfile } | undefined {
  const tenants = getAllTenants();
  // 1. Exact match by agent extension
  for (const t of tenants) {
    if (t.agents) {
      const a = t.agents.find((agent) => agent.extension === ext);
      if (a) return { tenant: t, agent: a };
    }
  }
  // 2. Match by tenant ID or agent ID
  for (const t of tenants) {
    if (t.id === ext) {
      const defaultAgent = t.agents?.find(a => a.isDefault) || t.agents?.[0];
      if (defaultAgent) return { tenant: t, agent: defaultAgent };
    }
    if (t.agents) {
      const a = t.agents.find((agent) => agent.id === ext);
      if (a) return { tenant: t, agent: a };
    }
  }
  return undefined;
}

export function getTenantAndAgent(tenantId: string, agentId?: string): { tenant: TenantProfile; agent: AgentProfile } | undefined {
  const tenant = getTenantById(tenantId);
  if (!tenant) {
    return getTenantAndAgentByExtension(tenantId);
  }

  let agent: AgentProfile | undefined;
  if (agentId) {
    agent = tenant.agents.find((a) => a.id === agentId || a.extension === agentId);
  }
  if (!agent) {
    agent = tenant.agents.find((a) => a.isDefault) || tenant.agents[0];
  }
  if (!agent) return undefined;

  return { tenant, agent };
}

export async function syncTenantToPostgres(tenant: TenantProfile) {
  try {
    await dbUpsertTenant({
      id: tenant.id,
      name: tenant.name,
      businessCategory: tenant.businessCategory,
      description: tenant.description,
    });
    if (Array.isArray(tenant.agents)) {
      for (const agent of tenant.agents) {
        await dbUpsertAiIdentity({
          id: agent.id,
          tenantId: tenant.id,
          aiName: agent.agentName,
          aiPronunciation: agent.pronunciation,
          aiPersonality: agent.personality,
          aiGreeting: agent.greetingMessage,
          aiDialect: agent.dialect,
          aiLanguage: agent.language,
          aiModelName: agent.aiModel,
          aiGender: agent.gender || "male",
          bargeIn: agent.bargeIn ?? true,
          bargeInSensitivity: agent.bargeInSensitivity || "gemini_only",
          agentStartsFirst: agent.agentStartsFirst ?? true,
          role: agent.role,
          extension: agent.extension,
          timezone: agent.timezone,
          speakingRate: agent.speakingRate,
          temperature: agent.temperature,
          defaultFallback: agent.defaultFallbackResponse,
          prebuiltVoice: agent.prebuiltVoice,
          systemInstruction: agent.systemInstruction,
          isDefault: agent.isDefault,
        });
      }
    }
  } catch (err) {
    console.error(`PostgreSQL sync error for tenant ${tenant.id}:`, err);
  }
}

export async function saveOrUpdateTenant(tenant: TenantProfile): Promise<TenantProfile> {
  const normalized = normalizeTenant(tenant);
  
  if (isPrisma()) {
    await syncTenantToPostgres(normalized);
    // Refresh memory
    const dbTenant = await dbFetchTenantById(normalized.id);
    if (dbTenant) {
      const profile = mapDbTenantToProfile(dbTenant);
      const index = tenantsMemory.findIndex(t => t.id === profile.id);
      if (index >= 0) tenantsMemory[index] = profile;
      else tenantsMemory.push(profile);
      return profile;
    }
  } else {
    const index = tenantsMemory.findIndex(t => t.id === normalized.id);
    if (index >= 0) tenantsMemory[index] = normalized;
    else tenantsMemory.push(normalized);
  }
  return normalized;
}

export async function saveOrUpdateAgent(tenantId: string, agent: AgentProfile): Promise<{ tenant: TenantProfile; agent: AgentProfile } | null> {
  const tenant = getTenantById(tenantId);
  if (!tenant) return null;

  if (isPrisma()) {
    await dbUpsertAiIdentity({
      id: agent.id,
      tenantId: tenantId,
      aiName: agent.agentName,
      aiPronunciation: agent.pronunciation,
      aiPersonality: agent.personality,
      aiGreeting: agent.greetingMessage,
      aiDialect: agent.dialect,
      aiLanguage: agent.language,
      aiModelName: agent.aiModel,
      aiGender: agent.gender || "male",
      bargeIn: agent.bargeIn ?? true,
      bargeInSensitivity: agent.bargeInSensitivity || "gemini_only",
      agentStartsFirst: agent.agentStartsFirst ?? true,
      role: agent.role,
      extension: agent.extension,
      timezone: agent.timezone,
      speakingRate: agent.speakingRate,
      temperature: agent.temperature,
      defaultFallback: agent.defaultFallbackResponse,
      prebuiltVoice: agent.prebuiltVoice,
      systemInstruction: agent.systemInstruction,
      isDefault: agent.isDefault,
    });
  } else {
    const agIdx = tenant.agents.findIndex(a => a.id === agent.id);
    if (agIdx >= 0) tenant.agents[agIdx] = agent;
    else tenant.agents.push(agent);
  }

  const updatedTenant = await saveOrUpdateTenant(tenant);
  const updatedAgent = updatedTenant.agents.find((a) => a.id === agent.id) || agent;
  return { tenant: updatedTenant, agent: updatedAgent };
}

export async function deleteAgent(tenantId: string, agentId: string): Promise<boolean> {
  const tenant = getTenantById(tenantId);
  if (!tenant || !tenant.agents) return false;

  if (tenant.agents.length <= 1) return false;

  if (isPrisma()) {
    await dbDeleteAiIdentity(agentId);
  } else {
    tenant.agents = tenant.agents.filter(a => a.id !== agentId);
  }
  await saveOrUpdateTenant(tenant);
  return true;
}

export async function deleteTenant(id: string): Promise<boolean> {
  if (isPrisma()) {
    const success = await dbRemoveTenant(id);
    if (success) {
      tenantsMemory = tenantsMemory.filter((t) => t.id !== id);
    }
    return success;
  } else {
    tenantsMemory = tenantsMemory.filter((t) => t.id !== id);
    return true;
  }
}

export async function addTenantCallbackRequest(tenantId: string, cb: CallbackRequest): Promise<CallbackRequest | null> {
  if (isPrisma()) {
    const result = await dbUpsertCallbackRequest({
      ...cb,
      tenantId
    });
    if (result) {
      // Update memory
      const tenant = getTenantById(tenantId);
      if (tenant) {
        if (!tenant.callbackRequests) tenant.callbackRequests = [];
        tenant.callbackRequests.unshift({
          ...cb,
          id: result.id,
          createdAt: result.createdAt ? new Date(result.createdAt).getTime() : Date.now()
        });
      }
      return cb;
    }
  } else {
    const tenant = getTenantById(tenantId);
    if (tenant) {
      if (!tenant.callbackRequests) tenant.callbackRequests = [];
      const newCb = { ...cb, id: `cb_${Date.now()}`, createdAt: Date.now() };
      tenant.callbackRequests.unshift(newCb);
      return newCb;
    }
  }
  return null;
}

export async function updateCallbackStatus(tenantId: string, callbackId: string, status: "pending" | "completed" | "cancelled"): Promise<boolean> {
  if (isPrisma()) {
    const result = await dbUpsertCallbackRequest({
      id: callbackId,
      tenantId,
      status
    });
    if (result) {
      const tenant = getTenantById(tenantId);
      if (tenant && tenant.callbackRequests) {
        const cb = tenant.callbackRequests.find(c => c.id === callbackId);
        if (cb) cb.status = status;
      }
      return true;
    }
  } else {
    const tenant = getTenantById(tenantId);
    if (tenant && tenant.callbackRequests) {
      const cb = tenant.callbackRequests.find(c => c.id === callbackId);
      if (cb) {
        cb.status = status;
        return true;
      }
    }
  }
  return false;
}

export function compileSystemInstruction(tenant: TenantProfile, agent?: AgentProfile): string {
  const activeAgent: Partial<AgentProfile> = agent || (tenant.agents && tenant.agents.length > 0 ? tenant.agents[0] : (tenant as any));

  let docContext = "";
  if (tenant.documents && tenant.documents.length > 0) {
    docContext = "\n\n--- DOKUMEN KNOWLEDGE BASE & PROSEDUR PERUSAHAAN (RAG CONTEXT) ---\n";
    tenant.documents.forEach((doc, idx) => {
      docContext += `\n[DOKUMEN ${idx + 1}: ${doc.title} | Kategori: ${doc.category}]\n${doc.content}\n`;
    });
    docContext += "\n--- AKHIR DOKUMEN KNOWLEDGE BASE ---\n";
  }

  const agentName = activeAgent.agentName || "Agent AI";
  const extension = activeAgent.extension || tenant.extension || "501";
  const language = activeAgent.language || tenant.language || "Indonesia";
  const dialect = activeAgent.dialect || tenant.dialect || "Standar / Baku";
  const gender = activeAgent.gender || tenant.gender || "Perempuan";
  const greeting = activeAgent.greetingMessage || tenant.greetingMessage || "Halo, ada yang bisa saya bantu?";
  const fallback = activeAgent.defaultFallbackResponse || tenant.defaultFallbackResponse;
  const personalityPrompt = activeAgent.personality || activeAgent.systemInstruction || tenant.systemInstruction || "";
  const roleText = activeAgent.role ? `\n- Divisi / Tanggung Jawab: ${activeAgent.role}` : "";

  const startModeText = (activeAgent.agentStartsFirst !== false)
    ? `- Inisiasi Panggilan: Agent HARUS memrakarsai/memulai percakapan terlebih dahulu segera setelah terhubung dengan menyapa ("${greeting}").`
    : `- Inisiasi Panggilan: Agent HARUS DIAM dan MENUNGGU pemanggil berbicara terlebih dahulu. Jangan berbicara sebelum pemanggil memulai percakapan.`;

  const fallbackText = fallback
    ? `\n- Jika informasi tidak ditemukan dalam Dokumen Knowledge Base / RAG, berikan respon standar: "${fallback}"`
    : "";

  return `${personalityPrompt}

Identitas Agent AI:
- Nama Agent: ${agentName}${roleText}
- Pronunciation / Cara Pengucapan: ${activeAgent.pronunciation || agentName}
- Perusahaan / Tenant: ${tenant.name} (${tenant.businessCategory})
- Ekstensi Telepon: ${extension}
- Bahasa: ${language}
- Dialek: ${dialect}
- Gender: ${gender}
- Zona Waktu: ${activeAgent.timezone || tenant.timezone || "WIB (Asia/Jakarta)"}
${startModeText}

Panduan Berbicara & Personality:
1. Sapa pelanggan secara alami dengan Bahasa ${language} (Dialek ${dialect}) yang sopan dan ramah.
2. Jawab pertanyaan hanya berdasarkan informasi valid dari DOKUMEN KNOWLEDGE BASE di bawah.${fallbackText}
3. Apabila pertanyaan pelanggan memerlukan penanganan khusus (misal pendaftaran, jadwal konsul, kendala teknis, retur), tawarkan untuk mencatat permintaan panggilan kembali menggunakan tool 'request_callback'.
${docContext}`;
}

// ----------------------------------------------------
// TenantApiKey Store Functions
// ----------------------------------------------------
const tenantApiKeysMemory: Map<string, TenantApiKey> = new Map();

export async function getTenantApiKeyRecord(tenantId: string, service: string = "gemini"): Promise<TenantApiKey | null> {
  const key = `${tenantId}:${service}`;
  if (isPrisma()) {
    try {
      const dbKey = await dbGetTenantApiKey(tenantId, service);
      if (dbKey) {
        const record: TenantApiKey = {
          id: dbKey.id,
          tenantId: dbKey.tenantId,
          service: dbKey.service,
          apiKey: dbKey.apiKey,
          status: dbKey.status,
          createdAt: dbKey.createdAt,
          updatedAt: dbKey.updatedAt,
        };
        tenantApiKeysMemory.set(key, record);
        return record;
      }
    } catch (err) {
      // Database fallback to memory
    }
  }

  return tenantApiKeysMemory.get(key) || null;
}

export function getEffectiveTenantApiKeySync(tenantId?: string, service: string = "gemini"): string {
  if (tenantId) {
    const key = `${tenantId}:${service}`;
    const memKey = tenantApiKeysMemory.get(key);
    if (memKey && memKey.status === "active" && memKey.apiKey && memKey.apiKey.trim().length > 0) {
      return memKey.apiKey.trim();
    }
  }
  return process.env.GEMINI_API_KEY || "";
}

export async function getEffectiveTenantApiKey(tenantId?: string, service: string = "gemini"): Promise<string> {
  if (!tenantId) return process.env.GEMINI_API_KEY || "";
  const record = await getTenantApiKeyRecord(tenantId, service);
  if (record && record.status === "active" && record.apiKey && record.apiKey.trim().length > 0) {
    return record.apiKey.trim();
  }
  return process.env.GEMINI_API_KEY || "";
}

export async function saveOrUpdateTenantApiKey(
  tenantId: string,
  apiKey: string,
  service: string = "gemini",
  status: string = "active"
): Promise<TenantApiKey> {
  let savedRecord: TenantApiKey;
  if (isPrisma()) {
    try {
      const dbResult = await dbUpsertTenantApiKey(tenantId, apiKey, service, status);
      savedRecord = {
        id: dbResult.id,
        tenantId: dbResult.tenantId,
        service: dbResult.service,
        apiKey: dbResult.apiKey,
        status: dbResult.status,
        createdAt: dbResult.createdAt,
        updatedAt: dbResult.updatedAt,
      };
    } catch (err) {
      savedRecord = {
        id: `key_${tenantId}_${Date.now()}`,
        tenantId: tenantId,
        service,
        apiKey: apiKey,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  } else {
    savedRecord = {
      id: `key_${tenantId}_${Date.now()}`,
      tenantId: tenantId,
      service,
      apiKey: apiKey,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  tenantApiKeysMemory.set(`${tenantId}:${service}`, savedRecord);
  return savedRecord;
}

export async function saveRagDocument(tenantId: string, doc: Partial<RagDocumentRecord>): Promise<RagDocumentRecord | null> {
  if (isPrisma()) {
    const result = await dbCreateRagDocument({
      tenantId,
      filename: doc.filename!,
      fileFormat: doc.fileFormat!,
      fileSizeBytes: doc.fileSizeBytes ? BigInt(doc.fileSizeBytes) : 0n,
      mimeType: doc.mimeType,
      storagePath: doc.storagePath!,
      status: doc.status || "processing",
      aiIdentityId: doc.aiIdentityId,
    });
    
    if (result) {
      const record: RagDocumentRecord = {
        id: result.id,
        tenantId: result.tenantId,
        filename: result.filename,
        fileFormat: result.fileFormat,
        fileSizeBytes: Number(result.fileSizeBytes),
        mimeType: result.mimeType || undefined,
        storagePath: result.storagePath,
        status: result.status,
        chunkCount: result.chunkCount,
        createdAt: result.createdAt.getTime(),
        updatedAt: result.updatedAt.getTime(),
        aiIdentityId: result.aiIdentityId || undefined,
      };
      
      // Update memory if tenant exists
      const tenant = getTenantById(tenantId);
      if (tenant) {
        if (!tenant.documents) tenant.documents = [];
        tenant.documents.unshift({
          id: record.id,
          title: record.filename,
          category: record.fileFormat,
          content: record.storagePath,
          updatedAt: record.updatedAt
        });
      }
      return record;
    }
  } else {
    // Memory only
    const record: RagDocumentRecord = {
      id: `rag_${Date.now()}`,
      tenantId,
      filename: doc.filename!,
      fileFormat: doc.fileFormat!,
      fileSizeBytes: doc.fileSizeBytes || 0,
      mimeType: doc.mimeType,
      storagePath: doc.storagePath!,
      status: "completed",
      chunkCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      aiIdentityId: doc.aiIdentityId,
    };
    
    const tenant = getTenantById(tenantId);
    if (tenant) {
      if (!tenant.documents) tenant.documents = [];
      tenant.documents.unshift({
        id: record.id,
        title: record.filename,
        category: record.fileFormat,
        content: record.storagePath,
        updatedAt: record.updatedAt
      });
    }
    return record;
  }
  return null;
}

export async function getTenantRagDocuments(tenantId: string): Promise<RagDocumentRecord[]> {
  if (isPrisma()) {
    const docs = await dbGetRagDocumentsByTenant(tenantId);
    return docs.map(d => ({
      id: d.id,
      tenantId: d.tenantId,
      filename: d.filename,
      fileFormat: d.fileFormat,
      fileSizeBytes: Number(d.fileSizeBytes),
      mimeType: d.mimeType || undefined,
      storagePath: d.storagePath,
      status: d.status,
      chunkCount: d.chunkCount,
      createdAt: d.createdAt.getTime(),
      updatedAt: d.updatedAt.getTime(),
      aiIdentityId: d.aiIdentityId || undefined,
    }));
  }
  
  // Fallback to memory via the documents array in TenantProfile
  const tenant = getTenantById(tenantId);
  if (tenant && tenant.documents) {
    return tenant.documents.map(d => ({
      id: d.id,
      tenantId,
      filename: d.title,
      fileFormat: d.category,
      fileSizeBytes: 0,
      storagePath: d.content,
      status: "completed",
      chunkCount: 0,
      createdAt: d.updatedAt,
      updatedAt: d.updatedAt,
    }));
  }
  return [];
}

export async function deleteTenantApiKey(tenantId: string, service: string = "gemini"): Promise<boolean> {
  tenantApiKeysMemory.delete(`${tenantId}:${service}`);
  if (isPrisma()) {
    try {
      await dbDeleteTenantApiKey(tenantId, service);
    } catch (e) {}
  }
  return true;
}
