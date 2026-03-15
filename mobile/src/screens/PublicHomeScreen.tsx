import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  onStaffLogin: () => void;
};

export default function PublicHomeScreen({
  onStaffLogin
}: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Kurye Sistemi</Text>
        <Text style={styles.subtitle}>Lutfen giris tipinizi secin</Text>

        <Pressable style={[styles.button, styles.staff]} onPress={onStaffLogin}>
          <Text style={styles.buttonText}>Personel Girisi (Admin/Kurye/Restoran)</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    padding: 20
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    color: '#64748b',
    marginBottom: 6
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  staff: { backgroundColor: '#0f766e' },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center'
  }
});
