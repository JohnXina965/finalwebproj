/**
 * Subscription Service
 * Manages subscription plans, listing limits, and upgrade options
 */

// Subscription Plan Definitions with Listing Limits
export const SUBSCRIPTION_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    listingLimit: 3, // Maximum listings allowed
    price: 399,
    postingDuration: 1,
    postingDurationUnit: 'years',
    features: [
      '3 Listings Maximum',
      '1 Year Listing Duration',
      'Basic Performance Analytics',
      'Standard Customer Support'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    listingLimit: 10, // Maximum listings allowed
    price: 799,
    postingDuration: 1,
    postingDurationUnit: 'years',
    features: [
      '10 Listings Maximum',
      '1 Year Listing Duration',
      'Advanced Performance Analytics',
      'Priority Customer Support',
      'Featured Listing Badge'
    ]
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    listingLimit: 15, // Maximum listings allowed
    price: 1299,
    postingDuration: 1,
    postingDurationUnit: 'years',
    features: [
      '15 Listings Maximum',
      '1 Year Listing Duration',
      'Premium Analytics Dashboard',
      '24/7 Priority Support',
      'Advanced Marketing Tools'
    ]
  }
};

// Additional Listing Slot Pricing
export const ADDITIONAL_LISTING_PRICES = {
  oneTime: {
    price: 199, // One-time payment per slot (1 year duration based on subscription plan)
    name: 'One-Time Purchase',
    description: 'Pay once, valid for 1 year'
  }
};

// Bulk Discount Pricing (Only for existing hosts)
export const BULK_SLOT_PRICING = {
  oneTime: {
    1: 199,   // 1 slot - regular price (₱199)
    3: 529,   // 3 slots (save ₱68) - Regular: ₱597, Discounted: ₱529
    5: 849,   // 5 slots (save ₱146) - Regular: ₱995, Discounted: ₱849
    10: 1699  // 10 slots (save ₱291) - Regular: ₱1990, Discounted: ₱1699
  }
};

/**
 * Get bulk pricing for listing slots
 * @param {number} quantity - Number of slots to purchase
 * @param {string} slotType - 'oneTime' (only option now)
 * @param {boolean} isExistingHost - Whether the user is an existing host
 * @returns {Object} Pricing information
 */
export const getBulkSlotPricing = (quantity, slotType = 'oneTime', isExistingHost = false) => {
  const pricing = BULK_SLOT_PRICING.oneTime;
  
  // If not an existing host, use regular pricing
  if (!isExistingHost) {
    const regularPrice = ADDITIONAL_LISTING_PRICES.oneTime.price;
    return {
      price: regularPrice * quantity,
      perSlot: regularPrice,
      savings: 0,
      isBulk: false
    };
  }
  
  // Find the best bulk price tier
  const tiers = Object.keys(pricing).map(Number).sort((a, b) => b - a);
  let selectedTier = 1;
  let selectedPrice = pricing[1] * quantity;
  
  for (const tier of tiers) {
    if (quantity >= tier) {
      selectedTier = tier;
      // Calculate: how many full tiers + remaining at regular price
      const fullTiers = Math.floor(quantity / tier);
      const remaining = quantity % tier;
      selectedPrice = (pricing[tier] * fullTiers) + (pricing[1] * remaining);
      break;
    }
  }
  
  // Calculate savings
  const regularPrice = pricing[1] * quantity;
  const savings = regularPrice - selectedPrice;
  
  return {
    price: selectedPrice,
    perSlot: selectedPrice / quantity,
    savings: savings,
    isBulk: selectedTier > 1,
    tier: selectedTier,
    regularPrice: regularPrice
  };
};

/**
 * Get subscription plan details
 */
export const getSubscriptionPlan = (planId) => {
  return SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.starter;
};

/**
 * Get listing limit for a subscription plan
 */
export const getListingLimit = (planId) => {
  const plan = getSubscriptionPlan(planId);
  return plan.listingLimit;
};

/**
 * Check if host can create more listings
 */
export const canCreateListing = (planId, currentListingCount, additionalSlots = 0) => {
  const limit = getListingLimit(planId);
  
  // Unlimited plan
  if (limit === -1) {
    return { allowed: true, remaining: -1 };
  }
  
  // Calculate total available slots (plan limit + additional slots)
  const totalSlots = limit + additionalSlots;
  const remaining = totalSlots - currentListingCount;
  
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit: totalSlots
  };
};

/**
 * Get upgrade options for a host
 */
export const getUpgradeOptions = (currentPlanId) => {
  const currentPlan = getSubscriptionPlan(currentPlanId);
  const plans = Object.values(SUBSCRIPTION_PLANS);
  
  // Filter out current plan and lower-tier plans
  return plans.filter(plan => {
    if (plan.id === currentPlanId) return false;
    
    // Get plan tiers
    const tiers = ['starter', 'pro', 'elite'];
    const currentTier = tiers.indexOf(currentPlanId);
    const planTier = tiers.indexOf(plan.id);
    
    // Only show higher-tier plans
    return planTier > currentTier;
  });
};

/**
 * Calculate cost to upgrade
 */
export const getUpgradeCost = (fromPlanId, toPlanId) => {
  const fromPlan = getSubscriptionPlan(fromPlanId);
  const toPlan = getSubscriptionPlan(toPlanId);
  
  // Upgrade cost is the difference in prices
  return Math.max(0, toPlan.price - fromPlan.price);
};

/**
 * Get available actions when listing limit is reached
 */
export const getLimitReachedActions = (currentPlanId, currentListingCount) => {
  const actions = [];
  
  // Option 1: Upgrade subscription
  const upgradeOptions = getUpgradeOptions(currentPlanId);
  if (upgradeOptions.length > 0) {
    actions.push({
      type: 'upgrade',
      title: 'Upgrade Subscription',
      description: 'Get more listings with a higher-tier plan',
      options: upgradeOptions.map(plan => ({
        planId: plan.id,
        name: plan.name,
        listingLimit: plan.listingLimit === -1 ? 'Unlimited' : plan.listingLimit,
        price: plan.price,
        additionalListings: plan.listingLimit - getListingLimit(currentPlanId)
      }))
    });
  }
  
  // Option 2: Purchase additional slots
  actions.push({
    type: 'add_slots',
    title: 'Purchase Additional Listing Slots',
    description: 'Add more listings without upgrading your plan',
    options: [
      {
        type: 'oneTime',
        name: ADDITIONAL_LISTING_PRICES.oneTime.name,
        price: ADDITIONAL_LISTING_PRICES.oneTime.price,
        description: ADDITIONAL_LISTING_PRICES.oneTime.description
      },
    ]
  });
  
  // Option 3: Renew/Extend (if applicable)
  actions.push({
    type: 'renew',
    title: 'Renew Subscription',
    description: 'Extend your current subscription duration',
    options: []
  });
  
  return actions;
};

