import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Image, FlatList,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { createListing, uploadListingImages, getCategories } from '../../src/api/listings.api';
import { COLORS, CONDITIONS } from '../../src/utils/currency';

const CONDITION_MAP = { 'New': 'new', 'Like New': 'like_new', 'Good': 'good', 'Fair': 'fair', 'Poor': 'poor' };
import Button from '../../src/components/ui/Button';

const STEPS = ['Details', 'Category', 'Images', 'Wants'];

export default function CreateListingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [condition, setCondition] = useState('Good');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [images, setImages] = useState([]);
  const [wantsDescription, setWantsDescription] = useState('');
  const [wantsCategories, setWantsCategories] = useState([]);

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const createMutation = useMutation({
    mutationFn: (data) => createListing(data),
    onSuccess: async (listing) => {
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((img, i) => {
          formData.append('images', { uri: img, name: `img${i}.jpg`, type: 'image/jpeg' });
        });
        try { await uploadListingImages(listing.id, formData); } catch {}
      }
      Toast.show({ type: 'success', text1: 'Listing created!', text2: 'Your item is now live' });
      router.replace(`/listing/${listing.id}`);
    },
    onError: (err) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to create listing',
        text2: err?.response?.data?.error || 'Please try again',
      });
    },
  });

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission denied' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - images.length,
    });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 5));
    }
  };

  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const toggleWantsCategory = (cat) => {
    setWantsCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const validateStep = () => {
    if (step === 0) {
      if (!title.trim()) { Toast.show({ type: 'error', text1: 'Title is required' }); return false; }
      if (!estimatedValue || isNaN(parseInt(estimatedValue))) {
        Toast.show({ type: 'error', text1: 'Enter a valid value' }); return false;
      }
    }
    if (step === 1) {
      if (!category) { Toast.show({ type: 'error', text1: 'Select a category' }); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else handleSubmit();
  };

  const handleSubmit = () => {
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      estimatedValue: parseInt(estimatedValue),
      condition: CONDITION_MAP[condition] || 'good',
      categoryId: category || undefined,
      locationState: city.trim() || undefined,
      wantsDescription: wantsDescription.trim() || undefined,
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Listing</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
                {i < step ? (
                  <Ionicons name="checkmark" size={12} color={COLORS.white} />
                ) : (
                  <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>
                )}
              </View>
              {i < STEPS.length - 1 && (
                <View style={[styles.stepLine, i < step && styles.stepLineActive]} />
              )}
            </React.Fragment>
          ))}
        </View>
        <Text style={styles.stepLabel}>{STEPS[step]}</Text>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Step 0: Details */}
          {step === 0 && (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="What are you swapping?"
                  placeholderTextColor={COLORS.textLight}
                  maxLength={80}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe your item in detail..."
                  placeholderTextColor={COLORS.textLight}
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Estimated Value (₦) *</Text>
                <TextInput
                  style={styles.input}
                  value={estimatedValue}
                  onChangeText={setEstimatedValue}
                  placeholder="e.g. 15000"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Condition</Text>
                <View style={styles.conditionRow}>
                  {CONDITIONS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.conditionBtn, condition === c && styles.conditionBtnActive]}
                      onPress={() => setCondition(c)}
                    >
                      <Text style={[styles.conditionText, condition === c && styles.conditionTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Lagos, Abuja"
                  placeholderTextColor={COLORS.textLight}
                  maxLength={60}
                />
              </View>
            </View>
          )}

          {/* Step 1: Category */}
          {step === 1 && (
            <View style={styles.form}>
              <Text style={styles.pickLabel}>Pick a category *</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryBtn, category === cat.id && styles.categoryBtnActive]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Text style={[styles.categoryText, category === cat.id && styles.categoryTextActive]}>
                      {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 2: Images */}
          {step === 2 && (
            <View style={styles.form}>
              <Text style={styles.pickLabel}>Add photos (up to 5)</Text>
              <View style={styles.imgGrid}>
                {images.map((uri, idx) => (
                  <View key={idx} style={styles.imgWrap}>
                    <Image source={{ uri }} style={styles.imgThumb} resizeMode="cover" />
                    <TouchableOpacity style={styles.removeImg} onPress={() => removeImage(idx)}>
                      <Ionicons name="close-circle" size={22} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 5 && (
                  <TouchableOpacity style={styles.addImgBtn} onPress={pickImages}>
                    <Ionicons name="camera" size={28} color={COLORS.textLight} />
                    <Text style={styles.addImgText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.imgHint}>
                Good photos increase your chances of a match! First image will be the cover.
              </Text>
            </View>
          )}

          {/* Step 3: Wants */}
          {step === 3 && (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>What do you want in return?</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={wantsDescription}
                  onChangeText={setWantsDescription}
                  placeholder="Describe what you're looking for..."
                  placeholderTextColor={COLORS.textLight}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Preferred categories (optional)</Text>
                <View style={styles.categoryGrid}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryBtn, wantsCategories.includes(cat.id) && styles.categoryBtnActive]}
                      onPress={() => toggleWantsCategory(cat.id)}
                    >
                      <Text style={[styles.categoryText, wantsCategories.includes(cat.id) && styles.categoryTextActive]}>
                        {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Navigation */}
          <View style={styles.navBtns}>
            {step > 0 && (
              <Button
                title="Back"
                variant="outline"
                onPress={() => setStep((s) => s - 1)}
                style={styles.backNavBtn}
                fullWidth={false}
              />
            )}
            <Button
              title={step === STEPS.length - 1 ? 'Publish Listing' : 'Next'}
              onPress={handleNext}
              loading={createMutation.isPending}
              style={styles.nextBtn}
              icon={step === STEPS.length - 1 ? <Ionicons name="checkmark" size={16} color={COLORS.white} /> : null}
            />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },

  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    backgroundColor: COLORS.white,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepNum: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  stepNumActive: { color: COLORS.white },
  stepLine: { flex: 1, height: 2, backgroundColor: COLORS.gray200 },
  stepLineActive: { backgroundColor: COLORS.primary },
  stepLabel: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  content: { padding: 20 },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  textArea: { minHeight: 100 },

  conditionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  conditionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  conditionBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  conditionText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  conditionTextActive: { color: COLORS.white },

  pickLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    flexShrink: 0,
  },
  categoryBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  categoryTextActive: { color: COLORS.white },

  imgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imgWrap: { width: 100, height: 100, borderRadius: 12, position: 'relative' },
  imgThumb: { width: '100%', height: '100%', borderRadius: 12 },
  removeImg: { position: 'absolute', top: -8, right: -8 },
  addImgBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addImgText: { fontSize: 11, color: COLORS.textLight, fontWeight: '500' },
  imgHint: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, fontStyle: 'italic' },

  navBtns: { flexDirection: 'row', gap: 10, marginTop: 24 },
  backNavBtn: { paddingHorizontal: 24 },
  nextBtn: { flex: 1 },
});
