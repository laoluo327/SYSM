import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Card, Space, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, DeleteOutlined, PrinterOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '../../api';

export default function StockIn() {
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
  const [keyword, setKeyword] = useState('');
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [orderNo, setOrderNo] = useState('');
  const [companyId, setCompanyId] = useState(null);
  const [warehouseId, setWarehouseId] = useState(null);
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [createTime, setCreateTime] = useState('');

  const formatNow = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
  };

  useEffect(() => { loadData(); }, [page, keyword]);

  const loadData = async () => {
    setLoading(true);
    const res = await api.get('/stock-in', { params: { page, pageSize: 20, keyword } });
    if (res.code === 0) { setList(res.data.list); setTotal(res.data.total); }
    setLoading(false);
  };

  const openModal = async () => {
    const [pRes, cRes, noRes, wRes] = await Promise.all([
      api.get('/products', { params: { pageSize: 1000 } }),
      api.get('/companies/all'),
      api.get('/stock-in/generate-order-no'),
      api.get('/warehouses/all'),
    ]);
    if (pRes.code === 0) setProducts(pRes.data.list);
    if (cRes.code === 0) setCompanies(cRes.data);
    if (noRes.code === 0) setOrderNo(noRes.data.order_no);
    if (wRes.code === 0) setWarehouses(wRes.data);
    setCompanyId(null);
    setWarehouseId(null);
    setItems([]);
    setCreateTime(formatNow());
    setModalOpen(true);
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
    if (!companyId) { message.warning('请选择供货公司'); return; }
    if (!warehouseId) { message.warning('请选择目标库房'); return; }
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) { message.warning('请至少添加一条商品入库明细'); return; }
    setSubmitting(true);
    const res = await api.post('/stock-in', {
      order_no: orderNo, company_id: companyId, warehouse_id: warehouseId,
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
    const res = await api.get(`/stock-in/order/${orderNo}`);
    if (res.code === 0) setOrderItems(res.data);
    setOrderDetailLoading(false);
  };

  const showItemDetail = (record) => { setItemDetail(record); setItemDetailOpen(true); };
  const openPrintPreview = () => { setPrintPreviewOpen(true); };
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

  // 入库单列表列
  const orderColumns = [
    { title: '入库单号', dataIndex: 'order_no', key: 'order_no', render: v => v ? <Tag color="blue">{v}</Tag> : '-' },
    { title: '供货公司', dataIndex: 'company_name', key: 'company_name' },
    { title: '入库库房', dataIndex: 'warehouse_name', key: 'warehouse_name', render: v => v ? <Tag color="green">{v}</Tag> : '-' },
    { title: '商品种类', dataIndex: 'item_count', key: 'item_count', render: v => `${v} 种` },
    { title: '总数量', dataIndex: 'total_qty', key: 'total_qty' },
    { title: '总金额', dataIndex: 'total_amount', key: 'total_amount', render: v => <span style={{ color: '#fa8c16', fontWeight: 600 }}>¥{v.toFixed(2)}</span> },
    { title: '入库人', dataIndex: 'operator', key: 'operator' },
    { title: '入库时间', dataIndex: 'created_at', key: 'created_at' },
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
    { title: '详情', key: 'action', width: 80, render: (_, r) => (
      <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => showItemDetail(r)}>详情</Button>
    )},
  ];

  // 新建入库单 - 商品明细列（含合计金额）
  const formItemColumns = [
    { title: '商品', width: 180, render: (_, r) => (
      <Select showSearch optionFilterProp="label" placeholder="搜索选择商品" style={{ width: '100%' }}
        value={r.product_id} onChange={v => updateItem(r.key, 'product_id', v)}
        options={products.map(p => ({ value: p.id, label: `${p.name}${p.spec ? ` (${p.spec})` : ''}` }))} />
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
      <div className="page-header"><h2 className="page-title">商品入库</h2></div>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div className="search-bar">
          <Input prefix={<SearchOutlined />} placeholder="搜索单号/公司/入库人" value={keyword} onChange={e => setKeyword(e.target.value)} style={{ width: 300 }} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>新建入库单</Button>
        </div>
        <Table columns={orderColumns} dataSource={list} rowKey="order_no" loading={loading} scroll={{ x: 900 }}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `共 ${t} 张入库单` }} />
      </Card>

      {/* 新建入库单弹窗 */}
      <Modal title="新建入库单" open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}
        destroyOnClose width={900} confirmLoading={submitting} okText="确认入库">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-section" style={{ marginBottom: 0 }}>
            <div className="form-section-title">入库单信息</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px 24px', alignItems: 'start' }}>
              <div>
                <span style={{ color: '#999', fontSize: 13 }}>入库单号</span>
                <div><Tag color="blue" style={{ fontSize: 15, padding: '4px 12px' }}>{orderNo}</Tag></div>
              </div>
              <div>
                <span style={{ color: '#999', fontSize: 13 }}><ClockCircleOutlined style={{ marginRight: 4 }} />建单时间</span>
                <div style={{ fontWeight: 500 }}>{createTime}</div>
              </div>
              <div>
                <span style={{ color: '#999', fontSize: 13 }}>供货公司 <span style={{ color: '#ff4d4f' }}>*</span></span>
                <Select allowClear showSearch optionFilterProp="label" placeholder="搜索选择供货公司"
                  style={{ width: '100%' }} value={companyId} onChange={setCompanyId}
                  options={companies.map(c => ({ value: c.id, label: c.name }))} />
              </div>
              <div>
                <span style={{ color: '#999', fontSize: 13 }}>目标库房 <span style={{ color: '#ff4d4f' }}>*</span></span>
                <Select allowClear showSearch optionFilterProp="label" placeholder="选择入库库房"
                  style={{ width: '100%' }} value={warehouseId} onChange={setWarehouseId}
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

      {/* 入库单详情弹窗 */}
      <Modal title={<span>入库单详情 <Tag color="blue">{currentOrderNo}</Tag></span>} open={orderDetailOpen}
        onCancel={() => setOrderDetailOpen(false)} width={750}
        footer={<div style={{ textAlign: 'right' }}>
          <Button icon={<PrinterOutlined />} type="primary" onClick={openPrintPreview}>打印入库单</Button>
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
      <Modal title="打印预览" open={printPreviewOpen} onCancel={() => setPrintPreviewOpen(false)} width={820}
        footer={<div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#999', fontSize: 12 }}>提示：打印时仅打印预览区域内容</span>
          <Space>
            <Button onClick={() => setPrintPreviewOpen(false)}>关闭</Button>
            <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>开始打印</Button>
          </Space>
        </div>}>
        <div id="print-scroll-wrapper" style={{ background: '#e8e8e8', padding: 20, maxHeight: '70vh', overflow: 'auto' }}>
          <div id="print-area" style={{ background: '#fff', padding: '40px 50px', maxWidth: 720, margin: '0 auto', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22, letterSpacing: 8 }}>入 库 单</h2>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13 }}>
              <div>入库单号：<strong>{currentOrderNo}</strong></div>
              <div>入库时间：{orderItems[0]?.created_at || ''}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13 }}>
              <div>供货公司：{orderItems[0]?.company_name || '-'}</div>
              <div>入库库房：<strong>{orderItems[0]?.warehouse_name || '-'}</strong></div>
              <div>入库人：{orderItems[0]?.operator || '-'}</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ border: '1px solid #d9d9d9', padding: '8px 10px', textAlign: 'center' }}>序号</th>
                  <th style={{ border: '1px solid #d9d9d9', padding: '8px 10px', textAlign: 'left' }}>商品名称</th>
                  <th style={{ border: '1px solid #d9d9d9', padding: '8px 10px', textAlign: 'center' }}>单位</th>
                  <th style={{ border: '1px solid #d9d9d9', padding: '8px 10px', textAlign: 'right' }}>单价</th>
                  <th style={{ border: '1px solid #d9d9d9', padding: '8px 10px', textAlign: 'right' }}>数量</th>
                  <th style={{ border: '1px solid #d9d9d9', padding: '8px 10px', textAlign: 'right' }}>合计金额</th>
                  <th style={{ border: '1px solid #d9d9d9', padding: '8px 10px', textAlign: 'left' }}>备注</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ border: '1px solid #d9d9d9', padding: '6px 10px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #d9d9d9', padding: '6px 10px' }}>{item.product_name}</td>
                    <td style={{ border: '1px solid #d9d9d9', padding: '6px 10px', textAlign: 'center' }}>{item.unit}</td>
                    <td style={{ border: '1px solid #d9d9d9', padding: '6px 10px', textAlign: 'right' }}>¥{item.price}</td>
                    <td style={{ border: '1px solid #d9d9d9', padding: '6px 10px', textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ border: '1px solid #d9d9d9', padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>¥{item.total_amount}</td>
                    <td style={{ border: '1px solid #d9d9d9', padding: '6px 10px' }}>{item.remark || ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#fafafa', fontWeight: 700 }}>
                  <td colSpan={5} style={{ border: '1px solid #d9d9d9', padding: '8px 10px', textAlign: 'right' }}>本单合计：</td>
                  <td style={{ border: '1px solid #d9d9d9', padding: '8px 10px', textAlign: 'right', color: '#fa8c16' }}>¥{orderTotal.toFixed(2)}</td>
                  <td style={{ border: '1px solid #d9d9d9', padding: '8px 10px' }}></td>
                </tr>
              </tfoot>
            </table>
            <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <div>制单人：__________</div>
              <div>收货人：__________</div>
              <div>日期：__________</div>
            </div>
          </div>
        </div>
      </Modal>

      {/* 商品入库详情弹窗 */}
      <Modal title="商品入库详情" open={itemDetailOpen} onCancel={() => setItemDetailOpen(false)} footer={null} width={640}>
        {itemDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section-title">入库单信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                <div><span style={{ color: '#999', fontSize: 13 }}>入库单号</span><div><Tag color="blue">{itemDetail.order_no || '-'}</Tag></div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}>供货公司</span><div style={{ fontWeight: 500 }}>{itemDetail.company_name || '-'}</div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}>入库库房</span><div style={{ fontWeight: 500 }}>{itemDetail.warehouse_name || '-'}</div></div>
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
                  <div style={{ color: '#999', fontSize: 12 }}>入库前</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#666' }}>{itemDetail.before_qty}</div>
                </div>
                <div style={{ fontSize: 20, color: '#47B881', fontWeight: 700 }}>→</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#999', fontSize: 12 }}>入库后</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#47B881' }}>{itemDetail.after_qty}</div>
                </div>
              </div>
            </div>
            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section-title">操作信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                <div><span style={{ color: '#999', fontSize: 13 }}>入库人</span><div style={{ fontWeight: 500 }}>{itemDetail.operator}</div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}>入库时间</span><div style={{ fontWeight: 500 }}>{itemDetail.created_at}</div></div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
