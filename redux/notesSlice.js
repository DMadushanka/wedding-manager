// src/redux/notesSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = [];

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    addNote: (state, action) => {
      state.unshift({
        id: Date.now().toString(),
        ...action.payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    },
    deleteNote: (state, action) => {
      return state.filter(note => note.id !== action.payload);
    },
    updateNote: (state, action) => {
      const index = state.findIndex(note => note.id === action.payload.id);
      if (index !== -1) {
        state[index] = {
          ...state[index],
          ...action.payload,
          updatedAt: new Date().toISOString()
        };
      }
    },
    // For redux-persist rehydration
    setNotes: (state, action) => {
      return action.payload;
    }
  }
});

export const { addNote, deleteNote, updateNote, setNotes } = notesSlice.actions;

// Selectors
export const selectAllNotes = state => state.notes;
export const selectNoteById = (state, noteId) => 
  state.notes.find(note => note.id === noteId);

export default notesSlice.reducer;