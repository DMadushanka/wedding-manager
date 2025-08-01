import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

const ProgressRings = ({
  size = 80,
  strokeWidth = 8,
  taskColor = '#4ECDC4',
  budgetColor = '#FF6B6B',
  backgroundColor = '#e0e0e0'
}) => {
  const { user } = useAuth();
  const [taskProgress, setTaskProgress] = useState(0);
  const [budgetProgress, setBudgetProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Task progress listener
    const tasksRef = collection(db, 'users', user.uid, 'tasks');
    const tasksQuery = query(tasksRef);
    const taskUnsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const totalTasks = snapshot.docs.length;
      const completedTasks = snapshot.docs.filter(doc => doc.data().completed).length;
      const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
      setTaskProgress(progress);
    });

    // Budget progress listener
    const budgetProgressRef = doc(db, 'users', user.uid, 'budget', 'current');
    const budgetUnsubscribe = onSnapshot(budgetProgressRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setBudgetProgress((docSnapshot.data().percentageSpent || 0) / 100);
      }
    });

    setLoading(false);

    return () => {
      taskUnsubscribe();
      budgetUnsubscribe();
    };
  }, [user]);

  const renderRing = (progress, color, offsetX = 0) => {
    const radius = size / 2;
    const normalizedRadius = radius - strokeWidth / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - progress * circumference;

    return (
      <Svg height={size} width={size} style={{ position: 'absolute', left: offsetX }}>
        {/* Background circle */}
        <Circle
          stroke={backgroundColor}
          fill="transparent"
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <Circle
          stroke={color}
          fill="transparent"
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${radius} ${radius})`}
        />
        {/* Percentage text */}
        <Text 
          x={radius} 
          y={radius + 5} 
          textAnchor="middle" 
          fill={color}
          fontSize="14"
          fontWeight="bold"
          style={styles.percentageText}
        >
          {Math.round(progress * 100)}%
        </Text>
      </Svg>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { width: size * 2 + 20, height: size }]}>
        <ActivityIndicator size="small" color={taskColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size * 2 + 20, height: size }]}>
      {/* Task Progress Ring (left) */}
      {renderRing(taskProgress, taskColor, 0)}
      
      {/* Budget Progress Ring (right) */}
      {renderRing(budgetProgress, budgetColor, size + 20)}
      
      {/* Labels */}
      <View style={styles.labelsContainer}>
        <View style={styles.label}>
          <View style={[styles.colorDot, { backgroundColor: taskColor }]} />
          <Text style={styles.labelText}>Tasks Completion </Text>
        </View>
        <View style={styles.label}>
          <View style={[styles.colorDot2, { backgroundColor: budgetColor }]} />
          <Text style={styles.labelText2}>Budget Remaining</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  labelsContainer: {
    position: 'absolute',
    bottom: -25,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 1,
    marginBottom: 10,
  },
  colorDot2: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 50,
    marginRight: 1,
    marginBottom: 10,
  },
  labelText: {
    fontSize: 12,
    color: '#cca300',
    paddingRight:20,
    paddingBottom:10,
    
    
  },
  labelText2: {
    fontSize: 12,
    color: '#cca300',
    paddingLeft:0,
    paddingBottom:10,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 30,
  },
});

export default ProgressRings;