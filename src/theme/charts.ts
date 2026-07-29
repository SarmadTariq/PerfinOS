/**
 * Financial visualization colours.
 *
 * These values are separate from brand identity colours. The approved terminal
 * blue is not treated as the automatic colour for every chart or financial
 * state.
 */
export const ChartColors = {
  finance: {
    income: '#1E8E5A',
    expense: '#D95F43',
    transfer: '#4B6FB4',
  },

  categories: {
    income: '#1E8E5A',
    food: '#D95F43',
    transportation: '#367C9D',
    housing: '#725EAB',
    subscriptions: '#C18726',
    shopping: '#A64F72',
    health: '#2F8F83',
    learning: '#4B6FB4',
  },

  series: [
    '#367C9D',
    '#725EAB',
    '#2F8F83',
    '#C18726',
    '#A64F72',
    '#4B6FB4',
    '#D95F43',
    '#1E8E5A',
  ],
} as const;

export type ChartCategoryToken = keyof typeof ChartColors.categories;
export type FinancialChartToken = keyof typeof ChartColors.finance;
