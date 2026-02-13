import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchRestaurants } from '@/lib/api';
import type { Restaurant } from '@/types';

export default function RestaurantsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    latitude: string;
    longitude: string;
  }>();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latitude = parseFloat(params.latitude || '0');
  const longitude = parseFloat(params.longitude || '0');

  const fetchRestaurants = async (showRefresh = false) => {
    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const results = await searchRestaurants({
        latitude,
        longitude,
        radius: 1500,
      });
      setRestaurants(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load restaurants');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (latitude && longitude) {
      fetchRestaurants();
    }
  }, [latitude, longitude]);

  const handleRestaurantPress = (restaurant: Restaurant) => {
    router.push({
      pathname: '/menu/[placeId]',
      params: {
        placeId: restaurant.placeId,
        name: restaurant.name,
      },
    });
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return '';
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const renderPriceLevel = (level?: number) => {
    if (!level) return null;
    return '$'.repeat(level);
  };

  const renderRestaurantItem = ({ item }: { item: Restaurant }) => (
    <Pressable
      style={({ pressed }) => [
        styles.restaurantCard,
        pressed && styles.restaurantCardPressed,
      ]}
      onPress={() => handleRestaurantPress(item)}
    >
      <View style={styles.restaurantInfo}>
        <Text style={styles.restaurantName}>{item.name}</Text>
        <Text style={styles.restaurantAddress} numberOfLines={1}>
          {item.address}
        </Text>
        <View style={styles.restaurantMeta}>
          {item.rating && (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={14} color="#f59e0b" />
              <Text style={styles.metaText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
          {item.priceLevel && (
            <Text style={styles.priceLevel}>
              {renderPriceLevel(item.priceLevel)}
            </Text>
          )}
          {item.distance && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color="#6b7280" />
              <Text style={styles.metaText}>{formatDistance(item.distance)}</Text>
            </View>
          )}
          {item.isOpen !== undefined && (
            <Text
              style={[
                styles.openStatus,
                item.isOpen ? styles.openStatusOpen : styles.openStatusClosed,
              ]}
            >
              {item.isOpen ? 'Open' : 'Closed'}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Finding restaurants near you...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => fetchRestaurants()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (restaurants.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="restaurant-outline" size={48} color="#9ca3af" />
        <Text style={styles.emptyText}>No restaurants found nearby</Text>
        <Text style={styles.emptySubtext}>
          Try expanding your search area
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listContent}
      data={restaurants}
      keyExtractor={(item) => item.placeId}
      renderItem={renderRestaurantItem}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchRestaurants(true)}
          tintColor="#22c55e"
        />
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 16,
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
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
  },
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  restaurantCardPressed: {
    backgroundColor: '#f3f4f6',
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  priceLevel: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '500',
  },
  openStatus: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  openStatusOpen: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
  },
  openStatusClosed: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  separator: {
    height: 12,
  },
});
