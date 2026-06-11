import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Form, Input, Button, message } from 'antd';
import api from '../../api';

export default function Settings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { refreshSettings } = useOutletContext();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const res = await api.get('/settings');
    if (res.code === 0) {
      form.setFieldsValue({ system_name: res.data.system_name });
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    const res = await api.put('/settings/system-name', values);
    if (res.code === 0) {
      message.success('修改成功');
      refreshSettings?.();
    } else {
      message.error(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">系统设置</h2>
      </div>
      <Card style={{ borderRadius: 12, maxWidth: 600 }} bordered={false}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="系统名称" name="system_name" rules={[{ required: true, message: '请输入系统名称' }]}>
            <Input placeholder="请输入系统名称" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>保存设置</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
