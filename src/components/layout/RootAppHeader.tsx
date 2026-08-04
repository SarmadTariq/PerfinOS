import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../base';
import { useColors } from '../../context/ThemeContext';
import { ControlSize, Radius, Spacing } from '../../theme/index';

export interface RootAppHeaderProps {
  title: string;
  subtitle?: string;
}

export const RootAppHeader = ({
  title,
  subtitle,
}: RootAppHeaderProps) => {
  const colors = useColors();
  const navigation = useNavigation<any>();

  const openProfile = () => {
    const parent = navigation.getParent();

    if (parent) {
      parent.navigate('Profile');
      return;
    }

    navigation.navigate('Profile');
  };

  return (
    <View style={styles.root}>
      <View style={styles.copy}>
        <Text
          variant="h2"
          numberOfLines={1}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            variant="bodySmall"
            color="secondary"
            numberOfLines={2}
            style={styles.subtitle}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        accessibilityHint="Opens your profile and account information"
        activeOpacity={0.78}
        onPress={openProfile}
        style={[
          styles.profileButton,
          {
            backgroundColor:
              colors.actionPrimarySoft,
            borderColor:
              colors.borderDefault,
          },
        ]}
      >
        <MaterialIcons
          name="person"
          size={22}
          color={colors.actionPrimary}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingTop: Spacing.xs,
  },
  subtitle: {
    marginTop: Spacing.xs,
  },
  profileButton: {
    width: ControlSize.minimumTouchTarget,
    height: ControlSize.minimumTouchTarget,
    borderRadius: Radius.round,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
