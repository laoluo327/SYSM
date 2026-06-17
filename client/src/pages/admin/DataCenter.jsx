import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Upload, Modal, List, message, Popconfirm, Divider, Space, DatePicker } from 'antd';
import {
  DownloadOutlined, CloudUploadOutlined, CloudDownloadOutlined,
  ReloadOutlined, DatabaseOutlined, UploadOutlined, DeleteOutlined,
  ImportOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api';

const { RangePicker } = DatePicker;

export default function DataCenter() {
  const [backups, setBackups] = useState([]);
  const [dateRange, setDateRange] = useState(null); // [startDate, endDate]

  useEffect(() => { loadBackups(); }, []);

  const loadBackups = async () => {
    const res = await api.get('/data-center/backups');
    if (res.code === 0) setBackups(res.data);
  };

  const exportData = async (type) => {
    const token = localStorage.getItem('token');
    try {
      // 构建 URL 参数
      const params = new URLSearchParams();
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
        params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      }
      
      const apiUrl = `/api/data-center/export/${type}?${params.toString()}`;
      
      const resp = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!resp.ok) {
        message.error('导出失败：' + resp.statusText);
        return;
      }
      
      const blob = await resp.blob();
      
      // 检查返回的是否是错误信息（JSON）
      if (blob.type.includes('application/json')) {
        const text = await blob.text();
        const error = JSON.parse(text);
        message.error('导出失败：' + (error.message || '未知错误'));
        return;
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // 根据类型设置中文文件名
      const fileNames = {
        'products': '商品明细.xlsx',
        'stock-in': '入库明细.xlsx',
        'stock-out': '出库明细.xlsx',
        'expenses': '开销明细.xlsx'
      };
      const baseName = fileNames[type] || `${type}.xlsx`;
      // 如果有时间范围，添加到文件名中
      const fileName = dateRange && dateRange[0] && dateRange[1]
        ? `${baseName.replace('.xlsx', '')}_${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}.xlsx`
        : baseName;
      a.download = fileName;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (e) {
      console.error('导出错误:', e);
      message.error('导出失败：' + e.message);
    }
  };

  const handleBackup = async () => {
    const res = await api.post('/data-center/backup');
    if (res.code === 0) { message.success('备份成功'); loadBackups(); } else { message.error(res.message); }
  };

  const handleRestore = async (filename) => {
    const formData = new FormData();
    formData.append('file', new Blob([]), filename);
    // 直接通过备份文件名恢复
    const res = await api.post(`/data-center/restore?filename=${filename}`);
    if (res.code === 0) { message.success('恢复成功'); } else { message.error(res.message); }
  };

  const handleReset = async () => {
    const res = await api.post('/data-center/reset');
    if (res.code === 0) { message.success('数据库重置成功，默认管理员密码已恢复为admin'); } else { message.error(res.message); }
  };

  const exportItems = [
    { key: 'products', label: '导出商品明细', icon: <DownloadOutlined /> },
    { key: 'stock-in', label: '导出入库明细', icon: <DownloadOutlined /> },
    { key: 'stock-out', label: '导出出库明细', icon: <DownloadOutlined /> },
    { key: 'expenses', label: '导出开销明细', icon: <DownloadOutlined /> },
  ];

  return (
    <div className="page-container">
      <div className="page-header"><h2 className="page-title">数据中心</h2></div>

      <Card title="数据导出" bordered={false} style={{ borderRadius: 12, marginBottom: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <span>时间范围：</span>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={['开始日期', '结束日期']}
              style={{ width: 280 }}
            />
            {dateRange && (
              <Button size="small" onClick={() => setDateRange(null)}>清空</Button>
            )}
          </Space>
          <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
            提示：选择时间范围后，将只导出该时间段内的数据。不选则导出全部数据。
          </div>
        </div>
        <Row gutter={[16, 16]}>
          {exportItems.map(item => (
            <Col key={item.key}>
              <Button icon={item.icon} onClick={() => exportData(item.key)}>{item.label}</Button>
            </Col>
          ))}
        </Row>
      </Card>

      <Card title="商品数据导入" bordered={false} style={{ borderRadius: 12, marginBottom: 20 }}>
        <div style={{ marginBottom: 16, color: '#999' }}>
          请先下载模板填写数据，再上传 Excel 文件导入。表头需包含：商品名称、规格、单位、数量、单价、备注。记录人默认为当前管理员，时间为系统当前时间。
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={async () => {
            const token = localStorage.getItem('token');
            try {
              const resp = await fetch('/api/data-center/import-template/products', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const blob = await resp.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = '商品导入模板.xlsx';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            } catch (e) {
              message.error('下载失败');
            }
          }}>下载导入模板</Button>
          <Upload
            accept=".xlsx,.xls"
            showUploadList={false}
            customRequest={async ({ file }) => {
              Modal.confirm({
                title: '确认导入',
                content: `确定要将「${file.name}」中的商品数据导入系统吗？`,
                okText: '确认导入',
                cancelText: '取消',
                onOk: async () => {
                  const formData = new FormData();
                  formData.append('file', file);
                  try {
                    const res = await api.post('/data-center/import-products', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    if (res.code === 0) {
                      Modal.success({ title: '导入完成', content: res.message });
                    } else {
                      message.error(res.message);
                    }
                  } catch (e) { message.error('导入失败'); }
                }
              });
            }}
          >
            <Button type="primary" icon={<ImportOutlined />}>选择Excel文件导入</Button>
          </Upload>
        </Space>
      </Card>

      <Card title="数据库管理" bordered={false} style={{ borderRadius: 12, marginBottom: 20 }}>
        <Row gutter={16}>
          <Col>
            <Button type="primary" icon={<CloudUploadOutlined />} onClick={handleBackup}>数据库备份</Button>
          </Col>
          <Col>
            <Popconfirm title="确定要重置数据库吗？所有数据将被清除（默认管理员账号保留）" onConfirm={handleReset} okText="确定重置" cancelText="取消">
              <Button danger icon={<ReloadOutlined />}>数据库重置</Button>
            </Popconfirm>
          </Col>
        </Row>
      </Card>

      <Card title="数据库恢复" bordered={false} style={{ borderRadius: 12 }}>
        <div style={{ marginBottom: 16, color: '#999' }}>
          选择备份文件进行恢复，恢复后当前数据将被覆盖。
        </div>
        <Upload
          accept=".db"
          showUploadList={false}
          customRequest={async ({ file }) => {
            const formData = new FormData();
            formData.append('file', file);
            try {
              const res = await api.post('/data-center/restore', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
              if (res.code === 0) { message.success('恢复成功'); loadBackups(); }
              else { message.error(res.message); }
            } catch (e) { message.error('恢复失败'); }
          }}
        >
          <Button icon={<UploadOutlined />}>上传备份文件恢复</Button>
        </Upload>
        {backups.length > 0 && (
          <>
            <Divider />
            <div style={{ marginBottom: 8, fontWeight: 500 }}>已有备份文件：</div>
            <List
              size="small"
              dataSource={backups}
              renderItem={item => (
                <List.Item actions={[
                  <Popconfirm key="restore" title={`确定使用 ${item} 恢复数据库？`} onConfirm={async () => {
                    try {
                      const res = await api.post(`/data-center/restore?filename=${item}`);
                      if (res.code === 0) { message.success('恢复成功'); } else { message.error(res.message); }
                    } catch (e) { message.error('恢复失败'); }
                  }}>
                    <Button size="small" type="link" icon={<CloudDownloadOutlined />}>恢复</Button>
                  </Popconfirm>
                ]}>
                  <DatabaseOutlined /> {item}
                </List.Item>
              )}
            />
          </>
        )}
      </Card>
    </div>
  );
}
