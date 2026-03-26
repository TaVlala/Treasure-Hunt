// Button.tsx — reusable pill-shaped button component for the mobile app.
// Variants: primary (amber fill), secondary (dark fill + border), ghost (transparent).

import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
} from 'react-native';
import { Colors, Fonts, FontSize, Spacing, Radius } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: Variant;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  label,
  variant = 'primary',
  loading = false,
  size = 'md',
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[`size_${size}`],
        styles[`variant_${variant}`],
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#000' : Colors.accent}
          size="small"
        />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    alignSelf: 'stretch',
  },

  // Sizes
  size_sm: { height: 36, paddingHorizontal: Spacing.lg },
  size_md: { height: 52, paddingHorizontal: Spacing.xl },
  size_lg: { height: 60, paddingHorizontal: Spacing.xxl },

  // Variants
  variant_primary:   { backgroundColor: Colors.accent },
  variant_secondary: { backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border },
  variant_ghost:     { backgroundColor: 'transparent' },
  variant_danger:    { backgroundColor: Colors.red },

  disabled: { opacity: 0.45 },

  // Label base
  label: {
    fontFamily: Fonts.bodySemi,
    letterSpacing: 0.2,
  },
  label_primary:   { color: '#000000' },
  label_secondary: { color: Colors.text },
  label_ghost:     { color: Colors.textMuted },
  label_danger:    { color: '#ffffff' },

  // Label sizes
  labelSize_sm: { fontSize: FontSize.sm },
  labelSize_md: { fontSize: FontSize.base },
  labelSize_lg: { fontSize: FontSize.md },
});
