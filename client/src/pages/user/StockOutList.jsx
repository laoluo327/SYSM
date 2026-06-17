import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Card, Space, Tag, Row, Col } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, DeleteOutlined, PrinterOutlined, ClockCircleOutlined, LinkOutlined, CheckCircleFilled } from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { PRINT_STYLES } from '../../components/StockOutPrintStyles';

export default function StockOutList() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const purchaseOrderNoFromUrl = searchParams.get('purchaseOrderNo') || '';

  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [currentOrderNo, setCurrentOrderNo] = useState('');
  const [itemDetailOpen, setItemDetailOpen] = useState(false);
  const [itemDetail, setItemDetail] = useState(null);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseStock, setWarehouseStock] = useState({});
  const [orderNo, setOrderNo] = useState('');
  const [clientId, setClientId] = useState(null);
  const [warehouseId, setWarehouseId] = useState(null);
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [createTime, setCreateTime] = useState('');
  const [purchaseOrderNo, setPurchaseOrderNo] = useState('');

  const formatNow = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  };

  useEffect(() => { loadData(); }, [page, keyword]);

  // 从采购单跳转过来时自动打开新建出库单弹窗并预填数据
  useEffect(() => {
    if (purchaseOrderNoFromUrl) {
      openModalWithPurchaseOrder(purchaseOrderNoFromUrl);
    }
  }, [purchaseOrderNoFromUrl]);

  const loadData = async () => {
    setLoading(true);
    const res = await api.get('/stock-out', { params: { page, pageSize: 20, keyword } });
    if (res.code === 0) { setList(res.data.list); setTotal(res.data.total); }
    setLoading(false);
  };

  const openModal = async () => {
    const [pRes, cRes, noRes, wRes] = await Promise.all([
      api.get('/products', { params: { pageSize: 1000 } }),
      api.get('/clients/all'),
      api.get('/stock-out/generate-order-no'),
      api.get('/warehouses/all'),
    ]);
    if (pRes.code === 0) setProducts(pRes.data.list);
    if (cRes.code === 0) setClients(cRes.data);
    if (noRes.code === 0) setOrderNo(noRes.data.order_no);
    if (wRes.code === 0) setWarehouses(wRes.data);
    setClientId(null);
    setWarehouseId(null);
    setWarehouseStock({});
    setItems([]);
    setPurchaseOrderNo('');
    setCreateTime(formatNow());
    setModalOpen(true);
  };

  // 从采购单跳转过来时预填数据
  const openModalWithPurchaseOrder = async (poNo) => {
    const [pRes, cRes, noRes, wRes, poRes] = await Promise.all([
      api.get('/products', { params: { pageSize: 1000 } }),
      api.get('/clients/all'),
      api.get('/stock-out/generate-order-no'),
      api.get('/warehouses/all'),
      api.get(`/purchase/${poNo}`),
    ]);
    if (pRes.code === 0) setProducts(pRes.data.list);
    if (cRes.code === 0) setClients(cRes.data);
    if (noRes.code === 0) setOrderNo(noRes.data.order_no);
    if (wRes.code === 0) setWarehouses(wRes.data);
    setPurchaseOrderNo(poNo);
    setWarehouseId(null);
    setWarehouseStock({});
    setCreateTime(formatNow());
    if (poRes.code === 0) {
      const order = poRes.data.order;
      const poItems = poRes.data.items || [];
      // 预填客户
      setClientId(order.client_id || null);
      // 预填商品明细
      setItems(poItems.map((it, idx) => ({
        key: Date.now() + idx,
        product_id: it.product_id,
        unit: it.unit || '',
        price: it.price || 0,
        quantity: it.quantity || 0,
        remark: '',
      })));
    } else {
      setClientId(null);
      setItems([]);
    }
    setModalOpen(true);
    // 清除URL参数避免刷新重复弹窗
    navigate('/user/stock-out', { replace: true });
  };

  const handleWarehouseChange = async (wId) => {
    setWarehouseId(wId);
    if (!wId) { setWarehouseStock({}); return; }
    const stockMap = {};
    await Promise.all(products.map(async p => {
      const res = await api.get(`/warehouses/stock/${p.id}`);
      if (res.code === 0) {
        const wh = res.data.find(w => w.id === wId);
        stockMap[p.id] = wh ? wh.quantity : 0;
      }
    }));
    setWarehouseStock(stockMap);
  };

  const addItem = () => {
    setItems([...items, { key: Date.now(), product_id: null, unit: '', price: 0, quantity: 0, remark: '' }]);
  };
  const removeItem = (key) => { setItems(items.filter(i => i.key !== key)); };
  const updateItem = (key, field, value) => {
    setItems(items.map(i => {
      if (i.key !== key) return i;
      const updated = { ...i, [field]: value };
      if (field === 'product_id') {
        const p = products.find(x => x.id === value);
        if (p) { updated.unit = p.unit; updated.price = p.price; }
      }
      return updated;
    }));
  };

  const handleSubmit = async () => {
    if (!clientId) { message.warning('请选择客户单位'); return; }
    if (!warehouseId) { message.warning('请选择出货公司'); return; }
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) { message.warning('请至少添加一条商品出库明细'); return; }
    setSubmitting(true);
    const res = await api.post('/stock-out', {
      order_no: orderNo, client_id: clientId, warehouse_id: warehouseId,
      purchase_order_no: purchaseOrderNo || '',
      items: validItems.map(i => ({ product_id: i.product_id, unit: i.unit, price: i.price, quantity: i.quantity, remark: i.remark })),
    });
    if (res.code === 0) { message.success(res.message); setModalOpen(false); loadData(); }
    else { message.error(res.message); }
    setSubmitting(false);
  };

  const showOrderDetail = async (orderNo) => {
    setCurrentOrderNo(orderNo);
    setOrderDetailLoading(true);
    setOrderDetailOpen(true);
    const res = await api.get(`/stock-out/order/${orderNo}`);
    if (res.code === 0) setOrderItems(res.data);
    setOrderDetailLoading(false);
  };

  const showItemDetail = (record) => { setItemDetail(record); setItemDetailOpen(true); };
  const openPrintPreview = () => { setSelectedStyle(1); setPrintPreviewOpen(true); };
  const handlePrint = () => {
    const printArea = document.getElementById('print-area');
    if (!printArea) return;
    const clone = printArea.cloneNode(true);
    const wrapper = document.createElement('div');
    wrapper.id = 'print-temp-wrapper';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);
    window.print();
    document.body.removeChild(wrapper);
  };

  const CurrentStyleComp = PRINT_STYLES.find(s => s.id === selectedStyle)?.component;

  const orderColumns = [
    { title: '出库单号', dataIndex: 'order_no', key: 'order_no', render: v => v ? <Tag color="orange">{v}</Tag> : '-' },
    { title: '采购单号', dataIndex: 'purchase_order_no', key: 'purchase_order_no', render: v => v ? <Tag color="blue">{v}</Tag> : '-' },
    { title: '客户单位', dataIndex: 'client_name', key: 'client_name' },
    { title: '出货公司', dataIndex: 'warehouse_name', key: 'warehouse_name', render: v => v ? <Tag color="purple">{v}</Tag> : '-' },
    { title: '商品种类', dataIndex: 'item_count', key: 'item_count', render: v => `${v} 种` },
    { title: '总数量', dataIndex: 'total_qty', key: 'total_qty' },
    { title: '总金额', dataIndex: 'total_amount', key: 'total_amount', render: v => <span style={{ color: '#fa8c16', fontWeight: 600 }}>¥{v.toFixed(2)}</span> },
    { title: '出库人', dataIndex: 'operator', key: 'operator' },
    { title: '出库时间', dataIndex: 'created_at', key: 'created_at' },
    { title: '详情', key: 'action', width: 80, render: (_, r) => (
      <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => showOrderDetail(r.order_no)}>详情</Button>
    )},
  ];

  // 订单详情中的商品列表
  const orderItemColumns = [
    { title: '商品名称', dataIndex: 'product_name', key: 'product_name' },
    { title: '单位', dataIndex: 'unit', key: 'unit' },
    { title: '单价', dataIndex: 'price', key: 'price', render: v => `¥${v}` },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '合计金额', dataIndex: 'total_amount', key: 'total_amount', render: v => <span style={{ color: '#fa8c16', fontWeight: 600 }}>¥{v}</span> },
    { title: '库存变动', key: 'stock_change', width: 140, render: (_, r) => (
      <span style={{ fontSize: 13 }}>
        <span style={{ color: '#666', fontWeight: 600 }}>{r.before_qty ?? '-'}</span>
        <span style={{ color: '#ff4d4f', margin: '0 4px' }}>↓</span>
        <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{r.after_qty ?? '-'}</span>
      </span>
    )},
    { title: '详情', key: 'action', width: 80, render: (_, r) => (
      <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => showItemDetail(r)}>详情</Button>
    )},
  ];

  // 新建出库单 - 商品明细列
  const formItemColumns = [
    { title: '商品', width: 180, render: (_, r) => (
      <Select showSearch optionFilterProp="label" placeholder="搜索选择商品" style={{ width: '100%' }}
        value={r.product_id} onChange={v => updateItem(r.key, 'product_id', v)}
        options={products.map(p => ({
          value: p.id,
          label: `${p.name}${p.spec ? ` (${p.spec})` : ''} [库存:${warehouseId && warehouseStock[p.id] !== undefined ? warehouseStock[p.id] : p.quantity}]`
        }))} />
    )},
    { title: '单位', width: 80, render: (_, r) => <Input value={r.unit} onChange={e => updateItem(r.key, 'unit', e.target.value)} /> },
    { title: '单价', width: 110, render: (_, r) => (
      <InputNumber min={0} precision={2} value={r.price} onChange={v => updateItem(r.key, 'price', v)} style={{ width: '100%' }} />
    )},
    { title: '数量', width: 110, render: (_, r) => (
      <InputNumber min={0.01} value={r.quantity} onChange={v => updateItem(r.key, 'quantity', v)} style={{ width: '100%' }} />
    )},
    { title: '合计金额', width: 100, render: (_, r) => (
      <span style={{ fontWeight: 600, color: (r.price * r.quantity) > 0 ? '#fa8c16' : '#999' }}>¥{(r.price * r.quantity).toFixed(2)}</span>
    )},
    { title: '备注', width: 130, render: (_, r) => <Input value={r.remark} onChange={e => updateItem(r.key, 'remark', e.target.value)} /> },
    { title: '', width: 50, render: (_, r) => <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeItem(r.key)} /> },
  ];

  // 订单合计
  const orderTotal = orderItems.reduce((s, i) => s + (i.total_amount || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header"><h2 className="page-title">商品出库</h2></div>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div className="search-bar">
          <Input prefix={<SearchOutlined />} placeholder="搜索单号/客户/出库人" value={keyword} onChange={e => setKeyword(e.target.value)} style={{ width: 300 }} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>新建出库单</Button>
        </div>
        <Table columns={orderColumns} dataSource={list} rowKey="order_no" loading={loading} scroll={{ x: 900 }}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `共 ${t} 张出库单` }} />
      </Card>

      {/* 新建出库单弹窗 */}
      <Modal title="新建出库单" open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        destroyOnClose width={900} confirmLoading={submitting} okText="确认出库">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-section" style={{ marginBottom: 0 }}>
            <div className="form-section-title">出库单信息</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '12px 24px', alignItems: 'start' }}>
              <div>
                <span style={{ color: '#999', fontSize: 13 }}>出库单号</span>
                <div><Tag color="orange" style={{ fontSize: 15, padding: '4px 12px' }}>{orderNo}</Tag></div>
              </div>
              <div>
                <span style={{ color: '#999', fontSize: 13 }}><ClockCircleOutlined style={{ marginRight: 4 }} />建单时间</span>
                <div style={{ fontWeight: 500 }}>{createTime}</div>
              </div>
              <div>
                <span style={{ color: '#999', fontSize: 13 }}>采购单号</span>
                <div>
                  <Input
                    placeholder="有则填写，无则留空"
                    value={purchaseOrderNo}
                    onChange={e => setPurchaseOrderNo(e.target.value)}
                    suffix={purchaseOrderNo ? <LinkOutlined style={{ color: '#fa8c16' }} /> : null}
                    allowClear
                  />
                </div>
              </div>
              <div>
                <span style={{ color: '#999', fontSize: 13 }}>客户单位 <span style={{ color: '#ff4d4f' }}>*</span></span>
                <Select allowClear showSearch optionFilterProp="label" placeholder="搜索选择客户单位"
                  style={{ width: '100%' }} value={clientId} onChange={setClientId}
                  options={clients.map(c => ({ value: c.id, label: c.name }))} />
              </div>
              <div>
                <span style={{ color: '#999', fontSize: 13 }}>出货公司 <span style={{ color: '#ff4d4f' }}>*</span></span>
                <Select allowClear showSearch optionFilterProp="label" placeholder="选择出货公司"
                  style={{ width: '100%' }} value={warehouseId} onChange={handleWarehouseChange}
                  options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
              </div>
            </div>
          </div>
          <div className="form-section" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="form-section-title" style={{ marginBottom: 0 }}>商品明细</div>
              <Button type="dashed" icon={<PlusOutlined />} onClick={addItem}>添加商品</Button>
            </div>
            <Table columns={formItemColumns} dataSource={items} rowKey="key" pagination={false} size="small"
              scroll={{ y: 280 }} locale={{ emptyText: '暂无商品，点击"添加商品"按钮添加' }}
              summary={() => items.length > 0 ? (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4} align="right"><strong>合计：</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1}><strong style={{ color: '#fa8c16' }}>¥{items.reduce((s, i) => s + (i.price * i.quantity), 0).toFixed(2)}</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={2} colSpan={2}></Table.Summary.Cell>
                </Table.Summary.Row>
              ) : null} />
          </div>
        </div>
      </Modal>

      {/* 出库单详情弹窗 */}
      <Modal title={<span>出库单详情 <Tag color="orange">{currentOrderNo}</Tag>{orderItems[0]?.purchase_order_no ? <Tag color="blue" style={{ marginLeft: 8 }}>采购单: {orderItems[0].purchase_order_no}</Tag> : null}</span>} open={orderDetailOpen}
        onCancel={() => setOrderDetailOpen(false)} width={750}
        footer={<div style={{ textAlign: 'right' }}>
          <Button icon={<PrinterOutlined />} type="primary" onClick={openPrintPreview}>打印出库单</Button>
        </div>}>
        <Table columns={orderItemColumns} dataSource={orderItems} rowKey="id" loading={orderDetailLoading}
          pagination={false} size="small"
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={4} align="right"><strong>本单合计：</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={1}><strong style={{ color: '#fa8c16' }}>¥{orderTotal.toFixed(2)}</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={2}></Table.Summary.Cell>
            </Table.Summary.Row>
          )} />
      </Modal>

      {/* 打印预览弹窗 */}
      <Modal title="打印预览 - 选择样式" open={printPreviewOpen} onCancel={() => setPrintPreviewOpen(false)} width={900}
        footer={<div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#999', fontSize: 12 }}>选择样式后点击打印，仅打印预览区域内容</span>
          <Space>
            <Button onClick={() => setPrintPreviewOpen(false)}>关闭</Button>
            <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>打印当前样式</Button>
          </Space>
        </div>}>
        {/* 样式选择区 */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={8}>
            {PRINT_STYLES.map(s => (
              <Col key={s.id} span={4}>
                <Card
                  size="small"
                  hoverable
                  onClick={() => setSelectedStyle(s.id)}
                  style={{
                    cursor: 'pointer',
                    border: selectedStyle === s.id ? `2px solid ${s.color}` : '1px solid #e8e8e8',
                    background: selectedStyle === s.id ? `${s.color}08` : '#fff',
                    textAlign: 'center',
                    padding: '4px 0',
                  }}
                  bodyStyle={{ padding: '8px 4px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: s.color, flexShrink: 0 }}></div>
                    <span style={{ fontSize: 13, fontWeight: selectedStyle === s.id ? 700 : 400 }}>{s.name}</span>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
        {/* 预览区 */}
        <div style={{ background: '#e8e8e8', padding: 20, maxHeight: '60vh', overflow: 'auto', borderRadius: 8 }}>
          {CurrentStyleComp && <CurrentStyleComp orderItems={orderItems} currentOrderNo={currentOrderNo} orderTotal={orderTotal} />}
        </div>
      </Modal>

      {/* 商品出库详情弹窗 */}
      <Modal title="商品出库详情" open={itemDetailOpen} onCancel={() => setItemDetailOpen(false)} footer={null} width={640}>
        {itemDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section-title">出库单信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                <div><span style={{ color: '#999', fontSize: 13 }}>出库单号</span><div><Tag color="orange">{itemDetail.order_no || '-'}</Tag></div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}>采购单号</span><div>{itemDetail.purchase_order_no ? <Tag color="blue">{itemDetail.purchase_order_no}</Tag> : '-'}</div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}>客户单位</span><div style={{ fontWeight: 500 }}>{itemDetail.client_name || '-'}</div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}>出货公司</span><div style={{ fontWeight: 500 }}>{itemDetail.warehouse_name || '-'}</div></div>
              </div>
            </div>
            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section-title">商品信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                <div><span style={{ color: '#999', fontSize: 13 }}>商品名称</span><div style={{ fontWeight: 500 }}>{itemDetail.product_name}</div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}>单位</span><div style={{ fontWeight: 500 }}>{itemDetail.unit}</div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}>备注</span><div style={{ fontWeight: 500 }}>{itemDetail.remark || '-'}</div></div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Card size="small" style={{ textAlign: 'center', background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>单价</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#52c41a' }}>¥{itemDetail.price}</div>
              </Card>
              <Card size="small" style={{ textAlign: 'center', background: '#e6f7ff', border: '1px solid #91d5ff' }}>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>数量</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#1890ff' }}>{itemDetail.quantity}</div>
              </Card>
              <Card size="small" style={{ textAlign: 'center', background: '#fff7e6', border: '1px solid #ffd591' }}>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>合计金额</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fa8c16' }}>¥{itemDetail.total_amount}</div>
              </Card>
            </div>
            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section-title">库存变动</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '8px 0' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#999', fontSize: 12 }}>出库前</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#666' }}>{itemDetail.before_qty}</div>
                </div>
                <div style={{ fontSize: 20, color: '#ff4d4f', fontWeight: 700 }}>→</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#999', fontSize: 12 }}>出库后</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#ff4d4f' }}>{itemDetail.after_qty}</div>
                </div>
              </div>
            </div>
            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section-title">操作信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                <div><span style={{ color: '#999', fontSize: 13 }}>出库人</span><div style={{ fontWeight: 500 }}>{itemDetail.operator}</div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}>出库时间</span><div style={{ fontWeight: 500 }}>{itemDetail.created_at}</div></div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
