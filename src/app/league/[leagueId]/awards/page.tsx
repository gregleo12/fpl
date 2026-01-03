import { AwardsPage } from '@/components/Awards/AwardsPage';

interface Props {
  params: {
    leagueId: string;
  };
}

export default function Awards({ params }: Props) {
  return <AwardsPage leagueId={params.leagueId} />;
}
