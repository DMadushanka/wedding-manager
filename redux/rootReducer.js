// src/redux/rootReducer.js
import { combineReducers } from '@reduxjs/toolkit';
import tasksReducer from './tasksSlice';
import budgetReducer from './budgetSlice';
import notesReducer from './notesSlice';

const rootReducer = combineReducers({
  tasks: tasksReducer,
  budget: budgetReducer,
  notes: notesReducer,
});

export default rootReducer;