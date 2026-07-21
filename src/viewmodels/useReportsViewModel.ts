import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { generatePlanResult, PlanGenerationResult } from '../services/aiService';

/**
 * Reports ViewModel - manages AI Plan state for ReportsView.
 *
 * Keeps loading/result state out of the view layer and wraps the
 * `generatePlanResult` call with error-safe handling.
 *
 * @returns AI Plan state, trigger function, and toast messaging
 */
export const useReportsViewModel = () => {
  const { data, generateReport, canUseFeature, isGuest } = useFinance();

  const [toast, setToast] = useState<string | null>(null);
  const [planResult, setPlanResult] = useState<PlanGenerationResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const aiEnabled = canUseFeature('aiReports') && !isGuest;

  /**
   * Triggers the AI Plan result. Guards against non-authenticated users.
   * Sets `planResult` on success; sets `toast` on both success and failure.
   */
  const runPlan = async () => {
    if (!aiEnabled) {
      setToast('AI Reports require a signed-in account.');
      return;
    }
    if (!data) return;
    setAiLoading(true);
    const result = await generatePlanResult(data);
    setPlanResult(result);
    setToast(result.source === 'ai' ? 'AI report generated' : 'Plan fallback generated');
    setAiLoading(false);
  };

  /**
   * Generates and saves a monthly report, then shows a toast.
   */
  const handleGenerateReport = async () => {
    await generateReport();
    setToast('Report generated');
  };

  return {
    data,
    aiEnabled,
    aiLoading,
    planResult,
    toast,
    setToast,
    runPlan,
    handleGenerateReport,
  };
};
