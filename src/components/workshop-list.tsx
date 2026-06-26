import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { FlatList } from 'react-native';

import { WorkshopCard } from '@/components/ui/workshop-card';
import { Spacing } from '@/constants/theme';
import { workshops } from '@/data/content';

export type WorkshopListProps = {
  ListHeaderComponent?: ReactElement;
};

/** Scrollable list of workshop cards. Tapping a card opens the workshop flow.
 *  Shared by the "See all" route and the My Lessons tab. */
export function WorkshopList({ ListHeaderComponent }: WorkshopListProps) {
  const router = useRouter();

  return (
    <FlatList
      data={workshops}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={ListHeaderComponent}
      renderItem={({ item }) => (
        <WorkshopCard item={item} onPress={() => router.push('/workshop/intro')} />
      )}
      contentContainerStyle={{
        padding: Spacing.lg,
        gap: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}
