import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tag, Table, Spin } from 'antd';
import { ShoppingCartOutlined, ClockCircleOutlined, CheckCircleOutlined, CarOutlined, BankOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const STATUS_MAP = {
  pending: { label: '待备货', color: 'default' },
  preparing: { label: '备货中', color: 'blue' },
  delivering: { label: '送货中', color: 'orange' },
  done: { label: '已完成', color: 'green' },
};

export default function ClientDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const clientName = user.client_name || '';

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchase/my');
      if (res.code === 0) setOrders(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  const pending = orders.filter(o => o.status === 'pending').length;
  const preparing = orders.filter(o => o.status === 'preparing').length;
  const delivering = orders.filter(o => o.status === 'delivering').length;
  const done = orders.filter(o => o.status === 'done').length;

  const recentOrders = orders.slice(0, 8);

  const columns = [
    {
      title: '采购单号', dataIndex: 'order_no', width: 150,
      render: v => <Tag color="orange" style={{ fontFamily: 'monospace', fontSize: 13 }}>{v}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: v => { const s = STATUS_MAP[v] || {}; return <Tag color={s.color}>{s.label || v}</Tag>; },
    },
    { title: '商品数', dataIndex: 'item_count', width: 70, align: 'center' },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', width: 150 },
  ];

  return (
    <Spin spinning={loading}>
      {clientName && (
        <Card
          style={{
            borderRadius: 12,
            marginBottom: 20,
            background: 'linear-gradient(135deg, #fa8c16 0%, #faad14 100%)',
            border: 'none',
          }}
          bodyStyle={{ padding: '20px 24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BankOutlined style={{ fontSize: 28, color: '#FFF' }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#FFF' }}>{clientName}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>欢迎登录，祝您使用愉快</div>
            </div>
          </div>
        </Card>
      )}
      <div style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card hoverable style={{ borderRadius: 10 }}>
              <Statistic title="采购单总数" value={orders.length} valueStyle={{ color: '#47B881' }}
                prefix={<ShoppingCartOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card hoverable style={{ borderRadius: 10 }}>
              <Statistic title="待备货" value={pending} valueStyle={{ color: '#8c8c8c' }}
                prefix={<ClockCircleOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card hoverable style={{ borderRadius: 10 }}>
              <Statistic title="备货中" value={preparing} valueStyle={{ color: '#1890ff' }}
                prefix={<ClockCircleOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card hoverable style={{ borderRadius: 10 }}>
              <Statistic title="送货中" value={delivering} valueStyle={{ color: '#fa8c16' }}
                prefix={<CarOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card hoverable style={{ borderRadius: 10 }}>
              <Statistic title="已完成" value={done} valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />} />
            </Card>
          </Col>
        </Row>
      </div>

      <Card
        title="最近采购单"
        bordered={false}
        style={{ borderRadius: 12 }}
        extra={<a onClick={() => navigate('/client/purchase')}>查看全部</a>}
      >
        <Table
          columns={columns}
          dataSource={recentOrders}
          rowKey="id"
          size="middle"
          pagination={false}
          scroll={{ x: 600 }}
        />
      </Card>
    </Spin>
  );
}
