import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { updateMe, uploadAvatar } from '../../../src/api/auth.api';
import { useAuthStore } from '../../../src/store/auth.store';
import { COLORS } from '../../../src/utils/currency';
import Button from '../../../src/components/ui/Button';
import Avatar from '../../../src/components/ui/Avatar';

export default function EditProfileScreen() {
  const { user, updateUser } = useAuthStore();
  const router = useRouter();

  const [name, setName] = useState(user?.fullName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [city, setCity] = useState(user?.locationState || '');
  const [localAvatar, setLocalAvatar] = useState(null);

  const updateMutation = useMutation({
    mutationFn: (data) => updateMe(data),
    onSuccess: (updated) => {
      updateUser(updated);
      Toast.show({ type: 'success', text1: 'Profile updated!' });
      router.back();
    },
    onError: (err) => {
      Toast.show({
        type: 'error',
        text1: 'Update failed',
        text2: err?.response?.data?.error || 'Please try again',
      });
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (formData) => uploadAvatar(formData),
    onSuccess: (data) => {
      updateUser(data);
      setLocalAvatar(null);
      Toast.show({ type: 'success', text1: 'Avatar updated!' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Failed to upload avatar' }),
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission denied', text2: 'Allow photo access in settings' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setLocalAvatar(asset.uri);
      const formData = new FormData();
      formData.append('avatar', {
        uri: asset.uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      });
      avatarMutation.mutate(formData);
    }
  };

  const handleSave = () => {
    updateMutation.mutate({
      fullName: name.trim() || undefined,
      bio: bio.trim() || undefined,
      locationState: city.trim() || undefined,
    });
  };

  const displayAvatar = localAvatar || user?.avatarUrl;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarWrap}>
              {displayAvatar ? (
                <Image source={{ uri: displayAvatar }} style={styles.avatarImg} />
              ) : (
                <Avatar name={user?.fullName} size={88} />
              )}
              <View style={styles.avatarEdit}>
                {avatarMutation.isPending ? (
                  <Ionicons name="reload" size={14} color={COLORS.white} />
                ) : (
                  <Ionicons name="camera" size={14} color={COLORS.white} />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={COLORS.textLight}
                maxLength={60}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell people about yourself..."
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={4}
                maxLength={300}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{bio.length}/300</Text>
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

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.readonlyField}>
                <Text style={styles.readonlyText}>{user?.email}</Text>
              </View>
            </View>
          </View>

          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={updateMutation.isPending}
            style={styles.saveBtn}
          />
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

  content: { padding: 24, gap: 4 },

  avatarSection: { alignItems: 'center', marginBottom: 24, gap: 8 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.gray200 },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  avatarHint: { fontSize: 13, color: COLORS.textSecondary },

  form: { gap: 16, marginBottom: 24 },
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
  charCount: { fontSize: 11, color: COLORS.textLight, textAlign: 'right' },
  readonlyField: {
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  readonlyText: { fontSize: 15, color: COLORS.textSecondary },
  readonlyBadge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  readonlyBadgeText: { fontSize: 11, color: COLORS.success, fontWeight: '700' },

  saveBtn: { marginBottom: 40 },
});
