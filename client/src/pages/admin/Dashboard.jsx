import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin } from 'antd';
import {
  ShoppingOutlined, DollarOutlined, ImportOutlined, ExportOutlined, FundOutlined
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const res = await api.get('/dashboard/admin');
    if (res.code === 0) setData(res.data);
    setLoading(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!data) return null;

  const stats = [
    { label: '商品总数', value: data.productCount, icon: <ShoppingOutlined />, color: '#47B881', bg: '#E8F5EE', prefix: '' },
    { label: '库存总金额', value: data.stockValue, icon: <FundOutlined />, color: '#FF9551', bg: '#FFF3EB', prefix: '¥' },
    { label: '本月入库额', value: data.monthStockIn, icon: <ImportOutlined />, color: '#47B881', bg: '#E8F5EE', prefix: '¥' },
    { label: '本月入库量', value: data.monthStockInQty, icon: <ImportOutlined />, color: '#47B881', bg: '#E8F5EE', prefix: '' },
    { label: '本月出库额', value: data.monthStockOut, icon: <ExportOutlined />, color: '#B39DDB', bg: '#F3EFF8', prefix: '¥' },
    { label: '本月出库量', value: data.monthStockOutQty, icon: <ExportOutlined />, color: '#B39DDB', bg: '#F3EFF8', prefix: '' },
    { label: '本月开销', value: data.monthExpense, icon: <DollarOutlined />, color: '#FF9551', bg: '#FFF3EB', prefix: '¥' },
  ];

  const quickEntries = [
    { label: '商品管理', icon: <ShoppingOutlined style={{ color: '#47B881' }} />, path: '/admin/products' },
    { label: '入库操作', icon: <ImportOutlined style={{ color: '#47B881' }} />, path: '/admin/stock-in' },
    { label: '出库操作', icon: <ExportOutlined style={{ color: '#FF9551' }} />, path: '/admin/stock-out' },
    { label: '日常开销', icon: <DollarOutlined style={{ color: '#B39DDB' }} />, path: '/admin/expenses' },
  ];

  const tagClass = (type) => {
    if (type === '入库') return 'tag tag-in';
    if (type === '出库') return 'tag tag-out';
    return 'tag tag-expense';
  };

  return (
    <div className="page-container">
      <Row gutter={[16, 16]}>
        {stats.map((s, i) => (
          <Col xs={24} sm={12} md={8} lg={4} xl={4} key={i}>
            <Card className="stat-card" bordered={false}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: s.color,
                }}>
                  {s.icon}
                </div>
                <div>
                  <div className="stat-value" style={{ color: s.color }}>{s.prefix}{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="快捷入口" style={{ marginTop: 20, borderRadius: 12 }} bordered={false}>
        <div className="quick-entry">
          {quickEntries.map((item, i) => (
            <div key={i} className="quick-entry-item" onClick={() => navigate(item.path)}>
              <span className="icon">{item.icon}</span>
              <span className="label">{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Row gutter={16} style={{ marginTop: 20 }}>
        <Col xs={24} lg={14}>
          <Card title="近7天入库/出库趋势" bordered={false} style={{ borderRadius: 12 }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="stockIn" name="入库" stroke="#47B881" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="stockOut" name="出库" stroke="#FF9551" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="近期操作" bordered={false} style={{ borderRadius: 12 }}>
            <div style={{ maxHeight: 280, overflow: 'auto' }}>
              {data.recentOps.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无操作记录</div>
              ) : (
                data.recentOps.map((item, i) => (
                  <div key={i} className="bubble-item">
                    <span className={tagClass(item.type)}>{item.type}</span>
                    <span className="content">{item.content}</span>
                    <span className="time">{item.time}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
