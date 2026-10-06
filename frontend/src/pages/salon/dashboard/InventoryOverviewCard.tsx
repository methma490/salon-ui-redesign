import { Link } from 'react-router-dom';
import { ChevronRight, Package, AlertTriangle, Ban, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useTenantTheme } from '@/contexts/TenantThemeContext';
import { getDashboardChartColors } from './chart-colors';

interface InventoryOverviewData {
  totalProducts: number;
  inStock: number;
  inStockPct: number;
  lowStock: number;
  lowStockPct: number;
  outOfStock: number;
  outOfStockPct: number;
  stockValue: number;
}

interface InventoryOverviewCardProps {
  data?: InventoryOverviewData;
}

export function InventoryOverviewCard({ data }: InventoryOverviewCardProps) {
  const theme = useTenantTheme();
  const primaryColor = theme?.palette?.primary ?? '#2563eb';
  const chartColors = getDashboardChartColors(primaryColor);

  const totalProducts = data?.totalProducts || 0;
  const inStock = data?.inStock || 0;
  const inStockPct = data?.inStockPct ?? 0;
  const lowStock = data?.lowStock || 0;
  const lowStockPct = data?.lowStockPct ?? 0;
  const outOfStock = data?.outOfStock || 0;
  const outOfStockPct = data?.outOfStockPct ?? 0;
  const stockValue = data?.stockValue || 0;

  const stockToAdd = Math.max(0, totalProducts - (inStock + lowStock + outOfStock));
  const stockToAddPct = Math.max(0, 100 - (inStockPct + lowStockPct + outOfStockPct));

  const chartData = [
    { name: 'In Stock', value: inStock, color: chartColors[0] },
    { name: 'Low Stock', value: lowStock, color: chartColors[1] },
    { name: 'Out of Stock', value: outOfStock, color: chartColors[2] },
    { name: 'Stock to Add', value: stockToAdd, color: chartColors[3] },
  ].filter((d) => d.value > 0);

  return (
    <div className="dash-card dash-inventory-overview-card">
      <div className="dash-card-header">
        <div className="dash-card-title-group">
          <h3>Inventory Overview</h3>
          <p>Product stock status at this branch.</p>
        </div>
      </div>

      <div className="dash-donut-layout">
        <div className="dash-donut-center-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                innerRadius={48}
                outerRadius={68}
                paddingAngle={3}
                dataKey="value"
                isAnimationActive
                animationBegin={0}
                animationDuration={850}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="dash-donut-center-label">
            <span className="dash-donut-center-val">{totalProducts}</span>
            <span className="dash-donut-center-sub">Total Products</span>
          </div>
        </div>

        <div className="dash-donut-legend-list">
          <div className="dash-donut-legend-row">
            <div className="dash-donut-legend-label">
              <span className="dash-legend-dot" style={{ backgroundColor: chartColors[0] }} />
              <span>In Stock</span>
            </div>
            <div>
              <span className="dash-donut-legend-val">{inStock}</span>
              <span className="dash-donut-legend-pct">{inStockPct}%</span>
            </div>
          </div>

          <div className="dash-donut-legend-row">
            <div className="dash-donut-legend-label">
              <span className="dash-legend-dot" style={{ backgroundColor: chartColors[1] }} />
              <span>Low Stock</span>
            </div>
            <div>
              <span className="dash-donut-legend-val">{lowStock}</span>
              <span className="dash-donut-legend-pct">{lowStockPct}%</span>
            </div>
          </div>

          <div className="dash-donut-legend-row">
            <div className="dash-donut-legend-label">
              <span className="dash-legend-dot" style={{ backgroundColor: chartColors[2] }} />
              <span>Out of Stock</span>
            </div>
            <div>
              <span className="dash-donut-legend-val">{outOfStock}</span>
              <span className="dash-donut-legend-pct">{outOfStockPct}%</span>
            </div>
          </div>

          <div className="dash-donut-legend-row">
            <div className="dash-donut-legend-label">
              <span className="dash-legend-dot" style={{ backgroundColor: chartColors[3] }} />
              <span>Stock to Add</span>
            </div>
            <div>
              <span className="dash-donut-legend-val">{stockToAdd}</span>
              <span className="dash-donut-legend-pct">{stockToAddPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Bottom summary stat tiles */}
      <div className="dash-inv-tiles-grid">
        <div className="dash-inv-tile">
          <div className="dash-inv-tile-icon bg-blue-50 text-blue-600">
            <Package className="h-3.5 w-3.5" />
          </div>
          <span className="dash-inv-tile-val">{inStock}</span>
          <span className="dash-inv-tile-lbl">In Stock</span>
        </div>

        <div className="dash-inv-tile">
          <div className="dash-inv-tile-icon bg-amber-50 text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
          <span className="dash-inv-tile-val">{lowStock}</span>
          <span className="dash-inv-tile-lbl">Low Stock</span>
        </div>

        <div className="dash-inv-tile">
          <div className="dash-inv-tile-icon bg-rose-50 text-rose-600">
            <Ban className="h-3.5 w-3.5" />
          </div>
          <span className="dash-inv-tile-val">{outOfStock}</span>
          <span className="dash-inv-tile-lbl">Out of Stock</span>
        </div>

        <div className="dash-inv-tile">
          <div className="dash-inv-tile-icon bg-indigo-50 text-indigo-600">
            <Layers className="h-3.5 w-3.5" />
          </div>
          <span className="dash-inv-tile-val">
            {stockValue >= 1000 ? `${Math.round(stockValue / 1000)}k` : stockValue}
          </span>
          <span className="dash-inv-tile-lbl">Stock Value</span>
        </div>
      </div>

      <Link to="/salon/products" className="dash-card-footer-link">
        <span>View Inventory</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
