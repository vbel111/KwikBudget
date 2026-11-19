import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useStore } from '@/lib/store';
import { C, F, TYPE } from '@/lib/theme';
import { Card, Press } from './ui';
import { Icon } from './Icon';

const KEY = 'kp.backupNudgeAt';
const WEEK = 7 * 86400000;

/**
 * Gentle prompt to back up a silent account, shown once someone has something worth keeping
 * (5+ entries). Dismissing hides it for a week.
 */
export function BackupNudge() {
  const r = useRouter();
  const isAnonymous = useStore((s) => s.isAnonymous); const count = useStore((s) => s.txs.length);
  const [hidden, setHidden] = useState(true);
  useEffect(() => { AsyncStorage.getItem(KEY).then((v) => setHidden(!!v && Date.now() - Number(v) < WEEK)).catch(() => setHidden(false)); }, []);
  if (!isAnonymous || count < 5 || hidden) return null;
  const dismiss = () => { setHidden(true); AsyncStorage.setItem(KEY, String(Date.now())).catch(() => {}); };
  return (
    <Animated.View entering={FadeInDown.springify()} exiting={FadeOut.duration(180)}>
      <Card style={{ marginTop: 12, padding: 14, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.softGold }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Icon name="shield" size={19} color={C.warnInk} /></View>
        <Press onPress={() => r.push({ pathname: '/auth', params: { mode: 'backup' } })} label="Back up your data" style={{ flex: 1 }} scale={0.98}>
          <Text style={{ fontFamily: F.x, fontSize: 14, color: C.ink }}>Keep your {count} entries safe</Text>
          <Text style={[TYPE.small, { marginTop: 2 }]}>Add an email in 20 seconds. Tap to back up.</Text>
        </Press>
        <Press onPress={dismiss} label="Not now" style={{ padding: 6 }}><Icon name="close" size={16} color={C.muted} /></Press>
      </Card>
    </Animated.View>
  );
}
