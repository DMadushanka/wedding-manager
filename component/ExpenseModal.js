import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const ExpenseModal = ({
  visible,
  onClose,
  onSave,
  expenseToEdit = null,
  categories = [],
  selectedCategory, // Received from parent
  onCategoryChange, // Callback to update category in parent
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(() => {
    if (expenseToEdit) {
      setDescription(expenseToEdit.description);
      setAmount(expenseToEdit.amount.toString());
      // Don't need to set category here - it's controlled by parent
    } else {
      resetForm();
    }
  }, [expenseToEdit, visible]);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setError('');
    setShowCategoryDropdown(false);
    // Don't reset category here - parent handles it
  };

  const handleSave = () => {
    Keyboard.dismiss();
    const amountValue = parseFloat(amount);

    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    onSave({
      description: description.trim(),
      amount: amountValue,
      category: selectedCategory // Use the prop directly
    });
    
    resetForm();
  };

  const handleCategorySelect = (category) => {
    onCategoryChange(category); // Update parent component's state
    setShowCategoryDropdown(false);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        resetForm();
        onClose();
      }}
    >
      <TouchableWithoutFeedback onPress={() => setShowCategoryDropdown(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {expenseToEdit ? 'Edit Expense' : 'Add New Expense'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.textInput}
                placeholder="What was this expense for?"
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.inputLabel}>Amount</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
                />
              </View>
            
              <Text style={styles.inputLabel}>Category</Text>
              <TouchableOpacity
                style={styles.categorySelector}
                onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
              >
                <Text style={styles.categoryText}>{selectedCategory}</Text>
                <Feather 
                  name={showCategoryDropdown ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>

              {showCategoryDropdown && (
                <View style={styles.dropdownContainer}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={styles.dropdownItem}
                      onPress={() => handleCategorySelect(cat)}
                    >
                      <Text style={styles.dropdownItemText}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                resetForm();
                onClose();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>
                  {expenseToEdit ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    marginTop: 15,
  },
  textInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 8,
    fontSize: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 5,
    color: '#333',
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 8,
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginTop: 5,
  },
  categoryText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownContainer: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: '#FF6B6B',
    marginTop: 10,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  cancelButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#6B5B95',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ExpenseModal;