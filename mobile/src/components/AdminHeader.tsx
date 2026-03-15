import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export default function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const { logout } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <Pressable style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]} onPress={handleLogout} hitSlop={10} disabled={loggingOut}>
        <Text style={styles.logoutText}>{loggingOut ? 'Cikiliyor...' : 'Cikis'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12
  },
  texts: {
    flex: 1
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 12
  },
  logoutButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10
  },
  logoutButtonDisabled: {
    opacity: 0.6
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600'
  }
});
