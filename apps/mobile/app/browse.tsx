import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { browseRestaurants } from '@/lib/api';
import type { DietFilter, RestaurantSummary } from '@/types';

const DIET_FILTERS: { label: string; value: DietFilter }[] = [
  { label: 'All', value: 'all' },
  { label: '🌱 Vegan', value: 'vegan' },
  { label: '🥚 Vegetarian', value: 'vegetarian' },
  { label: '🌾 Gluten-Free', value: 'gluten-free' },
];

const PAGE_LIMIT = 20;

export default function BrowseScreen() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [diet, setDiet] = useState<DietFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchPage = useCallback(
    async (nextPage: number, currentDiet: DietFilter, replace: boolean) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const data = await browseRestaurants({
          diet: currentDiet,
          page: nextPage,
          limit: PAGE_LIMIT,
        });
        setRestaurants((prev) => (replace ? data.restaurants : [...prev, ...data.restaurants]));
        setTotal(data.total);
        setPage(nextPage);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load restaurants');
      } finally {
        isFetchingRef.current = false;
      }
    },
    []
  );

  // Initial load and diet-change load
  useEffect(() => {
    setIsLoading(true);
    setRestaurants([]);
    fetchPage(1, diet, true).finally(() => setIsLoading(false));
  }, [diet, fetchPage]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPage(1, diet, true);
    setIsRefreshing(false);
  };

  const handleLoadMore = async () => {
    const hasMore = restaurants.length < total;
    if (!hasMore || isLoadingMore || isFetchingRef.current) return;
    setIsLoadingMore(true);
    await fetchPage(page + 1, diet, false);
    setIsLoadingMore(false);
  };

  const handleDietChange = (value: DietFilter) => {
    if (value === diet) return;
    setDiet(value);
  };

  const handleCardPress = (restaurant: RestaurantSummary) => {
    router.push({
      pathname: '/browse/[slug]',
      params: { slug: restaurant.slug },
    });
  };

  const renderPriceLevel = (level: number | null): string => {
    if (!level) return '';
    return '$'.repeat(level);
  };

  const renderDietaryCounts = (item: RestaurantSummary): string => {
    const parts: string[] = [];
    if (item.vegan_count > 0) parts.push(`${item.vegan_count} vegan`);
    if (item.vegetarian_count > 0) parts.push(`${item.vegetarian_count} vegetarian`);
    if (item.gluten_free_count > 0) parts.push(`${item.gluten_free_count} GF`);
    return parts.join(' · ');
  };

  const renderRestaurantCard = ({ item }: { item: RestaurantSummary }) => {
    const dietaryCounts = renderDietaryCounts(item);
    const priceText = renderPriceLevel(item.price_level);

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => handleCardPress(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.neighborhood && (
            <View style={styles.neighborhoodPill}>
              <Text style={styles.neighborhoodText}>{item.neighborhood}</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          {item.rating !== null && (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={13} color="#f59e0b" />
              <Text style={styles.metaText}>
                {item.rating.toFixed(1)}
                {item.user_rating_count !== null && (
                  <Text style={styles.metaMuted}> ({item.user_rating_count.toLocaleString()})</Text>
                )}
              </Text>
            </View>
          )}
          {priceText.length > 0 && (
            <Text style={styles.priceLevel}>{priceText}</Text>
          )}
        </View>

        {dietaryCounts.length > 0 && (
          <Text style={styles.dietaryCounts}>{dietaryCounts}</Text>
        )}

        {item.editorial_summary && (
          <Text style={styles.editorialSummary} numberOfLines={1}>
            {item.editorial_summary}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </View>
      </Pressable>
    );
  };

  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#22c55e" />
        </View>
      );
    }
    const hasMore = restaurants.length < total;
    if (hasMore && restaurants.length > 0) {
      return (
        <Pressable
          style={({ pressed }) => [styles.loadMoreButton, pressed && styles.loadMoreButtonPressed]}
          onPress={handleLoadMore}
        >
          <Text style={styles.loadMoreText}>Load more</Text>
        </Pressable>
      );
    }
    return null;
  };

  const renderFilterPills = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {DIET_FILTERS.map((filter) => {
        const isActive = diet === filter.value;
        return (
          <Pressable
            key={filter.value}
            style={[styles.filterPill, isActive && styles.filterPillActive]}
            onPress={() => handleDietChange(filter.value)}
          >
            <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
              {filter.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  if (isLoading) {
    return (
      <View style={styles.fullScreen}>
        {renderFilterPills()}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Loading restaurants...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.fullScreen}>
        {renderFilterPills()}
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setIsLoading(true);
              fetchPage(1, diet, true).finally(() => setIsLoading(false));
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fullScreen}>
      {renderFilterPills()}
      {restaurants.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="restaurant-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>No restaurants found for this filter</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={restaurants}
          keyExtractor={(item) => item.id}
          renderItem={renderRestaurantCard}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#22c55e"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterPillActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  filterPillText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#22c55e',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardPressed: {
    backgroundColor: '#f3f4f6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 1,
  },
  neighborhoodPill: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  neighborhoodText: {
    fontSize: 12,
    color: '#6b7280',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 13,
    color: '#6b7280',
  },
  metaMuted: {
    fontSize: 12,
    color: '#9ca3af',
  },
  priceLevel: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '500',
  },
  dietaryCounts: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '500',
    marginBottom: 4,
  },
  editorialSummary: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 4,
  },
  cardFooter: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  separator: {
    height: 12,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  loadMoreButtonPressed: {
    backgroundColor: '#f0fdf4',
  },
  loadMoreText: {
    fontSize: 15,
    color: '#22c55e',
    fontWeight: '600',
  },
});
