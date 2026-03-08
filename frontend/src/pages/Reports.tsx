import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  DocumentArrowDownIcon, 
  ChartBarIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { analyticsApi } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Reports = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: metrics } = useQuery({
    queryKey: ['metrics', timeRange],
    queryFn: () => analyticsApi.getMetrics(timeRange),
  });

  const { data: events } = useQuery({
    queryKey: ['recent-events', 100],
    queryFn: () => analyticsApi.getRecentEvents(100),
  });

  const generatePDF = () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.text('Agent Optimization Report', 20, 20);
      
      // Timestamp
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
      doc.text(`Time Range: ${timeRange}`, 20, 35);
      
      // Summary Statistics
      doc.setFontSize(14);
      doc.text('Summary Statistics', 20, 50);
      
      doc.setFontSize(10);
      doc.text(`Total Events: ${metrics?.total_events || 0}`, 20, 60);
      doc.text(`Error Rate: ${((metrics?.error_rate || 0) * 100).toFixed(1)}%`, 20, 65);
      doc.text(`Avg Latency: ${metrics?.avg_latency_ms?.toFixed(2)}ms`, 20, 70);
      doc.text(`P95 Latency: ${metrics?.p95_latency_ms?.toFixed(2)}ms`, 20, 75);
      
      // Variant Distribution
      doc.text(`Variant A: ${metrics?.variant_distribution?.A || 0} events`, 20, 85);
      doc.text(`Variant B: ${metrics?.variant_distribution?.B || 0} events`, 20, 90);
      
      // Task Distribution Table
      doc.setFontSize(14);
      doc.text('Task Distribution', 20, 110);
      
      const taskData = Object.entries(metrics?.task_distribution || {}).map(([task, count]) => [
        task,
        count,
        `${((count / (metrics?.total_events || 1)) * 100).toFixed(1)}%`
      ]);
      
      autoTable(doc, {
        startY: 115,
        head: [['Task', 'Count', 'Percentage']],
        body: taskData,
      });
      
      // Recent Events Table
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Recent Events', 20, 20);
      
      const eventsData = (events || []).slice(0, 20).map((event: any) => [
        new Date(event.timestamp).toLocaleString(),
        event.variant,
        event.status,
        `${event.latency_ms?.toFixed(2)}ms`,
        event.task_type
      ]);
      
      autoTable(doc, {
        startY: 25,
        head: [['Time', 'Variant', 'Status', 'Latency', 'Task']],
        body: eventsData,
      });
      
      // Save the PDF
      doc.save(`agent-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generated successfully');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToCSV = () => {
    if (!events || events.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      // Convert events to CSV
      const headers = ['Timestamp', 'Variant', 'Status', 'Latency (ms)', 'Task Type', 'Input Text'];
      const csvRows = [];
      
      csvRows.push(headers.join(','));
      
      events.forEach((event: any) => {
        const row = [
          `"${new Date(event.timestamp).toLocaleString()}"`,
          event.variant,
          event.status,
          event.latency_ms,
          event.task_type,
          `"${(event.input_text || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent-data-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
      
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">
          Generate comprehensive reports and export data
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DocumentTextIcon className="w-5 h-5 mr-2" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
            
            <div className="flex-1"></div>
            
            <Button
              onClick={generatePDF}
              isLoading={isGenerating}
              icon={<DocumentArrowDownIcon className="w-4 h-4" />}
            >
              Generate PDF Report
            </Button>
            
            <Button
              onClick={exportToCSV}
              variant="secondary"
              icon={<ArrowDownTrayIcon className="w-4 h-4" />}
            >
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total Events</div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics?.total_events || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Error Rate</div>
            <div className="text-2xl font-bold text-gray-900">
              {((metrics?.error_rate || 0) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Avg Latency</div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics?.avg_latency_ms?.toFixed(2)}ms
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Variant Split</div>
            <div className="text-2xl font-bold text-gray-900">
              A: {metrics?.variant_distribution?.A || 0} | B: {metrics?.variant_distribution?.B || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Distribution Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ChartBarIcon className="w-5 h-5 mr-2" />
            Task Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(metrics?.task_distribution || {}).map(([task, count]) => (
                <tr key={task}>
                  <td className="px-6 py-4 text-sm text-gray-900 capitalize">{task}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{count}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {((count / (metrics?.total_events || 1)) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Recent Events Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClockIcon className="w-5 h-5 mr-2" />
            Recent Events (Last 100)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-96">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Latency</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(events || []).map((event: any) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        event.variant === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {event.variant}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        event.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {event.latency_ms?.toFixed(2)}ms
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 capitalize">
                      {event.task_type}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};