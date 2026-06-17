import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Popconfirm, message, Card, Space } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../api';

export default function Warehouses() {
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
    const res = await api.get('/warehouses', { params: { page, pageSize: 20, keyword } });
    if (res.code === 0) { setList(res.data.list); setTotal(res.data.total); }
    setLoading(false);
  };

  const handleAdd = () => { setEditId(null); form.resetFields(); setModalOpen(true); };
  const handleEdit = (r) => { setEditId(r.id); form.setFieldsValue(r); setModalOpen(true); };
  const handleDelete = async (id) => {
    const res = await api.delete(`/warehouses/${id}`);
    if (res.code === 0) { message.success('删除成功'); loadData(); } else { message.error(res.message); }
  };
  const handleSubmit = async () => {
    const values = await form.validateFields();
    const res = editId ? await api.put(`/warehouses/${editId}`, values) : await api.post('/warehouses', values);
    if (res.code === 0) { message.success(editId ? '修改成功' : '添加成功'); setModalOpen(false); loadData(); }
    else { message.error(res.message); }
  };

  const columns = [
    { title: '出货公司', dataIndex: 'name', key: 'name', width: 160 },
    { title: '纳税人识别号', dataIndex: 'credit_code', key: 'credit_code', width: 180, ellipsis: true },
    { title: '对公账户', dataIndex: 'bank_account', key: 'bank_account', width: 160, ellipsis: true },
    { title: '联系电话', dataIndex: 'phone', key: 'phone', width: 130 },
    { title: '地址', dataIndex: 'address', key: 'address', ellipsis: true },
    { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 155 },
    { title: '操作', key: 'action', width: 120, render: (_, r) => (
      <Space>
        <Button size="small" type="link" onClick={() => handleEdit(r)}>修改</Button>
        <Popconfirm title="确定删除该出货公司？" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" type="link" danger>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <div className="page-container">
      <div className="page-header"><h2 className="page-title">出货公司</h2></div>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div className="search-bar">
          <Input prefix={<SearchOutlined />} placeholder="搜索出货公司/识别号/电话" value={keyword}
            onChange={e => setKeyword(e.target.value)} style={{ width: 280 }} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加出货公司</Button>
        </div>
        <Table columns={columns} dataSource={list} rowKey="id" loading={loading} scroll={{ x: 1000 }}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `共 ${t} 个出货公司` }} />
      </Card>
      <Modal title={editId ? '修改出货公司' : '添加出货公司'} open={modalOpen} onOk={handleSubmit}
        onCancel={() => setModalOpen(false)} destroyOnClose width={520}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="出货公司" rules={[{ required: true, message: '请输入出货公司' }]}>
            <Input placeholder="请输入出货公司名称" />
          </Form.Item>
          <Form.Item name="credit_code" label="纳税人识别号">
            <Input placeholder="请输入纳税人识别号（可选）" />
          </Form.Item>
          <Form.Item name="bank_account" label="对公账户">
            <Input placeholder="请输入对公账户（可选）" />
          </Form.Item>
          <Form.Item name="phone" label="联系电话">
            <Input placeholder="请输入联系电话（可选）" />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input placeholder="请输入地址（可选）" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}