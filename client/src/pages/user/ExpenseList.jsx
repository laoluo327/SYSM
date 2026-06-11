import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Popconfirm, message, Card, Space } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../api';

const payMethods = [
  { value: '对转账', label: '对转账' },
  { value: '微信转账', label: '微信转账' },
  { value: '银行转账', label: '银行转账' },
  { value: '现金支付', label: '现金支付' },
  { value: '其他', label: '其他' },
];

const categories = [
  { value: '办公用品', label: '办公用品' },
  { value: '餐饮', label: '餐饮' },
  { value: '交通', label: '交通' },
  { value: '水电', label: '水电' },
  { value: '房租', label: '房租' },
  { value: '工资', label: '工资' },
  { value: '通讯', label: '通讯' },
  { value: '招待', label: '招待' },
  { value: '其他', label: '其他' },
];

export default function ExpenseList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [form] = Form.useForm();

  useEffect(() => { loadData(); }, [page, keyword]);

  const loadData = async () => {
    setLoading(true);
    const res = await api.get('/expenses', { params: { page, pageSize: 20, keyword } });
    if (res.code === 0) { setList(res.data.list); setTotal(res.data.total); }
    setLoading(false);
  };

  const handleAdd = () => { setEditId(null); form.resetFields(); setModalOpen(true); };
  const handleEdit = (r) => { setEditId(r.id); form.setFieldsValue(r); setModalOpen(true); };
  const handleDelete = async (id) => {
    const res = await api.delete(`/expenses/${id}`);
    if (res.code === 0) { message.success('删除成功'); loadData(); } else { message.error(res.message); }
  };
  const handleSubmit = async () => {
    const values = await form.validateFields();
    const res = editId ? await api.put(`/expenses/${editId}`, values) : await api.post('/expenses', values);
    if (res.code === 0) { message.success(editId ? '修改成功' : '添加成功'); setModalOpen(false); loadData(); }
    else { message.error(res.message); }
  };

  const columns = [
    { title: '开销名称', dataIndex: 'name', key: 'name' },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '支付方式', dataIndex: 'pay_method', key: 'pay_method' },
    { title: '支付金额', dataIndex: 'amount', key: 'amount', render: v => `¥${v}` },
    { title: '支付人', dataIndex: 'payer', key: 'payer' },
    { title: '加给谁', dataIndex: 'recipient', key: 'recipient' },
    { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
    { title: '记录人', dataIndex: 'created_by', key: 'created_by' },
    { title: '记录时间', dataIndex: 'created_at', key: 'created_at' },
    { title: '操作', key: 'action', render: (_, r) => (
      <Space>
        <Button size="small" type="link" onClick={() => handleEdit(r)}>修改</Button>
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}><Button size="small" type="link" danger>删除</Button></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div className="page-container">
      <div className="page-header"><h2 className="page-title">开销列表</h2></div>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div className="search-bar">
          <Input prefix={<SearchOutlined />} placeholder="搜索名称/分类/支付人/加给谁" value={keyword} onChange={e => setKeyword(e.target.value)} style={{ width: 300 }} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增开销</Button>
        </div>
        <Table columns={columns} dataSource={list} rowKey="id" loading={loading} scroll={{ x: 1000 }}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `共 ${t} 条` }} />
      </Card>
      <Modal title={editId ? '修改开销' : '新增开销'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} destroyOnClose width={520}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="开销名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="分类">
            <Select allowClear options={categories} placeholder="请选择分类" />
          </Form.Item>
          <Form.Item name="pay_method" label="支付方式" rules={[{ required: true }]}>
            <Select options={payMethods} placeholder="请选择" />
          </Form.Item>
          <Form.Item name="amount" label="支付金额" rules={[{ required: true }]}><InputNumber min={0.01} precision={2} style={{ width: '100%' }} /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="payer" label="支付人"><Input /></Form.Item>
            <Form.Item name="recipient" label="加给谁"><Input /></Form.Item>
          </div>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
