import React, { useState, useEffect } from 'react';
import { Table, Card, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import api from '../../api';

export default function WarehouseList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  useEffect(() => { loadData(); }, [page, keyword]);

  const loadData = async () => {
    setLoading(true);
    const res = await api.get('/warehouses', { params: { page, pageSize: 20, keyword } });
    if (res.code === 0) { setList(res.data.list); setTotal(res.data.total); }
    setLoading(false);
  };

  const columns = [
    { title: '出货公司', dataIndex: 'name', key: 'name' },
    { title: '纳税人识别号', dataIndex: 'credit_code', key: 'credit_code', ellipsis: true },
    { title: '对公账户', dataIndex: 'bank_account', key: 'bank_account', ellipsis: true },
    { title: '联系电话', dataIndex: 'phone', key: 'phone' },
    { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true },
    { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
  ];

  return (
    <div className="page-container">
      <div className="page-header"><h2 className="page-title">出货公司</h2></div>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div className="search-bar">
          <Input prefix={<SearchOutlined />} placeholder="搜索出货公司/识别号/电话" value={keyword}
            onChange={e => setKeyword(e.target.value)} style={{ width: 280 }} allowClear />
        </div>
        <Table columns={columns} dataSource={list} rowKey="id" loading={loading} scroll={{ x: 900 }}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `共 ${t} 个出货公司` }} />
      </Card>
    </div>
  );
}