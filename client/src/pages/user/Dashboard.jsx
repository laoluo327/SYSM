import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spin } from 'antd';
import { ShoppingOutlined, ImportOutlined, ExportOutlined, DollarOutlined } from '@ant-design/icons';
import api from '../../api';

export default function UserDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const res = await api.get('/dashboard/user');
    if (res.code === 0) setData(res.data);
    setLoading(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!data) return null;

  const stats = [
    { label: '我录入的商品', value: data.myProducts, icon: <ShoppingOutlined />, color: '#47B881', bg: '#E8F5EE' },
    { label: '本月入库总额', value: data.myStockIn, icon: <ImportOutlined />, color: '#47B881', bg: '#E8F5EE', prefix: '¥' },
    { label: '本月出库总额', value: data.myStockOut, icon: <ExportOutlined />, color: '#FF9551', bg: '#FFF3EB', prefix: '¥' },
    { label: '本月开销总额', value: data.myExpense, icon: <DollarOutlined />, color: '#B39DDB', bg: '#F3EFF8', prefix: '¥' },
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
          <Col xs={24} sm={12} md={6} key={i}>
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
                  <div className="stat-value" style={{ color: s.color }}>{s.prefix || ''}{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="近期操作" bordered={false} style={{ marginTop: 20, borderRadius: 12 }}>
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
      </Card>
    </div>
  );
}
