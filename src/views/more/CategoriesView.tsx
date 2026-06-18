/**
 * CategoriesView — create, view, budget, and delete expense categories.
 * Extracted from PerFinOSScreens.tsx (CategoriesScreen).
 */
import React, { useState, useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Text } from '../../components/base';
import {
  CategoryBadge,
  IconButton,
  ScreenHeader,
  Toast,
} from '../../components/finance';
import { Field } from '../../components/form/Field';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useFinance } from '../../context/FinanceContext';
import { Spacing } from '../../theme';
import { formatCurrency } from '../../utils/format';

export const CategoriesScreen = () => (
  <RequireData>
    {(data) => {
      const { addCategory, updateCategory, deleteCategory } = useFinance();
      const navigation = useNavigation<any>();
      const [name, setName] = useState('');
      const [budget, setBudget] = useState('100');
      const [notice, setNotice] = useState<string | null>(null);
      useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(null), 2500);
        return () => clearTimeout(t);
      }, [notice]);

      const create = async () => {
        await addCategory({ name, type: 'expense', color: '#2F8F83', icon: 'category', monthlyBudget: Number(budget) });
        setName('');
        setNotice('Category added');
      };
      return (
        <AppScroll>
          <ScreenHeader title="Categories" subtitle="Default and custom categories with safe delete rules." action={<IconButton icon="arrow-back" label="Go back" onPress={() => navigation.goBack()} />} />
          {notice ? <Text variant="bodySmall" color="secondary" style={{ marginBottom: Spacing.md, textAlign: 'center' }}>{notice}</Text> : null}
          <Card shadow="sm" style={{ marginBottom: Spacing.lg }}>
            <Field label="Custom Category" value={name} onChangeText={setName} placeholder="Pet care" />
            <Field label="Monthly Budget" value={budget} onChangeText={setBudget} placeholder="100" keyboardType="numeric" />
            <Button label="Create Category" onPress={create} />
          </Card>
          {data.categories.map((category) => (
            <Card key={category.id} shadow="sm" style={{ marginBottom: Spacing.md }}>
              <View style={styles.rowBetween}>
                <CategoryBadge label={category.name} icon={category.icon} color={category.color} />
                <Text variant="bodySmall" color="secondary">{category.isDefault ? 'Default' : 'Custom'}</Text>
              </View>
              <View style={{ marginTop: Spacing.md }}>
                <Text variant="bodySmall" color="secondary">Monthly budget</Text>
                <Text variant="h4">{formatCurrency(category.monthlyBudget, data.user.currency)}</Text>
              </View>
              {!category.isDefault ? (
                <View style={styles.cardActions}>
                  <Button label="+ $25 budget" variant="secondary" onPress={() => updateCategory(category.id, { monthlyBudget: category.monthlyBudget + 25 })} style={{ flex: 1 }} />
                  <Button label="Delete" variant="danger" onPress={() => deleteCategory(category.id).catch((err) => Alert.alert('Cannot delete category', err.message))} style={{ flex: 1 }} />
                </View>
              ) : null}
            </Card>
          ))}
        </AppScroll>
      );
    }}
  </RequireData>
);

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
});
