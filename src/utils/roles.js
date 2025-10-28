export const ROLES = {
  PERSONAL: 'personal',
  BUSINESS: 'business',
  NGO: 'ngo',
  GOVERNMENT: 'government',
};

export const POST_CATEGORIES = {
  ALERT: 'alert',
  EVENT: 'event',
  OPPORTUNITY: 'opportunity',
  COMMUNITY: 'community',
  LOSTFOUND: 'lostfound',
  MARKET: 'market',
  AD: 'ad',
};

// Permission matrix: Defines which roles can post which categories
export const ROLE_CAN_POST = {
  [ROLES.PERSONAL]: new Set([
    POST_CATEGORIES.OPPORTUNITY,
    POST_CATEGORIES.COMMUNITY,
    POST_CATEGORIES.LOSTFOUND,
    POST_CATEGORIES.MARKET,
  ]),
  [ROLES.BUSINESS]: new Set([
    POST_CATEGORIES.ALERT,
    POST_CATEGORIES.EVENT,
    POST_CATEGORIES.OPPORTUNITY,
    POST_CATEGORIES.COMMUNITY,
    POST_CATEGORIES.LOSTFOUND,
    POST_CATEGORIES.MARKET,
    POST_CATEGORIES.AD,
  ]),
  [ROLES.NGO]: new Set([
    POST_CATEGORIES.ALERT,
    POST_CATEGORIES.EVENT,
    POST_CATEGORIES.OPPORTUNITY,
    POST_CATEGORIES.COMMUNITY,
    POST_CATEGORIES.LOSTFOUND,
    POST_CATEGORIES.MARKET,
  ]),
  [ROLES.GOVERNMENT]: new Set([
    POST_CATEGORIES.ALERT,
    POST_CATEGORIES.EVENT,
    POST_CATEGORIES.OPPORTUNITY,
    POST_CATEGORIES.COMMUNITY,
    POST_CATEGORIES.LOSTFOUND,
  ]),
};

/**
 * Checks if a given role is allowed to create a post of a certain category.
 * @param {string} role - The user's role (e.g., 'personal', 'business').
 * @param {string} category - The post category (e.g., 'alert', 'event').
 * @returns {boolean} - True if the role has permission, false otherwise.
 */
export const canPost = (role, category) => {
  return ROLE_CAN_POST[role]?.has(category) ?? false;
};