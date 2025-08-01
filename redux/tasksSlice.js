// src/redux/tasksSlice.js
import { createSlice } from '@reduxjs/toolkit';
import { subscribeToTasks } from '../services/FirebaseService';

const initialState = [];

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action) => {
      return action.payload;
    },
    syncTasksFromFirebase: (state, action) => {
      return action.payload;
    }
  }
});

export const { setTasks, syncTasksFromFirebase } = tasksSlice.actions;

// Thunk for real-time Firebase sync
export const syncTasks = () => (dispatch) => {
  return subscribeToTasks((tasks) => {
    dispatch(syncTasksFromFirebase(tasks));
  });
};

// Selectors
export const selectAllTasks = state => state.tasks;
export const selectCompletedTasks = state => state.tasks.filter(task => task.completed);
export const selectPendingTasks = state => state.tasks.filter(task => !task.completed);
export const selectTasksByCategory = (state, category) => 
  state.tasks.filter(task => task.category === category);

export default tasksSlice.reducer;