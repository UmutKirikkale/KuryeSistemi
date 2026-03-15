import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useCustomerStore } from '../../store/customerStore';

type Props = {
  onRegisterPress: () => void;
};

export default function CustomerLoginScreen({ onRegisterPress }: Props) {
  const { login, isLoading, error } = useCustomerStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      return;
    }

    try {
      await login(email.trim(), password);
    } catch {
      // store error is shown in UI
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Musteri Girisi</Text>
        <Text style={styles.subtitle}>Siparis vermek icin giris yapin</Text>

        <TextInput
          style={styles.input}
          placeholder="E-posta"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Sifre"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.primaryButton} onPress={handleLogin} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Giris Yap</Text>}
        </Pressable>

        <Pressable style={styles.linkButton} onPress={onRegisterPress}>
          <Text style={styles.linkText}>Hesabin yok mu? Kayit ol</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', backgroundColor: '#eff6ff', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#dbeafe' },
  title: { fontSize: 22, fontWeight: '700', color: '#1e3a8a' },
  subtitle: { color: '#64748b', marginBottom: 12, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#fff'
  },
  error: { color: '#b91c1c', marginBottom: 8 },
  primaryButton: { backgroundColor: '#2563eb', borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
  primaryText: { color: '#fff', fontWeight: '700' },
  linkButton: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#1d4ed8', fontWeight: '600' }
});
