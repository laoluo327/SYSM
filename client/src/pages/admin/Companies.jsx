import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Popconfirm, message, Card, Space } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../api';

export default function Companies() {
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
    const res = await api.get('/companies', { params: { page, pageSize: 20, keyword } });
    if (res.code === 0) { setList(res.data.list); setTotal(res.data.total); }
    setLoading(false);
  };

  const handleAdd = () => { setEditId(null); form.resetFields(); setModalOpen(true); };
  const handleEdit = (r) => { setEditId(r.id); form.setFieldsValue(r); setModalOpen(true); };
  const handleDelete = async (id) => {
    const res = await api.delete(`/companies/${id}`);
    if (res.code === 0) { message.success('删除成功'); loadData(); } else { message.error(res.message); }
  };
  const handleSubmit = async () => {
    const values = await form.validateFields();
    const res = editId ? await api.put(`/companies/${editId}`, values) : await api.post('/companies', values);
    if (res.code === 0) { message.success(editId ? '修改成功' : '添加成功'); setModalOpen(false); loadData(); }
    else { message.error(res.message); }
  };

  const columns = [
    { title: '公司名称', dataIndex: 'name', key: 'name' },
    { title: '统一社会信用代码', dataIndex: 'credit_code', key: 'credit_code' },
    { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true },
    { title: '联系人', dataIndex: 'contact', key: 'contact' },
    { title: '电话', dataIndex: 'phone', key: 'phone' },
    { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
    { title: '操作', key: 'action', render: (_, r) => (
      <Space>
        <Button size="small" type="link" onClick={() => handleEdit(r)}>修改</Button>
        <Popconfirm title="确定删除该公司？" onConfirm={() => handleDelete(r.id)}><Button size="small" type="link" danger>删除</Button></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div className="page-container">
      <div className="page-header"><h2 className="page-title">商品公司</h2></div>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div className="search-bar">
          <Input prefix={<SearchOutlined />} placeholder="搜索公司名称/联系人/电话" value={keyword} onChange={e => setKeyword(e.target.value)} style={{ width: 280 }} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加公司</Button>
        </div>
        <Table columns={columns} dataSource={list} rowKey="id" loading={loading} scroll={{ x: 800 }}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `共 ${t} 条` }} />
      </Card>
      <Modal title={editId ? '修改公司' : '添加公司'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} destroyOnClose width={560}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="公司名称" rules={[{ required: true, message: '请输入公司名称' }]}><Input /></Form.Item>
          <Form.Item name="credit_code" label="统一社会信用代码"><Input /></Form.Item>
          <Form.Item name="address" label="地址"><Input /></Form.Item>
          <Form.Item name="contact" label="联系人"><Input /></Form.Item>
          <Form.Item name="phone" label="电话"><Input /></Form.Item>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
