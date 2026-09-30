import { Link } from 'react-router-dom';
import { ChevronRight, Package, AlertTriangle, Ban, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useTenantTheme } from '@/contexts/TenantThemeContext';

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

  const totalProducts = data?.totalProducts || 320;
  const inStock = data?.inStock || 245;
  const inStockPct = data?.inStockPct ?? 76;
  const lowStock = data?.lowStock || 35;
  const lowStockPct = data?.lowStockPct ?? 11;
  const outOfStock = data?.outOfStock || 15;
  const outOfStockPct = data?.outOfStockPct ?? 5;
  const stockValue = data?.stockValue || 250000;

  const stockToAdd = Math.max(0, totalProducts - (inStock + lowStock + outOfStock)) || 25;
  const stockToAddPct = Math.max(0, 100 - (inStockPct + lowStockPct + outOfStockPct)) || 8;

  const chartData = [
    { name: 'In Stock', value: inStock, color: primaryColor },
    { name: 'Low Stock', value: lowStock, color: '#f59e0b' },
    { name: 'Out of Stock', value: outOfStock, color: '#ef4444' },
    { name: 'Stock to Add', value: stockToAdd, color: '#6366f1' },
  ].filter((d) => d.value > 0);

  return (
    <div className="dash-card">
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
              <span className="dash-legend-dot blue" style={{ backgroundColor: primaryColor }} />
              <span>In Stock</span>
            </div>
            <div>
              <span className="dash-donut-legend-val">{inStock}</span>
              <span className="dash-donut-legend-pct">{inStockPct}%</span>
            </div>
          </div>

          <div className="dash-donut-legend-row">
            <div className="dash-donut-legend-label">
              <span className="dash-legend-dot amber" />
              <span>Low Stock</span>
            </div>
            <div>
              <span className="dash-donut-legend-val">{lowStock}</span>
              <span className="dash-donut-legend-pct">{lowStockPct}%</span>
            </div>
          </div>

          <div className="dash-donut-legend-row">
            <div className="dash-donut-legend-label">
              <span className="dash-legend-dot red" />
              <span>Out of Stock</span>
            </div>
            <div>
              <span className="dash-donut-legend-val">{outOfStock}</span>
              <span className="dash-donut-legend-pct">{outOfStockPct}%</span>
            </div>
          </div>

          <div className="dash-donut-legend-row">
            <div className="dash-donut-legend-label">
              <span className="dash-legend-dot" style={{ backgroundColor: '#6366f1' }} />
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
