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
  ChartColors,
  Radius,
  Spacing,
} from '../../theme/index';
import {
  isCategoryArchived,
  MAX_CATEGORY_NAME_LENGTH,
} from '../../utils/categories';
import { formatCurrency } from '../../utils/format';
import { mcIconName } from '../../utils/icons';

const CATEGORY_COLORS = [
  ChartColors.categories.health,
  ChartColors.categories.transportation,
  ChartColors.categories.housing,
  ChartColors.categories.shopping,
  ChartColors.categories.food,
  ChartColors.categories.subscriptions,
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
      category.name
        .trim()
        .toLocaleLowerCase() ===
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

  const parsedBudget = Number(
    draft.monthlyBudget
  );

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
        borderColor: colors.actionPrimary,
      }}
    >
      {/* CATEGORIES_EDITOR_SLICE_C4 */}
      <View style={styles.sectionHeading}>
        <View style={styles.headingCopy}>
          <Text variant="h3">
            {editing
              ? 'Edit category'
              : 'Create category'}
          </Text>

          <Text
            variant="bodySmall"
            color="secondary"
          >
            {editing
              ? 'Type is locked so existing activity keeps its original meaning.'
              : 'Choose how this category appears when recording new activity.'}
          </Text>
        </View>

        <IconButton
          icon="close"
          label="Close category editor"
          onPress={onCancel}
        />
      </View>

      {!editing ? (
        <View style={styles.editorTypeControl}>
          <Text
            variant="caption"
            color="secondary"
            style={styles.fieldLabel}
          >
            CATEGORY TYPE
          </Text>

          <Segmented
            options={[
              'expense',
              'income',
            ]}
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
        </View>
      ) : (
        <View
          style={[
            styles.editorTypeLock,
            {
              backgroundColor:
                colors.backgroundSubtle,
              borderColor:
                colors.borderDefault,
            },
          ]}
        >
          <Text
            variant="caption"
            color="secondary"
          >
            TYPE LOCKED
          </Text>

          <Text variant="bodySmall">
            {draft.type === 'income'
              ? 'Income category'
              : 'Expense category'}
          </Text>

          <Text
            variant="bodySmall"
            color="secondary"
          >
            Existing activity keeps its
            original category type.
          </Text>
        </View>
      )}

      <Field
        label="Category name"
        value={draft.name}
        onChangeText={(name) =>
          onChange({
            ...draft,
            name,
          })
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

      <Text
        variant="bodySmall"
        color="secondary"
        style={styles.editorHelp}
      >
        Names ignore extra spaces and
        capitalization when checking
        duplicates.
      </Text>

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
              accessibilityLabel={
                `Category color ${color}`
              }
              accessibilityState={{
                checked: selected,
              }}
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
                    ? colors.borderStrong
                    : colors.borderSubtle,
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
              accessibilityLabel={
                `Category icon ${icon}`
              }
              accessibilityState={{
                checked: selected,
              }}
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
                    ? colors.actionPrimarySoft
                    : colors.backgroundSubtle,
                  borderColor: selected
                    ? colors.actionPrimary
                    : colors.borderDefault,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={mcIconName(icon)}
                size={20}
                color={
                  selected
                    ? colors.actionPrimary
                    : colors.textSecondary
                }
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <View
        style={[
          styles.editorSafety,
          {
            borderTopColor:
              colors.borderSubtle,
          },
        ]}
      >
        <Text
          variant="bodySmall"
          color="secondary"
        >
          Changes apply to future activity.
          Existing transactions and budget
          history keep their saved category
          references.
        </Text>
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
    /* CATEGORIES_ROWS_SLICE_C3 */
    <View
      style={[
        styles.categoryRow,
        {
          borderBottomColor:
            colors.borderSubtle,
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

          <View style={styles.categoryState}>
            <Text
              variant="caption"
              color="secondary"
            >
              {category.isDefault
                ? 'Default'
                : 'Custom'}
            </Text>

            {archived ? (
              <Text
                variant="caption"
                color="secondary"
              >
                {'Archived'}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.categoryMetaGrid}>
          <View style={styles.categoryMetaItem}>
            <Text
              variant="caption"
              color="secondary"
              style={
                styles.categoryMetaLabel
              }
            >
              TYPE
            </Text>

            <Text variant="bodySmall">
              {category.type === 'income'
                ? 'Income'
                : 'Expense'}
            </Text>
          </View>

          {category.type === 'expense' ? (
            <View
              style={
                styles.categoryMetaItem
              }
            >
              <Text
                variant="caption"
                color="secondary"
                style={
                  styles.categoryMetaLabel
                }
              >
                DEFAULT BUDGET
              </Text>

              <Text variant="bodySmall">
                {formatCurrency(
                  category.monthlyBudget,
                  currency
                )}
              </Text>
            </View>
          ) : null}

          <View style={styles.categoryMetaItem}>
            <Text
              variant="caption"
              color="secondary"
              style={
                styles.categoryMetaLabel
              }
            >
              ACTIVITY
            </Text>

            <Text variant="bodySmall">
              {transactionCount === 0
                ? 'No transactions'
                : `${transactionCount} transaction${
                    transactionCount === 1
                      ? ''
                      : 's'
                  }`}
            </Text>
          </View>

          <View style={styles.categoryMetaItem}>
            <Text
              variant="caption"
              color="secondary"
              style={
                styles.categoryMetaLabel
              }
            >
              BUDGET HISTORY
            </Text>

            <Text variant="bodySmall">
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
            <>
              <IconButton
                icon="edit"
                label={`Edit ${category.name}`}
                onPress={onEdit}
              />

              <Button
                label="Archive"
                variant="danger"
                size="sm"
                disabled={busy || archived}
                onPress={onRemove}
              />
            </>
          )}
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
          {/* CATEGORIES_SHELL_SLICE_C1 */}
          <View style={styles.categoriesHeader}>
            <IconButton
              icon="arrow-back"
              label="Go back"
              onPress={() =>
                navigation.goBack()
              }
            />

            <View
              style={
                styles.categoriesHeaderCopy
              }
            >
              <Text variant="h2">
                Manage categories
              </Text>

              <Text
                variant="bodySmall"
                color="secondary"
                style={
                  styles.categoriesHeaderSubtitle
                }
              >
                New activity uses these categories.
                Historical transaction references
                remain unchanged.
              </Text>
            </View>
          </View>

          {notice ? (
            <View
              accessibilityLiveRegion="polite"
              style={[
                styles.notice,
                {
                  backgroundColor:
                    colors.backgroundSubtle,
                  borderColor:
                    colors.statusPositive,
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
                    colors.backgroundSubtle,
                  borderColor: colors.statusCritical,
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

          {/* CATEGORIES_CONTROLS_SLICE_C2 */}
          <Card style={styles.categoryControls}>
            <View style={styles.controlHeader}>
              <View
                style={
                  styles.controlHeaderCopy
                }
              >
                <Text variant="h3">
                  Category library
                </Text>

                <Text
                  variant="bodySmall"
                  color="secondary"
                >
                  Choose which categories are
                  visible when recording new
                  activity.
                </Text>
              </View>

              <Button
                label="Add category"
                onPress={openCreate}
                disabled={draft !== null}
                style={
                  styles.addCategoryAction
                }
              />
            </View>

            <View style={styles.controlGrid}>
              <View style={styles.controlGroup}>
                <Text
                  variant="caption"
                  color="secondary"
                  style={
                    styles.controlEyebrow
                  }
                >
                  CATEGORY TYPE
                </Text>

                <Segmented
                  options={[
                    'expense',
                    'income',
                  ]}
                  value={type}
                  onChange={(value) => {
                    setType(
                      value as TransactionType
                    );
                    closeEditor();
                  }}
                />
              </View>

              <View style={styles.controlGroup}>
                <Text
                  variant="caption"
                  color="secondary"
                  style={
                    styles.controlEyebrow
                  }
                >
                  VISIBILITY
                </Text>

                <Segmented
                  options={[
                    'active',
                    'archived',
                  ]}
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
            </View>
          </Card>

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
            <View
              style={
                styles.listHeadingCopy
              }
            >
              <Text variant="h3">
                {type === 'income'
                  ? 'Income categories'
                  : 'Expense categories'}
              </Text>

              <Text
                variant="bodySmall"
                color="secondary"
              >
                {status === 'active'
                  ? 'Available when recording new activity.'
                  : 'Hidden from new activity and retained for history.'}
              </Text>
            </View>

            <Text
              variant="caption"
              color="secondary"
              style={styles.listCount}
            >
              {categories.length}{' '}
              {categories.length === 1
                ? 'category'
                : 'categories'}
            </Text>
          </View>

          {categories.length === 0 ? (
            <View
              style={[
                styles.empty,
                {
                  borderColor: colors.borderDefault,
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
                  ? 'Add one to make it available when recording new activity.'
                  : 'Archived categories stay available here for historical reference and restoration.'}
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
                ? `${confirmingCategory.name} will be hidden from new activity. Existing transactions, budget history, and Plan history will keep their current category reference.`
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
  editorTypeControl: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  editorTypeLock: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  editorHelp: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  editorSafety: {
    borderTopWidth:
      StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
  },

  categoryState: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  categoryMetaItem: {
    flexGrow: 1,
    flexBasis: 120,
    minWidth: 0,
    gap: Spacing.xs,
  },
  categoryMetaLabel: {
    letterSpacing: 0.6,
  },

  controlHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  controlHeaderCopy: {
    flex: 1,
    minWidth: 220,
    gap: Spacing.xs,
  },
  controlGroup: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 0,
    gap: Spacing.xs,
  },
  controlEyebrow: {
    letterSpacing: 0.7,
  },
  addCategoryAction: {
    minWidth: 150,
  },
  listHeadingCopy: {
    flex: 1,
    minWidth: 220,
    gap: Spacing.xs,
  },
  listCount: {
    paddingTop: Spacing.xs,
  },

  categoriesHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  categoriesHeaderCopy: {
    flex: 1,
    minWidth: 0,
    paddingTop: Spacing.xs,
  },
  categoriesHeaderSubtitle: {
    marginTop: Spacing.xs,
  },

  categoryControls: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  controlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
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
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  categoryList: {
    paddingVertical: 0,
    marginBottom: Spacing.xl,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth:
      StyleSheet.hairlineWidth,
  },
  categoryMain: {
    flex: 1,
    minWidth: 220,
    gap: Spacing.md,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  categoryMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
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
