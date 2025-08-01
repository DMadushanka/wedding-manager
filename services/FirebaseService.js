import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';


// EXPENSES AND BUDGET

const getUserExpensesRef = () => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  return collection(db, 'users', userId, 'expenses');
};

const getUserBudgetRef = () => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  return doc(db, 'users', userId, 'budget', 'current');
};

export const getBudget = async () => {
  try {
    const snapshot = await getDoc(getUserBudgetRef());
    return snapshot.exists() ? snapshot.data().amount : 10000;
  } catch (error) {
    console.error("Error getting budget:", error);
    return 10000;
  }
};

export const updateBudget = async (amount) => {
  try {
    await setDoc(getUserBudgetRef(), { amount });
  } catch (error) {
    console.error("Error updating budget:", error);
    throw error;
  }
};

export const getExpenses = async () => {
  try {
    const snapshot = await getDocs(getUserExpensesRef());
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting expenses:", error);
    return [];
  }
};

export const addExpense = async (expense) => {
  try {
    const newExpenseRef = doc(getUserExpensesRef());
    await setDoc(newExpenseRef, {
      ...expense,
      date: new Date().toISOString()
    });
    return newExpenseRef.id;
  } catch (error) {
    console.error("Error adding expense:", error);
    throw error;
  }
};

export const editExpense = async (id, expense) => {
  try {
    await setDoc(doc(getUserExpensesRef(), id), {
      ...expense,
      date: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error editing expense:", error);
    throw error;
  }
};

export const deleteExpense = async (id) => {
  try {
    await deleteDoc(doc(getUserExpensesRef(), id));
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
};

export const subscribeToBudget = (callback) => {
  return onSnapshot(getUserBudgetRef(), (doc) => {
    callback(doc.exists() ? doc.data().amount : 10000);
  });
};

export const subscribeToExpenses = (callback) => {
  return onSnapshot(getUserExpensesRef(), (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(expenses);
  });
};

export const updateBudgetPercentage = async (percentage) => {
  try {
    const budgetRef = getUserBudgetRef();
    await updateDoc(budgetRef, {
      percentageSpent: percentage
    });
  } catch (error) {
    console.error("Error updating budget percentage:", error);
    throw error;
  }
};


// TASKS

export const getUserTasksRef = () => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  return collection(db, 'users', userId, 'tasks');
};

export const getTasks = async () => {
  try {
    const snapshot = await getDocs(getUserTasksRef());
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting tasks:", error);
    return [];
  }
};

export const addTaskToFirestore = async (task) => {
  try {
    const newTaskRef = doc(getUserTasksRef());
    await setDoc(newTaskRef, {
      ...task,
      date: new Date().toISOString()
    });
    return newTaskRef.id;
  } catch (error) {
    console.error("Error adding task:", error);
    throw error;
  }
};

export const toggleTaskInFirestore = async (taskId, newStatus) => {
  try {
    await updateDoc(doc(getUserTasksRef(), taskId), {
      completed: newStatus
    });
  } catch (error) {
    console.error("Error toggling task:", error);
    throw error;
  }
};

export const deleteTaskFromFirestore = async (taskId) => {
  try {
    await deleteDoc(doc(getUserTasksRef(), taskId));
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
};

// NOTES

export const getUserNotesRef = () => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');
  return collection(db, 'users', userId, 'notes');
};

export const addNoteToFirestore = async (note) => {
  try {
    const notesRef = getUserNotesRef();
    return await addDoc(notesRef, note);
  } catch (error) {
    console.error("Error adding note:", error);
    throw error;
  }
};

export const deleteNoteFromFirestore = async (noteId) => {
  try {
    const noteDoc = doc(getUserNotesRef(), noteId);
    await deleteDoc(noteDoc);
  } catch (error) {
    console.error("Error deleting note:", error);
    throw error;
  }
};

// task progress store

export const updateTaskProgressPercentage = async (userId, percentage) => {
  try {
    const progressRef = doc(db, 'users', userId, 'progress', 'tasks');
    await setDoc(progressRef, {
      percentage,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error("Error updating task progress:", error);
    throw error;
  }
};

