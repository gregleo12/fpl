/**
 * K-200: Ownership Combinations Page
 *
 * Shows popular player combinations from top 500 FPL managers
 */

import OwnershipPage from '@/components/Ownership/OwnershipPage';

export const metadata = {
  title: 'Top 500 Ownership | RivalFPL',
  description: 'See what player combinations elite FPL managers are choosing',
};

export default function Page() {
  return <OwnershipPage />;
}
