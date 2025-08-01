import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, Alert, ActivityIndicator, Animated, ImageBackground } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { 
  getBudget, 
  getExpenses, 
  updateBudget, 
  addExpense, 
  editExpense, 
  deleteExpense,
  subscribeToBudget,
  subscribeToExpenses,
  updateBudgetPercentage
} from '../services/FirebaseService';
import BudgetInputModal from '../component/BudgetInputModal';
import ExpenseModal from '../component/ExpenseModal';
import { PieChart } from 'react-native-chart-kit';

const BudgetTrackerScreen = () => {
  const { user } = useAuth();
  const [budget, setBudget] = useState(10000);
  const [expenses, setExpenses] = useState([]);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Venue');
  const [editingExpense, setEditingExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  const categories = ['Venue', 'Catering', 'Attire', 'Photography', 'Other'];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Set up real-time listeners
    const unsubscribeBudget = subscribeToBudget((amount) => {
      if (isMounted) {
        setBudget(amount);
        setLoading(false);
        setError(null);
      }
    });
    
    const unsubscribeExpenses = subscribeToExpenses((expensesData) => {
      if (isMounted) {
        setExpenses(expensesData);
        setLoading(false);
        setError(null);
      }
    });

    // Initial data fetch
    const fetchInitialData = async () => {
      try {
        const initialBudget = await getBudget();
        const initialExpenses = await getExpenses();
        
        if (isMounted) {
          setBudget(initialBudget.amount || 10000);
          setExpenses(initialExpenses);
          
          // Calculate and update percentage on initial load
          const totalSpent = initialExpenses.reduce((sum, expense) => sum + expense.amount, 0);
          const percentage = initialBudget.amount > 0 ? (totalSpent / initialBudget.amount) * 100 : 0;
          await updateBudgetPercentage(percentage);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        if (isMounted) {
          setError("Failed to load data");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
      unsubscribeBudget();
      unsubscribeExpenses();
    };
  }, [user]);

  const renderContent = () => {
    if (!user) {
      return (
        <View style={styles.authContainer}>
          <Text style={styles.authText}>Please sign in to view your budget</Text>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>Loading budget data...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={50} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setError(null);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const remainingBudget = budget - totalSpent;
    const percentageSpent = budget > 0 ? (totalSpent / budget) * 100 : 0;

    // Prepare data for pie chart
    const categoryData = categories.map(category => {
      const total = expenses
        .filter(expense => expense.category === category)
        .reduce((sum, expense) => sum + expense.amount, 0);
      return {
        name: category,
        amount: total,
        color: getColorForCategory(category),
        legendFontColor: '#fff',
        legendFontSize: 12,
      };
    }).filter(item => item.amount > 0);

    function getColorForCategory(category) {
      const colors = {
        Venue: '#FF6B6B',
        Catering: '#4ECDC4',
        Attire: '#6B5B95',
        Photography: '#FFBE0B',
        Other: '#999',
      };
      return colors[category] || '#999';
    }

    function getIconForCategory(category) {
      const icons = {
        Venue: 'home',
        Catering: 'coffee',
        Attire: 'shopping-bag',
        Photography: 'camera',
        Other: 'more-horizontal',
      };
      return icons[category] || 'more-horizontal';
    }

    const handleAddExpense = async (expenseData) => {
      const tempId = Date.now().toString();
      const newExpense = { ...expenseData, id: tempId };
      const originalExpenses = [...expenses];
      
      try {
        // Optimistically update the UI
        if (editingExpense) {
          setExpenses(prevExpenses => 
            prevExpenses.map(e => e.id === editingExpense.id ? { ...e, ...expenseData } : e)
          );
        } else {
          setExpenses(prevExpenses => [...prevExpenses, newExpense]);
        }

        // Calculate new percentage for optimistic update
        const updatedExpenses = editingExpense 
          ? expenses.map(e => e.id === editingExpense.id ? { ...e, ...expenseData } : e)
          : [...expenses, newExpense];
        
        const newTotalSpent = updatedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const newPercentage = budget > 0 ? (newTotalSpent / budget) * 100 : 0;
        
        // Update Firestore
        if (editingExpense) {
          await editExpense(editingExpense.id, expenseData);
        } else {
          await addExpense(expenseData);
        }
        
        // Update the percentage in Firestore
        await updateBudgetPercentage(newPercentage);
        
        setShowExpenseModal(false);
        setEditingExpense(null);
      } catch (error) {
        // Revert optimistic updates on error
        setExpenses(originalExpenses);
        Alert.alert('Error', 'Failed to save expense');
        console.error(error);
      }
    };

    const handleDeleteExpense = async (expenseId) => {
      Alert.alert(
        'Delete Expense',
        'Are you sure you want to delete this expense?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            onPress: async () => {
              // Store the original state for potential revert
              const expenseToDelete = expenses.find(e => e.id === expenseId);
              const originalExpenses = [...expenses];
              
              try {
                // Optimistically update the UI
                setExpenses(prevExpenses => prevExpenses.filter(e => e.id !== expenseId));
                
                // Calculate new percentage
                const updatedExpenses = expenses.filter(e => e.id !== expenseId);
                const newTotalSpent = updatedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
                const newPercentage = budget > 0 ? (newTotalSpent / budget) * 100 : 0;
                
                await deleteExpense(expenseId);
                await updateBudgetPercentage(newPercentage);
              } catch (error) {
                // Revert optimistic updates on error
                setExpenses(originalExpenses);
                Alert.alert('Error', 'Failed to delete expense');
                console.error(error);
              }
            },
            style: 'destructive',
          },
        ],
        { cancelable: true }
      );
    };

    const handleEditExpense = (expense) => {
      setEditingExpense(expense);
      setSelectedCategory(expense.category);
      setShowExpenseModal(true);
    };

    const handleUpdateBudget = async (newBudget) => {
      const originalBudget = budget;
      
      try {
        // Optimistically update the UI
        setBudget(newBudget);
        
        // Calculate new percentage with the new budget amount
        const newPercentage = newBudget > 0 ? (totalSpent / newBudget) * 100 : 0;
        
        await updateBudget(newBudget);
        await updateBudgetPercentage(newPercentage);
        
        setShowBudgetModal(false);
      } catch (error) {
        // Revert optimistic update on error
        setBudget(originalBudget);
        Alert.alert('Error', 'Failed to update budget');
        console.error(error);
      }
    };

    return (
      <View style={styles.container}>
        <View style={styles.topDecoration} />
        <View style={styles.bottomDecoration} />
          <View style={styles.header}>
              <Text style={styles.title}>Budget Tracker</Text>
            </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Budget:</Text>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setShowBudgetModal(true)}
              >
                <Text style={styles.summaryValue}>${budget.toLocaleString()}</Text>
                <Feather name="edit-2" size={16} color="#666" style={styles.editIcon} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Spent:</Text>
              <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>
                ${totalSpent.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Remaining:</Text>
              <Text style={[styles.summaryValue, { 
                color: remainingBudget >= 0 ? '#4ECDC4' : '#FF6B6B' 
              }]}>
                ${Math.abs(remainingBudget).toLocaleString()}
                {remainingBudget < 0 && ' (Over)'}
              </Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBar,
                { 
                  width: `${Math.min(percentageSpent, 100)}%`,
                  backgroundColor: percentageSpent > 80 ? '#FF6B6B' : '#4ECDC4',
                }
              ]} />
            </View>
            <Text style={styles.progressText}>
              {percentageSpent.toFixed(1)}% of budget spent
            </Text>
          </View>
          
          {categoryData.length > 0 && (
            <View style={styles.chartContainer}>
              <Text style={styles.sectionTitle}>Expense Breakdown</Text>
              <PieChart
                data={categoryData}
                width={Dimensions.get('window').width - 40}
                height={200}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              setEditingExpense(null);
              setSelectedCategory('Venue'); 
              setShowExpenseModal(true);
            }}
          >
            <Feather name="plus" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add Expense</Text>
          </TouchableOpacity>
          
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
          
          {expenses.length > 0 ? (
            <FlatList
              data={[...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.expenseItem}>
                  <View style={styles.expenseLeft}>
                    <View style={[
                      styles.categoryIcon,
                      { backgroundColor: getColorForCategory(item.category) }
                    ]}>
                      <Feather name={getIconForCategory(item.category)} size={16} color="#fff" />
                    </View>
                    <View style={styles.expenseInfo}>
                      <Text style={styles.expenseTitle}>{item.description}</Text>
                      <Text style={styles.expenseCategory}>{item.category}</Text>
                    </View>
                  </View>
                  <View style={styles.expenseRight}>
                    <Text style={styles.expenseAmount}>-${item.amount.toFixed(2)}</Text>
                    <View style={styles.expenseActions}>
                      <TouchableOpacity 
                        onPress={() => handleEditExpense(item)}
                        style={styles.actionButton}
                      >
                        <Feather name="edit" size={16} color="#4ECDC4" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleDeleteExpense(item.id)}
                        style={styles.actionButton}
                      >
                        <Feather name="trash-2" size={16} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            />
          ) : (
            <View style={styles.emptyState}>
              <Feather name="dollar-sign" size={40} color="#e0e0e0" />
              <Text style={styles.emptyText}>No expenses recorded yet</Text>
            </View>
          )}
          
          {expenses.length > 5 && (
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All Expenses</Text>
              <Feather name="chevron-right" size={16} color="#4ECDC4" />
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
      
      <BudgetInputModal
        visible={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        currentBudget={budget}
        onSave={handleUpdateBudget}
      />
      
      <ExpenseModal
        visible={showExpenseModal}
        onClose={() => {
          setShowExpenseModal(false);
          setEditingExpense(null);
        }}
        onSave={handleAddExpense}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        expenseToEdit={editingExpense}
      />
    </View>
  );
};

  return (
    <ImageBackground
      source={require('../assets/background.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      {renderContent()}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    marginTop: 'auto',
  },
  topDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(245, 229, 6, 0.8)',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    opacity: 0.2,
  },

  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    backdropFilter: 'blur(10px)',
    
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  summaryCard: {
    backgroundColor: 'rgba(134, 118, 25, 0.35)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#ffcc00',
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffff80',
    letterSpacing: 0.3,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editIcon: {
    marginLeft: 5,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginTop: 15,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    color: '#ffff80',
    marginTop: 5,
    textAlign: 'right',
    letterSpacing: 0.3,
  },
  chartContainer: {
    backgroundColor: 'rgba(240, 236, 6, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 25,
    letterSpacing: 0.3,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#4ECDC4',
    borderRadius: 15,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 0.3,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(247, 191, 6, 0.15)',
    borderRadius: 15,
    padding: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 25,
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseActions: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  expenseTitle: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  expenseCategory: {
    fontSize: 12,
    color: '#fff',
    marginTop: 2,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(245, 210, 14, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginRight: 5,
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    letterSpacing: 0.3,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    padding: 10,
  },
  viewAllText: {
    color: 'red',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 5,
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    letterSpacing: 0.3,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FF6B6B',
    letterSpacing: 0.3,
  },
  retryButton: {
    padding: 10,
    backgroundColor: '#4ECDC4',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  authText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    letterSpacing: 0.3,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    marginBottom: 10,
    backgroundColor: 'rgba(150, 123, 66, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 202, 11, 0.2)',
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(245, 210, 14, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  categoryAmount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textShadowColor: 'rgba(245, 210, 14, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default BudgetTrackerScreen;