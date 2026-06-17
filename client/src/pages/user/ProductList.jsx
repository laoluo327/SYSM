import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Card, Space, Tag } from 'antd';
import { SearchOutlined, ImportOutlined, ExportOutlined, EyeOutlined, ShoppingCartOutlined, UserOutlined, ClockCircleOutlined, FileTextOutlined, BankOutlined } from '@ant-design/icons';
import api from '../../api';

export default function ProductList() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [stockInOpen, setStockInOpen] = useState(false);
  const [stockOutOpen, setStockOutOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [clients, setClients] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stockInForm] = Form.useForm();
  const [stockOutForm] = Form.useForm();

  useEffect(() => { loadData(); }, [page, keyword]);

  const loadData = async () => {
    setLoading(true);
    const res = await api.get('/products', { params: { page, pageSize: 20, keyword } });
    if (res.code === 0) { setList(res.data.list); setTotal(res.data.total); }
    setLoading(false);
  };

  const [stockInOrderNo, setStockInOrderNo] = useState('');
  const [stockOutOrderNo, setStockOutOrderNo] = useState('');

  const openStockIn = async (record) => {
    setCurrentProduct(record);
    stockInForm.resetFields();
    stockInForm.setFieldsValue({ unit: record.unit, price: record.price, quantity: 0 });
    const [cRes, noRes, wRes] = await Promise.all([api.get('/companies/all'), api.get('/stock-in/generate-order-no'), api.get('/warehouses/all')]);
    if (cRes.code === 0) setCompanies(cRes.data);
    if (noRes.code === 0) setStockInOrderNo(noRes.data.order_no);
    if (wRes.code === 0) setWarehouses(wRes.data);
    setStockInOpen(true);
  };

  const openStockOut = async (record) => {
    setCurrentProduct(record);
    stockOutForm.resetFields();
    stockOutForm.setFieldsValue({ unit: record.unit, price: record.price });
    const [cRes, noRes, wRes] = await Promise.all([api.get('/clients/all'), api.get('/stock-out/generate-order-no'), api.get('/warehouses/all')]);
    if (cRes.code === 0) setClients(cRes.data);
    if (noRes.code === 0) setStockOutOrderNo(noRes.data.order_no);
    if (wRes.code === 0) setWarehouses(wRes.data);
    setStockOutOpen(true);
  };

  const handleStockIn = async () => {
    const values = await stockInForm.validateFields();
    const res = await api.post('/stock-in', {
      order_no: stockInOrderNo,
      company_id: values.company_id,
      warehouse_id: values.warehouse_id,
      items: [{ product_id: currentProduct.id, unit: values.unit, price: values.price, quantity: values.quantity, remark: values.remark }],
    });
    if (res.code === 0) { message.success('入库成功'); setStockInOpen(false); loadData(); }
    else { message.error(res.message); }
  };

  const handleStockOut = async () => {
    const values = await stockOutForm.validateFields();
    const res = await api.post('/stock-out', {
      order_no: stockOutOrderNo,
      client_id: values.client_id,
      warehouse_id: values.warehouse_id,
      items: [{ product_id: currentProduct.id, unit: values.unit, price: values.price, quantity: values.quantity, remark: values.remark }],
    });
    if (res.code === 0) { message.success('出库成功'); setStockOutOpen(false); loadData(); }
    else { message.error(res.message); }
  };

  const showDetail = async (record) => {
    setDetailRecord(record);
    setWarehouseStock([]);
    setDetailOpen(true);
    const res = await api.get(`/warehouses/stock/${record.id}`);
    if (res.code === 0) setWarehouseStock(res.data);
  };

  const columns = [
    { title: '商品名称', dataIndex: 'name', key: 'name' },
    { title: '规格', dataIndex: 'spec', key: 'spec' },
    { title: '单位', dataIndex: 'unit', key: 'unit' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity' },
    { title: '单价', dataIndex: 'price', key: 'price', render: v => `¥${v}` },
    { title: '详情', key: 'detail', width: 80, render: (_, r) => (
      <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => showDetail(r)}>详情</Button>
    )},
    { title: '操作', key: 'action', width: 160, render: (_, r) => (
      <Space>
        <Button size="small" type="link" icon={<ImportOutlined />} onClick={() => openStockIn(r)}>入库</Button>
        <Button size="small" type="link" icon={<ExportOutlined />} onClick={() => openStockOut(r)}>出库</Button>
      </Space>
    )},
  ];

  return (
    <div className="page-container">
      <div className="page-header"><h2 className="page-title">商品列表</h2></div>
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div className="search-bar">
          <Input prefix={<SearchOutlined />} placeholder="搜索商品名称/规格/记录人" value={keyword} onChange={e => setKeyword(e.target.value)} style={{ width: 300 }} allowClear />
        </div>
        <Table columns={columns} dataSource={list} rowKey="id" loading={loading} scroll={{ x: 900 }}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `共 ${t} 条` }} />
      </Card>

      {/* 入库弹窗 */}
      <Modal title={`入库 - ${currentProduct?.name || ''}`} open={stockInOpen} onOk={handleStockIn} onCancel={() => setStockInOpen(false)} destroyOnClose width={520}>
        <Form form={stockInForm} layout="vertical">
          <div className="form-section">
            <div className="form-section-title">入库信息</div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: '#999', fontSize: 13 }}>入库单号</span>
              <div><Tag color="blue" style={{ fontSize: 14 }}>{stockInOrderNo}</Tag></div>
            </div>
            <Form.Item name="company_id" label="供货公司" rules={[{ required: true, message: '请选择供货公司' }]}>
              <Select allowClear showSearch optionFilterProp="label" placeholder="搜索选择供货公司"
                options={companies.map(c => ({ value: c.id, label: c.name }))} />
            </Form.Item>
            <Form.Item name="warehouse_id" label="目标出货公司" rules={[{ required: true, message: '请选择出货公司' }]}>
              <Select allowClear showSearch optionFilterProp="label" placeholder="出货公司"
                options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
            </Form.Item>
            <Space size="large">
              <Form.Item name="unit" label="单位"><Input style={{ width: 100 }} /></Form.Item>
              <Form.Item name="price" label="单价" rules={[{ required: true }]}><InputNumber min={0} precision={2} /></Form.Item>
              <Form.Item name="quantity" label="数量" rules={[{ required: true, message: '请输入数量' }]}><InputNumber min={0.01} /></Form.Item>
            </Space>
          </div>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* 出库弹窗 */}
      <Modal title={`出库 - ${currentProduct?.name || ''}`} open={stockOutOpen} onOk={handleStockOut} onCancel={() => setStockOutOpen(false)} destroyOnClose width={520}>
        <Form form={stockOutForm} layout="vertical">
          <div className="form-section">
            <div className="form-section-title">出库信息</div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: '#999', fontSize: 13 }}>出库单号</span>
              <div><Tag color="orange" style={{ fontSize: 14 }}>{stockOutOrderNo}</Tag></div>
            </div>
            <Form.Item name="client_id" label="客户单位" rules={[{ required: true, message: '请选择客户单位' }]}>
              <Select allowClear showSearch optionFilterProp="label" placeholder="搜索选择客户单位"
                options={clients.map(c => ({ value: c.id, label: c.name }))} />
            </Form.Item>
            <Form.Item name="warehouse_id" label="出货公司" rules={[{ required: true, message: '请选择出货公司' }]}>
              <Select allowClear showSearch optionFilterProp="label" placeholder="选择出货公司"
                options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
            </Form.Item>
            <Space size="large">
              <Form.Item name="unit" label="单位"><Input style={{ width: 100 }} /></Form.Item>
              <Form.Item name="price" label="单价" rules={[{ required: true }]}><InputNumber min={0} precision={2} /></Form.Item>
              <Form.Item name="quantity" label="数量" rules={[{ required: true, message: '请输入数量' }]}><InputNumber min={0.01} /></Form.Item>
            </Space>
          </div>
          <Form.Item name="remark" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* 商品详情弹窗 */}
      <Modal title="商品详情" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={640}>
        {detailRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section-title"><ShoppingCartOutlined /> 基础信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                <div><span style={{ color: '#999', fontSize: 13 }}>商品名称</span><div style={{ fontWeight: 500 }}>{detailRecord.name}</div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}>规格</span><div style={{ fontWeight: 500 }}>{detailRecord.spec || '-'}</div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}>单位</span><div style={{ fontWeight: 500 }}>{detailRecord.unit}</div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}>备注</span><div style={{ fontWeight: 500 }}>{detailRecord.remark || '-'}</div></div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" style={{ textAlign: 'center', background: '#e6f7ff', border: '1px solid #91d5ff' }}>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>当前库存</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#1890ff' }}>{detailRecord.quantity}</div>
              </Card>
              <Card size="small" style={{ textAlign: 'center', background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                <div style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>单价</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>¥{detailRecord.price}</div>
              </Card>
            </div>
            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section-title"><FileTextOutlined /> 记录信息</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                <div><span style={{ color: '#999', fontSize: 13 }}><UserOutlined style={{ marginRight: 4 }} />记录人</span><div style={{ fontWeight: 500 }}>{detailRecord.created_by || '-'}</div></div>
                <div><span style={{ color: '#999', fontSize: 13 }}><ClockCircleOutlined style={{ marginRight: 4 }} />记录时间</span><div style={{ fontWeight: 500 }}>{detailRecord.created_at}</div></div>
              </div>
            </div>
            {warehouseStock.length > 0 && (
              <div className="form-section" style={{ marginBottom: 0 }}>
                <div className="form-section-title"><BankOutlined /> 出货公司库存分布</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {warehouseStock.map(w => (
                    <Card key={w.id} size="small" style={{ textAlign: 'center', background: w.quantity > 0 ? '#f0f5ff' : '#fafafa', border: `1px solid ${w.quantity > 0 ? '#adc6ff' : '#d9d9d9'}` }}>
                      <div style={{ color: '#666', fontSize: 12, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                      <Tag color={w.quantity > 0 ? 'geekblue' : 'default'} style={{ fontSize: 14, padding: '2px 8px' }}>{w.quantity}</Tag>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
