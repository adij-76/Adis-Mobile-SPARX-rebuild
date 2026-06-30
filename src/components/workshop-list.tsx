import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { WorkshopCard } from '@/components/ui/workshop-card';
import { Colors, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';

export type WorkshopListProps = {
  ListHeaderComponent?: ReactElement;
};

/** Scrollable list of workshop cards, served from the live content API.
 *  Tapping a card opens that workshop in the lesson player.
 *  Shared by the "See all" route and the My Lessons tab. */
export function WorkshopList({ ListHeaderComponent }: WorkshopListProps) {
  const router = useRouter();
  const { data, loading, error, reload } = useAsync(() => api.content.workshops(), []);
  const workshops = data ?? [];

  if (loading) {
    return <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />;
  }

  if (error) {
    return (
      <View style={{ alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xl, paddingHorizontal: Spacing.lg }}>
        <Txt variant="bodySm" color={Colors.textSub} center>
          Couldn&apos;t load workshops.{'\n'}
          {error.message}
        </Txt>
        <Button title="Try again" variant="outline" onPress={reload} />
      </View>
    );
  }

  return (
    <FlatList
      data={workshops}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={
        <Txt variant="bodySm" color={Colors.textSub} center style={{ marginTop: Spacing.xl }}>
          No workshops available yet.
        </Txt>
      }
      renderItem={({ item }) => (
        <WorkshopCard
          item={{
            id: item.id,
            title: item.title || item.navTitle,
            description: item.description,
            rating: item.rating,
            image: item.thumbnail,
            vimeoUrl: item.vimeoUrl,
          }}
          onPress={() => router.push(`/lesson/${item.id}`)}
        />
      )}
      contentContainerStyle={{
        padding: Spacing.lg,
        gap: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}
