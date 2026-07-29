import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Text } from '../../components/base';
import {
  CategoryBadge,
  ConfirmModal,
  IconButton,
  ScreenHeader,
} from '../../components/finance';
import { Field, Segmented } from '../../components/form';
import { AppScroll } from '../../components/layout/AppScroll';
import { RequireData } from '../../components/layout/RequireData';
import { useFinance } from '../../context/FinanceContext';
import { useColors } from '../../context/ThemeContext';
import type {
  Category,
  TransactionType,
} from '../../models/finance';
import {
  Radius,
  Spacing,
} from '../../theme';
import {
  isCategoryArchived,
  MAX_CATEGORY_NAME_LENGTH,
} from '../../utils/categories';
import { formatCurrency } from '../../utils/format';
import { mcIconName } from '../../utils/icons';

const CATEGORY_COLORS = [
  '#2F8F83',
  '#367C9D',
  '#725EAB',
  '#A64F72',
  '#D95F43',
  '#C18726',
] as const;

const CATEGORY_ICONS = [
  'category',
  'cash-plus',
  'food',
  'car',
  'home',
  'shopping',
  'hospital-box',
  'school',
] as const;

interface CategoryDraft {
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  monthlyBudget: string;
}

const emptyDraft = (
  type: TransactionType
): CategoryDraft => ({
  name: '',
  type,
  color: CATEGORY_COLORS[0],
  icon:
    type === 'income'
      ? 'cash-plus'
      : 'category',
  monthlyBudget: '0',
});

const CategoryEditor = ({
  draft,
  editing,
  existingCategories,
  busy,
  onChange,
  onSave,
  onCancel,
}: {
  draft: CategoryDraft;
  editing: boolean;
  existingCategories: Category[];
  busy: boolean;
  onChange: (draft: CategoryDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) => {
  const colors = useColors();
  const normalizedName = draft.name
    .trim()
    .replace(/\s+/g, ' ');
  const duplicate = existingCategories.some(
    (category) =>
      category.type === draft.type &&
      category.name.trim().toLocaleLowerCase() ===
        normalizedName.toLocaleLowerCase()
  );
  const nameError =
    normalizedName.length === 0
      ? 'Enter a category name.'
      : normalizedName.length >
          MAX_CATEGORY_NAME_LENGTH
        ? `Use ${MAX_CATEGORY_NAME_LENGTH} characters or fewer.`
        : duplicate
          ? `A ${draft.type} category already uses this name.`
          : undefined;
  const parsedBudget = Number(draft.monthlyBudget);
  const budgetError =
    draft.type === 'expense' &&
    (draft.monthlyBudget.trim() === '' ||
      !Number.isFinite(parsedBudget) ||
      parsedBudget < 0)
      ? 'Enter zero or a positive amount.'
      : undefined;

  return (
    <Card
      style={{
        ...styles.editor,
        borderColor: colors.primary,
      }}
    >
      <View style={styles.sectionHeading}>
        <View style={styles.headingCopy}>
          <Text variant="h3">
            {editing
              ? 'Edit category'
              : 'New category'}
          </Text>
          <Text
            variant="bodySmall"
            color="secondary"
          >
            {editing
              ? 'Type stays fixed to preserve existing transaction meaning.'
              : 'Choose where this category appears in transaction forms.'}
          </Text>
        </View>
        <IconButton
          icon="close"
          label="Close category editor"
          onPress={onCancel}
        />
      </View>

      {!editing ? (
        <Segmented
          options={['expense', 'income']}
          value={draft.type}
          onChange={(value) =>
            onChange({
              ...emptyDraft(
                value as TransactionType
              ),
              name: draft.name,
              color: draft.color,
            })
          }
        />
      ) : null}

      <Field
        label="Category name"
        value={draft.name}
        onChangeText={(name) =>
          onChange({ ...draft, name })
        }
        placeholder={
          draft.type === 'income'
            ? 'Freelance'
            : 'Pet care'
        }
        error={
          draft.name.length > 0
            ? nameError
            : undefined
        }
      />

      {draft.type === 'expense' ? (
        <Field
          label="Default monthly budget"
          value={draft.monthlyBudget}
          onChangeText={(monthlyBudget) =>
            onChange({
              ...draft,
              monthlyBudget,
            })
          }
          placeholder="0"
          keyboardType="decimal-pad"
          error={
            draft.monthlyBudget.length > 0
              ? budgetError
              : undefined
          }
        />
      ) : null}

      <Text
        variant="bodySmall"
        style={styles.fieldLabel}
      >
        Color
      </Text>
      <View
        style={styles.choiceRow}
        accessibilityRole="radiogroup"
      >
        {CATEGORY_COLORS.map((color) => {
          const selected =
            draft.color === color;
          return (
            <TouchableOpacity
              key={color}
              accessibilityRole="radio"
              accessibilityLabel={`Category color ${color}`}
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              onPress={() =>
                onChange({
                  ...draft,
                  color,
                })
              }
              style={[
                styles.colorChoice,
                {
                  backgroundColor: color,
                  borderColor: selected
                    ? colors.text
                    : colors.bgSecondary,
                },
              ]}
            />
          );
        })}
      </View>

      <Text
        variant="bodySmall"
        style={styles.fieldLabel}
      >
        Icon
      </Text>
      <View
        style={styles.choiceRow}
        accessibilityRole="radiogroup"
      >
        {CATEGORY_ICONS.map((icon) => {
          const selected =
            draft.icon === icon;
          return (
            <TouchableOpacity
              key={icon}
              accessibilityRole="radio"
              accessibilityLabel={`Category icon ${icon}`}
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              onPress={() =>
                onChange({
                  ...draft,
                  icon,
                })
              }
              style={[
                styles.iconChoice,
                {
                  backgroundColor: selected
                    ? colors.primarySoft
                    : colors.bgSecondary,
                  borderColor: selected
                    ? colors.primary
                    : colors.border,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={mcIconName(icon)}
                size={20}
                color={
                  selected
                    ? colors.primary
                    : colors.textSecondary
                }
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.editorActions}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={onCancel}
          style={styles.flexAction}
        />
        <Button
          label={
            editing
              ? 'Save changes'
              : 'Create category'
          }
          onPress={onSave}
          disabled={
            Boolean(nameError) ||
            Boolean(budgetError)
          }
          loading={busy}
          style={styles.flexAction}
        />
      </View>
    </Card>
  );
};

const CategoryRow = ({
  category,
  currency,
  transactionCount,
  budgetMonthCount,
  busy,
  onEdit,
  onRestore,
  onRemove,
}: {
  category: Category;
  currency: string;
  transactionCount: number;
  budgetMonthCount: number;
  busy: boolean;
  onEdit: () => void;
  onRestore: () => void;
  onRemove: () => void;
}) => {
  const colors = useColors();
  const archived =
    isCategoryArchived(category);

  return (
    <View
      style={[
        styles.categoryRow,
        {
          borderBottomColor:
            colors.borderLight,
          opacity: archived ? 0.78 : 1,
        },
      ]}
    >
      <View style={styles.categoryMain}>
        <View style={styles.categoryTitleRow}>
          <CategoryBadge
            label={category.name}
            icon={category.icon}
            color={category.color}
          />
          <Text
            variant="caption"
            color="secondary"
          >
            {category.isDefault
              ? 'Default'
              : 'User created'}
            {archived ? ' · Archived' : ''}
          </Text>
        </View>
        <View style={styles.metadataRow}>
          <Text
            variant="bodySmall"
            color="secondary"
          >
            {category.type === 'income'
              ? 'Income'
              : 'Expense'}
          </Text>
          {category.type === 'expense' ? (
            <Text
              variant="bodySmall"
              color="secondary"
            >
              {formatCurrency(
                category.monthlyBudget,
                currency
              )}{' '}
              default
            </Text>
          ) : null}
          <Text
            variant="bodySmall"
            color="secondary"
          >
            {transactionCount === 0
              ? 'No transactions'
              : `${transactionCount} transaction${
                  transactionCount === 1
                    ? ''
                    : 's'
                }`}
          </Text>
          <Text
            variant="bodySmall"
            color="secondary"
          >
            {budgetMonthCount === 0
              ? 'No monthly overrides'
              : `${budgetMonthCount} budget month${
                  budgetMonthCount === 1
                    ? ''
                    : 's'
                }`}
          </Text>
        </View>
      </View>

      {!category.isDefault ? (
        <View style={styles.rowActions}>
          {archived ? (
            <Button
              label="Restore"
              variant="secondary"
              size="sm"
              disabled={busy}
              onPress={onRestore}
            />
          ) : (
            <IconButton
              icon="edit"
              label={`Edit ${category.name}`}
              onPress={onEdit}
            />
          )}
          <Button
            label="Archive"
            variant="danger"
            size="sm"
            disabled={busy || archived}
            onPress={onRemove}
          />
        </View>
      ) : null}
    </View>
  );
};

export const CategoriesScreen = () => (
  <RequireData>
    {(data) => {
      const {
        addCategory,
        updateCategory,
        deleteCategory,
      } = useFinance();
      const navigation = useNavigation<any>();
      const colors = useColors();
      const [type, setType] =
        useState<TransactionType>('expense');
      const [status, setStatus] = useState<
        'active' | 'archived'
      >('active');
      const [draft, setDraft] =
        useState<CategoryDraft | null>(null);
      const [editingId, setEditingId] =
        useState<string | null>(null);
      const [confirmingId, setConfirmingId] =
        useState<string | null>(null);
      const [busyId, setBusyId] =
        useState<string | null>(null);
      const [notice, setNotice] =
        useState<string | null>(null);
      const [error, setError] =
        useState<string | null>(null);

      const categories = useMemo(
        () =>
          data.categories
            .filter(
              (category) =>
                category.type === type &&
                isCategoryArchived(
                  category
                ) ===
                  (status === 'archived')
            )
            .sort(
              (left, right) =>
                Number(right.isDefault) -
                  Number(left.isDefault) ||
                left.name.localeCompare(
                  right.name
                )
            ),
        [data.categories, status, type]
      );
      const editingCategory =
        editingId === null
          ? null
          : data.categories.find(
              (category) =>
                category.id === editingId
            ) || null;
      const confirmingCategory =
        confirmingId === null
          ? null
          : data.categories.find(
              (category) =>
                category.id === confirmingId
            ) || null;

      const usageFor = (
        categoryId: string
      ) => ({
        transactionCount:
          data.transactions.filter(
            (transaction) =>
              transaction.categoryId ===
              categoryId
          ).length,
        budgetMonthCount:
          data.budgets.filter(
            (budget) =>
              Object.prototype.hasOwnProperty.call(
                budget.categoryBudgets,
                categoryId
              )
          ).length,
      });

      const openCreate = () => {
        setError(null);
        setEditingId(null);
        setDraft(emptyDraft(type));
      };
      const openEdit = (
        category: Category
      ) => {
        setError(null);
        setEditingId(category.id);
        setDraft({
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
          monthlyBudget: String(
            category.type === 'expense'
              ? category.monthlyBudget
              : 0
          ),
        });
      };
      const closeEditor = () => {
        setDraft(null);
        setEditingId(null);
        setError(null);
      };

      const save = async () => {
        if (!draft) return;
        setBusyId(editingId || 'create');
        setError(null);
        try {
          const input = {
            name: draft.name,
            type: draft.type,
            color: draft.color,
            icon: draft.icon,
            monthlyBudget:
              draft.type === 'expense'
                ? Number(draft.monthlyBudget)
                : 0,
          };
          if (editingId) {
            await updateCategory(
              editingId,
              input
            );
            setNotice('Category updated.');
          } else {
            await addCategory(input);
            setType(draft.type);
            setStatus('active');
            setNotice('Category created.');
          }
          closeEditor();
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Category could not be saved.'
          );
        } finally {
          setBusyId(null);
        }
      };

      const restore = async (
        category: Category
      ) => {
        setBusyId(category.id);
        setError(null);
        try {
          await updateCategory(category.id, {
            isArchived: false,
            archivedAt: null,
          });
          setNotice('Category restored.');
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Category could not be restored.'
          );
        } finally {
          setBusyId(null);
        }
      };

      const remove = async () => {
        if (!confirmingCategory) return;
        setBusyId(confirmingCategory.id);
        setError(null);
        try {
          await deleteCategory(
            confirmingCategory.id
          );
          setNotice('Category archived.');
          setConfirmingId(null);
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'Category could not be changed.'
          );
        } finally {
          setBusyId(null);
        }
      };

      return (
        <AppScroll>
          <ScreenHeader
            title="Categories"
            subtitle="Manage where income and expenses appear without changing historical transaction labels."
            action={
              <IconButton
                icon="arrow-back"
                label="Go back"
                onPress={() =>
                  navigation.goBack()
                }
              />
            }
          />

          {notice ? (
            <View
              accessibilityLiveRegion="polite"
              style={[
                styles.notice,
                {
                  backgroundColor:
                    colors.primarySoft,
                },
              ]}
            >
              <Text variant="bodySmall">
                {notice}
              </Text>
            </View>
          ) : null}
          {error ? (
            <View
              accessibilityRole="alert"
              style={[
                styles.notice,
                {
                  backgroundColor:
                    colors.bgSecondary,
                  borderColor: colors.danger,
                },
              ]}
            >
              <Text
                variant="bodySmall"
                color="danger"
              >
                {error}
              </Text>
            </View>
          ) : null}

          <View style={styles.toolbar}>
            <View style={styles.toolbarControls}>
              <Segmented
                options={['expense', 'income']}
                value={type}
                onChange={(value) => {
                  setType(
                    value as TransactionType
                  );
                  closeEditor();
                }}
              />
              <Segmented
                options={['active', 'archived']}
                value={status}
                onChange={(value) => {
                  setStatus(
                    value as
                      | 'active'
                      | 'archived'
                  );
                  closeEditor();
                }}
              />
            </View>
            <Button
              label="Add category"
              onPress={openCreate}
              disabled={draft !== null}
            />
          </View>

          {draft ? (
            <CategoryEditor
              draft={draft}
              editing={Boolean(editingCategory)}
              existingCategories={data.categories.filter(
                (category) =>
                  category.id !== editingId
              )}
              busy={
                busyId ===
                (editingId || 'create')
              }
              onChange={setDraft}
              onSave={save}
              onCancel={closeEditor}
            />
          ) : null}

          <View style={styles.listHeading}>
            <View>
              <Text variant="h3">
                {status === 'active'
                  ? 'Active'
                  : 'Archived'}{' '}
                {type} categories
              </Text>
              <Text
                variant="bodySmall"
                color="secondary"
              >
                {categories.length}{' '}
                {categories.length === 1
                  ? 'category'
                  : 'categories'}
              </Text>
            </View>
          </View>

          {categories.length === 0 ? (
            <View
              style={[
                styles.empty,
                {
                  borderColor: colors.border,
                },
              ]}
            >
              <Text variant="h4">
                No {status} {type} categories
              </Text>
              <Text
                variant="bodySmall"
                color="secondary"
                style={styles.emptyCopy}
              >
                {status === 'active'
                  ? 'Create one to make it available in transaction forms.'
                  : 'Archived categories will remain here for historical reference.'}
              </Text>
            </View>
          ) : (
            <Card style={styles.categoryList}>
              {categories.map((category) => {
                const usage = usageFor(
                  category.id
                );
                return (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    currency={data.user.currency}
                    transactionCount={
                      usage.transactionCount
                    }
                    budgetMonthCount={
                      usage.budgetMonthCount
                    }
                    busy={
                      busyId === category.id
                    }
                    onEdit={() =>
                      openEdit(category)
                    }
                    onRestore={() =>
                      restore(category)
                    }
                    onRemove={() =>
                      setConfirmingId(
                        category.id
                      )
                    }
                  />
                );
              })}
            </Card>
          )}

          <ConfirmModal
            visible={
              confirmingCategory !== null
            }
            title="Archive category?"
            message={
              confirmingCategory
                ? `${confirmingCategory.name} will be hidden from new transactions and retained for transaction, budget, and Plan history.`
                : ''
            }
            confirmLabel="Archive"
            onConfirm={remove}
            onCancel={() =>
              setConfirmingId(null)
            }
          />
        </AppScroll>
      );
    }}
  </RequireData>
);

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  toolbarControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    flex: 1,
  },
  editor: {
    marginBottom: Spacing.xl,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headingCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  colorChoice: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    borderWidth: 3,
  },
  iconChoice: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  flexAction: {
    flexGrow: 1,
    minWidth: 150,
  },
  notice: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  listHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  categoryList: {
    paddingVertical: 0,
    marginBottom: Spacing.xl,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  categoryMain: {
    flex: 1,
    minWidth: 240,
    gap: Spacing.sm,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: Spacing.xl,
  },
  emptyCopy: {
    marginTop: Spacing.xs,
  },
});
