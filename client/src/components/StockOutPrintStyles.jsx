import React from 'react';

// 出库单公共数据
function usePrintData(orderItems, currentOrderNo, orderTotal) {
  return {
    orderNo: currentOrderNo,
    purchaseOrderNo: orderItems[0]?.purchase_order_no || '',
    createdAt: orderItems[0]?.created_at || '',
    clientName: orderItems[0]?.client_name || '-',
    warehouseName: orderItems[0]?.warehouse_name || '-',
    operator: orderItems[0]?.operator || '-',
    items: orderItems,
    total: orderTotal,
  };
}

// ===================== 样式1：经典白表 =====================
// 特点：抬头"XX公司 出库单"，显示全部信息（出库单号+采购单号），传统灰色边框
export function Style1({ orderItems, currentOrderNo, orderTotal }) {
  const d = usePrintData(orderItems, currentOrderNo, orderTotal);
  return (
    <div id="print-area" style={{ background: '#fff', padding: '40px 50px', maxWidth: 720, margin: '0 auto', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 16, color: '#666', marginBottom: 4 }}>{d.warehouseName}</div>
        <h2 style={{ margin: 0, fontSize: 22, letterSpacing: 8 }}>出 库 单</h2>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13 }}>
        <div>客户单位：<strong>{d.clientName}</strong></div>
        <div>出库单号：<strong>{d.orderNo}</strong></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 13 }}>
        <div>出库人：{d.operator}</div>
        <div>出库时间：{d.createdAt}</div>
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
          {d.items.map((item, idx) => (
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
            <td style={{ border: '1px solid #d9d9d9', padding: '8px 10px', textAlign: 'right', color: '#fa8c16' }}>¥{d.total.toFixed(2)}</td>
            <td style={{ border: '1px solid #d9d9d9', padding: '8px 10px' }}></td>
          </tr>
        </tfoot>
      </table>
      <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <div>制单人：__________</div>
        <div>领货人：__________</div>
        <div>日期：__________</div>
      </div>
    </div>
  );
}

// ===================== 样式2：商务蓝标 =====================
// 特点：抬头"XX公司 出货单"，蓝色渐变头部，只显示采购单号，不显示出库单号
export function Style2({ orderItems, currentOrderNo, orderTotal }) {
  const d = usePrintData(orderItems, currentOrderNo, orderTotal);
  return (
    <div id="print-area" style={{ background: '#fff', maxWidth: 720, margin: '0 auto', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
      <div style={{ background: 'linear-gradient(135deg, #1a3a6b 0%, #2b5ea7 100%)', padding: '24px 40px', color: '#fff' }}>
        <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>{d.warehouseName}</div>
        <h2 style={{ margin: 0, fontSize: 24, letterSpacing: 6, fontWeight: 700 }}>出 货 单</h2>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>DELIVERY ORDER</div>
      </div>
      <div style={{ padding: '28px 40px 36px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px 24px', marginBottom: 20, fontSize: 13 }}>
          <div><span style={{ color: '#999' }}>客户单位：</span><strong>{d.clientName}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><span style={{ color: '#999' }}>经办人：</span>{d.operator}</span><span><span style={{ color: '#999' }}>出货时间：</span>{d.createdAt}</span></div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#e8f0fe' }}>
              <th style={{ border: '1px solid #b8d4f0', padding: '8px 10px', textAlign: 'center', color: '#1a3a6b' }}>序号</th>
              <th style={{ border: '1px solid #b8d4f0', padding: '8px 10px', textAlign: 'left', color: '#1a3a6b' }}>商品名称</th>
              <th style={{ border: '1px solid #b8d4f0', padding: '8px 10px', textAlign: 'center', color: '#1a3a6b' }}>单位</th>
              <th style={{ border: '1px solid #b8d4f0', padding: '8px 10px', textAlign: 'right', color: '#1a3a6b' }}>单价</th>
              <th style={{ border: '1px solid #b8d4f0', padding: '8px 10px', textAlign: 'right', color: '#1a3a6b' }}>数量</th>
              <th style={{ border: '1px solid #b8d4f0', padding: '8px 10px', textAlign: 'right', color: '#1a3a6b' }}>合计金额</th>
              <th style={{ border: '1px solid #b8d4f0', padding: '8px 10px', textAlign: 'left', color: '#1a3a6b' }}>备注</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((item, idx) => (
              <tr key={item.id}>
                <td style={{ border: '1px solid #d9e8f7', padding: '6px 10px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #d9e8f7', padding: '6px 10px' }}>{item.product_name}</td>
                <td style={{ border: '1px solid #d9e8f7', padding: '6px 10px', textAlign: 'center' }}>{item.unit}</td>
                <td style={{ border: '1px solid #d9e8f7', padding: '6px 10px', textAlign: 'right' }}>¥{item.price}</td>
                <td style={{ border: '1px solid #d9e8f7', padding: '6px 10px', textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ border: '1px solid #d9e8f7', padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#2b5ea7' }}>¥{item.total_amount}</td>
                <td style={{ border: '1px solid #d9e8f7', padding: '6px 10px' }}>{item.remark || ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f0f6ff', fontWeight: 700 }}>
              <td colSpan={5} style={{ border: '1px solid #b8d4f0', padding: '8px 10px', textAlign: 'right', color: '#1a3a6b' }}>本单合计：</td>
              <td style={{ border: '1px solid #b8d4f0', padding: '8px 10px', textAlign: 'right', color: '#2b5ea7', fontSize: 15 }}>¥{d.total.toFixed(2)}</td>
              <td style={{ border: '1px solid #b8d4f0', padding: '8px 10px' }}></td>
            </tr>
          </tfoot>
        </table>
        <div style={{ marginTop: 36, display: 'flex', justifyContent: 'space-between', fontSize: 13, borderTop: '2px solid #2b5ea7', paddingTop: 12 }}>
          <div>制单人：__________</div>
          <div>领货人：__________</div>
          <div>日期：__________</div>
        </div>
      </div>
    </div>
  );
}

// ===================== 样式3：简约极简 =====================
// 特点：抬头"XX公司"，无边框线条表，不显示任何单号，最干净
export function Style3({ orderItems, currentOrderNo, orderTotal }) {
  const d = usePrintData(orderItems, currentOrderNo, orderTotal);
  return (
    <div id="print-area" style={{ background: '#fff', padding: '50px 55px', maxWidth: 720, margin: '0 auto', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
      <div style={{ borderBottom: '3px solid #333', paddingBottom: 16, marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: '#999', marginBottom: 2 }}>{d.warehouseName}</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>出货单</h2>
      </div>
      <div style={{ marginBottom: 24, fontSize: 13 }}>
        <div style={{ textAlign: 'left' }}><span style={{ color: '#999' }}>客户：</span><strong>{d.clientName}</strong></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span><span style={{ color: '#999' }}>经办 </span>{d.operator}</span>
          <span><span style={{ color: '#999' }}>日期 </span>{d.createdAt}</span>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333' }}>
            <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600 }}>#</th>
            <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600 }}>商品</th>
            <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600 }}>单位</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600 }}>单价</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600 }}>数量</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600 }}>金额</th>
            <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600 }}>备注</th>
          </tr>
        </thead>
        <tbody>
          {d.items.map((item, idx) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 6px', textAlign: 'center', color: '#999' }}>{idx + 1}</td>
              <td style={{ padding: '8px 6px' }}>{item.product_name}</td>
              <td style={{ padding: '8px 6px', textAlign: 'center' }}>{item.unit}</td>
              <td style={{ padding: '8px 6px', textAlign: 'right' }}>¥{item.price}</td>
              <td style={{ padding: '8px 6px', textAlign: 'right' }}>{item.quantity}</td>
              <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600 }}>¥{item.total_amount}</td>
              <td style={{ padding: '8px 6px', color: '#999' }}>{item.remark || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, paddingTop: 12, borderTop: '2px solid #333' }}>
        <span style={{ fontSize: 14, marginRight: 16 }}>合计</span>
        <span style={{ fontSize: 18, fontWeight: 700 }}>¥{d.total.toFixed(2)}</span>
      </div>
      <div style={{ marginTop: 48, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666' }}>
        <div style={{ width: 150, borderTop: '1px solid #ccc', paddingTop: 6, textAlign: 'center' }}>制单人</div>
        <div style={{ width: 150, borderTop: '1px solid #ccc', paddingTop: 6, textAlign: 'center' }}>领货人</div>
        <div style={{ width: 150, borderTop: '1px solid #ccc', paddingTop: 6, textAlign: 'center' }}>日期</div>
      </div>
    </div>
  );
}

// ===================== 样式4：复古红头 =====================
// 特点：抬头红色大标题"XX公司出库单"，只显示出库单号，不显示采购单号
export function Style4({ orderItems, currentOrderNo, orderTotal }) {
  const d = usePrintData(orderItems, currentOrderNo, orderTotal);
  return (
    <div id="print-area" style={{ background: '#fff', maxWidth: 720, margin: '0 auto', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: '2px solid #c0392b' }}>
      <div style={{ background: '#c0392b', padding: '18px 40px', textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: 8, color: '#fff', fontWeight: 700 }}>{d.warehouseName} 出 库 单</h2>
      </div>
      <div style={{ height: 4, background: 'linear-gradient(90deg, #c0392b, #e74c3c, #c0392b)' }}></div>
      <div style={{ padding: '28px 40px 36px' }}>
        <div style={{ marginBottom: 20, fontSize: 13, padding: '12px 16px', background: '#fdf2f0', borderRadius: 4, border: '1px solid #f5d5d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span><span style={{ color: '#c0392b', fontWeight: 600 }}>客户单位：</span>{d.clientName}</span>
            <span><span style={{ color: '#c0392b', fontWeight: 600 }}>出库人：</span>{d.operator}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span><span style={{ color: '#c0392b', fontWeight: 600 }}>单号：</span>{d.orderNo}</span>
            <span><span style={{ color: '#c0392b', fontWeight: 600 }}>日期：</span>{d.createdAt}</span>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #c0392b', padding: '8px 10px', textAlign: 'center', background: '#c0392b', color: '#fff' }}>序号</th>
              <th style={{ border: '1px solid #c0392b', padding: '8px 10px', textAlign: 'left', background: '#c0392b', color: '#fff' }}>商品名称</th>
              <th style={{ border: '1px solid #c0392b', padding: '8px 10px', textAlign: 'center', background: '#c0392b', color: '#fff' }}>单位</th>
              <th style={{ border: '1px solid #c0392b', padding: '8px 10px', textAlign: 'right', background: '#c0392b', color: '#fff' }}>单价</th>
              <th style={{ border: '1px solid #c0392b', padding: '8px 10px', textAlign: 'right', background: '#c0392b', color: '#fff' }}>数量</th>
              <th style={{ border: '1px solid #c0392b', padding: '8px 10px', textAlign: 'right', background: '#c0392b', color: '#fff' }}>合计金额</th>
              <th style={{ border: '1px solid #c0392b', padding: '8px 10px', textAlign: 'left', background: '#c0392b', color: '#fff' }}>备注</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((item, idx) => (
              <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fef9f8' }}>
                <td style={{ border: '1px solid #e8b4a8', padding: '6px 10px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ border: '1px solid #e8b4a8', padding: '6px 10px' }}>{item.product_name}</td>
                <td style={{ border: '1px solid #e8b4a8', padding: '6px 10px', textAlign: 'center' }}>{item.unit}</td>
                <td style={{ border: '1px solid #e8b4a8', padding: '6px 10px', textAlign: 'right' }}>¥{item.price}</td>
                <td style={{ border: '1px solid #e8b4a8', padding: '6px 10px', textAlign: 'right' }}>{item.quantity}</td>
                <td style={{ border: '1px solid #e8b4a8', padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#c0392b' }}>¥{item.total_amount}</td>
                <td style={{ border: '1px solid #e8b4a8', padding: '6px 10px' }}>{item.remark || ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#fdf2f0', fontWeight: 700 }}>
              <td colSpan={5} style={{ border: '1px solid #e8b4a8', padding: '8px 10px', textAlign: 'right' }}>本单合计：</td>
              <td style={{ border: '1px solid #e8b4a8', padding: '8px 10px', textAlign: 'right', color: '#c0392b', fontSize: 15 }}>¥{d.total.toFixed(2)}</td>
              <td style={{ border: '1px solid #e8b4a8', padding: '8px 10px' }}></td>
            </tr>
          </tfoot>
        </table>
        <div style={{ marginTop: 36, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <div style={{ borderBottom: '1px solid #c0392b', width: 140, textAlign: 'center', paddingBottom: 4 }}>制单人</div>
          <div style={{ borderBottom: '1px solid #c0392b', width: 140, textAlign: 'center', paddingBottom: 4 }}>领货人</div>
          <div style={{ borderBottom: '1px solid #c0392b', width: 140, textAlign: 'center', paddingBottom: 4 }}>日期</div>
        </div>
      </div>
    </div>
  );
}

// ===================== 样式5：深色商务 =====================
// 特点：抬头深色"XX公司 出货单"，出库单号在头部徽章，不显示采购单号，金色点缀
export function Style5({ orderItems, currentOrderNo, orderTotal }) {
  const d = usePrintData(orderItems, currentOrderNo, orderTotal);
  return (
    <div id="print-area" style={{ background: '#fff', maxWidth: 720, margin: '0 auto', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
      <div style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 4 }}>{d.warehouseName}</div>
          <h2 style={{ margin: 0, fontSize: 22, letterSpacing: 4, color: '#fff', fontWeight: 700 }}>出货单</h2>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '8px 16px', color: '#fff', fontSize: 13, textAlign: 'right' }}>
          <div style={{ fontSize: 11, opacity: 0.7 }}>单号</div>
          <div style={{ fontWeight: 700, letterSpacing: 1 }}>{d.orderNo}</div>
        </div>
      </div>
      <div style={{ height: 3, background: 'linear-gradient(90deg, #f39c12, #e67e22, #f39c12)' }}></div>
      <div style={{ padding: '28px 40px 36px' }}>
        <div style={{ marginBottom: 22, fontSize: 13 }}>
          <div style={{ padding: '6px 0', borderBottom: '1px solid #eee' }}><span style={{ color: '#999', marginRight: 6 }}>客户</span><strong>{d.clientName}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #eee' }}>
            <span><span style={{ color: '#999', marginRight: 6 }}>经办人</span>{d.operator}</span>
            <span><span style={{ color: '#999', marginRight: 6 }}>日期</span>{d.createdAt}</span>
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#2c3e50' }}>
              <th style={{ padding: '10px 8px', textAlign: 'center', color: '#f39c12', fontWeight: 700, fontSize: 12 }}>NO.</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', color: '#fff', fontWeight: 700, fontSize: 12 }}>商品名称</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 12 }}>单位</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', color: '#fff', fontWeight: 700, fontSize: 12 }}>单价</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', color: '#fff', fontWeight: 700, fontSize: 12 }}>数量</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', color: '#f39c12', fontWeight: 700, fontSize: 12 }}>金额</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', color: '#fff', fontWeight: 700, fontSize: 12 }}>备注</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((item, idx) => (
              <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '8px', textAlign: 'center', color: '#f39c12', fontWeight: 700, borderBottom: '1px solid #eee' }}>{idx + 1}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{item.product_name}</td>
                <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #eee' }}>{item.unit}</td>
                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>¥{item.price}</td>
                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{item.quantity}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#e67e22', borderBottom: '1px solid #eee' }}>¥{item.total_amount}</td>
                <td style={{ padding: '8px', color: '#999', borderBottom: '1px solid #eee' }}>{item.remark || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, padding: '12px 16px', background: '#2c3e50', borderRadius: 4 }}>
          <span style={{ color: '#fff', marginRight: 16, fontSize: 14 }}>合计 TOTAL</span>
          <span style={{ color: '#f39c12', fontSize: 20, fontWeight: 700 }}>¥{d.total.toFixed(2)}</span>
        </div>
        <div style={{ marginTop: 36, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <div style={{ textAlign: 'center', width: 140 }}>
            <div style={{ height: 40 }}></div>
            <div style={{ borderTop: '1px solid #2c3e50', paddingTop: 6 }}>制单人</div>
          </div>
          <div style={{ textAlign: 'center', width: 140 }}>
            <div style={{ height: 40 }}></div>
            <div style={{ borderTop: '1px solid #2c3e50', paddingTop: 6 }}>领货人</div>
          </div>
          <div style={{ textAlign: 'center', width: 140 }}>
            <div style={{ height: 40 }}></div>
            <div style={{ borderTop: '1px solid #2c3e50', paddingTop: 6 }}>日期</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== 样式6：清新绿意 =====================
// 特点：绿色圆角卡片风格，公司名+出货单抬头，显示出库单号和采购单号，绿色系
export function Style6({ orderItems, currentOrderNo, orderTotal }) {
  const d = usePrintData(orderItems, currentOrderNo, orderTotal);
  return (
    <div id="print-area" style={{ background: '#f6faf5', maxWidth: 720, margin: '0 auto', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', borderRadius: 8, overflow: 'hidden' }}>
      {/* 绿色头部 */}
      <div style={{ background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', padding: '22px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 4 }}>{d.warehouseName}</div>
          <h2 style={{ margin: 0, fontSize: 22, letterSpacing: 4, color: '#fff', fontWeight: 700 }}>出 货 单</h2>
        </div>
        <div style={{ color: '#fff', fontSize: 12, textAlign: 'right', opacity: 0.9 }}>
          <div>单号：{d.orderNo}</div>
          {d.purchaseOrderNo && <div>采购单号：{d.purchaseOrderNo}</div>}
        </div>
      </div>
      <div style={{ padding: '24px 36px 32px' }}>
        {/* 信息卡片 */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, background: '#fff', borderRadius: 6, padding: '10px 14px', border: '1px solid #d5f0e0' }}>
            <div style={{ fontSize: 11, color: '#27ae60', marginBottom: 4 }}>客户单位</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{d.clientName}</div>
          </div>
          <div style={{ flex: 1, background: '#fff', borderRadius: 6, padding: '10px 14px', border: '1px solid #d5f0e0' }}>
            <div style={{ fontSize: 11, color: '#27ae60', marginBottom: 4 }}>出货日期</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{d.createdAt}</div>
          </div>
          <div style={{ flex: 1, background: '#fff', borderRadius: 6, padding: '10px 14px', border: '1px solid #d5f0e0' }}>
            <div style={{ fontSize: 11, color: '#27ae60', marginBottom: 4 }}>经办人</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{d.operator}</div>
          </div>
        </div>
        {/* 表格 */}
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, borderRadius: 6, overflow: 'hidden', border: '1px solid #d5f0e0' }}>
          <thead>
            <tr style={{ background: '#e8f8ee' }}>
              <th style={{ padding: '9px 10px', textAlign: 'center', color: '#1e8449', fontWeight: 700, borderBottom: '2px solid #27ae60' }}>序号</th>
              <th style={{ padding: '9px 10px', textAlign: 'left', color: '#1e8449', fontWeight: 700, borderBottom: '2px solid #27ae60' }}>商品名称</th>
              <th style={{ padding: '9px 10px', textAlign: 'center', color: '#1e8449', fontWeight: 700, borderBottom: '2px solid #27ae60' }}>单位</th>
              <th style={{ padding: '9px 10px', textAlign: 'right', color: '#1e8449', fontWeight: 700, borderBottom: '2px solid #27ae60' }}>单价</th>
              <th style={{ padding: '9px 10px', textAlign: 'right', color: '#1e8449', fontWeight: 700, borderBottom: '2px solid #27ae60' }}>数量</th>
              <th style={{ padding: '9px 10px', textAlign: 'right', color: '#1e8449', fontWeight: 700, borderBottom: '2px solid #27ae60' }}>合计金额</th>
              <th style={{ padding: '9px 10px', textAlign: 'left', color: '#1e8449', fontWeight: 700, borderBottom: '2px solid #27ae60' }}>备注</th>
            </tr>
          </thead>
          <tbody>
            {d.items.map((item, idx) => (
              <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f6faf5' }}>
                <td style={{ padding: '7px 10px', textAlign: 'center', borderBottom: '1px solid #e8f8ee', color: '#27ae60', fontWeight: 600 }}>{idx + 1}</td>
                <td style={{ padding: '7px 10px', borderBottom: '1px solid #e8f8ee' }}>{item.product_name}</td>
                <td style={{ padding: '7px 10px', textAlign: 'center', borderBottom: '1px solid #e8f8ee' }}>{item.unit}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', borderBottom: '1px solid #e8f8ee' }}>¥{item.price}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', borderBottom: '1px solid #e8f8ee' }}>{item.quantity}</td>
                <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#27ae60', borderBottom: '1px solid #e8f8ee' }}>¥{item.total_amount}</td>
                <td style={{ padding: '7px 10px', color: '#999', borderBottom: '1px solid #e8f8ee' }}>{item.remark || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* 合计 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#1e8449', marginRight: 16, fontWeight: 600 }}>合计金额</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#27ae60' }}>¥{d.total.toFixed(2)}</span>
        </div>
        {/* 签名区 */}
        <div style={{ marginTop: 36, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <div style={{ textAlign: 'center', width: 140 }}>
            <div style={{ height: 40 }}></div>
            <div style={{ borderTop: '2px solid #27ae60', paddingTop: 6, color: '#1e8449' }}>制单人</div>
          </div>
          <div style={{ textAlign: 'center', width: 140 }}>
            <div style={{ height: 40 }}></div>
            <div style={{ borderTop: '2px solid #27ae60', paddingTop: 6, color: '#1e8449' }}>收货人</div>
          </div>
          <div style={{ textAlign: 'center', width: 140 }}>
            <div style={{ height: 40 }}></div>
            <div style={{ borderTop: '2px solid #27ae60', paddingTop: 6, color: '#1e8449' }}>日期</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 样式配置
export const PRINT_STYLES = [
  { id: 1, name: '样式1', color: '#8c8c8c', component: Style1 },
  { id: 2, name: '样式2', color: '#2b5ea7', component: Style2 },
  { id: 3, name: '样式3', color: '#333', component: Style3 },
  { id: 4, name: '样式4', color: '#c0392b', component: Style4 },
  { id: 5, name: '样式5', color: '#2c3e50', component: Style5 },
  { id: 6, name: '样式6', color: '#27ae60', component: Style6 },
];
