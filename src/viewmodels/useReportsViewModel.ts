import { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { generatePlannerResult, AiPlannerResult } from '../services/aiService';

/**
 * Reports ViewModel — manages AI planner state for ReportsView.
 *
 * Keeps loading/result state out of the view layer and wraps the
 * `generatePlannerResult` call with error-safe handling.
 *
 * @returns AI planner state, trigger function, and toast messaging
 */
export const useReportsViewModel = () => {
  const { data, generateReport, canUseFeature, isGuest } = useFinance();

  const [toast, setToast] = useState<string | null>(null);
  const [planner, setPlanner] = useState<AiPlannerResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const aiEnabled = canUseFeature('aiReports') && !isGuest;

  /**
   * Triggers the AI planner. Guards against non-authenticated users.
   * Sets `planner` on success; sets `toast` on both success and failure.
   */
  const runPlanner = async () => {
    if (!aiEnabled) {
      setToast('AI Reports require a signed-in account.');
      return;
    }
    if (!data) return;
    setAiLoading(true);
    const result = await generatePlannerResult(data);
    setPlanner(result);
    setToast(result.source === 'ai' ? 'AI report generated' : 'Planner fallback generated');
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
    planner,
    toast,
    setToast,
    runPlanner,
    handleGenerateReport,
  };
};
