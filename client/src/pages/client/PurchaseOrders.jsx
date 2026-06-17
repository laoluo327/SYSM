import React, { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Button, Space, Modal, Input, InputNumber,
  Select, message, Divider, Typography, Row, Col, Descriptions, Popconfirm
} from 'antd';
import { PlusOutlined, EyeOutlined, ReloadOutlined, DeleteOutlined, CheckCircleOutlined, CarOutlined } from '@ant-design/icons';
import api from '../../api';

const { Text } = Typography;
const { Option } = Select;

const STATUS_MAP = {
  pending: { label: '待备货', color: 'default' },
  preparing: { label: '备货中', color: 'blue' },
  delivering: { label: '送货中', color: 'orange' },
  done: { label: '已完成', color: 'green' },
};

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // 新建采购单
  const [createOpen, setCreateOpen] = useState(false);
  const [orderNo, setOrderNo] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 详情弹窗
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailItems, setDetailItems] = useState([]);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchase/my');
      if (res.code === 0) setOrders(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = async () => {
    const noRes = await api.get('/purchase/generate-order-no');
    if (noRes.code === 0) setOrderNo(noRes.data.order_no);
    const prodRes = await api.get('/purchase/products');
    if (prodRes.code === 0) setProducts(prodRes.data || []);
    setSelectedItems([]);
    setRemark('');
    setCreateOpen(true);
  };

  const handleAddItem = () => {
    setSelectedItems([...selectedItems, { product_id: undefined, quantity: 1, unit: '', price: 0, remark: '' }]);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = value;
    if (field === 'product_id') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        updated[index].unit = prod.unit || '';
        updated[index].price = prod.price || 0;
      }
    }
    setSelectedItems(updated);
  };

  const handleRemoveItem = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const orderTotal = selectedItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

  const handleSubmitOrder = async () => {
    const validItems = selectedItems.filter(i => i.product_id && i.quantity > 0);
    if (!validItems.length) {
      return message.error('请至少选择一个商品并填写数量');
    }
    setSubmitting(true);
    try {
      const res = await api.post('/purchase', { order_no: orderNo, items: validItems, remark });
      if (res.code === 0) {
        message.success('采购单提交成功');
        setCreateOpen(false);
        loadOrders();
      } else {
        message.error(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 确认收货弹窗
  const [completeVisible, setCompleteVisible] = useState(false);
  const [completeOrderNo, setCompleteOrderNo] = useState('');
  const [receiptNote, setReceiptNote] = useState('');

  const handleViewDetail = async (ordNo) => {
    setDetailVisible(true);
    const res = await api.get(`/purchase/${ordNo}`);
    if (res.code === 0) {
      setDetailOrder(res.data.order);
      setDetailItems(res.data.items || []);
    }
  };

  const handleOpenComplete = (ordNo) => {
    setCompleteOrderNo(ordNo);
    setReceiptNote('');
    setCompleteVisible(true);
  };

  const handleComplete = async () => {
    const res = await api.put(`/purchase/${completeOrderNo}/complete`, { receipt_note: receiptNote });
    if (res.code === 0) {
      message.success('已确认收货，采购单完成');
      setCompleteVisible(false);
      loadOrders();
      if (detailVisible) handleViewDetail(completeOrderNo);
    } else {
      message.error(res.message);
    }
  };

  const columns = [
    {
      title: '采购单号', dataIndex: 'order_no', width: 160,
      render: v => <Tag color="orange" style={{ fontFamily: 'monospace', fontSize: 13 }}>{v}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: v => { const s = STATUS_MAP[v] || {}; return <Tag color={s.color}>{s.label || v}</Tag>; },
    },
    { title: '商品数', dataIndex: 'item_count', width: 80, align: 'center' },
    { title: '提交人', dataIndex: 'created_by', width: 90, render: v => v || '-' },
    { title: '提交时间', dataIndex: 'created_at', width: 155 },
    {
      title: '操作', key: 'action', width: 160,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(r.order_no)}>详情</Button>
          {r.status === 'delivering' && (
            <Button size="small" type="primary" icon={<CheckCircleOutlined />} style={{ background: '#52c41a', border: 'none' }} onClick={() => handleOpenComplete(r.order_no)}>确认收货</Button>
          )}
        </Space>
      ),
    },
  ];

  const detailColumns = [
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
      <Card
        title="采购申请"
        bordered={false}
        style={{ borderRadius: 12 }}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadOrders}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>新建采购单</Button>
          </Space>
        }
      >
        <Table columns={columns} dataSource={orders} rowKey="id" loading={loading}
          size="middle" scroll={{ x: 800 }}
          pagination={{ pageSize: 15, showTotal: t => `共 ${t} 条` }} />
      </Card>

      {/* 新建采购单弹窗 */}
      <Modal
        title={<span>新建采购单 <Tag color="orange" style={{ marginLeft: 8 }}>{orderNo}</Tag></span>}
        open={createOpen} onCancel={() => setCreateOpen(false)} width={800}
        footer={[
          <Button key="cancel" onClick={() => setCreateOpen(false)}>取消</Button>,
          <Button key="submit" type="primary" loading={submitting} onClick={handleSubmitOrder}>提交采购单</Button>,
        ]}
      >
        <div style={{ marginBottom: 12 }}>
          <Text strong>选择商品：</Text>
          <Button type="dashed" icon={<PlusOutlined />} size="small" onClick={handleAddItem} style={{ marginLeft: 8 }}>添加商品</Button>
        </div>
        {selectedItems.map((item, idx) => {
          const subtotal = (item.price || 0) * (item.quantity || 0);
          return (
            <Row gutter={8} key={idx} style={{ marginBottom: 8 }} align="middle">
              <Col span={8}>
                <Select placeholder="选择商品" value={item.product_id || undefined}
                  onChange={v => handleItemChange(idx, 'product_id', v)}
                  style={{ width: '100%' }} showSearch optionFilterProp="children" size="small">
                  {products.map(p => (
                    <Option key={p.id} value={p.id}>{p.name}{p.spec ? ` (${p.spec})` : ''}{p.price ? ` ¥${p.price}` : ''}</Option>
                  ))}
                </Select>
              </Col>
              <Col span={3}>
                <InputNumber min={1} value={item.quantity} onChange={v => handleItemChange(idx, 'quantity', v)}
                  style={{ width: '100%' }} size="small" placeholder="数量" />
              </Col>
              <Col span={2}>
                <Input value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} placeholder="单位" size="small" />
              </Col>
              <Col span={3}>
                <InputNumber min={0} value={item.price} onChange={v => handleItemChange(idx, 'price', v)}
                  style={{ width: '100%' }} size="small" placeholder="单价" prefix="¥" />
              </Col>
              <Col span={4}>
                <Text strong style={{ color: '#fa8c16' }}>¥{subtotal.toFixed(2)}</Text>
              </Col>
              <Col span={3}>
                <Input value={item.remark} onChange={e => handleItemChange(idx, 'remark', e.target.value)} placeholder="备注" size="small" />
              </Col>
              <Col span={1}>
                <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => handleRemoveItem(idx)} />
              </Col>
            </Row>
          );
        })}
        {selectedItems.length > 0 && (
          <div style={{ textAlign: 'right', marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e8e8e8' }}>
            <Text style={{ fontSize: 15 }}>采购单合计：</Text>
            <Text strong style={{ fontSize: 18, color: '#fa8c16' }}>¥{orderTotal.toFixed(2)}</Text>
          </div>
        )}
        <Divider style={{ margin: '12px 0' }} />
        <Input.TextArea rows={2} placeholder="采购单备注（可选）" value={remark} onChange={e => setRemark(e.target.value)} />
      </Modal>

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

            {/* 送货信息 */}
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
            <Table columns={detailColumns} dataSource={detailItems} rowKey="id" size="small" pagination={false} />
            {detailItems.length > 0 && (() => {
              const total = detailItems.reduce((sum, item) => sum + (item.total_amount || 0), 0);
              return (
                <div style={{ textAlign: 'right', marginTop: 12, paddingTop: 8, borderTop: '1px dashed #e8e8e8' }}>
                  <Text style={{ fontSize: 15 }}>采购单合计：</Text>
                  <Text strong style={{ fontSize: 18, color: '#fa8c16' }}>¥{total.toFixed(2)}</Text>
                </div>
              );
            })()}

            {detailOrder.status === 'delivering' && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Button type="primary" icon={<CheckCircleOutlined />} size="large"
                  style={{ background: '#52c41a', border: 'none' }}
                  onClick={() => handleOpenComplete(detailOrder.order_no)}>确认收货</Button>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* 确认收货弹窗 */}
      <Modal title="确认收货" open={completeVisible} onOk={handleComplete}
        onCancel={() => setCompleteVisible(false)} destroyOnClose width={440}
        okText="确认收货" cancelText="取消">
        <div style={{ marginBottom: 16, color: '#666' }}>请确认已收到货物，并可填写收货说明：</div>
        <Input.TextArea rows={4} placeholder="请输入收货说明（可选）" value={receiptNote}
          onChange={e => setReceiptNote(e.target.value)} />
      </Modal>
    </div>
  );
}