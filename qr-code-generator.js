/**
 * Nexus Premium QR Code Generator
 * 
 * This system generates visually stunning, tier-specific QR codes that
 * represent a user's Membership Key with artistic elements inspired by 
 * the Hugging Face QR code art generator.
 */

// -------------------------------------------------------------
// QR Code Generation Core Functions
// -------------------------------------------------------------

/**
 * Generate a premium QR code for a Nexus membership key
 * 
 * @param {string} membershipKey - The user's membership key
 * @param {Object} userData - Additional user data for personalization
 * @returns {Object} - QR code generation parameters and data
 */
function generatePremiumQRCode(membershipKey, userData = {}) {
  // Extract tier information from the membership key
  const tierInfo = extractTierFromKey(membershipKey);
  
  if (!tierInfo.valid) {
    return {
      success: false,
      error: "Invalid membership key format"
    };
  }
  
  // Base data that will be encoded in the QR code
  const qrData = {
    key: membershipKey,
    verification: `https://nexus.io/verify/${encodeURIComponent(membershipKey)}`,
    tier: tierInfo.name
  };
  
  // Generate a stable seed based on the membership key
  const seed = generateStableSeed(membershipKey);
  
  // Get tier-specific design elements
  const designElements = getTierDesignElements(tierInfo.name, seed);
  
  // Generate visual style parameters
  const visualStyle = {
    // Core style based on tier
    baseStyle: designElements.style,
    
    // Color schemes
    primaryColor: designElements.primaryColor,
    secondaryColor: designElements.secondaryColor,
    accentColor: designElements.accentColor,
    
    // Pattern elements
    patternDensity: tierInfo.level * 0.8 + 1.2, // Higher tiers get denser patterns
    patternComplexity: tierInfo.level * 0.7 + 1.3, // Higher tiers get more complex patterns
    
    // Special elements
    centerIcon: designElements.centerIcon,
    cornerStyle: designElements.cornerStyle,
    borderEffect: designElements.borderEffect,
    
    // Animation parameters (for digital display)
    animation: designElements.animation,
    animationSpeed: 0.5 + (tierInfo.level * 0.2), // Higher tiers get faster animations
    
    // Personalization
    personalElements: generatePersonalElements(userData, seed)
  };
  
  // Generate stable diffusion prompt for AI art integration
  const artPrompt = generateArtisticPrompt(tierInfo.name, seed, userData);
  
  return {
    success: true,
    membershipKey,
    tierInfo,
    qrCodeData: JSON.stringify(qrData),
    visualParameters: visualStyle,
    dimensions: {
      width: 1024,
      height: 1024
    },
    seed,
    artPrompt,
    renderOptions: {
      errorCorrectionLevel: 'H', // Highest error correction to allow for more visual modification
      margin: 2,
      scale: 8
    }
  };
}

/**
 * Extract tier information from a membership key
 */
function extractTierFromKey(membershipKey) {
  // Define tier prefixes and their properties
  const tiers = {
    "ARK": { name: "ARCHIVIST", level: 1, separator: "-" },
    "ORC": { name: "ORCHESTRATOR", level: 2, separator: ":" },
    "GOD":