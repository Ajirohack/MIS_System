/**
 * Nexus Membership Key System
 * 
 * This system generates unique, premium membership keys that bind to multiple APIs
 * and create visually distinctive QR codes for users to share and display.
 */

// -------------------------------------------------------------
// Constants & Configuration
// -------------------------------------------------------------

// User tiers and their properties
const USER_TIERS = {
  ARCHIVIST: {
    id: 1,
    name: "Archivist",
    separator: "-",
    prefix: "ARK",
    color: "#3A86FF", // Blue
    apis: ["KNOWLEDGE_BASE", "BASIC_TOOLS", "DOCUMENT_READER"],
    qrStyle: "constellation"
  },
  ORCHESTRATOR: {
    id: 2,
    name: "Orchestrator",
    separator: ":",
    prefix: "ORC",
    color: "#8338EC", // Purple
    apis: ["KNOWLEDGE_BASE", "ADVANCED_TOOLS", "MULTIMODAL", "DATA_ANALYSIS"],
    qrStyle: "nebula"
  },
  GODFATHER: {
    id: 3,
    name: "Godfather",
    separator: "∞",
    prefix: "GOD",
    color: "#FF006E", // Pink
    apis: ["KNOWLEDGE_BASE", "ALL_TOOLS", "SYSTEM_ACCESS", "PROCESS_AUTOMATION"],
    qrStyle: "quantum"
  },
  ENTITY: {
    id: 4,
    name: "Entity",
    separator: "⟡",
    prefix: "NXS",
    color: "#FFBE0B", // Gold
    apis: ["KNOWLEDGE_BASE", "ALL_TOOLS", "SYSTEM_ACCESS", "PROCESS_AUTOMATION", "AGENT_INCEPTION"],
    qrStyle: "cosmos"
  }
};

// Special characters for key generation
const SPECIAL_CHARS = "!@#$%^&*~=-_+[]{}|;:,./<>?";

// Available APIs in the system
const AVAILABLE_APIS = {
  KNOWLEDGE_BASE: {
    id: "kb-api",
    name: "Knowledge Base API",
    endpoints: ["/query", "/store", "/retrieve"],
    quotaBase: 1000
  },
  BASIC_TOOLS: {
    id: "basic-tools",
    name: "Basic Tools API",
    endpoints: ["/search", "/analyze", "/generate"],
    quotaBase: 500
  },
  ADVANCED_TOOLS: {
    id: "adv-tools",
    name: "Advanced Tools API",
    endpoints: ["/search", "/analyze", "/generate", "/create", "/transform"],
    quotaBase: 1000
  },
  ALL_TOOLS: {
    id: "all-tools",
    name: "Complete Tools API",
    endpoints: ["/search", "/analyze", "/generate", "/create", "/transform", "/automate", "/deploy"],
    quotaBase: 2000
  },
  MULTIMODAL: {
    id: "multimodal",
    name: "Multimodal Processing API",
    endpoints: ["/image", "/audio", "/video", "/text"],
    quotaBase: 800
  },
  DATA_ANALYSIS: {
    id: "data-analysis",
    name: "Data Analysis API",
    endpoints: ["/analyze", "/visualize", "/predict"],
    quotaBase: 600
  },
  SYSTEM_ACCESS: {
    id: "system",
    name: "System Control API",
    endpoints: ["/status", "/configure", "/monitor"],
    quotaBase: 300
  },
  PROCESS_AUTOMATION: {
    id: "automation",
    name: "Process Automation API",
    endpoints: ["/create-workflow", "/execute", "/schedule"],
    quotaBase: 400
  },
  AGENT_INCEPTION: {
    id: "agents",
    name: "Agent Inception API",
    endpoints: ["/create-agent", "/train", "/deploy"],
    quotaBase: 100
  },
  DOCUMENT_READER: {
    id: "docs",
    name: "Document Reader API",
    endpoints: ["/parse", "/extract", "/convert"],
    quotaBase: 750
  }
};

// -------------------------------------------------------------
// Key Generation Functions
// -------------------------------------------------------------

/**
 * Generate a unique membership key for a user
 * 
 * @param {string} userId - Unique identifier for the user
 * @param {string} tierName - User tier name (ARCHIVIST, ORCHESTRATOR, etc.)
 * @param {Date} registrationDate - When the user registered
 * @param {Object} userAttributes - Additional user attributes for personalization
 * @returns {string} - A unique, formatted membership key
 */
function generateMembershipKey(userId, tierName, registrationDate, userAttributes = {}) {
  // Get tier configuration
  const tier = USER_TIERS[tierName.toUpperCase()];
  if (!tier) throw new Error(`Invalid tier: ${tierName}`);
  
  // Generate key components
  const userHash = createUserHash(userId);
  const tierIdentifier = encodeTier(tier.id);
  const timeSignature = encodeTimestamp(registrationDate);
  const uniquePattern = generateUniquePattern(userId + registrationDate.getTime());
  
  // Create key segments
  const segmentA = `${tier.prefix}${userHash.substring(0, 3)}`;
  const segmentB = `${tierIdentifier}${uniquePattern.substring(0, 4)}`;
  const segmentC = `${timeSignature}`;
  const segmentD = `${uniquePattern.substring(4, 8)}`;
  
  // Generate personalized element based on user attributes
  const personalElement = generatePersonalElement(userAttributes, userId);
  
  // Add checksum for validation
  const baseKey = segmentA + segmentB + segmentC + segmentD + personalElement;
  const checksum = calculateChecksum(baseKey);
  
  // Format with tier-specific styling
  return formatKey(segmentA, segmentB, segmentC, segmentD, personalElement, checksum, tier);
}

/**
 * Create a cryptographic hash of the user ID
 */
function createUserHash(userId) {
  // In a real implementation, use a proper hashing function
  // This is a simplified version for demonstration
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to alphanumeric
  const hashStr = Math.abs(hash).toString(36).toUpperCase();
  return hashStr.padStart(6, '0');
}

/**
 * Encode the tier level into a character
 */
function encodeTier(tierId) {
  // Simple encoding for demonstration
  const tierChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return tierChars.charAt(tierId - 1);
}

/**
 * Encode the registration timestamp into a compact representation
 */
function encodeTimestamp(date) {
  // Get year last two digits, month, and day
  const year = date.getFullYear() % 100;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Convert to base36 for compactness
  const yearStr = year.toString(36).toUpperCase().padStart(2, '0');
  const monthStr = month.toString(36).toUpperCase();
  const dayStr = day.toString(36).toUpperCase().padStart(2, '0');
  
  return `${yearStr}${monthStr}${dayStr}`;
}

/**
 * Generate a unique pattern based on input string
 */
function generateUniquePattern(input) {
  // Create a seeded random number generator
  const seed = hashString(input);
  
  // Generate a mix of alphanumeric and special characters
  let pattern = '';
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  
  for (let i = 0; i < 12; i++) {
    // Every fourth character is a special character
    if (i % 4 === 3) {
      const specialIndex = seededRandom(seed + i) * SPECIAL_CHARS.length | 0;
      pattern += SPECIAL_CHARS[specialIndex];
    } else {
      const charIndex = seededRandom(seed + i) * chars.length | 0;
      pattern += chars[charIndex];
    }
  }
  
  return pattern;
}

/**
 * Generate a personal element based on user attributes
 */
function generatePersonalElement(userAttributes, userId) {
  // Extract initials or other personal identifiers
  let personal = '';
  
  if (userAttributes.name) {
    // Get initials from name
    const nameParts = userAttributes.name.split(' ');
    for (let i = 0; i < Math.min(nameParts.length, 2); i++) {
      if (nameParts[i].length > 0) {
        personal += nameParts[i][0].toUpperCase();
      }
    }
  }
  
  // If no personal element could be created, use a hash of the userId
  if (!personal) {
    const hash = hashString(userId);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    personal = '';
    for (let i = 0; i < 2; i++) {
      const index = seededRandom(hash + i) * chars.length | 0;
      personal += chars[index];
    }
  }
  
  return personal;
}

/**
 * Calculate a checksum for the key to enable validation
 */
function calculateChecksum(input) {
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input.charCodeAt(i) * (i + 1);
  }
  
  // Convert to two alphanumeric characters
  return (sum % 36).toString(36).toUpperCase() + 
         ((sum * 13) % 36).toString(36).toUpperCase();
}

/**
 * Format the key segments according to tier specifications
 */
function formatKey(segmentA, segmentB, segmentC, segmentD, personalElement, checksum, tier) {
  return `${segmentA}${tier.separator}${segmentB}${tier.separator}${segmentC}${tier.separator}${segmentD}${personalElement}${tier.separator}${checksum}`;
}

/**
 * Basic string hashing function
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * Simple seeded random number generator
 */
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// -------------------------------------------------------------
// API Binding Functions
// -------------------------------------------------------------

/**
 * Bind multiple APIs to a single membership key
 */
function bindAPIsToMembershipKey(membershipKey) {
  // First validate the membership key
  const validationResult = validateMembershipKey(membershipKey);
  
  if (!validationResult.valid) {
    return {
      success: false,
      error: "Invalid membership key",
      details: validationResult.error
    };
  }
  
  const { userId, tierName } = validationResult;
  const tier = USER_TIERS[tierName];
  
  // Determine which APIs are available to this tier
  const availableAPIs = tier.apis.map(apiKey => AVAILABLE_APIS[apiKey]);
  
  // Generate API keys for each available API
  const boundAPIs = availableAPIs.map(api => {
    return {
      apiName: api.name,
      apiId: api.id,
      apiKey: generateAPIKey(membershipKey, api.id, userId),
      endpoints: api.endpoints,
      quotaLimit: calculateQuota(api.quotaBase, tier.id)
    };
  });
  
  // In a real implementation, you would store these bindings in a database
  
  return {
    success: true,
    membershipKey,
    userId,
    tierName,
    tierLevel: tier.id,
    boundAPIs,
    totalApis: boundAPIs.length
  };
}

/**
 * Generate an API-specific key derived from the membership key
 */
function generateAPIKey(membershipKey, apiId, userId) {
  // Create a composite string
  const composite = `${membershipKey}:${apiId}:${userId}`;
  
  // Hash it to create the API key
  const apiKeyHash = hashString(composite);
  
  // Format into a readable API key
  const prefix = apiId.substring(0, 3).toUpperCase();
  const main = Math.abs(apiKeyHash).toString(36).toUpperCase().padStart(10, '0');
  
  // API keys have a simpler format than membership keys
  return `${prefix}-${main.substring(0, 5)}-${main.substring(5, 10)}`;
}

/**
 * Calculate quota for an API based on tier level
 */
function calculateQuota(baseQuota, tierLevel) {
  // Higher tiers get higher quotas
  const multiplier = 1 + (tierLevel - 1) * 0.5;
  return Math.floor(baseQuota * multiplier);
}

// -------------------------------------------------------------
// Key Validation Functions
// -------------------------------------------------------------

/**
 * Validate a membership key and extract its components
 */
function validateMembershipKey(membershipKey) {
  // Try to determine the tier from the key format
  let tierName = null;
  let separator = null;
  
  for (const [name, tier] of Object.entries(USER_TIERS)) {
    if (membershipKey.startsWith(tier.prefix) && membershipKey.includes(tier.separator)) {
      tierName = name;
      separator = tier.separator;
      break;
    }
  }
  
  if (!tierName || !separator) {
    return {
      valid: false,
      error: "Unknown key format"
    };
  }
  
  // Split the key into segments
  const segments = membershipKey.split(separator);
  
  if (segments.length !== 5) {
    return {
      valid: false,
      error: "Invalid key structure"
    };
  }
  
  // Extract components
  const segmentA = segments[0];
  const segmentB = segments[1];
  const segmentC = segments[2];
  const segmentD = segments[3].slice(0, -2);  // Remove personal element
  const personalElement = segments[3].slice(-2);
  const providedChecksum = segments[4];
  
  // Reconstruct key without checksum for validation
  const reconstructed = segmentA + segmentB + segmentC + segmentD + personalElement;
  const calculatedChecksum = calculateChecksum(reconstructed);
  
  if (providedChecksum !== calculatedChecksum) {
    return {
      valid: false,
      error: "Invalid checksum"
    };
  }
  
  // Extract tier identifier
  const tierIdentifier = segmentB.charAt(0);
  const extractedTierId = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(tierIdentifier) + 1;
  
  // Verify tier ID matches the prefix
  if (extractedTierId !== USER_TIERS[tierName].id) {
    return {
      valid: false,
      error: "Tier identifier mismatch"
    };
  }
  
  // Extract user hash (for retrieving user ID)
  const userHashPart = segmentA.substring(3);
  
  // Extract timestamp
  const timeSignature = segmentC;
  const year = parseInt(timeSignature.substring(0, 2), 36) + 2000;
  const month = parseInt(timeSignature.substring(2, 3), 36) - 1;
  const day = parseInt(timeSignature.substring(3), 36);
  
  const registrationDate = new Date(year, month, day);
  
  // In a real implementation, you would look up the userId from the userHash
  // For this example, we'll return a placeholder
  const userId = "user_" + userHashPart;
  
  return {
    valid: true,
    userId,
    tierName,
    tierLevel: USER_TIERS[tierName].id,
    registrationDate,
    personalElement
  };
}

// -------------------------------------------------------------
// QR Code Generation
// -------------------------------------------------------------

/**
 * Generate data for creating a premium QR code
 */
function generatePremiumQRCode(membershipKey) {
  // Validate membership key first
  const validationResult = validateMembershipKey(membershipKey);
  
  if (!validationResult.valid) {
    return {
      success: false,
      error: "Invalid membership key",
      details: validationResult.error
    };
  }
  
  const { tierName, tierLevel, userId } = validationResult;
  const tier = USER_TIERS[tierName];
  
  // Base QR code data
  const qrData = {
    membershipKey,
    validationURL: `https://nexus.io/validate/${encodeURIComponent(membershipKey)}`,
    tier: tierName
  };
  
  // Generate stable seed for visual consistency
  const seed = Math.abs(hashString(membershipKey));
  
  // Visual parameters based on tier
  const visualStyle = {
    style: tier.qrStyle,
    mainColor: tier.color,
    secondaryColor: getComplementaryColor(tier.color),
    patternComplexity: Math.min(tierLevel * 2, 10), // Higher tiers get more complex patterns
    borderStyle: getTierBorderStyle(tierLevel),
    centerLogo: getTierLogo(tierName)
  };
  
  // Generate a prompt for AI art generation
  const artPrompt = generateArtPrompt(tierName, validationResult.userId, seed);
  
  return {
    success: true,
    qrCodeData: JSON.stringify(qrData),
    visualParameters: visualStyle,
    seed,
    artPrompt,
    tierName,
    tierLevel
  };
}

/**
 * Get complementary color for the QR code
 */
function getComplementaryColor(hexColor) {
  // Remove the hash if it exists
  hexColor = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);
  
  // Get complementary color
  const compR = 255 - r;
  const compG = 255 - g;
  const compB = 255 - b;
  
  // Convert back to hex
  return `#${compR.toString(16).padStart(2, '0')}${compG.toString(16).padStart(2, '0')}${compB.toString(16).padStart(2, '0')}`;
}

/**
 * Get border style based on tier level
 */
function getTierBorderStyle(tierLevel) {
  const styles = [
    "simple",
    "dotted",
    "ornate",
    "cosmic"
  ];
  
  return styles[Math.min(tierLevel - 1, styles.length - 1)];
}

/**
 * Get logo for each tier
 */
function getTierLogo(tierName) {
  const logos = {
    "ARCHIVIST": "scroll",
    "ORCHESTRATOR": "conductor",
    "GODFATHER": "crown",
    "ENTITY": "nexus"
  };
  
  return logos[tierName] || "nexus";
}

/**
 * Generate an art prompt for the QR code design
 */
function generateArtPrompt(tierName, userId, seed) {
  const basePrompts = {
    "ARCHIVIST": "Ancient library with constellation patterns, knowledge seeker's sanctuary",
    "ORCHESTRATOR": "Command center with nebula-inspired interfaces, digital conductor's domain",
    "GODFATHER": "Quantum realm with crystalline structures, reality architect's vision",
    "ENTITY": "Cosmic consciousness visualized as energy patterns, digital entity's manifestation"
  };
  
  // Get relevant theme based on tier
  const basePrompt = basePrompts[tierName] || "Digital realm with abstract patterns";
  
  // Add user-specific element
  const userSeed = seed % 10;
  const userElements = [
    "floating glyphs",
    "geometric patterns",
    "flowing data streams",
    "energy spheres",
    "fractals",
    "digital particles",
    "light beams",
    "crystalline structures",
    "neural networks",
    "holographic interfaces"
  ];
  
  // Combine elements for a unique prompt
  return `${basePrompt}, with ${userElements[userSeed]}, highly detailed digital art in a ${getTierColorDescription(USER_TIERS[tierName].color)} color scheme`;
}

/**
 * Get color description for prompts
 */
function getTierColorDescription(hexColor) {
  const colorMap = {
    "#3A86FF": "blue cyberpunk",
    "#8338EC": "purple ethereal",
    "#FF006E": "vibrant magenta",
    "#FFBE0B": "golden cosmic"
  };
  
  return colorMap[hexColor] || "mysterious digital";
}

// -------------------------------------------------------------
// Usage Examples
// -------------------------------------------------------------

/**
 * Example: Generate a new membership key
 */
function exampleGenerateKey() {
  const userId = "user_12345";
  const tierName = "ORCHESTRATOR";
  const registrationDate = new Date();
  const userAttributes = {
    name: "Jane Smith"
  };
  
  const key = generateMembershipKey(userId, tierName, registrationDate, userAttributes);
  console.log("Generated Membership Key:", key);
  
  return key;
}

/**
 * Example: Bind APIs to a membership key
 */
function exampleBindAPIs(membershipKey) {
  const result = bindAPIsToMembershipKey(membershipKey);
  console.log("API Binding Result:", result);
  
  return result;
}

/**
 * Example: Validate a membership key
 */
function exampleValidateKey(membershipKey) {
  const result = validateMembershipKey(membershipKey);
  console.log("Validation Result:", result);
  
  return result;
}

/**
 * Example: Generate a premium QR code
 */
function exampleGenerateQRCode(membershipKey) {
  const result = generatePremiumQRCode(membershipKey);
  console.log("QR Code Generation Result:", result);
  
  return result;
}

// Run examples
const sampleKey = exampleGenerateKey();
exampleBindAPIs(sampleKey);
exampleValidateKey(sampleKey);
exampleGenerateQRCode(sampleKey);
