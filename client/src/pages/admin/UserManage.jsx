import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Popconfirm, message, Card, Space } from 'antd';
import { PlusOutlined, SearchOutlined, UndoOutlined } from '@ant-design/icons';
import api from '../../api';

const { Option } = Select;

export default function UserManage() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedRole, setSelectedRole] = useState('user');
  const [form] = Form.useForm();

  useEffect(() => { loadData(); loadClients(); }, [page, keyword]);

  const loadData = async () => {
    setLoading(true);
    const res = await api.get('/users', { params: { page, pageSize: 20, keyword } });
    if (res.code === 0) { setList(res.data.list); setTotal(res.data.total); }
    setLoading(false);
  };

  const loadClients = async () => {
    const res = await api.get('/clients/all');
    if (res.code === 0) setClients(res.data);
  };

  const handleAdd = () => {
    setEditId(null);
    form.resetFields();
    setSelectedRole('user');
    setModalOpen(true);
  };

  const handleEdit = (record) => {
    setEditId(record.id);
    setSelectedRole(record.role);
    form.setFieldsValue({
      ...record,
      client_id: record.client_id || undefined,
      password: undefined,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    const res = await api.delete(`/users/${id}`);
    if (res.code === 0) { message.success('删除成功'); loadData(); } else { message.error(res.message); }
  };

  const handleResetPwd = async (id, realName) => {
    const res = await api.post(`/users/${id}/reset-password`, { new_password: '123456' });
    if (res.code === 0) {
      message.success(`${realName} 的密码已重置为 123456`);
    } else {
      message.error(res.message);
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    // 客户角色必须选择客户单位
    if (values.role === 'client' && !values.client_id) {
      return message.error('客户权限必须指定客户单位');
    }
    // 非客户角色清除 client_id
    if (values.role !== 'client') {
      values.client_id = null;
    }
    const res = editId ? await api.put(`/users/${editId}`, values) : await api.post('/users', values);
    if (res.code === 0) { message.success(editId ? '修改成功' : '添加成功'); setModalOpen(false); loadData(); }
    else { message.error(res.message); }
  };

  const roleTagMap = {
    admin: { color: 'green', label: '管理员' },
    user: { color: 'blue', label: '普通用户' },
    client: { color: 'orange', label: '客户' },
  };

  const columns = [
    { title: '账号', dataIndex: 'username', key: 'username' },
    { title: '使用人', dataIndex: 'real_name', key: 'real_name' },
    { title: '电话', dataIndex: 'phone', key: 'phone' },
    {
      title: '权限', dataIndex: 'role', key: 'role',
      render: v => {
        const t = roleTagMap[v] || { color: 'default', label: v };
        return <Tag color={t.color}>{t.label}</Tag>;
      }
    },
    {
      title: '绑定客户', dataIndex: 'client_name', key: 'client_name',
      render: v => v || '-',
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at' },
    {
      title: '操作', key: 'action', render: (_, r) => (
        <Space>
          <Button size="small" type="link" onClick={() => handleEdit(r)}>修改</Button>
          <Popconfirm
            title={`确定将「${r.real_name}」的密码重置为 123456？`}
            onConfirm={() => handleResetPwd(r.id, r.real_name)}
            okText="确认"
            cancelText="取消"
          >
            <Button size="small" type="link" icon={<UndoOutlined />} style={{ color: '#fa8c16' }}>
              重置密码
            </Button>
          </Popconfirm>
          {r.is_default !== 1 && (
            <Popconfirm title="确定删除该账号？" onConfirm={() => handleDelete(r.id)}>
              <Button size="small" type="link" danger>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
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
          <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label={editId ? '新密码(留空不修改)' : '密码'} rules={editId ? [] : [{ required: true, message: '请输入密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="real_name" label="使用人" rules={[{ required: true, message: '请输入使用人' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="权限" rules={[{ required: true }]} initialValue="user">
            <Select onChange={v => setSelectedRole(v)}>
              <Option value="admin">管理员</Option>
              <Option value="user">普通用户</Option>
              <Option value="client">客户</Option>
            </Select>
          </Form.Item>
          {selectedRole === 'client' && (
            <Form.Item name="client_id" label="客户单位" rules={[{ required: true, message: '请选择客户单位' }]}>
              <Select placeholder="请选择客户单位" showSearch optionFilterProp="children">
                {clients.map(c => (
                  <Option key={c.id} value={c.id}>{c.name}</Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
