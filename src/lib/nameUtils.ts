/**
 * Utility functions for shortening team and manager names for display
 */

/**
 * Shorten team names for better display on mobile and compact layouts
 */
export function shortenTeamName(teamName: string): string {
  if (!teamName) return teamName;

  // Remove " F.C." suffix
  let shortened = teamName.replace(/\s+F\.C\.\*?$/i, '*');

  // Remove trailing exclamation marks
  shortened = shortened.replace(/!+$/, '');

  return shortened.trim();
}

/**
 * Shorten manager names for better display on mobile and compact layouts
 */
export function shortenManagerName(managerName: string): string {
  if (!managerName) return managerName;

  // Specific manager name replacements
  const replacements: { [key: string]: string } = {
    'Hadrien van Doosselaere': 'Hadrien van Do',
    'Vanaka Chhem-Kieth': 'Vanaka CK',
    'Sorivan Chhem-Kieth': 'Sorivan CK',
  };

  // Check for exact match first
  if (replacements[managerName]) {
    return replacements[managerName];
  }

  // Generic rules for other names if needed
  // Could add more generic shortening rules here in the future

  return managerName;
}
