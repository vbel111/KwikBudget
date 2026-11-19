import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { C, F, TYPE, shadow } from '@/lib/theme';
import { useStore } from '@/lib/store';
import { Press } from './ui';
import { Icon } from './Icon';

/** Initials avatar on the brand gradient; a small crown badge appears for Pro members. Opens Settings. */
export function Avatar({ size = 50 }: { size?: number }) {
  const name = useStore((s) => s.profile.name || s.email);
  const pro = useStore((s) => s.pro);
  const router = useRouter();
  const initials = (name || 'K').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  return (
    <Press onPress={() => router.push('/settings')} label="Settings and profile">
      <View style={[{ width: size, height: size, borderRadius: size / 2, padding: 3, backgroundColor: '#fff' }, shadow.soft]}>
        <LinearGradient colors={[C.mint, C.green2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: F.x, fontSize: size * 0.34, color: C.ink }}>{initials}</Text>
        </LinearGradient>
        {pro && (
          <View style={{ position: 'absolute', right: -3, bottom: -3, width: 20, height: 20, borderRadius: 10, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
            <Icon name="crown" size={11} color={C.gold} sw={2.4} />
          </View>
        )}
      </View>
    </Press>
  );
}

export function Header({ kicker, title, right }: { kicker: string; title: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Avatar />
      <View style={{ flex: 1 }}>
        <Text style={TYPE.small}>{kicker}</Text>
        <Text numberOfLines={1} style={TYPE.h2}>{title}</Text>
      </View>
      {right}
    </View>
  );
}
