import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { analyzeMenu } from '@/lib/api';
import type { MenuItem, DietaryLabel } from '@/types';

type InputMethod = 'photo' | 'url' | 'text' | null;

export default function MenuScreen() {
  const params = useLocalSearchParams<{
    placeId: string;
    name: string;
  }>();

  const [inputMethod, setInputMethod] = useState<InputMethod>(null);
  const [menuUrl, setMenuUrl] = useState('');
  const [menuText, setMenuText] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<DietaryLabel>>(new Set());
  const [wasCached, setWasCached] = useState(false);

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera access is needed to photograph menus.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      analyzeMenuImage(result.assets[0].base64);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Photo library access is needed to select menu images.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      analyzeMenuImage(result.assets[0].base64);
    }
  };

  const analyzeMenuImage = async (base64: string) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await analyzeMenu({
        menuImage: base64,
        placeId: params.placeId,
      });
      setMenuItems(response.items);
      setWasCached(response.cached);
      setInputMethod('photo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze menu');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeUrl = async () => {
    if (!menuUrl.trim()) {
      Alert.alert('Error', 'Please enter a menu URL');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await analyzeMenu({
        menuUrl: menuUrl.trim(),
        placeId: params.placeId,
      });
      setMenuItems(response.items);
      setWasCached(response.cached);
      setInputMethod('url');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze menu');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeText = async () => {
    if (!menuText.trim()) {
      Alert.alert('Error', 'Please enter menu text');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await analyzeMenu({
        menuText: menuText.trim(),
        placeId: params.placeId,
      });
      setMenuItems(response.items);
      setWasCached(response.cached);
      setInputMethod('text');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze menu');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleFilter = (filter: DietaryLabel) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  };

  const filteredItems = menuItems.filter((item) => {
    if (activeFilters.size === 0) return true;
    return item.labels.some((label) => activeFilters.has(label.type));
  });

  const getDietaryIcon = (type: DietaryLabel) => {
    switch (type) {
      case 'vegan':
        return '🌱';
      case 'vegetarian':
        return '🥚';
      case 'gluten-free':
        return '🌾';
    }
  };

  const renderInputSelection = () => (
    <View style={styles.inputSelection}>
      <Text style={styles.sectionTitle}>How would you like to add the menu?</Text>

      <View style={styles.inputButtons}>
        <Pressable
          style={({ pressed }) => [
            styles.inputButton,
            pressed && styles.inputButtonPressed,
          ]}
          onPress={handleTakePhoto}
        >
          <Ionicons name="camera" size={32} color="#22c55e" />
          <Text style={styles.inputButtonText}>Take Photo</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.inputButton,
            pressed && styles.inputButtonPressed,
          ]}
          onPress={handlePickImage}
        >
          <Ionicons name="images" size={32} color="#22c55e" />
          <Text style={styles.inputButtonText}>From Gallery</Text>
        </Pressable>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.urlInput}>
        <TextInput
          style={styles.textInput}
          placeholder="Paste menu URL..."
          value={menuUrl}
          onChangeText={setMenuUrl}
          autoCapitalize="none"
          keyboardType="url"
        />
        <Pressable
          style={[styles.analyzeButton, !menuUrl.trim() && styles.analyzeButtonDisabled]}
          onPress={handleAnalyzeUrl}
          disabled={!menuUrl.trim()}
        >
          <Text style={styles.analyzeButtonText}>Analyze</Text>
        </Pressable>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.textInputContainer}>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Paste menu text here..."
          value={menuText}
          onChangeText={setMenuText}
          multiline
          numberOfLines={4}
        />
        <Pressable
          style={[styles.analyzeButton, !menuText.trim() && styles.analyzeButtonDisabled]}
          onPress={handleAnalyzeText}
          disabled={!menuText.trim()}
        >
          <Text style={styles.analyzeButtonText}>Analyze</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {(['vegan', 'vegetarian', 'gluten-free'] as DietaryLabel[]).map((filter) => (
        <Pressable
          key={filter}
          style={[
            styles.filterButton,
            activeFilters.has(filter) && styles.filterButtonActive,
          ]}
          onPress={() => toggleFilter(filter)}
        >
          <Text style={styles.filterEmoji}>{getDietaryIcon(filter)}</Text>
          <Text
            style={[
              styles.filterText,
              activeFilters.has(filter) && styles.filterTextActive,
            ]}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderMenuItem = (item: MenuItem, index: number) => (
    <View key={index} style={styles.menuItem}>
      <View style={styles.menuItemHeader}>
        <Text style={styles.menuItemName}>{item.name}</Text>
        <View style={styles.menuItemLabels}>
          {item.labels.map((label, labelIndex) => (
            <View
              key={labelIndex}
              style={[
                styles.labelBadge,
                label.confidence === 'uncertain' && styles.labelBadgeUncertain,
              ]}
            >
              <Text style={styles.labelEmoji}>{getDietaryIcon(label.type)}</Text>
              {label.confidence === 'uncertain' && (
                <Ionicons name="help-circle" size={12} color="#f59e0b" />
              )}
            </View>
          ))}
        </View>
      </View>

      {item.description && (
        <Text style={styles.menuItemDescription}>{item.description}</Text>
      )}

      {item.labels.some((l) => l.askServer) && (
        <View style={styles.askServerContainer}>
          <Ionicons name="information-circle-outline" size={16} color="#3b82f6" />
          <Text style={styles.askServerText}>
            {item.labels.find((l) => l.askServer)?.askServer}
          </Text>
        </View>
      )}

      {item.modifications && item.modifications.length > 0 && (
        <View style={styles.modificationsContainer}>
          <Text style={styles.modificationsTitle}>Modifications:</Text>
          {item.modifications.map((mod, modIndex) => (
            <Text key={modIndex} style={styles.modificationText}>
              • {mod}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  const renderResults = () => (
    <View style={styles.resultsContainer}>
      {wasCached && (
        <View style={styles.cachedBanner}>
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text style={styles.cachedText}>Using cached analysis</Text>
        </View>
      )}

      {renderFilters()}

      <Text style={styles.resultsCount}>
        {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
        {activeFilters.size > 0 && ' matching filters'}
      </Text>

      <ScrollView style={styles.menuList}>
        {filteredItems.map(renderMenuItem)}
      </ScrollView>

      <Pressable
        style={styles.newAnalysisButton}
        onPress={() => {
          setMenuItems([]);
          setInputMethod(null);
          setMenuUrl('');
          setMenuText('');
          setActiveFilters(new Set());
        }}
      >
        <Ionicons name="refresh" size={20} color="#22c55e" />
        <Text style={styles.newAnalysisText}>Analyze Different Menu</Text>
      </Pressable>
    </View>
  );

  if (isAnalyzing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.analyzingText}>Analyzing menu...</Text>
        <Text style={styles.analyzingSubtext}>
          This may take a few moments
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setInputMethod(null);
          }}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.restaurantName}>{params.name || 'Menu Analysis'}</Text>
      </View>

      {menuItems.length > 0 ? renderResults() : renderInputSelection()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  inputSelection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  inputButton: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#22c55e',
    borderStyle: 'dashed',
  },
  inputButtonPressed: {
    backgroundColor: '#dcfce7',
  },
  inputButtonText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#22c55e',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9ca3af',
    fontSize: 14,
  },
  urlInput: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textInputContainer: {
    gap: 8,
  },
  analyzeButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  analyzeButtonDisabled: {
    backgroundColor: '#86efac',
  },
  analyzeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  analyzingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
  },
  analyzingSubtext: {
    marginTop: 4,
    fontSize: 14,
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
  resultsContainer: {
    flex: 1,
  },
  cachedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: '#f3f4f6',
  },
  cachedText: {
    fontSize: 12,
    color: '#6b7280',
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: '#dcfce7',
  },
  filterEmoji: {
    fontSize: 16,
  },
  filterText: {
    fontSize: 13,
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#16a34a',
    fontWeight: '500',
  },
  resultsCount: {
    padding: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuItemName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginRight: 8,
  },
  menuItemLabels: {
    flexDirection: 'row',
    gap: 4,
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  labelBadgeUncertain: {
    backgroundColor: '#fef3c7',
  },
  labelEmoji: {
    fontSize: 14,
  },
  menuItemDescription: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  askServerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  askServerText: {
    flex: 1,
    fontSize: 13,
    color: '#1d4ed8',
  },
  modificationsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  modificationsTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#16a34a',
    marginBottom: 4,
  },
  modificationText: {
    fontSize: 13,
    color: '#15803d',
    marginTop: 2,
  },
  newAnalysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 8,
  },
  newAnalysisText: {
    color: '#22c55e',
    fontWeight: '500',
  },
});
