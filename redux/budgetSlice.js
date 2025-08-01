// src/redux/budgetSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  budget: 10000, // Default budget
  expenses: []
};

const budgetSlice = createSlice({
  name: 'budget',
  initialState,
  reducers: {
    updateBudget: (state, action) => {
      state.budget = action.payload;
    },
    addExpense: (state, action) => {
      state.expenses.push({
        id: Date.now().toString(),
        ...action.payload,
        date: new Date().toISOString()
      });
    },
    deleteExpense: (state, action) => {
      state.expenses = state.expenses.filter(expense => expense.id !== action.payload);
    },
    editExpense: (state, action) => {
      const index = state.expenses.findIndex(expense => expense.id === action.payload.id);
      if (index !== -1) {
        state.expenses[index] = {
          ...state.expenses[index],
          ...action.payload,
          date: new Date().toISOString() // Update the date when edited
        };
      }
    }
  }
});

export const { updateBudget, addExpense, deleteExpense, editExpense } = budgetSlice.actions;

// Selectors
export const selectBudget = state => state.budget.budget;
export const selectExpenses = state => state.budget.expenses;
export const selectTotalSpent = state => 
  state.budget.expenses.reduce((sum, expense) => sum + expense.amount, 0);
export const selectRemainingBudget = state => 
  state.budget.budget - selectTotalSpent(state);
export const selectExpenseById = (state, expenseId) => 
  state.budget.expenses.find(expense => expense.id === expenseId);

export default budgetSlice.reducer;