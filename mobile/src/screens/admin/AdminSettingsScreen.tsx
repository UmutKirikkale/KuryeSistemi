import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { adminService } from '../../services/adminService';
import AdminHeader from '../../components/AdminHeader';

interface SystemSettings {
  courierAutoBusyAfterOrders: number;
  platformCommissionTemplates: {
    YEMEKSEPETI: number;
    FEEDME: number;
    GETIRYEMEK: number;
    TRENDYOLYEMEK: number;
    DIGER: number;
  };
}

const defaultTemplates: SystemSettings['platformCommissionTemplates'] = {
  YEMEKSEPETI: 35,
  FEEDME: 0,
  GETIRYEMEK: 30,
  TRENDYOLYEMEK: 30,
  DIGER: 20,
};

const PLATFORM_LABELS: Record<keyof SystemSettings['platformCommissionTemplates'], string> = {
  YEMEKSEPETI: 'Yemeksepeti',
  FEEDME: 'FeedMe',
  GETIRYEMEK: 'Getir Yemek',
  TRENDYOLYEMEK: 'Trendyol Yemek',
  DIGER: 'Diğer',
};

export default function AdminSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoBusy, setAutoBusy] = useState('4');
  const [templates, setTemplates] = useState<SystemSettings['platformCommissionTemplates']>(defaultTemplates);

  const fetch = useCallback(async () => {
    try {
      const { settings } = await adminService.getSystemSettings();
      setAutoBusy(String(settings.courierAutoBusyAfterOrders ?? 4));
      setTemplates(settings.platformCommissionTemplates ?? defaultTemplates);
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.error || 'Ayarlar yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleRefresh = () => { setRefreshing(true); fetch(); };

  const handleSave = async () => {
    const autoBusyNum = parseInt(autoBusy, 10);
    if (isNaN(autoBusyNum) || autoBusyNum < 1) {
      Alert.alert('Hata', 'Oto-meşgul eşiği en az 1 olmalı');
      return;
    }
    const invalid = Object.values(templates).some(v => v < 0 || v > 100);
    if (invalid) {
      Alert.alert('Hata', 'Komisyon oranları 0-100 arasında olmalı');
      return;
    }
    setSaving(true);
    try {
      await adminService.updateSystemSettings({
        courierAutoBusyAfterOrders: autoBusyNum,
        platformCommissionTemplates: templates,
      });
      Alert.alert('Başarılı', 'Ayarlar kaydedildi');
    } catch (e: any) {
      Alert.alert('Hata', e?.response?.data?.error || 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const setTemplateValue = (key: keyof typeof templates, val: string) => {
    const num = parseFloat(val);
    setTemplates(prev => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <AdminHeader title="Sistem Ayarları" />

      {/* Auto-busy */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Kurye Oto-Meşgul Eşiği</Text>
        <Text style={styles.hint}>Kurye bu kadar aktif sipariş aldığında otomatik meşgul olur</Text>
        <TextInput
          style={styles.input}
          value={autoBusy}
          onChangeText={setAutoBusy}
          keyboardType="numeric"
          placeholder="4"
        />
      </View>

      {/* Platform commissions */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Platform Komisyon Oranları (%)</Text>
        {(Object.keys(templates) as Array<keyof typeof templates>).map(key => (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>{PLATFORM_LABELS[key]}</Text>
            <TextInput
              style={styles.inputSmall}
              value={String(templates[key])}
              onChangeText={val => setTemplateValue(key, val)}
              keyboardType="numeric"
              placeholder="0"
            />
            <Text style={styles.percent}>%</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  hint: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#f9fafb',
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { flex: 1, fontSize: 14, color: '#374151' },
  inputSmall: {
    width: 72,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    textAlign: 'center',
  },
  percent: { marginLeft: 6, fontSize: 14, color: '#6b7280' },
  saveBtn: {
    margin: 16,
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
