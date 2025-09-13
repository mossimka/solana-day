"use client";
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { liquidityApi } from '../api/liquidityService';
import type { ChartDataPoint, ChartTimeFrame } from '../types';

// Dynamically import to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ChartPanelProps {
  poolId: string;
  symbol?: string;
  className?: string;
}

interface CandlestickData {
  x: number;
  y: [number, number, number, number]; // [open, high, low, close]
}

interface VolumeData {
  x: number;
  y: number;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({ 
  poolId,
  symbol = 'SOL/USDC',
  className = ''
}) => {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<ChartTimeFrame>('1H');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch chart data from backend
  const fetchChartData = useCallback(async (timeframe: ChartTimeFrame) => {
    if (!poolId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Calculate time range based on timeframe
      const now = Date.now();
      const timeRanges: Record<ChartTimeFrame, number> = {
        '15M': 24 * 60 * 60 * 1000, // 24 hours
        '1H': 7 * 24 * 60 * 60 * 1000, // 7 days  
        '4H': 30 * 24 * 60 * 60 * 1000, // 30 days
        '1D': 365 * 24 * 60 * 60 * 1000, // 365 days
      };
      
      const from = Math.floor((now - timeRanges[timeframe]) / 1000);
      const to = Math.floor(now / 1000);
      
      const response = await liquidityApi.getChartData(poolId, timeframe, from, to);
      
      if (response.data && Array.isArray(response.data)) {
        setChartData(response.data);
      } else {
        setError('Invalid chart data format');
      }
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
      setError('Failed to load chart data');
      // Fallback to mock data for development
      setChartData(generateMockData(timeframe));
    } finally {
      setLoading(false);
    }
  }, [poolId]);

  // Generate fallback mock data (similar to your original implementation)
  const generateMockData = (timeframe: ChartTimeFrame): ChartDataPoint[] => {
    const now = Date.now();
    const intervals: Record<ChartTimeFrame, number> = {
      '15M': 15 * 60 * 1000,
      '1H': 60 * 60 * 1000,
      '4H': 4 * 60 * 60 * 1000,
      '1D': 24 * 60 * 60 * 1000,
    };

    const interval = intervals[timeframe];
    const dataPoints = timeframe === '15M' ? 96 : timeframe === '1H' ? 24 : timeframe === '4H' ? 6 : 30;

    const mockData: ChartDataPoint[] = [];
    const basePrice = 220;
    const targetPrice = 240;
    const priceIncrement = (targetPrice - basePrice) / dataPoints;

    for (let i = 0; i < dataPoints; i++) {
      const timestamp = Math.floor((now - (dataPoints - i) * interval) / 1000);
      const open = basePrice + i * priceIncrement + (Math.random() - 0.5) * 2;
      const volatility = 3 + Math.random() * 2;
      const high = open + Math.random() * volatility;
      const low = open - Math.random() * volatility;
      const close = open + (Math.random() - 0.45) * volatility + priceIncrement * 0.8;

      mockData.push({
        time: timestamp,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.floor(50000 + Math.random() * 200000),
      });
    }

    return mockData;
  };

  // Fetch data when timeframe or poolId changes
  useEffect(() => {
    fetchChartData(selectedTimeFrame);
  }, [selectedTimeFrame, fetchChartData]);

  // Transform backend data to ApexCharts format
  const apexChartData = useMemo(() => {
    if (!chartData.length) return { candlestick: [], volume: [] };

    const candlestick: CandlestickData[] = chartData.map(point => ({
      x: point.time * 1000, // Convert to milliseconds
      y: [point.open, point.high, point.low, point.close],
    }));

    const volume: VolumeData[] = chartData.map(point => ({
      x: point.time * 1000, // Convert to milliseconds  
      y: point.volume,
    }));

    return { candlestick, volume };
  }, [chartData]);

  const chartOptions = useMemo(() => ({
    chart: {
      type: 'candlestick' as const,
      height: 400,
      background: 'transparent',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      foreColor: '#a0a0a0',
    },
    title: {
      text: symbol,
      align: 'left' as const,
      style: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#ffffff',
      },
    },
    xaxis: {
      type: 'datetime' as const,
      axisBorder: {
        show: true,
        color: '#333',
      },
      axisTicks: {
        show: true,
        color: '#333',
      },
      labels: {
        style: {
          colors: '#a0a0a0',
        },
      },
    },
    yaxis: {
      tooltip: {
        enabled: true,
      },
      labels: {
        style: {
          colors: '#a0a0a0',
        },
        formatter: (value: number) => `$${value.toFixed(2)}`,
      },
    },
    grid: {
      borderColor: '#333',
      strokeDashArray: 3,
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#00b746',
          downward: '#ef403c',
        },
        wick: {
          useFillColor: true,
        },
      },
    },
    tooltip: {
      theme: 'dark',
      custom: ({ seriesIndex, dataPointIndex, w }: any) => {
        const data = w.globals.seriesCandleO[seriesIndex][dataPointIndex];
        const o = w.globals.seriesCandleO[seriesIndex][dataPointIndex];
        const h = w.globals.seriesCandleH[seriesIndex][dataPointIndex];
        const l = w.globals.seriesCandleL[seriesIndex][dataPointIndex];
        const c = w.globals.seriesCandleC[seriesIndex][dataPointIndex];
        
        return `
          <div style="padding: 12px; background: #1a1a1a; border-radius: 8px; border: 1px solid #333;">
            <div style="font-weight: bold; margin-bottom: 8px; color: #ffffff;">${symbol}</div>
            <div style="color: #a0a0a0; font-size: 12px; margin-bottom: 4px;">
              <span>O:</span> <span style="color: #ffffff;">$${o?.toFixed(2)}</span>
            </div>
            <div style="color: #a0a0a0; font-size: 12px; margin-bottom: 4px;">
              <span>H:</span> <span style="color: #00b746;">$${h?.toFixed(2)}</span>
            </div>
            <div style="color: #a0a0a0; font-size: 12px; margin-bottom: 4px;">
              <span>L:</span> <span style="color: #ef403c;">$${l?.toFixed(2)}</span>
            </div>
            <div style="color: #a0a0a0; font-size: 12px;">
              <span>C:</span> <span style="color: #ffffff;">$${c?.toFixed(2)}</span>
            </div>
          </div>
        `;
      },
    },
    theme: {
      mode: 'dark' as const,
    },
  }), [symbol]);

  const volumeChartOptions = useMemo(() => ({
    chart: {
      type: 'bar' as const,
      height: 120,
      background: 'transparent',
      toolbar: { show: false },
      foreColor: '#a0a0a0',
    },
    plotOptions: {
      bar: {
        colors: {
          ranges: [{
            from: 0,
            to: Number.MAX_VALUE,
            color: '#4a5568'
          }]
        }
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      type: 'datetime' as const,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: '#a0a0a0' },
        formatter: (value: number) => {
          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
          if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
          return value.toFixed(0);
        },
      },
    },
    grid: {
      borderColor: '#333',
      strokeDashArray: 3,
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (value: number) => value.toLocaleString(),
      },
    },
  }), []);

  const timeFrames: ChartTimeFrame[] = ['15M', '1H', '4H', '1D'];

  if (loading) {
    return (
      <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-400">Loading chart data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header with timeframe buttons */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{symbol}</h3>
        <div className="flex space-x-2">
          {timeFrames.map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeFrame(timeframe)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                selectedTimeFrame === timeframe
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-800 rounded-lg text-red-200 text-sm">
          {error} (Showing fallback data)
        </div>
      )}

      {/* Chart */}
      <div className="space-y-4">
        <Chart
          options={chartOptions}
          series={[{
            name: 'Price',
            data: apexChartData.candlestick,
          }]}
          type="candlestick"
          height={400}
        />
        
        {/* Volume Chart */}
        <Chart
          options={volumeChartOptions}
          series={[{
            name: 'Volume',
            data: apexChartData.volume,
          }]}
          type="bar"
          height={120}
        />
      </div>
    </div>
  );
};