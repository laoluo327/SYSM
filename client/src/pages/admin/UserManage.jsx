import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, message, Card, Space } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../api';

export default function UserManage() {
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
    const res = await api.get('/users', { params: { page, pageSize: 20, keyword } });
    if (res.code === 0) { setList(res.data.list); setTotal(res.data.total); }
    setLoading(false);
  };

  const handleAdd = () => { setEditId(null); form.resetFields(); setModalOpen(true); };
  const handleEdit = (record) => { setEditId(record.id); form.setFieldsValue(record); setModalOpen(true); };
  const handleDelete = async (id) => {
    const res = await api.delete(`/users/${id}`);
    if (res.code === 0) { message.success('删除成功'); loadData(); } else { message.error(res.message); }
  };
  const handleSubmit = async () => {
    const values = await form.validateFields();
    const res = editId ? await api.put(`/users/${editId}`, values) : await api.post('/users', values);
    if (res.code === 0) { message.success(editId ? '修改成功' : '添加成功'); setModalOpen(false); loadData(); }
    else { message.error(res.message); }
  };

  const columns = [
    { title: '账号', dataIndex: 'username', key: 'username' },
    { title: '使用人', dataIndex: 'real_name', key: 'real_name' },
    { title: '电话', dataIndex: 'phone', key: 'phone' },
    { title: '权限', dataIndex: 'role', key: 'role', render: v => <Tag color={v === 'admin' ? 'green' : 'blue'}>{v === 'admin' ? '管理员' : '普通用户'}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
    { title: '操作', key: 'action', render: (_, r) => (
      <Space>
        <Button size="small" type="link" onClick={() => handleEdit(r)}>修改</Button>
        {r.is_default !== 1 && <Popconfirm title="确定删除该账号？" onConfirm={() => handleDelete(r.id)}><Button size="small" type="link" danger>删除</Button></Popconfirm>}
      </Space>
    )},
  ];

  return (
    <div className="page-container">
      <div className="page-header"><h2 className="page-title">账号管理</h2></div>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div className="search-bar">
          <Input prefix={<SearchOutlined />} placeholder="搜索账号/使用人/电话" value={keyword} onChange={e => setKeyword(e.target.value)} style={{ width: 240 }} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加账号</Button>
        </div>
        <Table columns={columns} dataSource={list} rowKey="id" loading={loading}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `共 ${t} 条` }} />
      </Card>
      <Modal title={editId ? '修改账号' : '添加账号'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}><Input /></Form.Item>
          <Form.Item name="password" label={editId ? '新密码(留空不修改)' : '密码'} rules={editId ? [] : [{ required: true, message: '请输入密码' }]}><Input.Password /></Form.Item>
          <Form.Item name="real_name" label="使用人" rules={[{ required: true, message: '请输入使用人' }]}><Input /></Form.Item>
          <Form.Item name="phone" label="电话"><Input /></Form.Item>
          <Form.Item name="role" label="权限" rules={[{ required: true }]} initialValue="user">
            <Select options={[{ value: 'admin', label: '管理员' }, { value: 'user', label: '普通用户' }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
