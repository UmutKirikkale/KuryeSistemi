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
  onLoginPress: () => void;
};

export default function CustomerRegisterScreen({ onLoginPress }: Props) {
  const { register, isLoading, error } = useCustomerStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || password.length < 6) {
      return;
    }

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password
      });
    } catch {
      // store error is shown in UI
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Musteri Kayit</Text>
        <Text style={styles.subtitle}>Marketplace hesabinizi olusturun</Text>

        <TextInput style={styles.input} placeholder="Ad Soyad" value={name} onChangeText={setName} />
        <TextInput
          style={styles.input}
          placeholder="E-posta"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput style={styles.input} placeholder="Telefon" value={phone} onChangeText={setPhone} />
        <TextInput
          style={styles.input}
          placeholder="Sifre (min 6 karakter)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.primaryButton} onPress={handleRegister} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Kayit Ol</Text>}
        </Pressable>

        <Pressable style={styles.linkButton} onPress={onLoginPress}>
          <Text style={styles.linkText}>Hesabin var mi? Giris yap</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', backgroundColor: '#f5f3ff', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e9d5ff' },
  title: { fontSize: 22, fontWeight: '700', color: '#5b21b6' },
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
  primaryButton: { backgroundColor: '#7c3aed', borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
  primaryText: { color: '#fff', fontWeight: '700' },
  linkButton: { marginTop: 12, alignItems: 'center' },
  linkText: { color: '#6d28d9', fontWeight: '600' }
});
