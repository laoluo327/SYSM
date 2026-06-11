import React from 'react';
import { Card, Button, Row, Col, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

export default function DataCenter() {
  const exportData = async (type) => {
    const token = localStorage.getItem('token');
    try {
      const resp = await fetch(`/api/data-center/export/${type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) {
        message.error('导出失败，可能权限不足');
        return;
      }
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (e) {
      message.error('导出失败');
    }
  };

  const exportItems = [
    { key: 'products', label: '导出商品明细' },
    { key: 'stock-in', label: '导出入库明细' },
    { key: 'stock-out', label: '导出出库明细' },
    { key: 'expenses', label: '导出开销明细' },
  ];

  return (
    <div className="page-container">
      <div className="page-header"><h2 className="page-title">数据中心</h2></div>
      <Card title="数据导出（Excel）" bordered={false} style={{ borderRadius: 12 }}>
        <Row gutter={[16, 16]}>
          {exportItems.map(item => (
            <Col key={item.key}>
              <Button icon={<DownloadOutlined />} onClick={() => exportData(item.key)}>{item.label}</Button>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
