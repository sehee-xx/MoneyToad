export type Gender = "여성" | "남성" | "";

export interface TransactionYear {
  date: string;
  totalAmount: number;
}

export interface MonthlyTransaction {
  id: number;
  transactionDateTime: string;
  amount: number;
  merchantName: string;
  category: string;
}

export interface CategoryTransaction {
  category: string;
  totalAmount: number;
}

export interface UpdateCategoryRequest {
  category: string;
}

export interface MonthlyBudgetResponse {
  budgetId: number;
  budget: number;
  spending: number;
  category: string;
}

export interface YearlyBudgetLeakResponse {
  budgetDate: string;
  isLeaked: boolean;
}

export interface UpdateBudgetRequest {
  budgetId: number;
  budget: number;
}

export interface UpdateBudgetResponse {
  budgetId: number;
  budget: number;
}
