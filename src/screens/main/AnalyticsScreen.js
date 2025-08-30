import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, RefreshControl, Alert } from 'react-native';
import { Card, Title, Paragraph, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';

const screenWidth = Dimensions.get('window').width;

// --- HELPER FUNCTIONS ---
const toDateString = (date) => date.toISOString().split('T')[0];
const getColorByIndex = (index) => {
  const colors = ['#FF6384', '#36A2EB', '#FFCD56', '#4BC0C0', '#9966FF', '#FF9F40'];
  return colors[index % colors.length];
};
const generateContinuousDailyData = (transactions, startDate, endDate, dataKey) => {
  const dailyDataMap = new Map();
  transactions.forEach(tx => { dailyDataMap.set(tx.date, tx[dataKey]); });
  const history = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = toDateString(currentDate);
    const value = dailyDataMap.get(dateStr) || 0;
    history.push({ date: dateStr, [dataKey]: value });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return history;
};
const formatChartLabels = (data) => {
  if (!data || data.length < 2) return [];
  const labels = [];
  const displayInterval = Math.max(1, Math.ceil(data.length / 4));
  data.forEach((item, index) => {
    if (index === 0 || index === data.length - 1 || index % displayInterval === 0) {
      const date = new Date(item.date);
      labels.push(`${date.getDate()}/${date.getMonth() + 1}`);
    } else {
      labels.push('');
    }
  });
  return labels;
};


export default function AnalyticsScreen() {
  const [analyticsData, setAnalyticsData] = useState({ modeStats: [], categoryStats: [] });
  const [chartType, setChartType] = useState('mode');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dailySpendHistory, setDailySpendHistory] = useState([]);
  const [monthlySpendHistory, setMonthlySpendHistory] = useState([]);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('1M');
  const { user } = useAuth();
  const { db } = useDatabase();
  const { isDark, theme } = useTheme();

  const chartButtons = [
    { value: 'mode', label: 'By Mode' },
    { value: 'category', label: 'By Category' },
    { value: 'spend', label: 'Daily Spend' },
  ];
  const timeFrames = [
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '6M', label: '6M' },
    { value: '1Y', label: '1Y' },
  ];
  const getStartDate = (frame) => {
    const end = new Date();
    let start = new Date();
    switch (frame) {
      case '3M': start.setMonth(end.getMonth() - 3); break;
      case '6M': start.setMonth(end.getMonth() - 6); break;
      case '1Y': start.setFullYear(end.getFullYear() - 1); break;
      case '1M':
      default: start.setMonth(end.getMonth() - 1);
    }
    return start;
  };

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    setDailySpendHistory([]);
    setMonthlySpendHistory([]);
    try {
      const pieData = await db.getAnalyticsData(user.id);
      setAnalyticsData(pieData);
  
      if (chartType === 'spend') {
        const startDate = getStartDate(selectedTimeFrame);
        const startDateStr = toDateString(startDate);
        const endDateStr = toDateString(new Date());

        if (selectedTimeFrame === '1M') {
          const spendTransactions = await db.getDailySpendHistory(user.id, startDateStr, endDateStr);
          const history = generateContinuousDailyData(spendTransactions, startDate, new Date(), 'total_spend');
          setDailySpendHistory(history);
        } else {
          const monthlyData = await db.getMonthlySpendHistory(user.id, startDateStr);
          setMonthlySpendHistory(monthlyData);
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadAnalyticsData(); }, [chartType, selectedTimeFrame]));

  const dailySpendData = useMemo(() => {
    if (!dailySpendHistory || dailySpendHistory.length === 0) {
      return { labels: [], datasets: [{ data: [] }] };
    }
    return {
      labels: formatChartLabels(dailySpendHistory),
      datasets: [
        {
          data: dailySpendHistory.map(item => item.total_spend),
          color: (opacity = 1) => isDark ? `rgba(255, 159, 28, 1)` : `rgba(247, 23, 53, 1)`,
          strokeWidth: 2,
        },
      ],
    };
  }, [dailySpendHistory, isDark]);
  
  const monthlySpendData = useMemo(() => {
    if (!monthlySpendHistory || monthlySpendHistory.length === 0) {
      return { labels: [], datasets: [{ data: [] }] };
    }
    const labels = monthlySpendHistory.map(item => {
        const date = new Date(item.month + '-02');
        return date.toLocaleDateString('en-IN', { month: 'short' });
    });
    const data = monthlySpendHistory.map(item => item.total_spend);
    return { labels, datasets: [{ data }] };
  }, [monthlySpendHistory]);

  const pieChartData = useMemo(() => {
    if (chartType === 'mode') {
      return analyticsData.modeStats
        .map((item, index) => ({ name: item.mode, amount: item.expense, color: getColorByIndex(index), legendFontColor: theme.colors.textSecondary, legendFontSize: 15 }))
        .filter((item) => item.amount > 0);
    } else if (chartType === 'category') {
      return analyticsData.categoryStats
        .filter((item) => item.type === 'expense')
        .map((item, index) => ({ name: item.category, amount: item.total, color: getColorByIndex(index), legendFontColor: theme.colors.textSecondary, legendFontSize: 15 }))
        .filter((item) => item.amount > 0);
    }
    return [];
  }, [analyticsData, chartType, theme.colors.textSecondary]);

  const handleDataPointClick = ({ index }) => {
    const dataPoint = dailySpendHistory[index];
    if (dataPoint) {
      const date = new Date(dataPoint.date).toLocaleDateString('en-GB', { day: 'long', month: 'short', year: 'numeric' });
      const amount = formatCurrency(dataPoint.total_spend);
      Alert.alert(date, `Total spent: ${amount}`);
    }
  };
  
  const onRefresh = async () => { setRefreshing(true); await loadAnalyticsData(); setRefreshing(false); };
  const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const totalExpense = useMemo(() => analyticsData.categoryStats.filter(i => i.type === 'expense').reduce((s, i) => s + i.total, 0), [analyticsData.categoryStats]);
  const totalIncome = useMemo(() => analyticsData.categoryStats.filter(i => i.type === 'income').reduce((s, i) => s + i.total, 0), [analyticsData.categoryStats]);
  
  const spendChartConfig = {
    backgroundGradientFrom: isDark ? '#2c2c2c' : '#FFFFFF',
    backgroundGradientTo: isDark ? '#2c2c2c' : '#FFFFFF',
    color: (opacity = 1) => isDark ? `rgba(255, 159, 28, ${opacity})` : `rgba(247, 23, 53, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '0' },
    propsForBackgroundLines: { stroke: isDark ? 'rgba(255, 255, 255, 0.2)' : theme.colors.border },
    formatYLabel: (yLabel) => {
        const num = Number(yLabel);
        if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
        return yLabel;
    },
  };
  
  const pieChartConfig = {
    backgroundColor: theme.colors.card,
    backgroundGradientFrom: theme.colors.card,
    backgroundGradientTo: theme.colors.card,
    color: (opacity = 1) => theme.colors.text,
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
        <View style={styles.summaryContainer}>
            <Card style={[styles.summaryCard, { backgroundColor: isDark ? '#1b4332' : '#e8f5e8' }]}><Card.Content style={styles.summaryContent}><Title style={[styles.summaryAmount, { color: '#2e7d32' }]}>{formatCurrency(totalIncome)}</Title><Paragraph style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total Income</Paragraph></Card.Content></Card>
            <Card style={[styles.summaryCard, { backgroundColor: isDark ? '#4a1e1e' : '#ffebee' }]}><Card.Content style={styles.summaryContent}><Title style={[styles.summaryAmount, { color: '#d32f2f' }]}>{formatCurrency(totalExpense)}</Title><Paragraph style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total Expense</Paragraph></Card.Content></Card>
        </View>
        <View style={styles.chartSelector}><SegmentedButtons value={chartType} onValueChange={setChartType} buttons={chartButtons} /></View>
        {chartType === 'spend' && (<View style={styles.chartSelector}><SegmentedButtons value={selectedTimeFrame} onValueChange={setSelectedTimeFrame} buttons={timeFrames} /></View>)}
        
        {isLoading ? (<ActivityIndicator animating={true} size="large" style={{ marginVertical: 50 }} />) : (
          <>
              {chartType === 'spend' && (
              <Card style={[styles.chartCard, { backgroundColor: spendChartConfig.backgroundGradientTo }]}>
                <Card.Content>
                  <Title style={[styles.chartTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>{selectedTimeFrame === '1M' ? 'Daily Spend' : 'Monthly Spend'}</Title>
                  
                  {selectedTimeFrame === '1M' ? (
                    // The extra curly braces have been removed from this block
                    dailySpendData.datasets[0].data.length > 0 ? (
                      <LineChart
                        data={dailySpendData}
                        width={screenWidth - 64}
                        height={220}
                        chartConfig={spendChartConfig}
                        fromZero={true}
                        withInnerLines={false}
                        withShadow={false}
                        style={{ marginLeft: -15 }}
                        onDataPointClick={handleDataPointClick}
                      />
                    ) : (
                      <View style={styles.noDataContainer}>
                        <Paragraph style={[styles.noDataText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                          No spend data for this period
                        </Paragraph>
                      </View>
                    )
                  ) : (
                    // This block was already correct
                    monthlySpendData.datasets[0].data.length > 0 ? (
                      <BarChart data={monthlySpendData} width={screenWidth - 64} height={220} chartConfig={spendChartConfig} fromZero={true} showValuesOnTopOfBars={true} yAxisLabel="₹" />
                    ) : (
                      <View style={styles.noDataContainer}><Paragraph style={[styles.noDataText, { color: isDark ? '#FFFFFF' : '#000000' }]}>No spend data for this period</Paragraph></View>
                    )
                  )}

                </Card.Content>
              </Card>
            )}
            {(chartType === 'mode' || chartType === 'category') && (
              <>
                <Card style={[styles.chartCard, { backgroundColor: theme.colors.card }]}><Card.Content>
                  <Title style={[styles.chartTitle, { color: theme.colors.text }]}>Expense Breakdown {chartType === 'mode' ? 'by Payment Mode' : 'by Category'}</Title>
                  {pieChartData.length > 0 ? (<View style={styles.chartContainer}><PieChart data={pieChartData} width={screenWidth - 64} height={220} chartConfig={pieChartConfig} accessor='amount' backgroundColor='transparent' paddingLeft='15' absolute /></View>) : (<View style={styles.noDataContainer}><Paragraph style={[styles.noDataText, { color: theme.colors.textSecondary }]}>No expense data for this month</Paragraph></View>)}
                </Card.Content></Card>
                {pieChartData.length > 0 && (
                  <Card style={[styles.detailCard, { backgroundColor: theme.colors.card }]}><Card.Content>
                    <Title style={[styles.detailTitle, { color: theme.colors.text }]}>Detailed Breakdown</Title>
                    {chartType === 'mode' ? (
                      analyticsData.modeStats.map((item, index) => (<View key={item.mode} style={[styles.detailItem, { borderBottomColor: theme.colors.border }]}><View style={styles.detailLeft}><View style={[styles.colorIndicator, { backgroundColor: getColorByIndex(index) }]} /><Paragraph style={[styles.detailMode, { color: theme.colors.text }]}>{item.mode}</Paragraph></View><View style={styles.detailRight}><Paragraph style={[styles.detailAmount, { color: '#d32f2f' }]}>-{formatCurrency(item.expense)}</Paragraph></View></View>))
                    ) : (
                      analyticsData.categoryStats.filter(item => item.type === 'expense').map((item, index) => (<View key={`${item.category}-${item.type}`} style={[styles.detailItem, { borderBottomColor: theme.colors.border }]}><View style={styles.detailLeft}><View style={[styles.colorIndicator, { backgroundColor: getColorByIndex(index) }]} /><Paragraph style={[styles.detailMode, { color: theme.colors.text }]}>{item.category}</Paragraph></View><View style={styles.detailRight}><Paragraph style={[styles.detailAmount, { color: '#d32f2f' }]}>-{formatCurrency(item.total)}</Paragraph></View></View>))
                    )}
                  </Card.Content></Card>
                )}
              </>
            )}
          </>
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryContainer: { padding: 16 },
  summaryCard: { marginBottom: 12, elevation: 2 },
  summaryContent: { alignItems: 'center', paddingVertical: 16 },
  summaryAmount: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  summaryLabel: { fontSize: 14 },
  chartSelector: { paddingHorizontal: 16, paddingBottom: 16 },
  chartCard: { margin: 16, marginTop: 0, elevation: 2 },
  chartTitle: { textAlign: 'center', marginBottom: 16, fontSize: 18 },
  chartContainer: { alignItems: 'center' },
  noDataContainer: { alignItems: 'center', paddingVertical: 40 },
  noDataText: { fontSize: 16 },
  detailCard: { margin: 16, marginTop: 0, elevation: 2 },
  detailTitle: { marginBottom: 16, fontSize: 18 },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  detailLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  colorIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  detailMode: { fontSize: 16, fontWeight: '500' },
  detailRight: { alignItems: 'flex-end' },
  detailAmount: { fontSize: 14, fontWeight: '500' },
});