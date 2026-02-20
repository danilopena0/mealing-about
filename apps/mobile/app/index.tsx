import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '@/hooks/useLocation';

export default function HomeScreen() {
  const router = useRouter();
  const { location, errorMsg, isLoading, permissionStatus, refreshLocation } =
    useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const handleTextSearch = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    router.push({
      pathname: '/restaurants',
      params: { query: trimmed },
    });
  };

  const handleSearchPress = async () => {
    if (!location) {
      await refreshLocation();
    }

    if (location) {
      router.push({
        pathname: '/restaurants',
        params: {
          latitude: location.latitude.toString(),
          longitude: location.longitude.toString(),
        },
      });
    }
  };

  const renderLocationStatus = () => {
    if (isLoading) {
      return (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color="#22c55e" />
          <Text style={styles.statusText}>Getting your location...</Text>
        </View>
      );
    }

    if (errorMsg) {
      return (
        <View style={styles.statusContainer}>
          <Ionicons name="warning-outline" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      );
    }

    if (location) {
      return (
        <View style={styles.statusContainer}>
          <Ionicons name="location" size={20} color="#22c55e" />
          <Text style={styles.statusText}>Location ready</Text>
        </View>
      );
    }

    if (permissionStatus === 'denied') {
      return (
        <View style={styles.statusContainer}>
          <Ionicons name="location-outline" size={20} color="#f59e0b" />
          <Text style={styles.statusText}>
            Location access needed to find restaurants
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.statusContainer}>
        <Ionicons name="location-outline" size={20} color="#6b7280" />
        <Text style={styles.statusText}>
          Tap the button to enable location
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <Text style={styles.heroIcon}>🍽️</Text>
          </View>
          <Text style={styles.title}>Mealing About</Text>
          <Text style={styles.subtitle}>
            Find vegan, vegetarian & gluten-free options at any restaurant
          </Text>
          <Text style={styles.browseSubtitle}>
            Browse pre-analyzed menus from independent restaurants 🌱
          </Text>
        </View>

        <View style={styles.featuresSection}>
          <View style={styles.featureRow}>
            <View style={styles.featureBadge}>
              <Text style={styles.featureEmoji}>🌱</Text>
            </View>
            <Text style={styles.featureText}>Vegan</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureBadge}>
              <Text style={styles.featureEmoji}>🥚</Text>
            </View>
            <Text style={styles.featureText}>Vegetarian</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureBadge}>
              <Text style={styles.featureEmoji}>🌾</Text>
            </View>
            <Text style={styles.featureText}>Gluten-Free</Text>
          </View>
        </View>

        {renderLocationStatus()}

        <Pressable
          style={({ pressed }) => [
            styles.browseButton,
            pressed && styles.browseButtonPressed,
          ]}
          onPress={() => router.push('/browse')}
        >
          <Ionicons
            name="restaurant"
            size={24}
            color="#22c55e"
            style={styles.buttonIcon}
          />
          <Text style={styles.browseButtonText}>Browse pre-analyzed menus</Text>
        </Pressable>

        <View style={styles.orDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or find near you</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.searchButton,
            pressed && styles.searchButtonPressed,
            isLoading && styles.searchButtonDisabled,
          ]}
          onPress={handleSearchPress}
          disabled={isLoading}
        >
          <Ionicons
            name="search"
            size={24}
            color="#fff"
            style={styles.buttonIcon}
          />
          <Text style={styles.searchButtonText}>
            {location ? 'Search restaurants near me' : 'Enable location & search'}
          </Text>
        </Pressable>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or search by name / address</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="e.g. Pizza Hut near Times Square"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleTextSearch}
            returnKeyType="search"
          />
          <Pressable
            style={({ pressed }) => [
              styles.searchInputButton,
              pressed && styles.searchInputButtonPressed,
              !searchQuery.trim() && styles.searchInputButtonDisabled,
            ]}
            onPress={handleTextSearch}
            disabled={!searchQuery.trim()}
          >
            <Ionicons name="search" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  browseSubtitle: {
    fontSize: 13,
    color: '#22c55e',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  featuresSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 32,
  },
  featureRow: {
    alignItems: 'center',
  },
  featureBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
  },
  browseButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 0,
  },
  browseButtonPressed: {
    backgroundColor: '#f0fdf4',
  },
  browseButtonText: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: '600',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  searchButton: {
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButtonPressed: {
    backgroundColor: '#16a34a',
    transform: [{ scale: 0.98 }],
  },
  searchButtonDisabled: {
    backgroundColor: '#86efac',
  },
  buttonIcon: {
    marginRight: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#9ca3af',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  searchInputButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputButtonPressed: {
    backgroundColor: '#16a34a',
  },
  searchInputButtonDisabled: {
    backgroundColor: '#86efac',
  },
});
