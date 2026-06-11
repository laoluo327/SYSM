import React, { useState } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import api from '../../api';

export default function ChangePassword() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    if (values.new_password !== values.confirm_password) {
      message.error('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    const res = await api.post('/auth/change-password', {
      old_password: values.old_password,
      new_password: values.new_password
    });
    if (res.code === 0) {
      message.success('密码修改成功');
      form.resetFields();
    } else {
      message.error(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="page-header"><h2 className="page-title">修改密码</h2></div>
      <Card style={{ borderRadius: 12, maxWidth: 480 }} bordered={false}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="old_password" label="原密码" rules={[{ required: true, message: '请输入原密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="new_password" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 4, message: '密码长度不能少于4位' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="confirm_password" label="确认新密码" rules={[{ required: true, message: '请再次输入新密码' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>确认修改</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
