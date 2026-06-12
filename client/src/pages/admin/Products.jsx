import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Popconfirm, message, Card, Space, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, ShoppingCartOutlined, UserOutlined, ClockCircleOutlined, FileTextOutlined, BankOutlined } from '@ant-design/icons';
import api from '../../api';

export default function Products() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [editId, setEditId] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [form] = Form.useForm();

  useEffect(() => { loadData(); }, [page, keyword]);
  const loadData = async () => {
    setLoading(true);
    const res = await api.get('/products', { params: { page, pageSize: 20, keyword } });
    if (res.code === 0) { setList(res.data.list); setTotal(res.data.total); }
    setLoading(false);
  };

  const handleAdd = () => { setEditId(null); form.resetFields(); setModalOpen(true); };
  const handleEdit = (r) => { setEditId(r.id); form.setFieldsValue(r); setModalOpen(true); };
  const handleDelete = async (id) => {
    const res = await api.delete(`/products/${id}`);
    if (res.code === 0) { message.success('删除成功'); loadData(); } else { message.error(res.message); }
  };
  const handleSubmit = async () => {
    const values = await form.validateFields();
    const res = editId ? await api.put(`/products/${editId}`, values) : await api.post('/products', values);
    if (res.code === 0) { message.success(editId ? '修改成功' : '添加成功'); setModalOpen(false); loadData(); }
    else { message.error(res.message); }
  };

  const showDetail = async (record) => {
    setDetailRecord(record);
    setWarehouseStock([]);
    setDetailOpen(true);
    const res = await api.get(`/warehouses/stock/${record.id}`);
    if (res.code === 0) setWarehouseStock(res.data);
  };

  const columns = [
    { title: '商品名称', dataIndex: 'name', key: 'name' },
    { title: '规格', dataIndex: 'spec', key: 'spec' },
    { title: '单位', dataIndex: 'unit', key: 'unit' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '单价', dataIndex: 'price', key: 'price', render: v => `¥${v}` },
    { title: '详情', key: 'action', width: 160, render: (_, r) => (
      <Space>
        <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => showDetail(r)}>详情</Button>
        <Button size="small" type="link" onClick={() => handleEdit(r)}>修改</Button>
        <Popconfirm title="确定删除该商品？" onConfirm={() => handleDelete(r.id)}><Button size="small" type="link" danger>删除</Button></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div className="page-container">
      <div className="page-header"><h2 className="page-title">商品列表</h2></div>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div className="search-bar">
          <Input prefix={<SearchOutlined />} placeholder="搜索商品名称/规格/记录人" value={keyword} onChange={e => setKeyword(e.target.value)} style={{ width: 280 }} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加商品</Button>
        </div>
        <Table columns={columns} dataSource={list} rowKey="id" loading={loading} scroll={{ x: 800 }}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `共 ${t} 条` }} />
      </Card>
      <Modal title={editId ? '修改商品' : '添加商品'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} destroyOnClose width={560}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}><Input /></Form.Item>
          <Space size="large">
            <Form.Item name="spec" label="规格"><Input style={{ width: 150 }} /></Form.Item>
            <Form.Item name="unit" label="单位"><Input style={{ width: 100 }} /></Form.Item>
            <Form.Item name="quantity" label="初始数量" initialValue={0}><InputNumber min={0} /></Form.Item>
            <Form.Item name="price" label="单价" initialValue={0}><InputNumber min={0} precision={2} /></Form.Item>
          </Space>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
      <Modal title="商品详情" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={640}>
        {detailRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section-title"><ShoppingCartOutlined /> 基础信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                <div><span style={{ color: '#999', fontSize: 13 }}>商品名称</span><div style={{ fontWeight: 500 }}>{detailRecord.name}</div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}>规格</span><div style={{ fontWeight: 500 }}>{detailRecord.spec || '-'}</div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}>单位</span><div style={{ fontWeight: 500 }}>{detailRecord.unit}</div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}>备注</span><div style={{ fontWeight: 500 }}>{detailRecord.remark || '-'}</div></div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" style={{ textAlign: 'center', background: '#e6f7ff', border: '1px solid #91d5ff' }}>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>当前库存</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff' }}>{detailRecord.quantity}</div>
              </Card>
              <Card size="small" style={{ textAlign: 'center', background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>单价</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>¥{detailRecord.price}</div>
              </Card>
            </div>
            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section-title"><FileTextOutlined /> 记录信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                <div><span style={{ color: '#999', fontSize: 13 }}><UserOutlined style={{ marginRight: 4 }} />记录人</span><div style={{ fontWeight: 500 }}>{detailRecord.created_by || '-'}</div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}><ClockCircleOutlined style={{ marginRight: 4 }} />记录时间</span><div style={{ fontWeight: 500 }}>{detailRecord.created_at}</div></div>
              </div>
            </div>
            {warehouseStock.length > 0 && (
              <div className="form-section" style={{ marginBottom: 0 }}>
                <div className="form-section-title"><BankOutlined /> 库房库存分布</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {warehouseStock.map(w => (
                    <Card key={w.id} size="small" style={{ textAlign: 'center', background: w.quantity > 0 ? '#f0f5ff' : '#fafafa', border: `1px solid ${w.quantity > 0 ? '#adc6ff' : '#d9d9d9'}` }}>
                      <div style={{ color: '#666', fontSize: 12, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                      <Tag color={w.quantity > 0 ? 'geekblue' : 'default'} style={{ fontSize: 14, padding: '2px 8px' }}>{w.quantity}</Tag>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
