import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Space, Modal, Descriptions, Divider,
  Select, Input, message, Typography, Row, Col, Badge, Form
} from 'antd';
import { EyeOutlined, SearchOutlined, ReloadOutlined, CarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const { Option } = Select;
const { Text } = Typography;

const STATUS_MAP = {
  pending: { label: '待备货', color: 'default' },
  preparing: { label: '备货中', color: 'blue' },
  delivering: { label: '送货中', color: 'orange' },
  done: { label: '已完成', color: 'green' },
};

export default function AdminPurchaseList() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchVal, setSearchVal] = useState('');

  const [detailVisible, setDetailVisible] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailItems, setDetailItems] = useState([]);

  // 送货弹窗
  const [deliverVisible, setDeliverVisible] = useState(false);
  const [deliverOrderNo, setDeliverOrderNo] = useState('');
  const [deliverForm] = Form.useForm();

  const loadList = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, pageSize };
      if (statusFilter) params.status = statusFilter;
      if (keyword) params.keyword = keyword;
      const res = await api.get('/purchase', { params });
      if (res.code === 0) {
        setList(res.data.list || []);
        setTotal(res.data.total || 0);
        setPage(p);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, keyword]);

  useEffect(() => { loadList(1); }, [statusFilter, keyword]);

  const handleSearch = () => { setKeyword(searchVal); };

  const handleViewDetail = async (orderNo) => {
    setDetailVisible(true);
    const res = await api.get(`/purchase/${orderNo}`);
    if (res.code === 0) {
      setDetailOrder(res.data.order);
      setDetailItems(res.data.items || []);
    }
  };

  // 开始备货 - 跳转到出库页面
  const handlePrepare = (orderNo) => {
    navigate(`/admin/stock-out?purchaseOrderNo=${orderNo}`);
  };

  // 打开送货弹窗
  const handleOpenDeliver = (orderNo) => {
    setDeliverOrderNo(orderNo);
    deliverForm.resetFields();
    setDeliverVisible(true);
  };

  // 提交送货信息
  const handleSubmitDeliver = async () => {
    const values = await deliverForm.validateFields();
    const res = await api.put(`/purchase/${deliverOrderNo}/deliver`, values);
    if (res.code === 0) {
      message.success('已开始送货');
      setDeliverVisible(false);
      loadList(page);
    } else {
      message.error(res.message);
    }
  };

  const columns = [
    {
      title: '采购单号', dataIndex: 'order_no', width: 160,
      render: v => <Tag color="orange" style={{ fontFamily: 'monospace', fontSize: 13 }}>{v}</Tag>,
    },
    { title: '客户单位', dataIndex: 'client_name', width: 140, ellipsis: true },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: v => { const s = STATUS_MAP[v] || {}; return <Tag color={s.color}>{s.label || v}</Tag>; },
    },
    {
      title: '商品数', dataIndex: 'item_count', width: 80, align: 'center',
      render: v => <Badge count={v} color="#47B881" showZero />,
    },
    { title: '提交人', dataIndex: 'created_by', width: 80, render: v => v || '-' },
    { title: '提交时间', dataIndex: 'created_at', width: 150 },
    {
      title: '操作', key: 'action', width: 220,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(row.order_no)}>详情</Button>
          {row.status === 'pending' && (
            <Button size="small" type="primary" onClick={() => handlePrepare(row.order_no)}>开始备货</Button>
          )}
          {row.status === 'preparing' && (
            <Button size="small" type="primary" icon={<CarOutlined />}
              style={{ background: '#fa8c16', border: 'none' }}
              onClick={() => handleOpenDeliver(row.order_no)}>开始送货</Button>
          )}
        </Space>
      ),
    },
  ];

  const itemColumns = [
    { title: '商品名称', dataIndex: 'product_name', ellipsis: true },
    { title: '规格', dataIndex: 'spec', width: 100, ellipsis: true },
    { title: '数量', dataIndex: 'quantity', width: 80, align: 'right', render: v => <Text strong>{v}</Text> },
    { title: '单位', dataIndex: 'unit', width: 70 },
    { title: '单价', dataIndex: 'price', width: 90, align: 'right', render: v => v != null ? `¥${Number(v).toFixed(2)}` : '-' },
    { title: '合计', dataIndex: 'total_amount', width: 100, align: 'right', render: v => v != null ? <Text strong style={{ color: '#fa8c16' }}>¥{Number(v).toFixed(2)}</Text> : '-' },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
  ];

  return (
    <div>
      <Card title="采购申请单" bordered={false} style={{ borderRadius: 12 }}
        extra={<Button icon={<ReloadOutlined />} onClick={() => loadList(1)}>刷新</Button>}
      >
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8} md={6}>
            <Select allowClear placeholder="筛选状态" style={{ width: '100%' }}
              value={statusFilter || undefined} onChange={v => setStatusFilter(v || '')}>
              <Option value="pending">待备货</Option>
              <Option value="preparing">备货中</Option>
              <Option value="delivering">送货中</Option>
              <Option value="done">已完成</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Input.Search placeholder="搜索单号或客户单位" value={searchVal}
              onChange={e => setSearchVal(e.target.value)} onSearch={handleSearch}
              enterButton={<SearchOutlined />} allowClear
              onClear={() => { setSearchVal(''); setKeyword(''); }} />
          </Col>
        </Row>
        <Table columns={columns} dataSource={list} rowKey="id" loading={loading}
          size="middle" scroll={{ x: 1000 }}
          pagination={{ current: page, pageSize, total, showTotal: t => `共 ${t} 条`, onChange: p => loadList(p) }} />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title={detailOrder ? <span>采购单详情 <Tag color="orange" style={{ marginLeft: 8 }}>{detailOrder.order_no}</Tag></span> : '采购单详情'}
        open={detailVisible} onCancel={() => setDetailVisible(false)}
        footer={<Button onClick={() => setDetailVisible(false)}>关闭</Button>} width={780}
      >
        {detailOrder && (
          <>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="客户单位">{detailOrder.client_name}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={STATUS_MAP[detailOrder.status]?.color}>{STATUS_MAP[detailOrder.status]?.label || detailOrder.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="提交人">{detailOrder.created_by || '-'}</Descriptions.Item>
              <Descriptions.Item label="提交时间">{detailOrder.created_at || '-'}</Descriptions.Item>
              {detailOrder.preparing_by && (
                <>
                  <Descriptions.Item label="备货人">{detailOrder.preparing_by}</Descriptions.Item>
                  <Descriptions.Item label="开始备货时间">{detailOrder.preparing_at}</Descriptions.Item>
                </>
              )}
              {detailOrder.delivering_by && (
                <>
                  <Descriptions.Item label="发货人">{detailOrder.delivering_by}</Descriptions.Item>
                  <Descriptions.Item label="发货时间">{detailOrder.delivering_at}</Descriptions.Item>
                </>
              )}
              {detailOrder.done_by && (
                <>
                  <Descriptions.Item label="收货确认人">{detailOrder.done_by}</Descriptions.Item>
                  <Descriptions.Item label="完成时间">{detailOrder.done_at}</Descriptions.Item>
                  {detailOrder.receipt_note && <Descriptions.Item label="收货说明" span={2}>{detailOrder.receipt_note}</Descriptions.Item>}
                </>
              )}
              <Descriptions.Item label="备注" span={2}>{detailOrder.remark || '-'}</Descriptions.Item>
            </Descriptions>
            {(detailOrder.delivery_company || detailOrder.delivery_no || detailOrder.delivery_contact || detailOrder.delivery_phone) && (
              <>
                <Divider orientation="left" style={{ marginTop: 16 }}><CarOutlined /> 送货信息</Divider>
                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="物流公司">{detailOrder.delivery_company || '-'}</Descriptions.Item>
                  <Descriptions.Item label="物流单号">{detailOrder.delivery_no || '-'}</Descriptions.Item>
                  <Descriptions.Item label="送货联系人">{detailOrder.delivery_contact || '-'}</Descriptions.Item>
                  <Descriptions.Item label="联系电话">{detailOrder.delivery_phone || '-'}</Descriptions.Item>
                  {detailOrder.delivery_remark && <Descriptions.Item label="送货备注" span={2}>{detailOrder.delivery_remark}</Descriptions.Item>}
                </Descriptions>
              </>
            )}
            <Divider orientation="left" style={{ marginTop: 16 }}>商品明细</Divider>
            <Table columns={itemColumns} dataSource={detailItems} rowKey="id" size="small" pagination={false} />
            {detailItems.length > 0 && (() => {
              const total = detailItems.reduce((sum, item) => sum + (item.total_amount || 0), 0);
              return (
                <div style={{ textAlign: 'right', marginTop: 12, paddingTop: 8, borderTop: '1px dashed #e8e8e8' }}>
                  <Text style={{ fontSize: 15 }}>采购单合计：</Text>
                  <Text strong style={{ fontSize: 18, color: '#fa8c16' }}>¥{total.toFixed(2)}</Text>
                </div>
              );
            })()}
          </>
        )}
      </Modal>

      {/* 送货信息弹窗 */}
      <Modal title="填写送货信息" open={deliverVisible} onOk={handleSubmitDeliver}
        onCancel={() => setDeliverVisible(false)} destroyOnClose width={520}
        okText="确认送货" cancelText="取消">
        <Form form={deliverForm} layout="vertical">
          <Form.Item name="delivery_company" label="物流公司">
            <Input placeholder="请输入物流公司名称（可选）" />
          </Form.Item>
          <Form.Item name="delivery_no" label="物流单号">
            <Input placeholder="请输入物流单号（可选）" />
          </Form.Item>
          <Form.Item name="delivery_contact" label="送货联系人">
            <Input placeholder="请输入送货联系人（可选）" />
          </Form.Item>
          <Form.Item name="delivery_phone" label="联系电话">
            <Input placeholder="请输入联系电话（可选）" />
          </Form.Item>
          <Form.Item name="delivery_remark" label="送货备注">
            <Input.TextArea rows={2} placeholder="其他备注信息（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}