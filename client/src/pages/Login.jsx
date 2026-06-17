import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [sysName, setSysName] = useState('做账管理系统');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (token && user.role) {
      const rolePath = { admin: '/admin', user: '/user', client: '/client' };
      navigate(rolePath[user.role] || '/login');
    }
    // 获取系统名称（公开接口）
    fetch('/api/settings/system-name').then(r => r.json()).then(res => {
      if (res.code === 0 && res.data?.system_name) {
        setSysName(res.data.system_name);
        document.title = res.data.system_name;
      }
    }).catch(() => {});
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', values);
      if (res.code === 0) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        message.success('登录成功');
        navigate(res.data.user.role === 'admin' ? '/admin' : res.data.user.role === 'client' ? '/client' : '/user');
      } else {
        message.error(res.message || '登录失败');
      }
    } catch (e) {
      message.error('登录失败');
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-title">{sysName}</div>
        <div className="login-subtitle">欢迎登录，请输入您的账号信息</div>
        <Form onFinish={onFinish} size="large" autoComplete="off">
          <Form.Item name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input prefix={<UserOutlined style={{ color: '#bbb' }} />} placeholder="请输入账号" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined style={{ color: '#bbb' }} />} placeholder="请输入密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 44, fontSize: 16 }}>
              登 录
            </Button>
          </Form.Item>
        </Form>
        <div className="login-footer">系统开发：罗工 13896294207</div>
      </div>
    </div>
  );
}
