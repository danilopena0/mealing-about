import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRestaurantDetail } from '@/lib/api';
import type { DietFilter, PreloadedMenuItem, RestaurantSummary } from '@/types';

const DIET_TABS: { label: string; value: DietFilter }[] = [
  { label: 'All', value: 'all' },
  { label: '🌱 Vegan', value: 'vegan' },
  { label: '🥚 Vegetarian', value: 'vegetarian' },
  { label: '🌾 GF', value: 'gluten-free' },
];

function matchesDiet(item: PreloadedMenuItem, diet: DietFilter): boolean {
  if (diet === 'all') return true;
  if (diet === 'vegan') return item.is_vegan;
  if (diet === 'vegetarian') return item.is_vegetarian;
  if (diet === 'gluten-free') return item.is_gluten_free;
  return true;
}

export default function RestaurantDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantSummary | null>(null);
  const [menuItems, setMenuItems] = useState<PreloadedMenuItem[]>([]);
  const [diet, setDiet] = useState<DietFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    getRestaurantDetail(slug)
      .then((data) => {
        setRestaurant(data.restaurant);
        setMenuItems(data.menuItems);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load restaurant');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  if (error || !restaurant) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error ?? 'Restaurant not found'}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const filteredItems = menuItems.filter((item) => matchesDiet(item, diet));

  const veganCount = menuItems.filter((i) => i.is_vegan).length;
  const vegCount = menuItems.filter((i) => i.is_vegetarian).length;
  const gfCount = menuItems.filter((i) => i.is_gluten_free).length;

  const summaryParts: string[] = [];
  if (veganCount > 0) summaryParts.push(`${veganCount} vegan`);
  if (vegCount > 0) summaryParts.push(`${vegCount} vegetarian`);
  if (gfCount > 0) summaryParts.push(`${gfCount} GF`);
  const summaryLine = summaryParts.join(' · ') + (summaryParts.length > 0 ? ' items' : '');

  const renderPriceLevel = (level: number | null): string => {
    if (!level) return '';
    return '$'.repeat(level);
  };

  const renderMenuItem = (item: PreloadedMenuItem) => (
    <View key={item.id} style={styles.menuItemCard}>
      <View style={styles.menuItemHeader}>
        <Text style={styles.menuItemName}>{item.name}</Text>
        <View style={styles.badgeRow}>
          {item.is_vegan && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🌱</Text>
            </View>
          )}
          {item.is_vegetarian && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🥚</Text>
            </View>
          )}
          {item.is_gluten_free && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🌾</Text>
            </View>
          )}
          {item.confidence === 'uncertain' && (
            <View style={[styles.badge, styles.badgeAmber]}>
              <Text style={styles.badgeText}>⚠️</Text>
            </View>
          )}
        </View>
      </View>

      {item.description && (
        <Text style={styles.menuItemDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      {item.ask_server && (
        <View style={styles.askServerBox}>
          <Text style={styles.askServerText}>
            {'ℹ️ '}{item.ask_server}
          </Text>
        </View>
      )}

      {item.modifications && item.modifications.length > 0 && (
        <View style={styles.modificationsBox}>
          <Text style={styles.modificationsLabel}>Modifications:</Text>
          {item.modifications.map((mod, index) => (
            <Text key={index} style={styles.modificationItem}>
              {'• '}{mod}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Restaurant Header */}
      <View style={styles.header}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        {restaurant.neighborhood && (
          <View style={styles.neighborhoodPill}>
            <Text style={styles.neighborhoodText}>{restaurant.neighborhood}</Text>
          </View>
        )}
        <Text style={styles.address}>{restaurant.address}</Text>
        <View style={styles.headerMeta}>
          {restaurant.rating !== null && (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text style={styles.metaText}>
                {restaurant.rating.toFixed(1)}
                {restaurant.user_rating_count !== null && (
                  <Text style={styles.metaMuted}>
                    {' '}({restaurant.user_rating_count.toLocaleString()})
                  </Text>
                )}
              </Text>
            </View>
          )}
          {restaurant.price_level !== null && (
            <Text style={styles.priceLevel}>{renderPriceLevel(restaurant.price_level)}</Text>
          )}
        </View>
        {restaurant.editorial_summary && (
          <Text style={styles.editorialSummary}>{restaurant.editorial_summary}</Text>
        )}
      </View>

      {/* Summary line */}
      {summaryLine.length > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>{summaryLine}</Text>
        </View>
      )}

      {/* Diet Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {DIET_TABS.map((tab) => {
          const isActive = diet === tab.value;
          return (
            <Pressable
              key={tab.value}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setDiet(tab.value)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Menu Items */}
      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="restaurant-outline" size={40} color="#9ca3af" />
          <Text style={styles.emptyText}>No items for this filter</Text>
        </View>
      ) : (
        <View style={styles.menuList}>
          {filteredItems.map(renderMenuItem)}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
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
  backButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#22c55e',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  neighborhoodPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  neighborhoodText: {
    fontSize: 12,
    color: '#6b7280',
  },
  address: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  editorialSummary: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  summaryContainer: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
  },
  summaryText: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '500',
  },
  tabRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  tabText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  menuList: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#9ca3af',
  },
  menuItemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  menuItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeAmber: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 13,
  },
  menuItemDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 6,
  },
  askServerBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#60a5fa',
  },
  askServerText: {
    fontSize: 13,
    color: '#1d4ed8',
    lineHeight: 18,
  },
  modificationsBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  modificationsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
    marginBottom: 4,
  },
  modificationItem: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
});
