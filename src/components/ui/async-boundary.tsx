import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactElement } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Txt } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** The shape returned by useAsync(). */
export type AsyncQuery<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
};

/**
 * Standardises the loading / error+retry / empty / content states shared by
 * every data-backed list (videos, lessons, …). Renders a centered spinner while
 * loading, a "cloud-offline + Try again" panel on error, an optional empty
 * state, otherwise `children(data)`.
 */
export function AsyncBoundary<T>({
  query,
  /** Used in the error copy: "Couldn't load {errorLabel}." */
  errorLabel = 'this',
  empty,
  children,
}: {
  query: AsyncQuery<T>;
  errorLabel?: string;
  empty?: { icon: IoniconName; text: string; when?: (data: T) => boolean };
  children: (data: T) => ReactElement;
}) {
  const { data, loading, error, reload } = query;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={Colors.strokeStrong} />
        <Txt variant="bodySm" color={Colors.textSub} center>
          Couldn&apos;t load {errorLabel}.{'\n'}
          {error.message}
        </Txt>
        <Button title="Try again" variant="outline" onPress={reload} />
      </View>
    );
  }

  const value = (data ?? null) as T;
  const isEmpty = empty
    ? empty.when
      ? empty.when(value)
      : Array.isArray(value)
        ? value.length === 0
        : value == null
    : false;

  if (empty && isEmpty) {
    return (
      <View style={styles.center}>
        <Ionicons name={empty.icon} size={40} color={Colors.strokeStrong} />
        <Txt variant="bodySm" color={Colors.textSub} center>
          {empty.text}
        </Txt>
      </View>
    );
  }

  return children(value);
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
});
